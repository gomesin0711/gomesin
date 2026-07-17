import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseListing } from "@/lib/types";
import { getPaketMap } from "@/lib/paket";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const listing = await db.listing.findUnique({
    where: { slug },
    include: { category: true, seller: true, user: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
  }

  // increment views (non-blocking, fire and forget)
  db.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => {});

  // related: same category, exclude self
  const related = await db.listing.findMany({
    where: {
      status: "active",
      categoryId: listing.categoryId,
      id: { not: listing.id },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { category: true, seller: true, user: true },
  });

  return NextResponse.json({
    listing: parseListing(listing),
    related: related.map(parseListing),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { title, description, price, priceType, condition, brand, yearProduced, city, province, categoryId, images, specs, package: pkg, paymentMethod } = body;

    const existing = await db.listing.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    }

    const data: any = {};
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
    if (images !== undefined) data.images = JSON.stringify(images);
    if (specs !== undefined) data.specs = JSON.stringify(specs);

    // Package activation: when `package` is provided, recompute packageType,
    // featured, status, paymentStatus, and paymentExpiry based on package pricing from DB.
    if (pkg) {
      const paketMap = await getPaketMap();
      const pkgKey = pkg;
      const pkgPrice = paketMap[pkgKey]?.price ?? 0;
      const pkgDays = paketMap[pkgKey]?.duration ?? 30;
      const isPaid = pkgKey === "simpan" || (pkgPrice > 0 && !!paymentMethod);
      data.packageType = pkgKey;
      data.featured = pkgKey === "spotlight" || pkgKey === "highlight";
      data.status = pkgKey === "simpan" ? "pending" : (isPaid ? "active" : "pending");
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
    return NextResponse.json(
      { error: "Gagal mengupdate iklan: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const existing = await db.listing.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json({ error: "Iklan tidak ditemukan" }, { status: 404 });
    }

    await db.listing.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true, id: existing.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal menghapus iklan: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
