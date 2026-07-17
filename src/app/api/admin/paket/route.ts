import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const pakets = await db.paket.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({
    pakets: pakets.map((p) => ({
      ...p,
      features: JSON.parse(p.features),
    })),
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, price, duration, features, active } = body;
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const updated = await db.paket.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(duration !== undefined && { duration: Number(duration) }),
      ...(features !== undefined && { features: JSON.stringify(features) }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json({
    paket: { ...updated, features: JSON.parse(updated.features) },
  });
}
