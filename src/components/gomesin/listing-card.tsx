"use client";

import { useState, useEffect } from "react";
import { Heart, MapPin, BadgeCheck, ImageIcon, Eye, Sparkles, Zap, User, Tag } from "lucide-react";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { formatRupiah, formatRupiahFull, timeAgo } from "@/lib/types";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLang, translations as i18nTranslations, categoryName, listingTitle } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";

export function ListingCard({ listing, spotlight = false }: { listing: Listing; spotlight?: boolean }) {
  const goToDetail = useStore((s) => s.goToDetail);
  const goToSeller = useStore((s) => s.goToSeller);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(listing.id));
  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  // Package-based promotion badges
  const pkg = listing.packageType || "";
  const isSpotlight = pkg === "spotlight";
  const isHighlight = pkg === "highlight";
  const isSundul = pkg === "sundul";

  const images = listing.images || [];

  const fav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(listing.id);
    toast.success(isFav ? tr("removedFromFav") : tr("addedToFav"), {
      duration: 1400,
    });
  };

  const openSeller = (e: React.MouseEvent) => {
    e.stopPropagation();
    const uid = (listing as any).user?.id;
    if (uid) goToSeller(uid);
  };

  const img = images[0];

  // Spotlight image rotation: 3 displayed slots cycle through all images every 5s
  const [spotOffset, setSpotOffset] = useState(0);
  useEffect(() => {
    if (!isSpotlight || images.length <= 3) return;
    const interval = setInterval(() => {
      setSpotOffset((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isSpotlight, images.length]);

  return (
    <article
      data-listing-id={listing.id}
      onClick={() => {
        // Save clicked listing id so home can scroll back to this card on return
        const st: any = (useStore as any).getState?.();
        if (st?.setFeaturedClickedId) st.setFeaturedClickedId(listing.id);
        if (st?.setFeaturedRestorePending) st.setFeaturedRestorePending(true);
        goToDetail(listing.slug);
      }}
      className={cn(
        "card-hover group cursor-pointer overflow-hidden rounded-xl border transition",
        isSpotlight
          ? "border-amber-400 bg-card ring-2 ring-amber-400/30 shadow-lg col-span-2 sm:col-span-3 md:col-span-3"
          : isHighlight
          ? "border-orange-400 bg-card ring-1 ring-orange-400/30 shadow-md col-span-2 sm:col-span-2 md:col-span-2"
          : isSundul
          ? "border-purple-500 bg-purple-200 ring-2 ring-purple-400/40 shadow-md"
          : "border-border bg-card"
      )}
    >
      {/* Profile button — above image, only for Spotlight */}
      {isSpotlight && (
        <div className="flex items-center justify-between bg-amber-50 px-3 py-1.5">
          <button
            onClick={openSeller}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-sm ring-1 ring-amber-300 transition hover:bg-amber-100"
          >
            <User className="size-3.5" />
            {listing.seller.name}
            {listing.seller.verified && <BadgeCheck className="size-3.5 text-primary" />}
          </button>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800">
            <MapPin className="size-3" /> {listing.city}
          </span>
        </div>
      )}

      {isSpotlight ? (
        /* Spotlight: 3 images in a single row (auto-rotates through all images every 5s) */
        <div className="relative grid grid-cols-3 gap-0.5 bg-muted">
          {[0, 1, 2].map((idx) => {
            const src = images.length > 0 ? images[(spotOffset + idx) % images.length] : null;
            return (
              <div key={idx} className="relative aspect-square overflow-hidden bg-muted">
                {src ? (
                  <Image
                    src={src}
                    alt={listingTitle(listing, mounted ? lang : "id")}
                    fill
                    sizes="(max-width: 768px) 17vw, (max-width: 1200px) 17vw, 13vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-8" />
                  </div>
                )}
                {/* badges only on first image (leftmost) */}
                {idx === 0 && (
                  <>
                    <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
                      <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                        {tr("spotlightBadge")}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow",
                          listing.condition === "baru" ? "bg-emerald-600" : "bg-gray-600"
                        )}
                      >
                        {listing.condition === "baru" ? tr("baru") : tr("bekas")}
                      </span>
                    </div>
                    <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                      <Eye className="size-3" />
                      {listing.views?.toLocaleString("id-ID") || 0}
                    </span>
                  </>
                )}
              </div>
            );
          })}
          {/* favorite (top-right of whole gallery) */}
          <button
            onClick={fav}
            aria-label={isFav ? tr("removeFav") : tr("addFav")}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-foreground shadow backdrop-blur transition hover:bg-white"
          >
            <Heart
              className={cn("size-4", isFav && "fill-rose-500 text-rose-500")}
            />
          </button>
        </div>
      ) : isHighlight ? (
        /* Highlight: 2 images side by side */
        <div className="relative grid grid-cols-2 gap-0.5 bg-muted">
          {[0, 1].map((idx) => {
            const src = images[idx] || null;
            return (
              <div key={idx} className="relative aspect-square overflow-hidden bg-muted">
                {src ? (
                  <Image
                    src={src}
                    alt={listingTitle(listing, mounted ? lang : "id")}
                    fill
                    sizes="(max-width: 768px) 25vw, (max-width: 1200px) 17vw, 13vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-8" />
                  </div>
                )}
                {/* badges only on first image (left) */}
                {idx === 0 && (
                  <>
                    <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
                      <span className="rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                        {tr("highlightBadge")}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow",
                          listing.condition === "baru" ? "bg-emerald-600" : "bg-gray-600"
                        )}
                      >
                        {listing.condition === "baru" ? tr("baru") : tr("bekas")}
                      </span>
                    </div>
                    <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                      <Eye className="size-3" />
                      {listing.views?.toLocaleString("id-ID") || 0}
                    </span>
                  </>
                )}
              </div>
            );
          })}
          {/* favorite (top-right of whole gallery) */}
          <button
            onClick={fav}
            aria-label={isFav ? tr("removeFav") : tr("addFav")}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-foreground shadow backdrop-blur transition hover:bg-white"
          >
            <Heart
              className={cn("size-4", isFav && "fill-rose-500 text-rose-500")}
            />
          </button>
        </div>
      ) : (
        /* Normal cards (Standard/Sundul): single image */
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {img ? (
            <Image
              src={img}
              alt={listingTitle(listing, mounted ? lang : "id")}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-10" />
            </div>
          )}

          {/* top-left badges — promotion badges + condition */}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {isSundul && (
              <span className="rounded-md bg-purple-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                {tr("sundulBadge")}
              </span>
            )}
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow",
                listing.condition === "baru" ? "bg-emerald-600" : "bg-gray-600"
              )}
            >
              {listing.condition === "baru" ? tr("baru") : tr("bekas")}
            </span>
          </div>

          {/* favorite */}
          <button
            onClick={fav}
            aria-label={isFav ? tr("removeFav") : tr("addFav")}
            className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-foreground shadow backdrop-blur transition hover:bg-white"
          >
            <Heart
              className={cn("size-4", isFav && "fill-rose-500 text-rose-500")}
            />
          </button>

          {/* views badge - bottom left of image */}
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            <Eye className="size-3" />
            {listing.views?.toLocaleString("id-ID") || 0}
          </span>
        </div>
      )}

      {/* Spotlight yellow belt — below image */}
      {isSpotlight && (
        <div className="flex items-center justify-center gap-1.5 bg-amber-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-950 shadow-sm">
          <Sparkles className="size-3.5" />
          {tr("spotlightBadge")}
        </div>
      )}

      {/* Highlight orange belt — below image */}
      {isHighlight && (
        <div className="flex items-center justify-center gap-1.5 bg-orange-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
          <Zap className="size-3.5" />
          {tr("highlightBadge")}
        </div>
      )}

      <div className={cn("space-y-1.5 p-3", isSpotlight && "sm:p-4")}>
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("font-bold text-primary", isSpotlight ? "text-2xl" : "text-lg")}>
            {formatRupiahFull(listing.price)}
          </p>
          {listing.priceType === "negotiable" && (
            <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
              {tr("nego")}
            </span>
          )}
        </div>
        <h3 className={cn(
          "line-clamp-2 font-semibold leading-snug text-foreground",
          isSpotlight ? "min-h-[3rem] text-base" : "min-h-[2.5rem] text-sm"
        )}>
          {listingTitle(listing, mounted ? lang : "id")}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tag className="size-3 shrink-0 text-primary" />
          <span className="shrink-0 font-medium text-primary">{categoryName(listing.category?.name || "", mounted ? lang : "id")}</span>
          <MapPin className="ml-0.5 size-3.5 shrink-0" />
          <span className="truncate">{listing.city}</span>
          {listing.yearProduced && (
            <>
              <span>•</span>
              <span className="shrink-0">Th. {listing.yearProduced}</span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between pt-0.5 text-xs text-muted-foreground">
          <span>{timeAgo(listing.createdAt, mounted ? lang : "id")}</span>
          <span className="inline-flex items-center gap-0.5">
            <BadgeCheck className="size-3.5 text-primary" />
            {listing.seller.verified ? tr("verified") : listing.seller.name.split(" ")[0]}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export { formatRupiahFull };
