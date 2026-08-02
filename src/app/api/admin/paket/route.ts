import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { getFallbackPakets } from "@/lib/fallback-data";

export async function GET() {
  try {
  if (isDbAvailable()) {
    try {
      const pakets = await db.paket.findMany({ orderBy: { sortOrder: "asc" } });
      return NextResponse.json({
        pakets: pakets.map((p) => ({
          ...p,
          features: JSON.parse(p.features),
        })),
      });
    } catch { /* fallback */ }
  }

  const fallback = getFallbackPakets().map((p: any) => ({
    ...p,
    features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features || [],
  }));
  return NextResponse.json({ pakets: fallback });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, price, originalPrice, duration, features, active } = body;
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  if (!isDbAvailable()) {
    return NextResponse.json({ error: "DB tidak tersedia" }, { status: 503 });
  }

  const updated = await db.paket.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(originalPrice !== undefined && { originalPrice: Number(originalPrice) }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(features !== undefined && { features: JSON.stringify(features) }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json({
    paket: { ...updated, features: JSON.parse(updated.features) },
  });
}