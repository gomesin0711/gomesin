import { promises as fs } from "fs";
import path from "path";
import { getPaketMap } from "@/lib/paket";

// ─── Types ───────────────────────────────────────────────────────────────────

type StoredListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  priceType: string;
  condition: string;
  brand: string | null;
  yearProduced: number | null;
  city: string;
  province: string;
  images: string[];
  specs: Record<string, string>;
  featured: boolean;
  packageType: string;
  status: string;
  paymentStatus: string;
  paymentExpiry: string | null;
  categoryId: string;
  sellerId: string;
  seller: { id: string; name: string; phone: string; city: string; avatar: string | null; joinedAt: string };
  user: { id: string; name: string; phone: string | null; email: string | null; city: string | null; logoImage: string | null; bannerImage: string | null } | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  views: number;
  violationFlag: boolean;
  uniqueCode: number | null;
  category: { id: string; name: string; slug: string; icon: string; color: string } | null;
};

// ─── File-based store (persists across warm invocations on Vercel) ────────────

const FILE_PATH = "/tmp/listings-data.json";

const globalStore = globalThis as unknown as {
  __listingsStore: Map<string, StoredListing> | undefined;
  __listingsLoaded: boolean;
};

async function loadFromFile(): Promise<Map<string, StoredListing>> {
  try {
    const data = await fs.readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(data) as StoredListing[];
    const map = new Map<string, StoredListing>();
    for (const l of parsed) {
      map.set(l.id, l);
    }
    return map;
  } catch {
    return new Map();
  }
}

async function saveToFile(map: Map<string, StoredListing>): Promise<void> {
  try {
    const arr = Array.from(map.values());
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8");
  } catch {
    // Silently fail — in-memory still works
  }
}

async function getStore(): Promise<Map<string, StoredListing>> {
  if (!globalStore.__listingsStore || !globalStore.__listingsLoaded) {
    globalStore.__listingsStore = await loadFromFile();
    globalStore.__listingsLoaded = true;
  }
  return globalStore.__listingsStore;
}

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fallbackCreateListing(data: {
  title: string;
  description: string;
  price: string | number;
  priceType?: string;
  condition?: string;
  brand?: string;
  yearProduced?: string;
  city: string;
  province: string;
  images?: string[];
  specs?: Record<string, string>;
  featured?: boolean;
  packageType?: string;
  paymentMethod?: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  categoryId?: string;
  saveAsDraft?: boolean;
  adType?: string;
  availability?: string;
}): Promise<StoredListing> {
  const store = await getStore();
  const paketMap = await getPaketMap();
  const pkgKey = data.packageType || "colek";
  const pkgDays = paketMap[pkgKey]?.duration ?? 30;

  const isDraft = data.saveAsDraft === true;
  const isPaid = !!data.paymentMethod;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + pkgDays);

  const id = generateId();
  const slugBase = (data.title || "iklan").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug = slugBase + "-" + Math.random().toString(36).slice(2, 7);

  const sellerId = "fallback-seller-" + (data.userId || "anon");

  const listing: StoredListing = {
    id,
    slug,
    title: data.title,
    description: data.description,
    price: Math.floor(Number(data.price) || 0),
    priceType: data.priceType || "fixed",
    condition: data.condition || "bekas",
    brand: data.brand || null,
    yearProduced: data.yearProduced ? parseInt(data.yearProduced, 10) : null,
    city: data.city,
    province: data.province,
    images: data.images || [],
    specs: data.specs || {},
    featured: data.featured || false,
    packageType: pkgKey,
    status: isDraft ? "draft" : "pending",
    paymentStatus: isDraft ? "unpaid" : (isPaid ? "paid" : "unpaid"),
    paymentExpiry: isPaid ? expiryDate.toISOString() : null,
    categoryId: data.categoryId || "cat-fallback",
    sellerId,
    seller: {
      id: sellerId,
      name: data.userName || "Pengguna Gomesin",
      phone: data.userPhone || "0812-0000-0000",
      city: data.city,
      avatar: null,
      joinedAt: new Date().toISOString(),
    },
    user: data.userId ? {
      id: data.userId,
      name: data.userName || "Pengguna Gomesin",
      phone: data.userPhone || null,
      email: null,
      city: data.city || null,
      logoImage: null,
      bannerImage: null,
    } : null,
    userId: data.userId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
    violationFlag: false,
    uniqueCode: null,
    category: data.categoryId ? { id: data.categoryId, name: "Kategori", slug: "kategori", icon: "package", color: "#666" } : null,
  };

  store.set(id, listing);
  await saveToFile(store);

  return listing;
}

export async function fallbackGetListingBySlug(slug: string): Promise<StoredListing | null> {
  const store = await getStore();
  for (const l of store.values()) {
    if (l.slug === slug) return l;
  }
  return null;
}

export async function fallbackGetRelatedListings(categoryId: string, excludeId: string): Promise<StoredListing[]> {
  const store = await getStore();
  const results: StoredListing[] = [];
  for (const l of store.values()) {
    if (l.categoryId === categoryId && l.id !== excludeId && l.status === "active") {
      results.push(l);
    }
  }
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results.slice(0, 6);
}

export async function fallbackUpdateListingBySlug(
  slug: string,
  data: Partial<StoredListing>
): Promise<StoredListing | null> {
  const store = await getStore();
  for (const [id, l] of store.entries()) {
    if (l.slug === slug) {
      const updated: StoredListing = {
        ...l,
        ...data,
        id: l.id,
        slug: l.slug,
        updatedAt: new Date().toISOString(),
      };
      store.set(id, updated);
      await saveToFile(store);
      return updated;
    }
  }
  return null;
}

export async function fallbackDeleteListingBySlug(slug: string): Promise<boolean> {
  const store = await getStore();
  for (const [id, l] of store.entries()) {
    if (l.slug === slug) {
      store.delete(id);
      await saveToFile(store);
      return true;
    }
  }
  return false;
}

export async function fallbackGetListingsByUserId(userId: string): Promise<StoredListing[]> {
  const store = await getStore();
  const results: StoredListing[] = [];
  for (const l of store.values()) {
    if (l.userId === userId || l.sellerId === userId) {
      results.push(l);
    }
  }
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}
