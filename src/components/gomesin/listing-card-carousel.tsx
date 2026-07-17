"use client";

import { useState, useRef } from "react";
import { Heart, MapPin, BadgeCheck, ImageIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatRupiah, timeAgo } from "@/lib/types";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ListingCardCarousel({ listing }: { listing: Listing }) {
  const goToDetail = useStore((s) => s.goToDetail);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(listing.id));

  const [activeImg, setActiveImg] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const images = listing.images || [];
  const total = images.length;

  const fav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(listing.id);
    toast.success(isFav ? tr("removedFromFav") : tr("addedToFav"), {
      duration: 1400,
    });
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImg((p) => (p - 1 + total) % total);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImg((p) => (p + 1) % total);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 30) {
      if (diff < 0) next(e as unknown as React.MouseEvent);
      else prev(e as unknown as React.MouseEvent);
    }
    touchStartX.current = null;
  };

  return (
    <article
      onClick={() => goToDetail(listing.slug)}
      className="card-hover group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* image carousel */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.length > 0 ? (
          <div
            className="flex h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeImg * 100}%)` }}
          >
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- external image
              <img
                key={i}
                src={src}
                alt={listing.title}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="size-full shrink-0 object-cover"
                style={{ width: "100%", height: "100%" }}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-10" />
          </div>
        )}

        {/* top-left badges */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {listing.featured && (
            <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Featured
            </span>
          )}
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow",
              listing.condition === "baru" ? "bg-primary" : "bg-emerald-600"
            )}
          >
            {listing.condition === "baru" ? tr("commonBaru") : tr("commonBekas")}
          </span>
        </div>

        {/* favorite */}
        <button
          onClick={fav}
          aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-foreground shadow backdrop-blur transition hover:bg-white"
        >
          <Heart className={cn("size-4", isFav && "fill-rose-500 text-rose-500")} />
        </button>

        {/* arrow buttons (if multiple images) */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Gambar sebelumnya"
              className="absolute left-1 top-1/2 hidden -translate-y-1/2 grid size-7 place-items-center rounded-full bg-white/80 text-foreground shadow backdrop-blur transition hover:bg-white sm:grid"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={next}
              aria-label="Gambar berikutnya"
              className="absolute right-1 top-1/2 hidden -translate-y-1/2 grid size-7 place-items-center rounded-full bg-white/80 text-foreground shadow backdrop-blur transition hover:bg-white sm:grid"
            >
              <ChevronRight className="size-4" />
            </button>
            {/* counter */}
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              {activeImg + 1} / {total}
            </span>
          </>
        )}
      </div>

      {/* dots indicator */}
      {total > 1 && (
        <div className="absolute left-1/2 top-[calc(66.67%-12px)] flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setActiveImg(i);
              }}
              aria-label={`Gambar ${i + 1}`}
              className={cn(
                "rounded-full transition-all",
                i === activeImg
                  ? "size-2 bg-primary"
                  : "size-1.5 bg-white/80 hover:bg-white"
              )}
            />
          ))}
        </div>
      )}

      {/* content */}
      <div className="space-y-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-base font-bold text-foreground">
            {formatRupiah(listing.price)}
          </p>
          {listing.priceType === "negotiable" && (
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
              Nego
            </span>
          )}
        </div>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-foreground">
          {listing.title}
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{listing.city}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted-foreground">
          <span>{timeAgo(listing.createdAt)}</span>
          <span className="inline-flex items-center gap-0.5">
            <BadgeCheck className="size-3 text-primary" />
            {listing.seller.verified ? tr("profVerified") : listing.seller.name.split(" ")[0]}
          </span>
        </div>
      </div>
    </article>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
