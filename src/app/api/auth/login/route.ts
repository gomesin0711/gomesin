import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    const emailNorm = (email ?? "").trim().toLowerCase();

    if (!emailNorm || !password) {
      return NextResponse.json(
        { error: "Email dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

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
  } catch (e: any) {
    const msg = e?.message || "";
    if (msg.includes("Unable to open the database") || msg.includes("database file") || msg.includes("DATABASE_URL")) {
      return NextResponse.json(
        { error: "Login belum tersedia di versi online. Gunakan aplikasi lokal untuk masuk." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Gagal masuk: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
