import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { getAdminFallbackUsers } from "@/lib/admin-fallback";

// GET: list all registered users
export async function GET() {
  if (isDbAvailable()) {
    try {
      const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
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
      return NextResponse.json({
        users: users.map((u) => ({
          ...u,
          createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
        })),
      });
    } catch { /* fall through */ }
  }

  // Fallback
  try {
    const data = await getAdminFallbackUsers();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: delete user by id
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  if (isDbAvailable()) {
    try {
      const user = await db.user.findUnique({ where: { id } });
      if (!user) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
      if (user.role === "admin" || user.role === "superadmin") {
        return NextResponse.json({ error: "Tidak dapat menghapus akun admin" }, { status: 403 });
      }
      await db.message.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
      await db.listing.deleteMany({ where: { userId: id } });
      await db.user.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ error: "Gagal menghapus user: " + (e?.message || "unknown") }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "DB tidak tersedia" }, { status: 503 });
}