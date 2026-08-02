import { db, isDbAvailable } from "@/lib/db";
import { getFallbackPakets } from "@/lib/fallback-data";

export type PaketData = {
  key: string;
  name: string;
  price: number;
  duration: number; // days
  features: string[];
  maxPhotos: number;
  active: boolean;
};

let cache: PaketData[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

function toPaketData(p: any): PaketData {
  return {
    key: p.key,
    name: p.name,
    price: p.price,
    duration: p.duration,
    features: typeof p.features === "string" ? JSON.parse(p.features) : p.features || [],
    maxPhotos: p.maxPhotos ?? 5,
    active: p.active,
  };
}

export async function getPakets(): Promise<PaketData[]> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  if (!isDbAvailable()) {
    const fallback = (getFallbackPakets() || []).map(toPaketData);
    cache = fallback;
    cacheTime = now;
    return fallback;
  }

  try {
    const rows = await db.paket.findMany({ orderBy: { sortOrder: "asc" } });
    cache = rows.map(toPaketData);
    cacheTime = now;
    return cache;
  } catch {
    const fallback = (getFallbackPakets() || []).map(toPaketData);
    cache = fallback;
    cacheTime = now;
    return fallback;
  }
}

export async function getPaketMap(): Promise<Record<string, { price: number; duration: number }>> {
  const pakets = await getPakets();
  const map: Record<string, { price: number; duration: number }> = {};
  for (const p of pakets) {
    map[p.key] = { price: p.price, duration: p.duration };
  }
  return map;
}
