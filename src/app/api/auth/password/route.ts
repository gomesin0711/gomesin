import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";

// PATCH /api/auth/password — change user password
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, currentPassword, newPassword } = body as {
      userId?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (!userId) {
      return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });
    }
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Kata sandi lama dan baru wajib diisi." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Kata sandi baru minimal 6 karakter." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }

    // verify current password
    if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ error: "Kata sandi lama salah." }, { status: 401 });
    }

    // update with new hashed password
    const hashed = hashPassword(newPassword);
    await db.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal mengubah kata sandi: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
