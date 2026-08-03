import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: list all sellers with listing counts
export async function GET() {
  const sellers = await db.seller.findMany({
    orderBy: { joinedAt: "desc" },
    include: { listings: { select: { id: true } } },
  });
  return NextResponse.json({
    sellers: sellers.map((s) => ({
      ...s,
      joinedAt: s.joinedAt instanceof Date ? s.joinedAt.toISOString() : s.joinedAt,
      listingCount: s.listings.length,
    })),
  });
}

// PATCH: toggle verified status
export async function PATCH(req: NextRequest) {
  const { id, verified } = await req.json();
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });
  const updated = await db.seller.update({
    where: { id },
    data: { verified: !!verified },
  });
  return NextResponse.json({ seller: updated });
}
