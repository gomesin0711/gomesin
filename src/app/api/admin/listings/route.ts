import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { parseListing } from "@/lib/types";
import { getPaketMap } from "@/lib/paket";
import {
  getAllFallbackListings,
  fallbackUpdateListingBySlug,
  fallbackDeleteListingBySlug,
} from "@/lib/listing-fallback";
import seedData from "@/lib/seed-data.json";

function normalizeSeedListing(raw: any): any {
  return {
    ...raw,
    images: Array.isArray(raw.images) ? raw.images : [],
    specs: typeof raw.specs === "string" ? (() => { try { return JSON.parse(raw.specs); } catch { return {}; } })() : raw.specs || {},
    price: typeof raw.price === "number" ? raw.price : Number(raw.price),
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    seller: raw.seller ? { ...raw.seller, joinedAt: raw.seller.joinedAt instanceof Date ? raw.seller.joinedAt.toISOString() : raw.seller.joinedAt } : raw.seller,
  };
}

// GET all listings (admin, include inactive/violation/unpaid)
export async function GET(req: NextRequest) {
  try {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const paketMap = await getPaketMap();

  // Try DB first
  if (isDbAvailable()) {
    try {
      const where: any = {};
      if (status) where.status = status;
      const dbListings = await db.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { category: true, seller: true },
      });
      const withFee = dbListings.map((l) => {
        const parsed = parseListing(l);
        const fee = paketMap[parsed.packageType || ""]?.price ?? 0;
        return { ...parsed, adFee: fee };
      });
      return NextResponse.json({ listings: withFee });
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: combine seed data + file-based store (Vercel /tmp/)
  try {
    // 1. Seed data listings (all statuses, not just active)
    const seedListings = seedData.listings.map(normalizeSeedListing);
    // 2. File-based store listings (user-posted)
    const fbListings = await getAllFallbackListings();
    // 3. Merge: file-based overrides seed (by id)
    const mergedMap = new Map<string, any>();
    for (const l of seedListings) mergedMap.set(l.id, l);
    for (const l of fbListings) mergedMap.set(l.id, l); // file-based takes priority
    let allListings = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    // 4. Filter by status if requested
    if (status) {
      allListings = allListings.filter((l) => l.status === status);
    }
    const withFee = allListings.map((l) => {
      const parsed = parseListing(l as any);
      const fee = paketMap[parsed.packageType || ""]?.price ?? 0;
      return { ...parsed, adFee: fee };
    });
    return NextResponse.json({ listings: withFee });
  } catch (e) {
    console.error("Admin listings fallback error:", e);
    return NextResponse.json({ listings: [] });
  }
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

// PATCH: update status (approve/reject/sold) OR toggle violation
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, violationFlag, violationReason, slug } = body;
  if (!id && !slug) return NextResponse.json({ error: "ID atau slug wajib" }, { status: 400 });

  const data: any = {};
  if (status) {
    data.status = status;
    if (status === "active") data.paymentStatus = "paid";
  }
  if (violationFlag !== undefined) {
    data.violationFlag = violationFlag;
    data.violationReason = violationFlag ? (violationReason || "Melanggar ketentuan") : null;
    if (violationFlag) data.status = "rejected";
    else data.status = "active";
  }

  // Try DB first
  if (isDbAvailable() && id) {
    try {
      const updated = await db.listing.update({ where: { id }, data });
      return NextResponse.json({ listing: parseListing(updated) });
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: update in file-based store
  try {
    let targetSlug = slug;
    if (!targetSlug && id) {
      const allListings = await getAllFallbackListings();
      const found = allListings.find((l) => l.id === id);
      if (found) targetSlug = found.slug;
    }
    if (!targetSlug) {
      return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    }
    const updated = await fallbackUpdateListingBySlug(targetSlug, data);
    if (!updated) {
      return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ listing: parseListing(updated as any) });
  } catch (e: any) {
    return NextResponse.json({ error: "Gagal update: " + (e?.message || "") }, { status: 500 });
  }
}

// DELETE listing
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  // Try DB first
  if (isDbAvailable()) {
    try {
      await db.listing.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: delete from file-based store
  try {
    const allListings = await getAllFallbackListings();
    const found = allListings.find((l) => l.id === id);
    if (!found) {
      return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    }
    await fallbackDeleteListingBySlug(found.slug);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Gagal hapus: " + (e?.message || "") }, { status: 500 });
  }
}
