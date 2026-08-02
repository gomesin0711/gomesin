import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parseListing } from "@/lib/types";
import { getPaketMap } from "@/lib/paket";
import { saveImagesToLocal } from "@/lib/save-image";
import { getFallbackListings } from "@/lib/fallback-data";
import { fallbackCreateListing } from "@/lib/listing-fallback";
import type { ListingFilters } from "@/lib/fallback-data";

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
  const sellerName = searchParams.get("seller")?.trim() || "";
  const sort = searchParams.get("sort") || "newest";
  const featuredOnly = searchParams.get("featured") === "1";
  const idsParam = searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "24", 10)));

  try {
    const where: Prisma.ListingWhereInput = { status: "active", paymentStatus: "paid", violationFlag: false };
    if (ids && ids.length) {
      where.id = { in: ids };
    }

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { brand: { contains: q } },
        { seller: { name: { contains: q } } },
        { city: { contains: q } },
      ];
    }
    if (category) {
      // Kategori "Jasa Teknisi" (jasa-teknisi) → tampilkan semua iklan jasa
      // (iklan jasa pakai condition="jasa", bukan categoryId jasa-teknisi).
      if (category === "jasa-teknisi") {
        where.condition = "jasa";
      } else {
        where.category = { slug: category };
      }
    }
    if (condition) where.condition = condition;
    if (province) where.province = province;
    if (city) where.city = { contains: city };
    if (sellerName) where.seller = { name: { contains: sellerName } };
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
        include: { category: true, seller: true, user: { select: { id: true, name: true, phone: true, email: true, city: true, logoImage: true, bannerImage: true } } },
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
  } catch (error) {
    console.error("GET /api/listings DB error, falling back to seed data", error);

    const filters: ListingFilters = {
      q: q || undefined,
      category: category || undefined,
      condition: condition || undefined,
      province: province || undefined,
      packageType: packageType || undefined,
      sort: sort || undefined,
      page,
      limit,
      ids,
      featured: featuredOnly || undefined,
    };

    return NextResponse.json(getFallbackListings(filters));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, price, priceType, condition, brand, yearProduced, city, province, categoryId, images, specs, featured, package: pkg, paymentMethod, userId, userName, userPhone, saveAsDraft, adType, availability } = body;

  const isDraft = saveAsDraft === true;
  if (!isDraft && (!title || !description || !price || !categoryId || !city || !province)) {
    return NextResponse.json({ error: "Data tidak lengkap. Mohon lengkapi semua field wajib." }, { status: 400 });
  }
  if (isDraft && !title) {
    return NextResponse.json({ error: "Judul wajib diisi untuk menyimpan dulu." }, { status: 400 });
  }

  // ─── Try DB path first (local dev with SQLite) ───────────────────────────
  if (isDbAvailable()) {
    try {
      let dbUser = null;
      if (userId) {
        dbUser = await db.user.findUnique({ where: { id: userId } });
      }
      const finalName = dbUser?.name || userName || "Anda (Pengguna Gomesin)";
      const finalPhone = dbUser?.phone || userPhone || "0812-0000-0000";

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
            city,
            province,
            verified: false,
            rating: 5.0,
            reviewCount: 0,
          },
        });
      } else {
        seller = await db.seller.update({
          where: { id: seller.id },
          data: { name: finalName, phone: finalPhone },
        });
      }

      const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const slug = slugBase + "-" + Math.random().toString(36).slice(2, 7);

      const paketMap = await getPaketMap();
      const pkgKey = pkg || "colek";
      const pkgDays = paketMap[pkgKey]?.duration ?? 30;

      let finalCategoryId = categoryId;
      if (!finalCategoryId) {
        const firstCat = await db.category.findFirst({ orderBy: { sortOrder: "asc" } });
        finalCategoryId = firstCat?.id;
      }

      const isPaid = !!paymentMethod;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + pkgDays);

      const rawImages: string[] = images || [];
      const localImages = await saveImagesToLocal(rawImages);

      const created = await db.listing.create({
        data: {
          title,
          slug,
          description,
          price: BigInt(Math.floor(Number(price) || 0)),
          priceType: priceType || "fixed",
          condition: condition || "bekas",
          brand: brand || null,
          yearProduced: yearProduced ? parseInt(yearProduced, 10) : null,
          city,
          province,
          images: JSON.stringify(localImages),
          specs: JSON.stringify(specs || {}),
          packageType: pkgKey,
          featured: pkgKey === "spotlight" || pkgKey === "highlight",
          status: isDraft ? "draft" : "pending",
          paymentStatus: isDraft ? "unpaid" : (isPaid ? "paid" : "unpaid"),
          paymentExpiry: isPaid ? expiryDate : null,
          categoryId: finalCategoryId,
          sellerId: seller.id,
          userId: userId || null,
        },
        include: { category: true, seller: true, user: { select: { id: true, name: true, phone: true, email: true, city: true, logoImage: true, bannerImage: true } } },
      });

      return NextResponse.json({ listing: parseListing(created) }, { status: 201 });
    } catch (dbError: any) {
      console.error("POST /api/listings DB error, falling back", dbError);
    }
  }

  // ─── Fallback path (Vercel / no DB) ───────────────────────────────────────
  try {
    const listing = await fallbackCreateListing({
      title, description, price, priceType, condition, brand, yearProduced,
      city, province, images, specs, featured, packageType: pkg,
      paymentMethod, userId, userName, userPhone, categoryId, saveAsDraft,
      adType, availability,
    });
    return NextResponse.json({ listing: parseListing(listing as any) }, { status: 201 });
  } catch (fallbackError: any) {
    console.error("POST /api/listings fallback error", fallbackError);
    return NextResponse.json({ error: "Gagal membuat iklan: " + (fallbackError?.message || "unknown") }, { status: 500 });
  }
}
