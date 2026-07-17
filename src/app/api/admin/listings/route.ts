import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseListing } from "@/lib/types";

// GET all listings (admin, include inactive/violation/unpaid)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const where: any = {};
  if (status) where.status = status;
  const listings = await db.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { category: true, seller: true },
  });
  return NextResponse.json({ listings: listings.map(parseListing) });
}

// PATCH: update status (approve/reject/sold) OR toggle violation
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, violationFlag, violationReason } = body;
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });

  const data: any = {};
  if (status) {
    data.status = status;
    // when admin approves (status=active), also set paymentStatus=paid so it shows on beranda
    if (status === "active") data.paymentStatus = "paid";
  }
  if (violationFlag !== undefined) {
    data.violationFlag = violationFlag;
    data.violationReason = violationFlag ? (violationReason || "Melanggar ketentuan") : null;
    // if violation, also set status to rejected
    if (violationFlag) data.status = "rejected";
    else data.status = "active"; // restore when violation cleared
  }

  const updated = await db.listing.update({ where: { id }, data });
  return NextResponse.json({ listing: parseListing(updated) });
}

// DELETE listing
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });
  await db.listing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
