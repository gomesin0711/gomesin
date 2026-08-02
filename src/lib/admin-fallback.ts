import seedData from "@/lib/seed-data.json";
import { getAuthStore, SafeUser } from "@/lib/auth-fallback";
import { getFallbackPakets } from "@/lib/fallback-data";
import { getAllFallbackListings } from "@/lib/listing-fallback";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normalizeListing(raw: any): any {
  return {
    ...raw,
    images: Array.isArray(raw.images) ? raw.images : [],
    specs:
      typeof raw.specs === "string"
        ? (() => {
            try {
              return JSON.parse(raw.specs);
            } catch {
              return {};
            }
          })()
        : raw.specs || {},
    price: typeof raw.price === "number" ? raw.price : Number(raw.price),
    createdAt:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : raw.createdAt,
    seller: raw.seller
      ? {
          ...raw.seller,
          joinedAt:
            raw.seller.joinedAt instanceof Date
              ? raw.seller.joinedAt.toISOString()
              : raw.seller.joinedAt,
        }
      : raw.seller,
  };
}

function paketPrice(pkgType: string): number {
  const pakets = getFallbackPakets();
  const map: Record<string, number> = {};
  for (const p of pakets) {
    map[p.type || p.name?.toLowerCase() || ""] = Number(p.price) || 0;
  }
  return map[pkgType] ?? 0;
}

// ─── getAdminFallbackStats ────────────────────────────────────────────────────
// Computes dashboard stats from seed data + auth store

export async function getAdminFallbackStats() {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  const dow = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - dow);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Users from auth-fallback store
  const authStore = await getAuthStore();
  const allUsers = Array.from(authStore.values());
  const admins = allUsers.filter((u) => u.role === "admin");

  const usersToday = allUsers.filter((u) => new Date(u.createdAt) >= startOfToday).length;
  const usersWeek = allUsers.filter((u) => new Date(u.createdAt) >= startOfWeek).length;
  const usersMonth = allUsers.filter((u) => new Date(u.createdAt) >= startOfMonth).length;

  // Listings from seed data + file-based store
  const seedListings = seedData.listings;
  let fbListings: any[] = [];
  try {
    fbListings = await getAllFallbackListings();
  } catch { /* ignore */ }
  // Merge: file-based overrides seed (by id), plus any new listings
  const listingMap = new Map<string, any>();
  for (const l of seedListings) listingMap.set(l.id, normalizeListing(l));
  for (const l of fbListings) listingMap.set(l.id, normalizeListing(l));
  const allListings = Array.from(listingMap.values());
  const listingsToday = allListings.filter((l) => new Date(l.createdAt) >= startOfToday).length;
  const listingsWeek = allListings.filter((l) => new Date(l.createdAt) >= startOfWeek).length;
  const listingsMonth = allListings.filter((l) => new Date(l.createdAt) >= startOfMonth).length;

  // Omzet from listings
  const omzetToday = allListings
    .filter((l) => new Date(l.createdAt) >= startOfToday)
    .reduce((s, l) => s + paketPrice(l.packageType || "colek"), 0);
  const omzetWeek = allListings
    .filter((l) => new Date(l.createdAt) >= startOfWeek)
    .reduce((s, l) => s + paketPrice(l.packageType || "colek"), 0);
  const omzetMonth = allListings
    .filter((l) => new Date(l.createdAt) >= startOfMonth)
    .reduce((s, l) => s + paketPrice(l.packageType || "colek"), 0);
  const omzetAll = allListings.reduce((s, l) => s + paketPrice(l.packageType || "colek"), 0);

  // Top categories
  const catCountMap: Record<string, number> = {};
  for (const l of allListings) {
    if (l.categoryId) catCountMap[l.categoryId] = (catCountMap[l.categoryId] || 0) + 1;
  }
  const topCategories = Object.entries(catCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([catId, count]) => {
      const cat = seedData.categories.find((c) => c.id === catId);
      return { name: cat?.name || "—", count };
    });

  // Last 7 days chart
  const last7Days: { date: string; label: string; omzet: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dStart = new Date(startOfToday);
    dStart.setDate(dStart.getDate() - i);
    const dEnd = new Date(dStart);
    dEnd.setDate(dEnd.getDate() + 1);
    const dayListings = allListings.filter((l) => {
      const d = new Date(l.createdAt);
      return d >= dStart && d < dEnd;
    });
    const label = dStart.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
    last7Days.push({
      date: dStart.toISOString().slice(0, 10),
      label,
      omzet: dayListings.reduce((s, l) => s + paketPrice(l.packageType || "colek"), 0),
      count: dayListings.length,
    });
  }

  return {
    totals: {
      users: allUsers.length,
      listings: allListings.length,
      admins: admins.length,
      omzetAll,
    },
    users: { today: usersToday, week: usersWeek, month: usersMonth },
    listings: { today: listingsToday, week: listingsWeek, month: listingsMonth },
    omzet: { today: omzetToday, week: omzetWeek, month: omzetMonth, all: omzetAll },
    topCategories,
    last7Days,
  };
}

