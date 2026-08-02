import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (isDbAvailable()) {
    try {
      const updated = await db.category.update({ where: { id }, data: body });
      return NextResponse.json({ category: updated });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ error: "DB tidak tersedia" }, { status: 503 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (isDbAvailable()) {
    try {
      await db.category.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch { /* fall through */ }
  }

  return NextResponse.json({ error: "DB tidak tersedia" }, { status: 503 });
}
