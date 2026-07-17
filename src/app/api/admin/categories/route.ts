import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all categories
export async function GET() {
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const counts = await db.listing.groupBy({ by: ["categoryId"], _count: true });
  const map: Record<string, number> = {};
  counts.forEach((c) => (map[c.categoryId] = c._count as number));
  return NextResponse.json({
    categories: cats.map((c) => ({ ...c, listingCount: map[c.id] ?? 0 })),
  });
}

// POST create category
export async function POST(req: NextRequest) {
  const { name, slug, icon, color, sortOrder } = await req.json();
  if (!name || !slug) return NextResponse.json({ error: "Nama & slug wajib" }, { status: 400 });
  const maxOrder = await db.category.aggregate({ _max: { sortOrder: true } });
  const created = await db.category.create({
    data: {
      name,
      slug,
      icon: icon || "Cog",
      color: color || "emerald",
      sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json({ category: created }, { status: 201 });
}
