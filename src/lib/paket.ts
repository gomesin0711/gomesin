import { db } from "@/lib/db";

export type PaketData = {
  key: string;
  name: string;
  price: number;
  duration: number; // days
  features: string[];
  active: boolean;
};

let cache: PaketData[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

export async function getPakets(): Promise<PaketData[]> {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;
  const rows = await db.paket.findMany({ orderBy: { sortOrder: "asc" } });
  cache = rows.map((p) => ({
    key: p.key,
    name: p.name,
    price: p.price,
    duration: p.duration,
    features: JSON.parse(p.features),
    active: p.active,
  }));
  cacheTime = now;
  return cache;
}

export async function getPaketMap(): Promise<Record<string, { price: number; duration: number }>> {
  const pakets = await getPakets();
  const map: Record<string, { price: number; duration: number }> = {};
  for (const p of pakets) {
    map[p.key] = { price: p.price, duration: p.duration };
  }
  return map;
}
