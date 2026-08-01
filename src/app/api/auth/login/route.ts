import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { fallbackFindUser, fallbackFindUserByPhone } from "@/lib/auth-fallback";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, phone } = body as {
    email?: string;
    password?: string;
    phone?: string;
  };

  // Phone-based login (after OTP verified)
  if (phone && !email) {
    const phoneNorm = phone.replace(/[^0-9]/g, "");
    let cleanPhone = phoneNorm;
    if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.slice(1);

    try {
      const user = await db.user.findFirst({
        where: { phone: { contains: cleanPhone.slice(-10) } },
      });
      if (!user) {
        // Try fallback
        const fallback = await fallbackFindUserByPhone(cleanPhone);
        if (!fallback.ok) {
          return NextResponse.json({ error: "Nomor WhatsApp tidak terdaftar. Silakan daftar dulu." }, { status: 404 });
        }
        return NextResponse.json({ user: fallback.user });
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
          createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
        },
      });
    } catch {
      const fallback = await fallbackFindUserByPhone(cleanPhone);
      if (!fallback.ok) {
        return NextResponse.json({ error: "Nomor WhatsApp tidak terdaftar. Silakan daftar dulu." }, { status: 404 });
      }
      return NextResponse.json({ user: fallback.user });
    }
  }

  // Email + password login (original)
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
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
      },
    });
  } catch {
    // SQLite unavailable — use fallback
  }

  const result = await fallbackFindUser(emailNorm, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ user: result.user });
}
