import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { parseListing } from "@/lib/types";
import { fallbackGetListingsByUserId } from "@/lib/listing-fallback";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const sellerId = req.nextUrl.searchParams.get("sellerId");

  if (!userId && !sellerId) {
    return NextResponse.json(
      { error: "User ID atau Seller ID wajib diisi." },
      { status: 400 }
    );
  }

  if (isDbAvailable()) {
    try {
      const whereClause: any = userId ? { userId } : { sellerId };
      let listings = await db.listing.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: { category: true, seller: true, user: true },
      });

      if (listings.length === 0 && userId) {
        listings = await db.listing.findMany({
          where: { sellerId: userId },
          orderBy: { createdAt: "desc" },
          include: { category: true, seller: true, user: true },
        });
      }

      return NextResponse.json({
        listings: listings.map(parseListing),
        total: listings.length,
      });
    } catch (e) {
      console.error("GET /api/my-listings DB error, falling back", e);
    }
  }

  const searchId = userId || sellerId || "";
  const listings = await fallbackGetListingsByUserId(searchId);
  return NextResponse.json({
    listings: listings.map((l) => parseListing(l as any)),
    total: listings.length,
  });
}
