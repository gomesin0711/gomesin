import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { fallbackFindUser } from "@/lib/auth-fallback";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  }

  const emailNorm = email.trim().toLowerCase();

  // Try DB first
  if (isDbAvailable()) {
    try {
      const user = await db.user.findFirst({ where: { email: emailNorm } });
      return NextResponse.json({ exists: !!user });
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: check file-based store
  try {
    const store = await import("@/lib/auth-fallback");
    const { getAuthStore } = store;
    const authStore = await getAuthStore();
    return NextResponse.json({ exists: authStore.has(emailNorm) });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
