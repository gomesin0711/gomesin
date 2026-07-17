"use client";

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Phone,
  Mail,
  BadgeCheck,
  Star,
  Package,
  Eye,
  Tag,
} from "lucide-react";
import { ListingCard } from "../listing-card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLang, translations as i18nTranslations } from "@/lib/i18n";
import { timeAgo } from "@/lib/types";
import { useMounted } from "@/lib/use-mounted";

async function fetchSellerData(userId: string) {
  // Fetch the user's listings (includes seller relation)
  const listingsRes = await fetch(`/api/my-listings?userId=${userId}`);
  if (!listingsRes.ok) throw new Error("fail");
  const listingsData = await listingsRes.json();
  return listingsData;
}

export function SellerView() {
  const sellerId = useStore((s) => s.sellerId);
  const goBack = useStore((s) => s.goBack);
  const goHome = useStore((s) => s.goHome);
  const goToDetail = useStore((s) => s.goToDetail);
  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["seller-listings", sellerId],
    queryFn: () => fetchSellerData(sellerId!),
    enabled: !!sellerId,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mb-6 h-32 w-full animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data || data.listings.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-lg font-semibold">{tr("notFound")}</p>
        <p className="mt-1 text-sm text-muted-foreground">Penjual tidak ditemukan atau belum memiliki iklan.</p>
        <Button className="mt-4" onClick={goBack}>
          <ChevronLeft className="size-4" /> {tr("back")}
        </Button>
      </div>
    );
  }

  const listings = data.listings;
  // Get seller info from the first listing (they all share the same seller)
  const firstListing = listings[0];
  const seller = firstListing.seller;
  const ownerUser = firstListing.user;

  // Use user data if available, otherwise seller data
  const displayName = ownerUser?.name || seller.name;
  const displayPhone = ownerUser?.phone || seller.phone;
  const displayEmail = ownerUser?.email;
  const displayCity = ownerUser?.city || seller.city;
  const displayProvince = seller.province;
  const verified = seller.verified;
  const rating = seller.rating;
  const reviewCount = seller.reviewCount;
  const joinedAt = seller.joinedAt;

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Only show active listings
  const activeListings = listings.filter((l: any) => l.status === "active");

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 animate-fade-up">
      {/* back button + breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent"
          aria-label={tr("back")}
        >
          <ChevronLeft className="size-4" /> {tr("back")}
        </button>
        <div className="flex min-w-0 items-center gap-1">
          <button onClick={goHome} className="hover:text-primary">{tr("home2")}</button>
          <ChevronRight className="size-3 shrink-0" />
          <span className="truncate text-foreground">{displayName}</span>
        </div>
      </div>

      {/* Seller profile card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-emerald-600 p-5 text-primary-foreground shadow-lg mb-6">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 right-12 size-20 rounded-full bg-white/10" />
        <div className="relative flex items-start gap-4">
          <Avatar className="size-16 border-2 border-white/40">
            <AvatarFallback className="bg-white/20 text-xl font-bold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold leading-tight">{displayName}</h1>
              {verified && <BadgeCheck className="size-5 shrink-0" />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-primary-foreground/80">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {displayCity}{displayProvince ? `, ${displayProvince}` : ""}
              </span>
              {joinedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" /> Bergabung {timeAgo(joinedAt, mounted ? lang : "id")}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">
                <Star className="size-3 fill-amber-300 text-amber-300" />
                {rating.toFixed(1)} · {reviewCount} ulasan
              </span>
              {verified && (
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">
                  <BadgeCheck className="size-3" /> {tr("trustedSeller")}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">
                <Package className="size-3" /> {activeListings.length} iklan aktif
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact info card */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {displayPhone && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="size-3.5 text-primary" /> {tr("sellerPhone")}
            </p>
            <p className="mt-1 text-sm font-bold tracking-wide">{displayPhone}</p>
          </div>
        )}
        {displayEmail && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="size-3.5 text-primary" /> Email
            </p>
            <p className="mt-1 truncate text-sm font-bold">{displayEmail}</p>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="size-3.5 text-primary" /> Total Iklan
          </p>
          <p className="mt-1 text-sm font-bold">{listings.length} iklan</p>
        </div>
      </div>

      {/* Listings grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Iklan dari {displayName}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({activeListings.length})</span>
          </h2>
        </div>
        {activeListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
            <Package className="size-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-semibold">Belum ada iklan aktif</p>
            <p className="mt-1 text-xs text-muted-foreground">Iklan dari penjual ini akan muncul di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {activeListings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
