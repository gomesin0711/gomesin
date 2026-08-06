import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/listings/unique-code
// Generate a unique 3-digit payment code that changes on every call.
// Uniqueness: must not collide with uniqueCode of any UNPAID listing.
// Code is NOT stored — it's ephemeral, regenerated each time.
//
// Body: { userId: string, packageType: string }
// Returns: { uniqueCode: number }
export async function POST(req: NextRequest) {
  try {
    const { userId, packageType } = await req.json();

    if (!userId || !packageType) {
      return NextResponse.json({ error: "userId dan packageType wajib" }, { status: 400 });
    }

    // Collect all uniqueCodes from listings that are still unpaid (active payments)
    const unpaidListings = await db.listing.findMany({
      where: {
        paymentStatus: "unpaid",
        uniqueCode: { not: null },
      },
      select: { uniqueCode: true },
    });
    const usedSet = new Set(unpaidListings.map((l: any) => l.uniqueCode));

    // Generate a random 3-digit code (1-999) that's not in usedSet
    const available: number[] = [];
    for (let i = 1; i <= 999; i++) {
      if (!usedSet.has(i)) available.push(i);
    }

    if (available.length === 0) {
      return NextResponse.json({ error: "Semua kode unik terpakai" }, { status: 500 });
    }

    const code = available[Math.floor(Math.random() * available.length)];

    return NextResponse.json({ uniqueCode: code });
  } catch (e: any) {
    console.error("unique-code API error:", e);
    return NextResponse.json({ error: "Gagal generate kode unik" }, { status: 500 });
  }
}
