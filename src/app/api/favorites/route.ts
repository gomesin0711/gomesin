import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ favorites: [] });

  if (isDbAvailable()) {
    try {
      const rows = await db.favorite.findMany({
        where: { userId },
        select: { listingId: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ favorites: rows.map((r) => r.listingId) });
    } catch { /* fallback */ }
  }

  return NextResponse.json({ favorites: [] });
}

export async function POST(req: NextRequest) {
  const { userId, listingId } = await req.json();
  if (!userId || !listingId) {
    return NextResponse.json({ error: "userId dan listingId wajib" }, { status: 400 });
  }

  if (isDbAvailable()) {
    try {
      await db.favorite.create({ data: { userId, listingId } });
      return NextResponse.json({ success: true });
    } catch { /* fallback */ }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, listingId } = await req.json();
  if (!userId || !listingId) {
    return NextResponse.json({ error: "userId dan listingId wajib" }, { status: 400 });
  }

  if (isDbAvailable()) {
    try {
      await db.favorite.deleteMany({ where: { userId, listingId } });
      return NextResponse.json({ success: true });
    } catch { /* fallback */ }
  }

  return NextResponse.json({ success: true });
}
