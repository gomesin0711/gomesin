import { NextRequest, NextResponse } from "next/server";
import { db, isDbAvailable } from "@/lib/db";
import { getPaketMap } from "@/lib/paket";
import { getAdminFallbackMonthlyReport } from "@/lib/admin-fallback";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

  if (isDbAvailable()) {
    try {
  const startYear = new Date(year, 0, 1);
  const endYear = new Date(year + 1, 0, 1);

  const paketMap = await getPaketMap();
  const adFee = (pkg: string) => paketMap[pkg]?.price ?? 0;

  const [listings, users] = await Promise.all([
    db.listing.findMany({
      where: { createdAt: { gte: startYear, lt: endYear } },
      select: { id: true, packageType: true, createdAt: true, status: true, title: true, price: true, city: true },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findMany({
      where: { createdAt: { gte: startYear, lt: endYear } },
      select: { id: true, name: true, email: true, createdAt: true, role: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const months = MONTHS_ID.map((label, idx) => ({
    month: idx + 1, label, omzet: 0, listings: 0, users: 0,
    byPackage: {} as Record<string, { count: number; omzet: number }>,
    listingIds: [] as string[],
  }));

  for (const l of listings) {
    const m = new Date(l.createdAt).getMonth();
    const pkg = l.packageType || "colek";
    const fee = adFee(pkg);
    months[m].omzet += fee;
    months[m].listings += 1;
    months[m].listingIds.push(l.id);
    if (!months[m].byPackage[pkg]) months[m].byPackage[pkg] = { count: 0, omzet: 0 };
    months[m].byPackage[pkg].count += 1;
    months[m].byPackage[pkg].omzet += fee;
  }

  for (const u of users) {
    const m = new Date(u.createdAt).getMonth();
    months[m].users += 1;
  }

  const yearTotal = {
    omzet: months.reduce((s, m) => s + m.omzet, 0),
    listings: months.reduce((s, m) => s + m.listings, 0),
    users: months.reduce((s, m) => s + m.users, 0),
  };

  const allListings = await db.listing.findMany({ select: { createdAt: true } });
  const yearsWithData = [...new Set(allListings.map((l) => new Date(l.createdAt).getFullYear()))].sort((a, b) => b - a);
  if (!yearsWithData.includes(now.getFullYear())) yearsWithData.unshift(now.getFullYear());

  return NextResponse.json({
    year, years: yearsWithData, months, yearTotal,
    listingsByMonth: months.reduce((acc, m) => {
      acc[m.month] = listings
        .filter((l) => new Date(l.createdAt).getMonth() + 1 === m.month)
        .map((l) => ({
          id: l.id, title: l.title, packageType: l.packageType,
          price: Number(l.price), city: l.city, status: l.status,
          createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt).toISOString(),
        }));
      return acc;
    }, {} as Record<number, any[]>),
    usersByMonth: months.reduce((acc, m) => {
      acc[m.month] = users
        .filter((u) => new Date(u.createdAt).getMonth() + 1 === m.month)
        .map((u) => ({
          id: u.id, name: u.name, email: u.email, role: u.role,
          createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date(u.createdAt).toISOString(),
        }));
      return acc;
    }, {} as Record<number, any[]>),
  });
    } catch { /* fall through to fallback */ }
  }

  // Fallback
  try {
    const data = await getAdminFallbackMonthlyReport(year);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
