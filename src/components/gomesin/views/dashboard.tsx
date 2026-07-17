"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ListingRow, ListingRowSkeleton } from "../listing-row";
import { PackageActivateDialog } from "../package-activate-dialog";
import { formatRupiah, formatRupiahFull, timeAgo } from "@/lib/types";
import { useLang, translations as i18nTranslations, categoryName, listingTitle } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  List,
  Tag,
  Eye,
  TrendingUp,
  Plus,
  ChevronRight,
  Frown,
  Trash2,
  Edit,
  Loader2,
  MapPin,
  ImageIcon,
  BadgeCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Listing = any;

async function fetchListings(userId?: string) {
  const url = userId ? `/api/my-listings?userId=${encodeURIComponent(userId)}` : "/api/my-listings";
  const res = await fetch(url);
  if (!res.ok) throw new Error("fail");
  return res.json() as Promise<{ listings: Listing[]; total: number }>;
}

async function deleteListing(slug: string) {
  const res = await fetch(`/api/listings/${slug}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || tr("dashDeleteFailed"));
  return data;
}

export function DashboardView() {
  const goToDetail = useStore((s) => s.goToDetail);
  const goToEdit = useStore((s) => s.goToEdit);
  const goToPost = useStore((s) => s.goToPost);
  const goHome = useStore((s) => s.goHome);
  const user = useStore((s) => s.user);
  const goToLogin = useStore((s) => s.goToLogin);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [activateListing, setActivateListing] = useState<Listing | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-listings", user?.id],
    queryFn: () => fetchListings(user?.id),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteListing,
    onSuccess: () => {
      toast.success(tr("deleteSuccess"));
      setDeleteSlug(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard-listings", user?.id] });
      // also refresh home listing queries
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (e: any) => {
      toast.error(e.message || tr("deleteFailed"));
    },
  });

  // Not logged in — prompt to login
  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center animate-fade-up">
        <div className="grid size-16 place-items-center rounded-full bg-primary/10">
          <Frown className="size-8 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-bold">{tr("loginRequired")}</h2>
        <Button className="mt-4" onClick={goToLogin}>
          {tr("loginRegister")}
        </Button>
      </div>
    );
  }

  const allListings: Listing[] = data?.listings ?? [];
  const total = data?.total ?? 0;

  // Filter by search
  const listings = search.trim()
    ? allListings.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.title?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.brand?.toLowerCase().includes(q) ||
          l.city?.toLowerCase().includes(q) ||
          l.category?.name?.toLowerCase().includes(q)
        );
      })
    : allListings;

  const handleDelete = (slug: string) => {
    setDeleteSlug(slug);
  };

  const confirmDelete = () => {
    if (deleteSlug) deleteMutation.mutate(deleteSlug);
  };

  // stats
  const totalViews = listings.reduce((a, l) => a + (l.views || 0), 0);
  const totalValue = listings.reduce((a, l) => a + (l.price || 0), 0);
  const featuredCount = listings.filter((l) => l.featured).length;

  const stats = [
    { label: tr("totalAds"), value: total.toLocaleString("id-ID"), icon: Tag, color: "text-primary" },
    { label: tr("totalViews"), value: totalViews.toLocaleString("id-ID"), icon: Eye, color: "text-blue-500" },
    { label: tr("featuredCount"), value: featuredCount, icon: TrendingUp, color: "text-amber-500" },
    { label: tr("assetValue"), value: formatRupiah(totalValue), icon: Tag, color: "text-emerald-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-up">
      {/* breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <button onClick={goHome} className="hover:text-primary">{tr("home2")}</button>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{tr("dashboardCrumb")}</span>
      </div>

      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{tr("dashboardTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {tr("dashboardDesc")}
          </p>
        </div>
        <Button onClick={goToPost} className="gap-2 rounded-full bg-primary font-semibold">
          <Plus className="size-4" /> {tr("postAd2")}
        </Button>
      </div>

      {/* stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{s.label}</span>
              <s.icon className={cn("size-4", s.color)} />
            </div>
            <p className="mt-1 text-base font-bold sm:text-lg">{s.value}</p>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold sm:text-lg">{tr("adList")}</h2>
        <div className="flex items-center gap-2">
          {/* search */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr("dashSearchPlaceholder")}
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary sm:w-56"
            />
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {listings.length} {tr("adsCount")}
          </span>
          {/* view toggle */}
          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Tampilan grid"
              aria-pressed={viewMode === "grid"}
              className={cn(
                "grid size-9 place-items-center transition",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-accent"
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
                "grid size-9 place-items-center border-l border-border transition",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-accent"
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* results */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-square w-full animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-2 border-t border-border p-3">
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
                  <th className="p-2">{tr("thMachine")}</th>
                  <th className="p-2">{tr("thDetail")}</th>
                  <th className="hidden p-2 text-right sm:table-cell">{tr("thPrice")}</th>
                  <th className="p-2 text-right">{tr("thTime")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <ListingRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Frown className="size-12 text-muted-foreground" />
          <h3 className="mt-3 text-lg font-semibold">{tr("noAds")}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {tr("noAdsDesc")}
          </p>
          <Button className="mt-4 gap-2" onClick={goToPost}>
            <Plus className="size-4" /> {tr("postFirstAd")}
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((l) => {
            const img = l.images?.[0];
            const imgs = l.images || [];
            const statusInfo = l.status === "pending"
              ? { color: "bg-amber-500", text: tr("pendingVerification"), icon: Clock }
              : l.status === "rejected" || l.violationFlag
              ? { color: "bg-red-500", text: l.violationFlag ? tr("violation") : tr("rejected"), icon: AlertTriangle }
              : { color: "bg-emerald-500", text: tr("dashActive"), icon: CheckCircle2 };
            const StatusIcon = statusInfo.icon;
            const specEntries = l.specs ? Object.entries(l.specs) : [];
            // pkgName/pkgColor: Standard (gratis/simpan) = empty string (no badge shown).
            // Only Spotlight/Highlight/Sundul show badges.
            const pkgName =
              l.packageType === "spotlight"
                ? "Spotlight"
                : l.packageType === "highlight"
                ? "Highlight"
                : l.packageType === "sundul"
                ? "Colek"
                : "";
            const pkgColor =
              l.packageType === "spotlight"
                ? "bg-amber-100 text-amber-700"
                : l.packageType === "highlight"
                ? "bg-orange-100 text-orange-700"
                : l.packageType === "sundul"
                ? "bg-purple-100 text-purple-700"
                : "";
            return (
              <div
                key={l.id}
                onClick={() => setActivateListing(l)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary hover:shadow-md"
              >
                {/* image */}
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {img ? (
                    <img src={img} alt={l.title} className="size-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-8" />
                    </div>
                  )}
                  {/* status badge */}
                  <span className={cn("absolute left-2 top-2 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow", statusInfo.color)}>
                    <StatusIcon className="size-3" />
                    {statusInfo.text}
                  </span>
                  {/* featured badge */}
                  {l.featured && (
                    <span className="absolute right-2 top-2 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow">
                      Featured
                    </span>
                  )}
                  {/* photo count */}
                  {imgs.length > 1 && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      📷 {imgs.length}
                    </span>
                  )}
                </div>

                {/* content */}
                <div className="p-3">
                  {/* price + nego */}
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-bold text-primary">
                      {formatRupiahFull(l.price)}
                    </p>
                    {l.priceType === "negotiable" && (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Nego
                      </span>
                    )}
                  </div>
                  {/* title */}
                  <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {listingTitle(l, mounted ? lang : "id")}
                  </h3>
                  {/* meta */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="size-3" /> {l.city}, {l.province}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{l.condition === "baru" ? tr("commonBaru") : tr("commonBekas")}</span>
                    <span>•</span>
                    <span>Brand: {l.brand || "-"}</span>
                    <span>•</span>
                    <span>Th. {l.yearProduced || "-"}</span>
                  </div>
                  {/* category + package */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {categoryName(l.category?.name || "", mounted ? lang : "id")}
                    </span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", pkgColor)}>
                      {pkgName || "Standard"}
                    </span>
                  </div>
                </div>

                {/* BOTTOM: full details */}
                <div className="space-y-2.5 border-t border-border p-3">
                  {/* description */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Deskripsi</p>
                    {l.description ? (
                      <p className="line-clamp-3 text-xs leading-relaxed text-foreground/80">
                        {l.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/60">Belum ada deskripsi</p>
                    )}
                  </div>
                  {/* detail info table */}
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Detail Iklan</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      <div className="flex justify-between border-b border-border/50 pb-0.5">
                        <span className="text-muted-foreground">Kondisi</span>
                        <span className="font-medium">{l.condition === "baru" ? tr("commonBaru") : tr("commonBekas")}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-0.5">
                        <span className="text-muted-foreground">Brand</span>
                        <span className="font-medium">{l.brand || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-0.5">
                        <span className="text-muted-foreground">Tahun</span>
                        <span className="font-medium">{l.yearProduced || "-"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-0.5">
                        <span className="text-muted-foreground">Tipe Harga</span>
                        <span className="font-medium">{l.priceType === "negotiable" ? "Nego" : "Pas"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-0.5">
                        <span className="text-muted-foreground">Paket</span>
                        <span className="font-medium">{pkgName || "Standard"}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/50 pb-0.5">
                        <span className="text-muted-foreground">Kategori</span>
                        <span className="font-medium truncate">{l.category?.name || "-"}</span>
                      </div>
                    </div>
                  </div>
                  {/* all specs */}
                  <div>
                    <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Spesifikasi</p>
                    {specEntries.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {specEntries.map(([k, v]: [string, any]) => (
                          <span key={k} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <span className="font-medium">{k}:</span> {v}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/60">Belum ada spesifikasi. Klik Edit untuk menambah.</p>
                    )}
                  </div>
                  {/* stats row */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Eye className="size-3" /> {l.views?.toLocaleString("id-ID") || 0} dilihat
                    </span>
                    <span>•</span>
                    <span>{timeAgo(l.createdAt, mounted ? lang : "id")}</span>
                    {l.paymentExpiry && (
                      <>
                        <span>•</span>
                        <span className={cn(
                          "font-medium",
                          new Date(l.paymentExpiry) < new Date() ? "text-red-600" : "text-emerald-600"
                        )}>
                          {new Date(l.paymentExpiry) < new Date() ? tr("dashExpired") : "Berakhir " + new Date(l.paymentExpiry).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      </>
                    )}
                  </div>
                  {/* action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={(e) => { e.stopPropagation(); goToEdit(l.slug); }}
                    >
                      <Edit className="size-3.5" /> Edit Iklan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs text-destructive hover:bg-destructive/5"
                      onClick={(e) => { e.stopPropagation(); handleDelete(l.slug); }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[540px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
                <th className="p-2">{tr("thMachine")}</th>
                <th className="p-2">{tr("thDetail")}</th>
                <th className="hidden p-2 text-right sm:table-cell">{tr("thPrice")}</th>
                <th className="p-2 text-right">{tr("thTime")}</th>
                <th className="p-2 text-center">{tr("thAction")}</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <ListingRow
                  key={l.id}
                  listing={l}
                  onRowClick={(listing) => setActivateListing(listing)}
                  extraCells={
                    <td className="p-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            goToEdit(l.slug);
                          }}
                          aria-label={tr("dashEditAd")}
                          className="grid size-8 place-items-center rounded-md border border-primary/30 bg-background text-primary transition hover:bg-primary hover:text-white"
                          title={tr("dashEditAd")}
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(l.slug);
                          }}
                          aria-label={tr("deleteAd")}
                          className="grid size-8 place-items-center rounded-md border border-destructive/30 bg-background text-destructive transition hover:bg-destructive hover:text-white"
                          title={tr("deleteAd")}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* delete confirmation dialog */}
      <AlertDialog open={deleteSlug !== null} onOpenChange={(o) => !o && setDeleteSlug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("deleteAdTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr("deleteAdDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="gap-2 bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {deleteMutation.isPending ? tr("deleting") : tr("deleteBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* package activate / upgrade dialog */}
      {activateListing && (
        <PackageActivateDialog
          key={activateListing.id}
          listing={activateListing}
          open={activateListing !== null}
          onOpenChange={(o) => !o && setActivateListing(null)}
          onEdit={(slug) => goToEdit(slug)}
        />
      )}
    </div>
  );
}
