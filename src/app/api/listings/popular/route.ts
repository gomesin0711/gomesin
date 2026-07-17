import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseListing } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") || "8", 10)));

  // 1. Count messages per listingId (only non-null listingId)
  const messages = await db.message.findMany({
    where: { listingId: { not: null } },
    select: { listingId: true },
  });
  const chatCounts: Record<string, number> = {};
  for (const m of messages) {
    if (m.listingId) chatCounts[m.listingId] = (chatCounts[m.listingId] || 0) + 1;
  }

  // 2. Get listing IDs sorted by chat count (desc)
  const chattedIds = Object.entries(chatCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // 3. Fetch active + paid listings
  const allActive = await db.listing.findMany({
    where: { status: "active", paymentStatus: "paid", violationFlag: false },
    include: { category: true, seller: true, user: { select: { id: true, name: true, phone: true, email: true, city: true } } },
  });

  // 4. Build result: chatted listings first (sorted by chat count), then fill with others
  const chattedListings = chattedIds
    .map((id) => allActive.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => !!l);

  const chattedIdsSet = new Set(chattedIds);
  const otherListings = allActive
    .filter((l) => !chattedIdsSet.has(l.id))
    // fill with Spotlight/Highlight first, then newest
    .sort((a, b) => {
      const rank: Record<string, number> = { spotlight: 0, highlight: 1, sundul: 2, gratis: 3, standard: 3 };
      const ra = rank[a.packageType] ?? 3;
      const rb = rank[b.packageType] ?? 3;
      if (ra !== rb) return ra - rb;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  const combined = [...chattedListings, ...otherListings].slice(0, limit);
  const listings = combined.map(parseListing);

  return NextResponse.json({
    listings,
    total: listings.length,
    page: 1,
    limit,
    totalPages: 1,
  });
}
