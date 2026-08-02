import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { getAdminFallbackSellers } from "@/lib/admin-fallback";

// GET: list all sellers with listing counts
export async function GET() {
  if (isDbAvailable()) {
    try {
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
    } catch { /* fall through */ }
  }

  // Fallback
  try {
    const data = await getAdminFallbackSellers();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: toggle verified status
export async function PATCH(req: NextRequest) {
  const { id, verified } = await req.json();
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  if (isDbAvailable()) {
    try {
      const updated = await db.seller.update({
        where: { id },
        data: { verified: !!verified },
      });
      return NextResponse.json({ seller: updated });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ error: "DB tidak tersedia" }, { status: 503 });
}