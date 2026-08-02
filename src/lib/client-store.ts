/**
 * Client-side persistent store for Vercel deployment.
 * 
 * On Vercel serverless, /tmp/ is ephemeral — user data and listings
 * are lost between function invocations. This module stores critical
 * data in the browser's localStorage as a fallback so the app
 * remains functional even when server-side storage is unavailable.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type StoredCredential = {
  id: string;
  name: string;
  email: string;
  password: string; // plain text (only stored locally, never sent to server)
  phone: string | null;
  city: string | null;
  company: string | null;
  address: string | null;
  bannerImage: string | null;
  logoImage: string | null;
  role: string;
  createdAt: string;
};

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
  seller: {
    id: string;
    name: string;
    phone: string;
    city: string;
    avatar: string | null;
    joinedAt: string;
  };
  user: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    logoImage: string | null;
    bannerImage: string | null;
  } | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  views: number;
  violationFlag: boolean;
  uniqueCode: number | null;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  } | null;
};

// ─── Storage keys ─────────────────────────────────────────────────────────────

const CREDS_KEY = "gomesin-credentials";
const LISTINGS_KEY = "gomesin-my-listings";

// ─── Generic helpers ──────────────────────────────────────────────────────────

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ─── Credential helpers (auth persistence) ───────────────────────────────────

/** Get all stored credentials (array, one per registered account) */
export function getClientCredentials(): StoredCredential[] {
  return readJSON<StoredCredential[]>(CREDS_KEY, []);
}

/** Save a credential after successful registration */
export function saveClientCredential(user: {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  city?: string | null;
  company?: string | null;
  address?: string | null;
  bannerImage?: string | null;
  logoImage?: string | null;
  role?: string;
  createdAt?: string;
}): void {
  const creds = getClientCredentials();
  const emailKey = user.email.toLowerCase().trim();
  // Remove existing entry for same email (update)
  const filtered = creds.filter((c) => c.email.toLowerCase() !== emailKey);
  const entry: StoredCredential = {
    id: user.id,
    name: user.name,
    email: emailKey,
    password: user.password, // store plain password for client-side verification
    phone: user.phone ?? null,
    city: user.city ?? null,
    company: user.company ?? null,
    address: user.address ?? null,
    bannerImage: user.bannerImage ?? null,
    logoImage: user.logoImage ?? null,
    role: user.role || "user",
    createdAt: user.createdAt || new Date().toISOString(),
  };
  filtered.push(entry);
  writeJSON(CREDS_KEY, filtered);
}

/** Update existing credential (e.g., after profile update) */
export function updateClientCredential(
  userId: string,
  data: Partial<Omit<StoredCredential, "id" | "email" | "password">>
): void {
  const creds = getClientCredentials();
  let changed = false;
  for (const c of creds) {
    if (c.id === userId) {
      Object.assign(c, data);
      changed = true;
      break;
    }
  }
  if (changed) writeJSON(CREDS_KEY, creds);
}

/** Try to verify login credentials client-side (fallback when server fails) */
export function verifyClientCredential(
  email: string,
  password: string
): Omit<StoredCredential, "password"> | null {
  const creds = getClientCredentials();
  const emailKey = email.toLowerCase().trim();
  for (const c of creds) {
    if (c.email === emailKey && c.password === password) {
      // Return user data without password
      const { password: _, ...safe } = c;
      return safe;
    }
  }
  return null;
}

/** Remove a credential (e.g., account deletion) */
export function removeClientCredential(userId: string): void {
  const creds = getClientCredentials().filter((c) => c.id !== userId);
  writeJSON(CREDS_KEY, creds);
}

// ─── Listing helpers (listing persistence) ────────────────────────────────────

/** Get all locally stored listings */
export function getClientListings(): StoredListing[] {
  return readJSON<StoredListing[]>(LISTINGS_KEY, []);
}

/** Save a listing after successful creation */
export function saveClientListing(listing: any): void {
  const listings = getClientListings();
  // Don't duplicate
  const idx = listings.findIndex((l) => l.id === listing.id);
  if (idx >= 0) {
    listings[idx] = listing;
  } else {
    listings.unshift(listing); // newest first
  }
  writeJSON(LISTINGS_KEY, listings);
}

/** Remove a locally stored listing */
export function removeClientListing(listingId: string): void {
  const listings = getClientListings().filter((l) => l.id !== listingId);
  writeJSON(LISTINGS_KEY, listings);
}

/** Update a locally stored listing */
export function updateClientListing(
  listingId: string,
  data: Partial<StoredListing>
): void {
  const listings = getClientListings();
  for (const l of listings) {
    if (l.id === listingId) {
      Object.assign(l, data, { updatedAt: new Date().toISOString() });
      break;
    }
  }
  writeJSON(LISTINGS_KEY, listings);
}

/** Get locally stored listings for a specific user */
export function getClientListingsByUserId(userId: string): StoredListing[] {
  return getClientListings().filter(
    (l) => l.userId === userId || l.sellerId === userId
  );
}

/** Merge server listings with local listings (dedup by id) */
export function mergeListings(
  serverListings: any[],
  userId: string
): any[] {
  const localListings = getClientListingsByUserId(userId);
  if (localListings.length === 0) return serverListings;

  const serverIds = new Set(serverListings.map((l: any) => l.id));
  const merged = [...serverListings];
  // Add local listings that aren't on the server
  for (const local of localListings) {
    if (!serverIds.has(local.id)) {
      merged.push(local);
    }
  }
  // Sort by creation date descending
  merged.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return merged;
}
