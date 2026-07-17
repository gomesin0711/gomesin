"use client";

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { useLang, translations as i18nTranslations, categoryName } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/ui/button";
import { ListingCard, ListingCardSkeleton } from "../listing-card";
import { ListingRow, ListingRowSkeleton } from "../listing-row";
import { CategoryIcon } from "../category-icon";
import { CategorySidebar } from "../category-sidebar";
import { AdBanner } from "../ad-banner";
import {
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Clock,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Zap,
  Wrench,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type Cat = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  listingCount: number;
};
type Listing = any;

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fail " + url);
  return res.json();
}

type ViewMode = "grid" | "table";

function ViewToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-border bg-background">
      <button
        type="button"
        onClick={() => setViewMode("grid")}
        aria-label="Tampilan grid"
        aria-pressed={viewMode === "grid"}
        className={cn(
          "grid size-8 place-items-center transition",
          viewMode === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-accent"
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode("table")}
        aria-label="Tampilan tabel"
        aria-pressed={viewMode === "table"}
        className={cn(
          "grid size-8 place-items-center border-l border-border transition",
          viewMode === "table"
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-accent"
        )}
      >
        <List className="size-4" />
      </button>
    </div>
  );
}

function ListingSection({
  listings,
  loading,
  viewMode,
  skeletonCount = 8,
}: {
  listings: Listing[];
  loading: boolean;
  viewMode: ViewMode;
  skeletonCount?: number;
}) {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  if (loading) {
    return viewMode === "grid" ? (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    ) : (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
              <th className="p-2">{tr("thMachine")}</th>
              <th className="p-2">{tr("thDetail")}</th>
              <th className="hidden p-2 text-right sm:table-cell">{tr("thPrice")}</th>
              <th className="p-2 text-right">{tr("thTime")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ListingRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (listings.length === 0) return null;
  return viewMode === "grid" ? (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
            <th className="p-2">{tr("thMachine")}</th>
            <th className="p-2">{tr("thDetail")}</th>
            <th className="hidden p-2 text-right sm:table-cell">{tr("thPrice")}</th>
            <th className="p-2 text-right">{tr("thTime")}</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <ListingRow key={l.id} listing={l} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Reusable horizontal carousel section with arrows + dots + autoplay (10s)
function CarouselSection({
  listings,
  loading,
  cardWidth = "min(580px, 80vw)",
}: {
  listings: Listing[];
  loading: boolean;
  cardWidth?: string;
}) {
  const goToDetail = useStore((s) => s.goToDetail);
  const carouselRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = () => {
    const c = carouselRef.current;
    if (!c || !listings.length) return;
    const cardW = c.children[0]?.getBoundingClientRect().width || 580;
    const gap = 12;
    const idx = Math.round(c.scrollLeft / (cardW + gap));
    setActiveIdx(Math.max(0, Math.min(idx, listings.length - 1)));
  };

  const scrollBy = (dir: "left" | "right") => {
    const c = carouselRef.current;
    if (!c) return;
    const cardW = c.children[0]?.getBoundingClientRect().width || 580;
    const gap = 12;
    c.scrollBy({ left: (cardW + gap) * (dir === "left" ? -1 : 1), behavior: "smooth" });
  };

  const scrollTo = (idx: number) => {
    const c = carouselRef.current;
    if (!c) return;
    const card = c.children[idx] as HTMLElement | undefined;
    if (card) c.scrollLeft = card.offsetLeft - c.offsetLeft;
  };

  // Autoplay disabled per user request — manual navigation only (arrows/dots)

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0" style={{ width: cardWidth }}>
            <ListingCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-10 text-center text-sm text-muted-foreground">
        Belum ada iklan saat ini.
      </div>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => { pausedRef.current = true; }} onMouseLeave={() => { pausedRef.current = false; }}>
      {/* left arrow */}
      <button
        type="button"
        onClick={() => scrollBy("left")}
        disabled={activeIdx === 0}
        aria-label="Previous"
        className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 grid size-10 place-items-center rounded-full bg-white text-foreground shadow-lg ring-1 ring-border transition hover:bg-accent disabled:opacity-40 sm:grid"
      >
        <ChevronLeft className="size-5" />
      </button>
      {/* right arrow */}
      <button
        type="button"
        onClick={() => scrollBy("right")}
        disabled={activeIdx >= listings.length - 1}
        aria-label="Next"
        className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 grid size-10 place-items-center rounded-full bg-white text-foreground shadow-lg ring-1 ring-border transition hover:bg-accent disabled:opacity-40 sm:grid"
      >
        <ChevronRight className="size-5" />
      </button>
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto pb-3 pe-[50vw] no-scrollbar"
      >
        {listings.map((l) => (
          <div
            key={l.id}
            data-listing-id={l.id}
            className="shrink-0"
            style={{ width: cardWidth }}
            onClick={() => {
              const st: any = (useStore as any).getState?.();
              if (st?.setFeaturedClickedId) st.setFeaturedClickedId(l.id);
              if (st?.setFeaturedRestorePending) st.setFeaturedRestorePending(true);
              goToDetail(l.slug);
            }}
          >
            <ListingCard listing={l} />
          </div>
        ))}
      </div>
      {/* dot indicators */}
      {listings.length > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          {listings.map((l, i) => (
            <button
              key={l.id}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={"Go to ad " + (i + 1)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === activeIdx ? "w-6 bg-primary" : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeView() {
  const goToListings = useStore((s) => s.goToListings);
  const goToDetail = useStore((s) => s.goToDetail);
  const goToPost = useStore((s) => s.goToPost);
  const featuredScrollLeft = useStore((s) => s.featuredScrollLeft);
  const setFeaturedScrollLeft = useStore((s) => s.setFeaturedScrollLeft);
  const featuredClickedId = useStore((s) => s.featuredClickedId);
  const setFeaturedClickedId = useStore((s) => s.setFeaturedClickedId);
  const featuredRestorePending = useStore((s) => s.featuredRestorePending);
  const setFeaturedRestorePending = useStore((s) => s.setFeaturedRestorePending);
  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const [heroSearch, setHeroSearch] = useState("");
  const featuredCarouselRef = useRef<HTMLDivElement>(null);
  const [activeFeaturedIdx, setActiveFeaturedIdx] = useState(0);
  const featuredPausedRef = useRef(false);

  // Track which card is currently in view (leftmost visible) for dot indicators
  const handleFeaturedScroll = () => {
    const c = featuredCarouselRef.current;
    if (!c || !featuredListings.length) return;
    const cardWidth = c.children[0]?.getBoundingClientRect().width || 580;
    const gap = 12; // gap-3
    const idx = Math.round(c.scrollLeft / (cardWidth + gap));
    setActiveFeaturedIdx(Math.max(0, Math.min(idx, featuredListings.length - 1)));
  };

  // Scroll carousel by one card left/right
  const scrollFeatured = (dir: "left" | "right") => {
    const c = featuredCarouselRef.current;
    if (!c) return;
    const cardWidth = c.children[0]?.getBoundingClientRect().width || 580;
    const gap = 12;
    const delta = (cardWidth + gap) * (dir === "left" ? -1 : 1);
    c.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Scroll to a specific card by index (for dot click)
  const scrollFeaturedTo = (idx: number) => {
    const c = featuredCarouselRef.current;
    if (!c) return;
    const card = c.children[idx] as HTMLElement | undefined;
    if (card) {
      c.scrollLeft = card.offsetLeft - c.offsetLeft;
    }
  };

  // Pause autoplay on hover/touch (resume when pointer leaves)
  const handleFeaturedMouseEnter = () => { featuredPausedRef.current = true; };
  const handleFeaturedMouseLeave = () => { featuredPausedRef.current = false; };

  const { data: catData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchJson("/api/categories").then((d) => d.categories as Cat[]),
    staleTime: 0,
  });
  const { data: featured } = useQuery({
    queryKey: ["listings", "featured"],
    queryFn: () => fetchJson("/api/listings?packageType=spotlight&limit=8&sort=newest"),
    staleTime: 0,
  });
  const { data: fresh } = useQuery({
    queryKey: ["listings", "fresh"],
    queryFn: () => fetchJson("/api/listings?sort=newest&limit=48"),
    staleTime: 0,
  });
  const { data: popular } = useQuery({
    queryKey: ["listings", "popular"],
    queryFn: () => fetchJson("/api/listings?sort=popular&week=1&limit=12"),
    staleTime: 0,
  });
  const { data: baru } = useQuery({
    queryKey: ["listings", "baru"],
    queryFn: () => fetchJson("/api/listings?condition=baru&sort=newest&limit=24"),
    staleTime: 0,
  });
  const { data: dahsyat } = useQuery({
    queryKey: ["listings", "dahsyat"],
    queryFn: () => fetchJson("/api/listings?packageType=highlight&sort=newest&limit=8"),
    staleTime: 0,
  });
  const { data: jasa } = useQuery({
    queryKey: ["listings", "jasa"],
    queryFn: () => fetchJson("/api/listings?condition=jasa&sort=newest&limit=24"),
    staleTime: 0,
  });
  const { data: searched } = useQuery({
    queryKey: ["listings", "searched"],
    queryFn: () => fetchJson("/api/listings/most-searched?limit=12"),
    staleTime: 0,
  });

  const featuredListings: Listing[] = featured?.listings ?? [];
  const freshListings: Listing[] = fresh?.listings ?? [];
  const popularListings: Listing[] = popular?.listings ?? [];
  const baruListings: Listing[] = baru?.listings ?? [];
  const dahsyatListings: Listing[] = dahsyat?.listings ?? [];
  const jasaListings: Listing[] = jasa?.listings ?? [];
  const searchedListings: Listing[] = searched?.listings ?? [];
  const cats: Cat[] = catData ?? [];

  // Autoplay disabled per user request — manual navigation only (arrows/dots)

  // Restore scroll to the clicked listing card when returning to home (e.g. after viewing a listing)
  // Searches ALL sections on the home page for the clicked card (not just the carousel).
  useEffect(() => {
    const t = setTimeout(() => {
      const s = useStore.getState();
      if (!s.featuredRestorePending) return;
      if (s.featuredClickedId) {
        // Find the clicked card anywhere on the home page
        const card = document.querySelector(
          `[data-listing-id="${s.featuredClickedId}"]`
        ) as HTMLElement | null;
        if (card) {
          // If the card is inside the featured carousel, scroll the carousel horizontally too
          const carousel = featuredCarouselRef.current;
          if (carousel && carousel.contains(card)) {
            carousel.scrollLeft = card.offsetLeft - carousel.offsetLeft;
          }
          // Scroll the page so the card is centered in view
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          // Briefly highlight the clicked card so the user sees which ad they viewed
          card.classList.add("ring-4", "ring-primary", "ring-offset-2", "transition-all");
          setTimeout(() => {
            card.classList.remove("ring-4", "ring-primary", "ring-offset-2");
          }, 2000);
        }
      } else if (featuredCarouselRef.current && s.featuredScrollLeft > 0) {
        featuredCarouselRef.current.scrollLeft = s.featuredScrollLeft;
      }
      s.setFeaturedRestorePending(false);
    }, 300);
    return () => clearTimeout(t);
  }, [featured, fresh, popular]);

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  return (
    <div className="animate-fade-up">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-600 text-primary-foreground">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="size-3.5" /> {tr("badge")}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
              {tr("heroTitle")} <br className="hidden sm:block" /> {tr("heroTitleAccent")}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-primary-foreground/90 sm:text-base">
              {tr("heroDesc")}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                goToListings({ q: heroSearch });
              }}
              className="mt-6 flex max-w-xl items-center gap-2 rounded-full bg-background p-1.5 shadow-lg"
            >
              <Search className="ml-2 size-5 shrink-0 text-muted-foreground" />
              <input
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder={tr("searchPlaceholder")}
                className="h-10 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" className="h-10 rounded-full px-5 font-semibold">
                {tr("searchBtn")}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {[tr("tagMesinCetak"), tr("tagCNC"), tr("tagLaser"), tr("tagKompressor"), tr("tagExcavator")].map((t) => (
                <button
                  key={t}
                  onClick={() => goToListings({ q: t })}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur hover:bg-white/25"
                >
                  {t}
                </button>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* CATEGORIES — disembunyikan (kategori tetap accessible via category nav bar di header) */}
      <section className="hidden">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 className="text-base font-bold sm:text-lg">{tr("exploreCategories")}</h2>
            <p className="text-[11px] text-muted-foreground">{tr("exploreCategoriesDesc")}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => goToListings({})} className="hidden sm:flex">
            {tr("viewAll")} <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar sm:gap-4">
          {(cats.length ? cats : Array.from({ length: 10 }).map((_, i) => ({ id: String(i), name: "", slug: "", icon: "Cog", color: "", listingCount: 0 }))).map((c, i) => (
            <button
              key={c.id || i}
              onClick={() => c.slug && goToListings({ category: c.slug })}
              className="card-hover group flex w-16 shrink-0 flex-col items-center text-center sm:w-20"
            >
              <span className="grid aspect-square w-full place-items-center rounded-lg bg-secondary transition group-hover:bg-primary/10">
                <CategoryIcon name={c.icon} className="size-full p-1" />
              </span>
              <span className="mt-1.5 line-clamp-2 text-[9px] font-semibold leading-tight text-foreground sm:text-[10px]">
                {categoryName(c.name, mounted ? lang : "id") || <span className="inline-block h-2 w-10 animate-pulse rounded bg-muted" />}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* MAIN CONTENT + RIGHT SIDEBAR */}
      <div className="mx-auto max-w-7xl px-4 flex gap-4 py-6">
        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* FEATURED — horizontal scrollable carousel */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">{tr("featured")}</h2>
                  <p className="text-sm text-muted-foreground">{tr("featuredDesc")}</p>
                </div>
              </div>
            </div>
            {featured ? (
              <div className="relative" onMouseEnter={handleFeaturedMouseEnter} onMouseLeave={handleFeaturedMouseLeave}>
                {/* left arrow */}
                <button
                  type="button"
                  onClick={() => scrollFeatured("left")}
                  disabled={activeFeaturedIdx === 0}
                  aria-label="Previous"
                  className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 grid size-10 place-items-center rounded-full bg-white text-foreground shadow-lg ring-1 ring-border transition hover:bg-accent disabled:opacity-40 sm:grid"
                >
                  <ChevronLeft className="size-5" />
                </button>
                {/* right arrow */}
                <button
                  type="button"
                  onClick={() => scrollFeatured("right")}
                  disabled={activeFeaturedIdx >= featuredListings.length - 1}
                  aria-label="Next"
                  className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 grid size-10 place-items-center rounded-full bg-white text-foreground shadow-lg ring-1 ring-border transition hover:bg-accent disabled:opacity-40 sm:grid"
                >
                  <ChevronRight className="size-5" />
                </button>
                <div
                  ref={featuredCarouselRef}
                  onScroll={handleFeaturedScroll}
                  className="flex gap-3 overflow-x-auto pb-3 pe-[50vw] no-scrollbar"
                >
                  {featuredListings.map((l) => (
                    <div
                      key={l.id}
                      data-listing-id={l.id}
                      className="shrink-0"
                      style={{ width: "min(580px, 80vw)" }}
                      onClick={() => {
                        // Save carousel scroll position + clicked card id + set restore flag before navigating to detail
                        if (featuredCarouselRef.current) {
                          setFeaturedScrollLeft(featuredCarouselRef.current.scrollLeft);
                        }
                        setFeaturedClickedId(l.id);
                        setFeaturedRestorePending(true);
                        goToDetail(l.slug);
                      }}
                    >
                      <ListingCard listing={l} />
                    </div>
                  ))}
                </div>
                {/* dot indicators */}
                {featuredListings.length > 1 && (
                  <div className="mt-2 flex justify-center gap-2">
                    {featuredListings.map((l, i) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => scrollFeaturedTo(i)}
                        aria-label={"Go to ad " + (i + 1)}
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          i === activeFeaturedIdx ? "w-6 bg-primary" : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shrink-0" style={{ width: "min(580px, 80vw)" }}>
                    <ListingCardSkeleton />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PRODUK TERDAHSYAT — Highlight package listings (scrollable carousel) */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-orange-500" />
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">{tr("dahsyatAds")}</h2>
                  <p className="text-sm text-muted-foreground">{tr("dahsyatAdsDesc")}</p>
                </div>
              </div>
            </div>
            <CarouselSection listings={dahsyatListings} loading={!dahsyat} cardWidth="min(384px, 60vw)" />
          </section>

          {/* AD BANNER 1 */}
          <AdBanner />

          {/* POPULAR */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">{tr("popular")}</h2>
                  <p className="text-sm text-muted-foreground">{tr("popularViewsDesc")}</p>
                </div>
              </div>
            </div>
            <ListingSection listings={popularListings} loading={!popular} viewMode={viewMode} />
          </section>

          {/* SELL CTA */}
          <section>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-primary p-6 text-primary-foreground sm:p-10">
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 right-24 size-32 rounded-full bg-white/10" />
              <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-extrabold sm:text-3xl">{tr("sellCtaTitle")}</h3>
                  <p className="mt-1 max-w-lg text-sm text-primary-foreground/90">
                    {tr("sellCtaDesc")}
                  </p>
                </div>
                <Button
                  onClick={goToPost}
                  size="lg"
                  className="shrink-0 rounded-full bg-background px-6 font-bold text-primary shadow hover:bg-background/90"
                >
                  <Plus className="size-5" /> {tr("sellCtaBtn")}
                </Button>
              </div>
            </div>
          </section>

          {/* BRAND NEW (Mesin Baru) — condition baru only */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600" />
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">{tr("baruAds")}</h2>
                  <p className="text-sm text-muted-foreground">{tr("baruAdsDesc")}</p>
                </div>
              </div>
            </div>
            {baruListings.length > 0 ? (
              <ListingSection listings={baruListings} loading={!baru} viewMode={viewMode} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card py-10 text-center text-sm text-muted-foreground">
                Belum ada mesin baru saat ini.
              </div>
            )}
          </section>

          {/* JASA — service listings (jasa cetak, jasa service, jasa sewa, dll.) */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="size-5 text-blue-600" />
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">{tr("jasaAds")}</h2>
                  <p className="text-sm text-muted-foreground">{tr("jasaAdsDesc")}</p>
                </div>
              </div>
            </div>
            {jasaListings.length > 0 ? (
              <ListingSection listings={jasaListings} loading={!jasa} viewMode={viewMode} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card py-10 text-center text-sm text-muted-foreground">
                Belum ada jasa saat ini.
              </div>
            )}
          </section>

          {/* PALING BANYAK DICARI — sorted by views desc */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Search className="size-5 text-amber-600" />
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">{tr("searchedAds")}</h2>
                  <p className="text-sm text-muted-foreground">{tr("searchedAdsDesc")}</p>
                </div>
              </div>
            </div>
            {searchedListings.length > 0 ? (
              <ListingSection listings={searchedListings} loading={!searched} viewMode={viewMode} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card py-10 text-center text-sm text-muted-foreground">
                Belum ada data.
              </div>
            )}
          </section>

          {/* FRESH */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">{tr("fresh")}</h2>
                  <p className="text-sm text-muted-foreground">{tr("freshDesc")}</p>
                </div>
              </div>
            </div>
            <ListingSection listings={freshListings} loading={!fresh} viewMode={viewMode} />
          </section>
        </div>

        {/* RIGHT SIDEBAR — Categories (icons only, desktop) */}
        <aside className="hidden w-16 shrink-0 lg:block">
          <div className="sticky top-16">
            <CategorySidebar />
          </div>
        </aside>
      </div>

    </div>
  );
}
