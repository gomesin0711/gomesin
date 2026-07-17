import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parseListing } from "@/lib/types";
import { getPaketMap } from "@/lib/paket";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category") || "";
  const condition = searchParams.get("condition") || "";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const province = searchParams.get("province") || "";
  const packageType = searchParams.get("packageType") || "";
  const city = searchParams.get("city")?.trim() || "";
  const sort = searchParams.get("sort") || "newest";
  const featuredOnly = searchParams.get("featured") === "1";
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));

  const where: Prisma.ListingWhereInput = { status: "active", paymentStatus: "paid", violationFlag: false };
  if (ids && ids.length) {
    where.id = { in: ids };
  }

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { brand: { contains: q } },
    ];
  }
  if (category) {
    where.category = { slug: category };
  }
  if (condition) where.condition = condition;
  if (province) where.province = province;
  if (city) where.city = { contains: city };
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = BigInt(Math.floor(Number(minPrice)));
    if (maxPrice) where.price.lte = BigInt(Math.floor(Number(maxPrice)));
  }
  if (featuredOnly) where.featured = true;
  // Week filter: only listings from the last 7 days
  const weekOnly = searchParams.get("week") === "1";
  if (weekOnly) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    where.createdAt = { gte: weekAgo };
  }
  if (packageType) {
    const pkgList = packageType.split(",").map((p) => p.trim()).filter(Boolean);
    if (pkgList.length === 1) where.packageType = pkgList[0];
    else if (pkgList.length > 1) where.packageType = { in: pkgList };
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
      ? { price: "desc" }
      : sort === "popular"
      ? { views: "desc" }
      : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true, seller: true, user: { select: { id: true, name: true, phone: true, email: true, city: true } } },
    }),
  ]);

  // Newest ads first — no promo-rank grouping, pure createdAt desc order.
  const listings = rows.map(parseListing);

  return NextResponse.json({
    listings,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, price, priceType, condition, brand, yearProduced, city, province, categoryId, images, specs, featured, package: pkg, paymentMethod, userId, userName, userPhone } = body;

    if (!title || !description || !price || !categoryId || !city || !province) {
      return NextResponse.json({ error: "Data tidak lengkap. Mohon lengkapi semua field wajib." }, { status: 400 });
    }

    // Fetch the actual user from DB to get their latest name + phone
    // (more reliable than client-sent values which may be stale).
    let dbUser = null;
    if (userId) {
      dbUser = await db.user.findUnique({ where: { id: userId } });
    }
    const finalName = dbUser?.name || userName || "Anda (Pengguna Gomesin)";
    const finalPhone = dbUser?.phone || userPhone || "0812-0000-0000";

    // Find or create a seller record tied to this user.
    // Each user gets their own seller profile so their ads are isolated.
    // Try to find existing seller by matching listings with this userId.
    let seller = null;
    if (userId) {
      const userListings = await db.listing.findFirst({
        where: { userId },
        include: { seller: true },
      });
      if (userListings) {
        seller = userListings.seller;
      }
    }
    if (!seller) {
      seller = await db.seller.create({
        data: {
          name: finalName,
          phone: finalPhone,
          city: city,
          province: province,
          verified: false,
          rating: 5.0,
          reviewCount: 0,
        },
      });
    } else {
      // Update existing seller with latest user info (in case profile changed)
      seller = await db.seller.update({
        where: { id: seller.id },
        data: { name: finalName, phone: finalPhone },
      });
    }

    const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = slugBase + "-" + Math.random().toString(36).slice(2, 7);

    // Package pricing from DB (admin can edit via Paket tab)
    const paketMap = await getPaketMap();
    const pkgKey = pkg || "gratis";
    const pkgPrice = paketMap[pkgKey]?.price ?? 0;
    const pkgDays = paketMap[pkgKey]?.duration ?? 30;

    // If package is free, paymentStatus = paid immediately. Otherwise paid (simulated payment).
    // In production, this would integrate with a payment gateway (Midtrans, Xendit, etc).
    const isPaid = pkgPrice === 0 || paymentMethod; // free or payment method provided = paid
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + pkgDays);

    const created = await db.listing.create({
      data: {
        title,
        slug,
        description,
        price: BigInt(Math.floor(Number(price))),
        priceType: priceType || "fixed",
        condition: condition || "bekas",
        brand: brand || null,
        yearProduced: yearProduced ? parseInt(yearProduced, 10) : null,
        city,
        province,
        images: JSON.stringify(images || []),
        specs: JSON.stringify(specs || {}),
        featured: pkgKey === "premium" || pkgKey === "bisnis" || !!featured,
        status: "active",
        paymentStatus: isPaid ? "paid" : "unpaid",
        paymentExpiry: isPaid ? expiryDate : null,
        categoryId,
        sellerId: seller.id,
        userId: userId || null,
      },
      include: { category: true, seller: true, user: { select: { id: true, name: true, phone: true, email: true, city: true } } },
    });

    return NextResponse.json({ listing: parseListing(created) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Gagal membuat iklan: " + (e?.message || "unknown") }, { status: 500 });
  }
}
