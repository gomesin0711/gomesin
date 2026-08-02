import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { parseListing } from "@/lib/types";
import { getPaketMap } from "@/lib/paket";
import {
  getAllFallbackListings,
  fallbackUpdateListingBySlug,
  fallbackDeleteListingBySlug,
} from "@/lib/listing-fallback";

// GET all listings (admin, include inactive/violation/unpaid)
export async function GET(req: NextRequest) {
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

  // Fallback: read from file-based store (Vercel /tmp/)
  try {
    let fbListings = await getAllFallbackListings();
    if (status) {
      fbListings = fbListings.filter((l) => l.status === status);
    }
    const withFee = fbListings.map((l) => {
      const parsed = parseListing(l as any);
      const fee = paketMap[parsed.packageType || ""]?.price ?? 0;
      return { ...parsed, adFee: fee };
    });
    return NextResponse.json({ listings: withFee });
  } catch (e) {
    console.error("Admin listings fallback error:", e);
    return NextResponse.json({ listings: [] });
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
