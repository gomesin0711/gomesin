import { NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { getAdminFallbackInfo } from "@/lib/admin-fallback";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isDbAvailable()) {
    try {
      const admin = await db.user.findFirst({
        where: { role: "admin" },
        select: { id: true, name: true },
      });
      if (!admin) {
        return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ admin });
    } catch { /* fall through */ }
  }

  // Fallback
  try {
    const data = await getAdminFallbackInfo();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
