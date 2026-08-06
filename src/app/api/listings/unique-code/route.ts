import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/listings/unique-code
// Generate an EPHEMERAL 3-digit payment code (1-999).
// - Changes every time (not stored in DB).
// - Checked only against unpaid listings to avoid duplicates.
// - If all 999 are used by unpaid listings, wraps around.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Body not required — code is ephemeral

    // Fetch all unique codes from UNPAID listings only.
    const unpaidListings = await db.listing.findMany({
      where: { paymentStatus: "unpaid", uniqueCode: { not: null } },
      select: { uniqueCode: true },
    });
    const usedSet = new Set(unpaidListings.map((l: any) => l.uniqueCode));

    // Build available list and pick random
    const available: number[] = [];
    for (let i = 1; i <= 999; i++) {
      if (!usedSet.has(i)) available.push(i);
    }
    const code = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : Math.floor(Math.random() * 999) + 1;

    return NextResponse.json({ uniqueCode: code });
  } catch (e: any) {
    console.error("unique-code API error:", e);
    // Fallback: random 3-digit code
    const fallback = Math.floor(Math.random() * 999) + 1;
    return NextResponse.json({ uniqueCode: fallback });
  }
}