// ─── getAdminFallbackSellers ──────────────────────────────────────────────────
// Returns sellers derived from seed listing data

export async function getAdminFallbackSellers() {
  const sellerMap = new Map<string, any>();
  for (const l of seedData.listings) {
    const s = l.seller;
    if (!s || sellerMap.has(s.id)) continue;
    sellerMap.set(s.id, {
      id: s.id,
      name: s.name,
      city: s.city || null,
      avatar: s.avatar || null,
      verified: s.verified ?? false,
      joinedAt: s.joinedAt instanceof Date ? s.joinedAt.toISOString() : s.joinedAt,
      listingCount: 0,
    });
  }
  // Count listings per seller
  for (const l of seedData.listings) {
    if (l.seller?.id && sellerMap.has(l.seller.id)) {
      sellerMap.get(l.seller.id).listingCount++;
    }
  }
  return { sellers: Array.from(sellerMap.values()).sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()) };
}

// ─── getAdminFallbackCategories ───────────────────────────────────────────────

export async function getAdminFallbackCategories() {
  const countMap: Record<string, number> = {};
  for (const l of seedData.listings) {
    if (l.categoryId) countMap[l.categoryId] = (countMap[l.categoryId] || 0) + 1;
  }
  const categories = seedData.categories
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((c) => ({ ...c, listingCount: countMap[c.id] ?? 0 }));
  return { categories };
}

// ─── getAdminFallbackUsers ────────────────────────────────────────────────────

export async function getAdminFallbackUsers() {
  const authStore = await getAuthStore();
  const users = Array.from(authStore.values())
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      city: u.city,
      role: u.role,
      createdAt: u.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { users };
}

// ─── getAdminFallbackMonthlyReport ────────────────────────────────────────────

export async function getAdminFallbackMonthlyReport(year?: number) {
  const now = new Date();
  const y = year || now.getFullYear();
  const startYear = new Date(y, 0, 1);
  const endYear = new Date(y + 1, 0, 1);

  const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const months = MONTHS_ID.map((label, idx) => ({
    month: idx + 1,
    label,
    omzet: 0,
    listings: 0,
    users: 0,
    byPackage: {} as Record<string, { count: number; omzet: number }>,
    listingIds: [] as string[],
  }));

  for (const l of seedData.listings) {
    const d = new Date(l.createdAt);
    if (d < startYear || d >= endYear) continue;
    const m = d.getMonth();
    const pkg = l.packageType || "colek";
    const fee = paketPrice(pkg);
    months[m].omzet += fee;
    months[m].listings += 1;
    months[m].listingIds.push(l.id);
    if (!months[m].byPackage[pkg]) months[m].byPackage[pkg] = { count: 0, omzet: 0 };
    months[m].byPackage[pkg].count += 1;
    months[m].byPackage[pkg].omzet += fee;
  }

  // Users from auth store
  const authStore = await getAuthStore();
  for (const u of authStore.values()) {
    const d = new Date(u.createdAt);
    if (d < startYear || d >= endYear) continue;
    const m = d.getMonth();
    months[m].users += 1;
  }

  const yearTotal = {
    omzet: months.reduce((s, m) => s + m.omzet, 0),
    listings: months.reduce((s, m) => s + m.listings, 0),
    users: months.reduce((s, m) => s + m.users, 0),
  };

  // Years with data
  const years = new Set<number>();
  years.add(y);
  for (const l of seedData.listings) years.add(new Date(l.createdAt).getFullYear());
  for (const u of authStore.values()) years.add(new Date(u.createdAt).getFullYear());
  const yearsWithData = [...years].sort((a, b) => b - a);

  // Listings by month
  const listingsByMonth: Record<number, any[]> = {};
  for (const l of seedData.listings) {
    const d = new Date(l.createdAt);
    if (d < startYear || d >= endYear) continue;
    const m = d.getMonth() + 1;
    if (!listingsByMonth[m]) listingsByMonth[m] = [];
    listingsByMonth[m].push({
      id: l.id,
      title: l.title,
      packageType: l.packageType,
      price: Number(l.price),
      city: l.city,
      status: l.status,
      createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
    });
  }

  const usersByMonth: Record<number, any[]> = {};
  for (const u of authStore.values()) {
    const d = new Date(u.createdAt);
    if (d < startYear || d >= endYear) continue;
    const m = d.getMonth() + 1;
    if (!usersByMonth[m]) usersByMonth[m] = [];
    usersByMonth[m].push({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    });
  }

  return { year: y, years: yearsWithData, months, yearTotal, listingsByMonth, usersByMonth };
}

// ─── getAdminFallbackInfo ─────────────────────────────────────────────────────

export async function getAdminFallbackInfo() {
  const authStore = await getAuthStore();
  for (const u of authStore.values()) {
    if (u.role === "admin") {
      return { admin: { id: u.id, name: u.name } };
    }
  }
  // Fallback: return seed admin
  return { admin: { id: "cms1trinv0000pzao4vy44or8", name: "Admin Gomesin" } };
}
