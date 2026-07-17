import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseListing } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));

  // Only consider listings from the last 7 days (this week)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // 1. Count chat/whatsapp messages per listingId (only non-null listingId, from this week)
  const messages = await db.message.findMany({
    where: { listingId: { not: null }, createdAt: { gte: weekAgo } },
    select: { listingId: true },
  });
  const chatCounts: Record<string, number> = {};
  for (const m of messages) {
    if (m.listingId) chatCounts[m.listingId] = (chatCounts[m.listingId] || 0) + 1;
  }

  // 2. Fetch active + paid listings from this week
  const allActive = await db.listing.findMany({
    where: { status: "active", paymentStatus: "paid", violationFlag: false, createdAt: { gte: weekAgo } },
    include: { category: true, seller: true, user: { select: { id: true, name: true, phone: true, email: true, city: true } } },
  });

  // 3. Score each listing: chat count * 10 + views (chat weighted high as it indicates strong interest)
  const scored = allActive.map((l) => {
    const chatCount = chatCounts[l.id] || 0;
    const views = l.views || 0;
    const score = chatCount * 10 + views;
    return { listing: l, chatCount, views, score };
  });

  // 4. Sort by score desc, take top N
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  const listings = top.map((s) => parseListing(s.listing));

  return NextResponse.json({
    listings,
    total: listings.length,
    page: 1,
    limit,
    totalPages: 1,
  });
}
