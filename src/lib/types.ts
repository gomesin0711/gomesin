// Shared types & helpers for Gomesin
import type { Lang } from "./i18n";
import { translations, formatT } from "./i18n";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
};

export type Seller = {
  id: string;
  name: string;
  phone: string;
  avatar: string | null;
  city: string;
  province: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  joinedAt: string;
};

export type Listing = {
  id: string;
  title: string;
  titleEn?: string | null;
  titleZh?: string | null;
  slug: string;
  description: string;
  descEn?: string | null;
  descZh?: string | null;
  price: number;
  priceType: string;
  condition: string;
  brand: string | null;
  yearProduced: number | null;
  city: string;
  province: string;
  images: string[];
  specs: Record<string, string>;
  specsEn?: string | null;
  specsZh?: string | null;
  featured: boolean;
  views: number;
  status: string;
  packageType?: string;
  createdAt: string;
  category: Category;
  seller: Seller;
};

export function formatRupiah(n: number): string {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num >= 1_000_000_000) {
    const v = num / 1_000_000_000;
    return "Rp " + (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(/\.0$/, "")) + " M";
  }
  if (num >= 1_000_000) {
    const v = num / 1_000_000;
    return "Rp " + (Number.isInteger(v) ? v.toString() : v.toFixed(1).replace(/\.0$/, "")) + " jt";
  }
  if (num >= 1_000) {
    const v = num / 1_000;
    return "Rp " + (Number.isInteger(v) ? v.toString() : v.toFixed(0)) + " rb";
  }
  return "Rp " + num.toLocaleString("de-DE");
}

export function formatRupiahFull(n: number): string {
  // Format with dot thousands separator: 50012 → "Rp 50.012"
  const num = typeof n === "bigint" ? Number(n) : n;
  return "Rp " + num.toLocaleString("de-DE");
}

export function timeAgo(iso: string, lang: Lang = "id"): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const min = Math.floor(diff / 60000);
  const t = translations[lang];
  if (min < 60) return min <= 1 ? t.justNow : formatT(t.minAgo, { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return formatT(t.hrAgo, { n: hr });
  const day = Math.floor(hr / 24);
  if (day < 30) return formatT(t.dayAgo, { n: day });
  const mo = Math.floor(day / 30);
  if (mo < 12) return formatT(t.monthAgo, { n: mo });
  return formatT(t.yearAgo, { n: Math.floor(mo / 12) });
}

export function parseListing(raw: any): Listing {
  return {
    ...raw,
    price: typeof raw.price === "bigint" ? Number(raw.price) : raw.price,
    images: raw.images ? (typeof raw.images === "string" ? JSON.parse(raw.images) : raw.images) : [],
    specs: raw.specs ? (typeof raw.specs === "string" ? JSON.parse(raw.specs) : raw.specs) : {},
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    joinedAt: raw.seller?.joinedAt instanceof Date ? raw.seller.joinedAt.toISOString() : raw.seller?.joinedAt,
  };
}

export const PROVINCES = [
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Banten",
  "DI Yogyakarta",
  "Sumatera Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Riau",
  "Jambi",
  "Lampung",
  "Kalimantan Timur",
  "Kalimantan Barat",
  "Kalimantan Selatan",
  "Sulawesi Selatan",
  "Sulawesi Utara",
  "Bali",
  "NTB",
  "NTT",
];

export const SORT_OPTIONS = [
  { value: "newest", labelId: "Terbaru", labelEn: "Newest", labelZh: "最新" },
  { value: "price-asc", labelId: "Harga Termurah", labelEn: "Lowest Price", labelZh: "最低价" },
  { value: "price-desc", labelId: "Harga Tertinggi", labelEn: "Highest Price", labelZh: "最高价" },
  { value: "popular", labelId: "Paling Populer", labelEn: "Most Popular", labelZh: "最受欢迎" },
];

export function sortLabel(opt: { labelId: string; labelEn: string; labelZh?: string }, lang: string): string {
  if (lang === "en") return opt.labelEn;
  if (lang === "zh") return opt.labelZh || opt.labelEn;
  return opt.labelId;
}
