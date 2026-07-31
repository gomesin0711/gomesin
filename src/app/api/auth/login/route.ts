import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { fallbackFindUser } from "@/lib/auth-fallback";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body as { email?: string; password?: string };

  const emailNorm = (email ?? "").trim().toLowerCase();

  if (!emailNorm || !password) {
    return NextResponse.json(
      { error: "Email dan kata sandi wajib diisi." },
      { status: 400 }
    );
  }

  // Try SQLite/Prisma first
  try {
    const user = await db.user.findUnique({ where: { email: emailNorm } });
    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "Email atau kata sandi salah." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        company: user.company,
        address: user.address,
        bannerImage: user.bannerImage,
        logoImage: user.logoImage,
        role: user.role,
        createdAt:
          user.createdAt instanceof Date
            ? user.createdAt.toISOString()
            : user.createdAt,
      },
    });
  } catch {
    // SQLite unavailable (e.g. Vercel serverless) — use fallback
  }

  // Fallback: in-memory + /tmp file store
  const result = await fallbackFindUser(emailNorm, password);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ user: result.user });
}
