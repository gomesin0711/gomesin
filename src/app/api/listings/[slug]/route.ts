import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { parseListing } from "@/lib/types";
import { getPaketMap } from "@/lib/paket";
import { saveImagesToLocal } from "@/lib/save-image";
import { getFallbackListingBySlug } from "@/lib/fallback-data";
import {
  fallbackGetListingBySlug,
  fallbackUpdateListingBySlug,
  fallbackDeleteListingBySlug,
} from "@/lib/listing-fallback";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (isDbAvailable()) {
    try {
      const listing = await db.listing.findUnique({
        where: { slug },
        include: { category: true, seller: true, user: true },
      });

      if (!listing) {
        return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
      }

      // increment views (non-blocking, fire and forget)
      db.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => {});

      // related: same category, exclude self — parallel with the above fire-and-forget
      const [related] = await Promise.all([
        db.listing.findMany({
          where: {
            status: "active",
            categoryId: listing.categoryId,
            id: { not: listing.id },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { category: true, seller: true, user: true },
        }),
      ]);

      return NextResponse.json({
        listing: parseListing(listing),
        related: related.map(parseListing),
      });
    } catch (error) {
      console.error("GET /api/listings/[slug] DB error, falling back", error);
    }
  }

  // Fallback: check fallback-data (seed), then listing-fallback (user-created)
  const fallback = getFallbackListingBySlug(slug);
  if (fallback) {
    return NextResponse.json(fallback);
  }

  const fbListing = await fallbackGetListingBySlug(slug);
  if (!fbListing) {
    return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
  }

  const { fallbackGetRelatedListings } = await import("@/lib/listing-fallback");
  const related = fbListing.categoryId
    ? await fallbackGetRelatedListings(fbListing.categoryId, fbListing.id)
    : [];

  return NextResponse.json({
    listing: parseListing(fbListing as any),
    related: related.map((l) => parseListing(l as any)),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { title, description, price, priceType, condition, brand, yearProduced, city, province, categoryId, images, specs, package: pkg, paymentMethod, status } = body;

  if (isDbAvailable()) {
    try {
      const existing = await db.listing.findUnique({ where: { slug } });
      if (!existing) {
        return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
      }

      const data: any = {};

      // Status change (e.g. mark as sold / un-sold)
      if (status !== undefined && !pkg) {
        if (!['active', 'sold', 'draft', 'pending', 'rejected'].includes(status)) {
          return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
        }
        data.status = status;
      }

      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      if (price !== undefined) data.price = BigInt(Math.floor(Number(price)));
      if (priceType !== undefined) data.priceType = priceType;
      if (condition !== undefined) data.condition = condition;
      if (brand !== undefined) data.brand = brand || null;
      if (yearProduced !== undefined) data.yearProduced = yearProduced ? parseInt(yearProduced, 10) : null;
      if (city !== undefined) data.city = city;
      if (province !== undefined) data.province = province;
      if (categoryId !== undefined) data.categoryId = categoryId;
      if (images !== undefined) {
        const localImages = await saveImagesToLocal(images);
        data.images = JSON.stringify(localImages);
      }
      if (specs !== undefined) data.specs = JSON.stringify(specs);

      // Package activation
      if (pkg) {
        const paketMap = await getPaketMap();
        const pkgKey = pkg;
        const pkgPrice = paketMap[pkgKey]?.price ?? 0;
        const pkgDays = paketMap[pkgKey]?.duration ?? 30;
        const isPaid = pkgKey === "simpan" || (pkgPrice > 0 && !!paymentMethod);
        data.packageType = pkgKey;
        data.featured = pkgKey === "spotlight" || pkgKey === "highlight";
        data.status = "pending";
        data.paymentStatus = pkgKey === "simpan" ? "unpaid" : (isPaid ? "paid" : "unpaid");
        if (isPaid && pkgDays > 0) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + pkgDays);
          data.paymentExpiry = expiryDate;
        } else {
          data.paymentExpiry = null;
        }
      }

      const updated = await db.listing.update({
        where: { id: existing.id },
        data,
        include: { category: true, seller: true, user: true },
      });

      return NextResponse.json({ listing: parseListing(updated) });
    } catch (e: any) {
      // Fall through to fallback
      console.error("PATCH /api/listings/[slug] DB error, falling back", e);
    }
  }

  // Fallback: update in file-based store
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (price !== undefined) updateData.price = Math.floor(Number(price));
  if (priceType !== undefined) updateData.priceType = priceType;
  if (condition !== undefined) updateData.condition = condition;
  if (brand !== undefined) updateData.brand = brand || null;
  if (yearProduced !== undefined) updateData.yearProduced = yearProduced ? parseInt(yearProduced, 10) : null;
  if (city !== undefined) updateData.city = city;
  if (province !== undefined) updateData.province = province;
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (images !== undefined) updateData.images = images;
  if (specs !== undefined) updateData.specs = specs;
  if (status !== undefined && !pkg) updateData.status = status;

  if (pkg) {
    const paketMap = await getPaketMap();
    const pkgKey = pkg;
    const pkgPrice = paketMap[pkgKey]?.price ?? 0;
    const pkgDays = paketMap[pkgKey]?.duration ?? 30;
    const isPaid = pkgKey === "simpan" || (pkgPrice > 0 && !!paymentMethod);
    updateData.packageType = pkgKey;
    updateData.featured = pkgKey === "spotlight" || pkgKey === "highlight";
    updateData.status = "pending";
    updateData.paymentStatus = pkgKey === "simpan" ? "unpaid" : (isPaid ? "paid" : "unpaid");
    if (isPaid && pkgDays > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + pkgDays);
      updateData.paymentExpiry = expiryDate.toISOString();
    } else {
      updateData.paymentExpiry = null;
    }
  }

  const updated = await fallbackUpdateListingBySlug(slug, updateData);
  if (!updated) {
    return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ listing: parseListing(updated as any) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (isDbAvailable()) {
    try {
      const existing = await db.listing.findUnique({ where: { slug } });
      if (!existing) {
        return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
      }

      await db.listing.delete({ where: { id: existing.id } });
      return NextResponse.json({ success: true, id: existing.id });
    } catch (e: any) {
      console.error("DELETE /api/listings/[slug] DB error, falling back", e);
    }
  }

  // Fallback: delete from file-based store
  const deleted = await fallbackDeleteListingBySlug(slug);
  if (!deleted) {
    return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}