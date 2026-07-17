import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/auth/profile — update user profile (name, phone, city)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, phone, city } = body as {
      userId?: string;
      name?: string;
      phone?: string;
      city?: string;
    };

    if (!userId) {
      return NextResponse.json(
        { error: "User ID wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 }
      );
    }

    const data: { name?: string; phone?: string | null; city?: string | null } = {};
    if (name && name.trim()) data.name = name.trim();
    if (phone !== undefined) data.phone = phone.trim() || null;
    if (city !== undefined) data.city = city.trim() || null;

    const updated = await db.user.update({
      where: { id: userId },
      data,
    });

    // Sync: if phone or name was updated, also update the seller records
    // owned by this user so listing detail shows the latest info.
    if (data.phone !== undefined || data.name) {
      const sellerUpdate: { phone?: string | null; name?: string } = {};
      if (data.phone !== undefined) sellerUpdate.phone = data.phone;
      if (data.name) sellerUpdate.name = data.name;
      // Find sellers whose phone matches the OLD phone or name matches
      // (sellers were created with user's name + phone at ad-post time)
      await db.seller.updateMany({
        where: { listings: { some: { userId } } },
        data: sellerUpdate,
      });
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        city: updated.city,
        role: updated.role,
        createdAt:
          updated.createdAt instanceof Date
            ? updated.createdAt.toISOString()
            : updated.createdAt,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal memperbarui profil: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
