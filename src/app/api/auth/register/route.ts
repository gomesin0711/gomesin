import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, city } = body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      city?: string;
    };

    const emailNorm = (email ?? "").trim().toLowerCase();
    const nameTrim = (name ?? "").trim();

    if (!nameTrim || !emailNorm || !password) {
      return NextResponse.json(
        { error: "Nama, email, dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan masuk." },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        name: nameTrim,
        email: emailNorm,
        password: hashPassword(password),
        phone: phone?.trim() || null,
        city: city?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal mendaftar: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
