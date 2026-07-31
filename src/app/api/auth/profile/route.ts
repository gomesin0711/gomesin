import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/auth/profile?userId=<id> — fetch latest user profile (for auto-refresh on mount)
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "User ID wajib" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
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
    return NextResponse.json(
      { error: "Gagal: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/profile — update user profile (name, phone, city)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, phone, city, company, address, bannerImage, logoImage } = body as {
      userId?: string;
      name?: string;
      phone?: string;
      city?: string;
      company?: string;
      address?: string;
      bannerImage?: string;
      logoImage?: string;
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

    const data: { name?: string; phone?: string | null; city?: string | null; company?: string | null; address?: string | null; bannerImage?: string | null; logoImage?: string | null } = {};
    if (name && name.trim()) data.name = name.trim();
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (city !== undefined) data.city = city?.trim() || null;
    if (company !== undefined) data.company = company?.trim() || null;
    if (address !== undefined) data.address = address?.trim() || null;
    if (bannerImage !== undefined) data.bannerImage = bannerImage?.trim() || null;
    if (logoImage !== undefined) data.logoImage = logoImage?.trim() || null;

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
        company: updated.company,
        address: updated.address,
        bannerImage: updated.bannerImage,
        logoImage: updated.logoImage,
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
