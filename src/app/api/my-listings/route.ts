import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseListing } from "@/lib/types";

// GET listings owned by a specific user (for "My Ads" dashboard)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "User ID wajib diisi." },
      { status: 400 }
    );
  }

  const listings = await db.listing.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { category: true, seller: true },
  });

  return NextResponse.json({
    listings: listings.map(parseListing),
    total: listings.length,
  });
}
