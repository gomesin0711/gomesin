import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { getAdminFallbackCategories } from "@/lib/admin-fallback";

// GET all categories
export async function GET() {
  if (isDbAvailable()) {
    try {
      const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
      const counts = await db.listing.groupBy({ by: ["categoryId"], _count: true });
      const map: Record<string, number> = {};
      counts.forEach((c) => (map[c.categoryId] = c._count as number));
      return NextResponse.json({
        categories: cats.map((c) => ({ ...c, listingCount: map[c.id] ?? 0 })),
      });
    } catch { /* fall through */ }
  }

  // Fallback
  try {
    const data = await getAdminFallbackCategories();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create category
export async function POST(req: NextRequest) {
  const { name, slug, icon, color, sortOrder } = await req.json();
  if (!name || !slug) return NextResponse.json({ error: "Nama & slug wajib" }, { status: 400 });

  if (isDbAvailable()) {
    try {
      const maxOrder = await db.category.aggregate({ _max: { sortOrder: true } });
      const created = await db.category.create({
        data: {
          name,
          slug,
          icon: icon || "Cog",
          color: color || "orange",
          sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        },
      });
      return NextResponse.json({ category: created }, { status: 201 });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ error: "DB tidak tersedia" }, { status: 503 });
}
