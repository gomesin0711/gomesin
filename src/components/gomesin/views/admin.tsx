"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatRupiahFull } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, LayoutDashboard, Tag, Users, FolderTree, Award,
  MapPin, Image, Crown, Receipt, FileText, ScrollText,
  CheckCircle2, XCircle, Trash2, Plus, ChevronRight, ChevronLeft, Lock, X,
  TrendingUp, DollarSign, Eye, BarChart3, Loader2, Edit, Sparkle, Clock, RefreshCw,
  Mail, Phone, Calendar, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useLang, translations as i18nTranslations } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";

type Tab = "dashboard" | "iklan" | "iklanbaru" | "iklanexpired" | "iklanditolak" | "penjual" | "kategori" | "merek" | "lokasi" | "banner" | "paket" | "transaksi" | "laporan" | "laporanbulanan" | "audit" | "pengguna";

// ============ FETCHERS ============
const fetchJson = async (url: string) => (await fetch(url)).json();

// Format biaya pasang iklan (angka dari server) → "Gratis" atau "Rp X".
// `adFee` sudah dihitung di sisi server (/api/admin/listings) dari tabel Paket,
// jadi tidak ada race condition dengan fetch paket terpisah.
const formatAdFee = (fee: number | undefined | null): string => {
  const n = Number(fee) || 0;
  return n === 0 ? "Gratis" : formatRupiahFull(n);
};

// ============ MAIN COMPONENT ============
export function AdminView({ initialTab }: { initialTab?: Tab }) {
  const goHome = useStore((s) => s.goHome);
  const user = useStore((s) => s.user);
  const goToLogin = useStore((s) => s.goToLogin);
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const [tab, setTab] = useState<Tab>(initialTab || "dashboard");

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Lock className="mx-auto size-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Akses Ditolak</h2>
        <p className="mt-2 text-sm text-muted-foreground">Silakan masuk dengan akun admin.</p>
        <Button className="mt-4" onClick={goToLogin}>Masuk Admin</Button>
        <p className="mt-2 text-xs text-muted-foreground">admin@gomesin.id / admin123</p>
      </div>
    );
  }
  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldCheck className="mx-auto size-12 text-destructive" />
        <h2 className="mt-4 text-xl font-bold">Bukan Admin</h2>
        <p className="mt-2 text-sm text-muted-foreground">Akun Anda tidak memiliki akses admin.</p>
        <Button className="mt-4" onClick={goHome}>Kembali</Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: tr("admDashboard"), icon: LayoutDashboard },
    { id: "iklan", label: tr("admVerifyListings"), icon: Tag },
    { id: "penjual", label: tr("admVerifySellers"), icon: Users },
    { id: "kategori", label: tr("admManageCategories"), icon: FolderTree },
    { id: "merek", label: tr("admManageBrands"), icon: Award },
    { id: "lokasi", label: tr("admManageLocations"), icon: MapPin },
    { id: "banner", label: tr("admPromoBanner"), icon: Image },
    { id: "paket", label: tr("admPremiumPackages"), icon: Crown },
    { id: "transaksi", label: tr("admTransactions"), icon: Receipt },
    { id: "laporan", label: tr("admReports"), icon: FileText },
    { id: "audit", label: tr("admAuditTitle"), icon: ScrollText },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 animate-fade-up">
      {/* breadcrumb + header */}
      <div className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <button onClick={goHome} className="hover:text-primary">Beranda</button>
        <ChevronRight className="size-3" />
        <span className="text-foreground">Administrator</span>
      </div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Panel Administrator</h1>
          <p className="text-sm text-muted-foreground">Mengelola seluruh data Gomesin</p>
        </div>
      </div>

      {/* content — tab dikontrol via sidebar, tidak ada tab bar */}
      {tab === "dashboard" && <DashboardTab />}
      {tab === "iklan" && <IklanTab />}
      {tab === "iklanbaru" && <IklanBaruTab />}
      {tab === "iklanexpired" && <IklanExpiredTab />}
      {tab === "iklanditolak" && <IklanDitolakTab />}
      {tab === "penjual" && <PenjualTab />}
      {tab === "kategori" && <KategoriTab />}
      {tab === "pengguna" && <PenggunaTab />}
      {tab === "merek" && <MerekTab />}
      {tab === "lokasi" && <LokasiTab />}
      {tab === "banner" && <BannerTab />}
      {tab === "paket" && <PaketTab />}
      {tab === "transaksi" && <TransaksiTab />}
      {tab === "laporan" && <LaporanTab />}
      {tab === "laporanbulanan" && <MonthlyReportTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}

// ============ DASHBOARD TAB ============
function DashboardTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchJson("/api/admin/stats") });
  if (isLoading || !data) return <SkeletonGrid count={4} />;
  const stats = [
    { label: tr("admTotalUsers"), value: data.totals.users, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: tr("admTotalListings"), value: data.totals.listings, icon: Tag, color: "text-primary", bg: "bg-primary/10" },
    { label: tr("admTotalRevenue"), value: formatRupiahFull(data.totals.omzetAll), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", small: true },
    { label: tr("admAdmins"), value: data.totals.admins, icon: ShieldCheck, color: "text-amber-500", bg: "bg-amber-50" },
  ];
  const periods = [
    { label: tr("admToday"), ...data.users, ...data.listings, omzet: data.omzet.today },
    { label: tr("admThisWeek"), u: data.users.week, l: data.listings.week, omzet: data.omzet.week },
    { label: tr("admThisMonth"), u: data.users.month, l: data.listings.month, omzet: data.omzet.month },
  ];
  const maxOmzet = Math.max(...data.last7Days.map((d: any) => d.omzet), 1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
              <span className={cn("grid size-8 place-items-center rounded-lg", s.bg)}><s.icon className={cn("size-4", s.color)} /></span>
            </div>
            <p className={cn("mt-2 font-bold", s.small ? "text-sm sm:text-base" : "text-xl sm:text-2xl")}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {periods.map((p) => (
          <div key={p.label} className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold">{p.label}</h3>
            <div className="space-y-2 text-sm">
              <Row label={tr("admNewUsers")} value={p.u ?? p.label === "Hari Ini" ? data.users.today : 0} />
              <Row label={tr("admIncomingAds2")} value={p.l ?? 0} />
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Omset</span>
                <span className="font-bold text-emerald-600">{formatRupiahFull(p.omzet)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><BarChart3 className="size-4 text-primary" /> Omset 7 Hari Terakhir</h3>
        <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
          {data.last7Days.map((d: any, i: number) => {
            const h = Math.max(4, (d.omzet / maxOmzet) * 100);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[9px] text-muted-foreground">{d.omzet > 0 ? formatRupiahFull(d.omzet).replace("Rp ", "") : "—"}</span>
                <div className="flex w-full items-end justify-center" style={{ height: 100 }}>
                  <div className="w-full max-w-[32px] rounded-t-md bg-gradient-to-t from-primary to-emerald-400" style={{ height: `${h}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      {data.topCategories.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold"><TrendingUp className="size-4 text-primary" /> Kategori Terpopuler</h3>
          <div className="space-y-2">
            {data.topCategories.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-5 text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <span className="w-40 shrink-0 truncate text-xs font-medium">{c.name}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-primary/70" style={{ width: `${(c.count / Math.max(...data.topCategories.map((x: any) => x.count))) * 100}%` }} /></div>
                <span className="w-8 text-right text-xs font-bold">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ IKLAN TAB ============
function IklanTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings"], queryFn: () => fetchJson("/api/admin/listings") });
  const [previewListing, setPreviewListing] = useState<any>(null);
  const [activeImg, setActiveImg] = useState(0);
  const del = useMutation({
    mutationFn: (id: string) => fetch("/api/admin/listings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }),
    onSuccess: () => { toast.success(tr("admDeleted")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch("/api/admin/listings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }),
    onSuccess: () => { toast.success(tr("admStatusUpdated")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  const setViolation = useMutation({
    mutationFn: ({ id, flag, reason }: { id: string; flag: boolean; reason?: string }) => fetch("/api/admin/listings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, violationFlag: flag, violationReason: reason }) }),
    onSuccess: () => { toast.success(tr("admViolationStatusUpdated")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  if (isLoading || !data) return <SkeletonGrid count={3} />;

  const openPreview = (l: any) => {
    setPreviewListing(l);
    setActiveImg(0);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">Iklan Aktif ({data.listings.length})</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
            <th className="p-2 text-center">No</th><th className="p-2">Iklan</th><th className="p-2">Penjual</th><th className="hidden p-2 sm:table-cell">Harga Pasang Iklan</th><th className="p-2">Bayar</th><th className="p-2">Status</th><th className="p-2 text-center">Aksi</th>
          </tr></thead>
          <tbody>
            {data.listings.map((l: any, idx: number) => (
              <tr
                key={l.id}
                onClick={() => openPreview(l)}
                className={cn("cursor-pointer border-b border-border hover:bg-accent/30", l.violationFlag && "bg-red-50")}
              >
                <td className="p-2 text-center text-xs font-medium text-muted-foreground">{idx + 1}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {l.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.images[0]} alt="" className="size-10 shrink-0 rounded object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.category?.name} · {l.city}</p>
                      {l.violationFlag && <p className="text-[10px] font-semibold text-red-600">⚠ {l.violationReason || "Melanggar"}</p>}
                    </div>
                  </div>
                </td>
                <td className="p-2 text-xs">{l.seller?.name} {l.seller?.verified && <BadgeCheck className="inline size-3 text-primary" />}</td>
                <td className="hidden p-2 text-right text-xs font-bold text-emerald-600 sm:table-cell">{formatAdFee(l.adFee)}</td>
                <td className="p-2"><Badge className={l.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{l.paymentStatus === "paid" ? "Lunas" : "Belum"}</Badge></td>
                <td className="p-2"><Badge className={l.status === "active" ? "bg-emerald-100 text-emerald-700" : l.status === "sold" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}>{l.status}</Badge></td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-1">
                    <button onClick={() => setStatus.mutate({ id: l.id, status: "active" })} className="grid size-7 place-items-center rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200" title="Approve"><CheckCircle2 className="size-4" /></button>
                    <button onClick={() => setViolation.mutate({ id: l.id, flag: !l.violationFlag, reason: tr("admViolationReason") })} className={cn("grid size-7 place-items-center rounded", l.violationFlag ? "bg-red-500 text-white" : "bg-red-100 text-red-600 hover:bg-red-200")} title="Tandai Pelanggaran"><XCircle className="size-4" /></button>
                    <button onClick={() => del.mutate(l.id)} className="grid size-7 place-items-center rounded bg-red-100 text-red-600 hover:bg-red-200" title={tr("admDelete")}><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        <ShieldCheck className="mr-1 inline size-4" />
        {tr("admListingHint")}
      </div>

      {/* PREVIEW DIALOG */}
      {previewListing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewListing(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="line-clamp-1 text-base font-bold">{previewListing.title}</h3>
              <button onClick={() => setPreviewListing(null)} className="grid size-8 place-items-center rounded-lg hover:bg-accent">
                <XCircle className="size-5" />
              </button>
            </div>

            {/* gallery */}
            <div className="p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {previewListing.images?.[activeImg] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewListing.images[activeImg]} alt={previewListing.title} className="size-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">Tidak ada gambar</div>
                )}
                {previewListing.images?.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImg((p) => (p - 1 + previewListing.images.length) % previewListing.images.length)}
                      className="absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => setActiveImg((p) => (p + 1) % previewListing.images.length)}
                      className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                      {activeImg + 1} / {previewListing.images.length}
                    </span>
                  </>
                )}
              </div>

              {/* thumbnails */}
              {previewListing.images?.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                  {previewListing.images.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={cn(
                        "relative size-14 shrink-0 overflow-hidden rounded-lg border-2",
                        i === activeImg ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* info */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={previewListing.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>{previewListing.status}</Badge>
                  <Badge className={previewListing.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{previewListing.paymentStatus === "paid" ? "Lunas" : "Belum Bayar"}</Badge>
                  {previewListing.condition === "baru" ? <Badge className="bg-primary">Baru</Badge> : <Badge className="bg-emerald-600">Bekas</Badge>}
                  {previewListing.featured && <Badge className="bg-amber-500">Featured</Badge>}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                  <DollarSign className="size-4 text-emerald-600" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Harga Pasang Iklan</p>
                    <p className="text-lg font-bold text-emerald-600">{formatAdFee(previewListing.adFee)}</p>
                  </div>
                  <Badge className={cn("ml-auto", previewListing.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{previewListing.paymentStatus === "paid" ? "Lunas" : "Belum Bayar"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{previewListing.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Kategori:</span> {previewListing.category?.name}</div>
                  <div><span className="text-muted-foreground">Brand:</span> {previewListing.brand || "-"}</div>
                  <div><span className="text-muted-foreground">Lokasi:</span> {previewListing.city}, {previewListing.province}</div>
                  <div><span className="text-muted-foreground">Penjual:</span> {previewListing.seller?.name}</div>
                  <div><span className="text-muted-foreground">Views:</span> {previewListing.views?.toLocaleString("id-ID")}</div>
                  <div><span className="text-muted-foreground">Tahun:</span> {previewListing.yearProduced || "-"}</div>
                </div>
                {previewListing.violationFlag && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600">
                    ⚠ Ditandai pelanggaran: {previewListing.violationReason || tr("admViolationReason")}
                  </div>
                )}
              </div>

              {/* actions */}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button size="sm" variant="default" onClick={() => { setStatus.mutate({ id: previewListing.id, status: "active" }); setPreviewListing(null); }}>
                  <CheckCircle2 className="size-4" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setViolation.mutate({ id: previewListing.id, flag: !previewListing.violationFlag, reason: tr("admViolationReason") }); setPreviewListing(null); }}>
                  <XCircle className="size-4" /> {previewListing.violationFlag ? "Hapus Pelanggaran" : "Tandai Pelanggaran"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { del.mutate(previewListing.id); setPreviewListing(null); }}>
                  <Trash2 className="size-4" /> Hapus Iklan
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ IKLAN BARU TAB (unpaid / pending verification) ============
function IklanBaruTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings"], queryFn: () => fetchJson("/api/admin/listings") });
  const [previewListing, setPreviewListing] = useState<any>(null);
  const [activeImg, setActiveImg] = useState(0);
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch("/api/admin/listings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }),
    onSuccess: () => { toast.success(tr("admListingStatusUpdated")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  if (isLoading || !data) return <SkeletonGrid count={3} />;

  // filter: iklan baru = status pending (belum diverifikasi admin)
  const newListings = data.listings.filter((l: any) => l.status === "pending");

  const approve = (id: string) => {
    setStatus.mutate({ id, status: "active" });
  };
  const reject = (id: string) => {
    if (confirm(tr("admRejectConfirm"))) {
      setStatus.mutate({ id, status: "rejected" });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold">Iklan Baru — Perlu Verifikasi ({newListings.length})</h2>
      {newListings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
          <p className="mt-2 text-sm font-semibold">Tidak ada iklan baru</p>
          <p className="text-xs text-muted-foreground">Semua iklan sudah diverifikasi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {newListings.map((l: any, idx: number) => (
            <div
              key={l.id}
              className="overflow-hidden rounded-xl border-2 border-amber-300 bg-card"
            >
              {/* gambar seperti di beranda */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {l.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.images[0]} alt={l.title} className="size-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><Image className="size-10" /></div>
                )}
                <span className="absolute left-2 top-2 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow">
                  Menunggu Verifikasi
                </span>
                <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                {l.images?.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                    {l.images.length} foto
                  </span>
                )}
              </div>

              {/* info */}
              <div className="space-y-1.5 p-3">
                <p className="text-base font-bold text-primary">{formatRupiahFull(l.price)}</p>
                {l.priceType === "negotiable" && <span className="text-[10px] text-muted-foreground">Nego</span>}
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">{l.title}</h3>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Pemasang:</span> {l.seller?.name}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {l.city}, {l.province}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {l.category?.name} · {l.condition === "baru" ? tr("commonBaru") : tr("commonBekas")}
                  {l.brand ? ` · ${l.brand}` : ""}
                </p>

                {/* tombol verifikasi & ditolak */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => approve(l.id)}
                    disabled={setStatus.isPending}
                  >
                    <CheckCircle2 className="size-4" />
                    Verifikasi
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 gap-1"
                    onClick={() => reject(l.id)}
                    disabled={setStatus.isPending}
                  >
                    <XCircle className="size-4" />
                    Ditolak
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        <Sparkle className="mr-1 inline size-4" />
        {tr("admNewAdsHint")}
      </div>

      {/* PREVIEW DIALOG (reuse same popup) */}
      {previewListing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewListing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="line-clamp-1 text-base font-bold">{previewListing.title}</h3>
              <button onClick={() => setPreviewListing(null)} className="grid size-8 place-items-center rounded-lg hover:bg-accent"><XCircle className="size-5" /></button>
            </div>
            <div className="p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {previewListing.images?.[activeImg] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewListing.images[activeImg]} alt={previewListing.title} className="size-full object-cover" />
                )}
                {previewListing.images?.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg((p) => (p - 1 + previewListing.images.length) % previewListing.images.length)} className="absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"><ChevronLeft className="size-4" /></button>
                    <button onClick={() => setActiveImg((p) => (p + 1) % previewListing.images.length)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"><ChevronRight className="size-4" /></button>
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{activeImg + 1} / {previewListing.images.length}</span>
                  </>
                )}
              </div>
              {previewListing.images?.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                  {previewListing.images.map((img: string, i: number) => (
                    <button key={i} onClick={() => setActiveImg(i)} className={cn("relative size-14 shrink-0 overflow-hidden rounded-lg border-2", i === activeImg ? "border-primary" : "border-transparent opacity-60")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={previewListing.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{previewListing.paymentStatus === "paid" ? "Lunas" : "Belum Bayar"}</Badge>
                  <Badge className="bg-blue-100 text-blue-700">{previewListing.status}</Badge>
                  {previewListing.condition === "baru" ? <Badge className="bg-primary">Baru</Badge> : <Badge className="bg-emerald-600">Bekas</Badge>}
                </div>
                <p className="text-2xl font-bold text-primary">{formatRupiahFull(previewListing.price)}</p>
                <p className="text-sm text-muted-foreground">{previewListing.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Kategori:</span> {previewListing.category?.name}</div>
                  <div><span className="text-muted-foreground">Brand:</span> {previewListing.brand || "-"}</div>
                  <div><span className="text-muted-foreground">Lokasi:</span> {previewListing.city}, {previewListing.province}</div>
                  <div><span className="text-muted-foreground">Penjual:</span> {previewListing.seller?.name}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button size="sm" variant="default" onClick={() => { setStatus.mutate({ id: previewListing.id, status: "active" }); setPreviewListing(null); }}><CheckCircle2 className="size-4" /> Setujui & Tayangkan</Button>
                <Button size="sm" variant="destructive" onClick={() => { setStatus.mutate({ id: previewListing.id, status: "rejected" }); setPreviewListing(null); }}><XCircle className="size-4" /> Tolak Iklan</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ IKLAN EXPIRED TAB (paymentExpiry < now) ============
function IklanExpiredTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings"], queryFn: () => fetchJson("/api/admin/listings") });
  const [previewListing, setPreviewListing] = useState<any>(null);
  const [activeImg, setActiveImg] = useState(0);
  const renew = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) => fetch("/api/admin/listings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "active", paymentExpiry: new Date(Date.now() + days * 86400000).toISOString() }) }),
    onSuccess: () => { toast.success(tr("admExtended")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => fetch("/api/admin/listings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }),
    onSuccess: () => { toast.success(tr("admDeleted")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  if (isLoading || !data) return <SkeletonGrid count={3} />;

  const now = new Date();
  const expiredListings = data.listings.filter((l: any) => {
    if (!l.paymentExpiry) return false;
    return new Date(l.paymentExpiry) < now;
  });

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">Iklan Expired — Perlu Perpanjangan ({expiredListings.length})</h2>
      {expiredListings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
          <p className="mt-2 text-sm font-semibold">Tidak ada iklan expired</p>
          <p className="text-xs text-muted-foreground">Semua iklan masih dalam masa aktif.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expiredListings.map((l: any, idx: number) => (
            <div
              key={l.id}
              onClick={() => { setPreviewListing(l); setActiveImg(0); }}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:bg-accent/30"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">{idx + 1}</span>
              {l.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.images[0]} alt="" className="size-12 shrink-0 rounded-lg object-cover opacity-60" />
              ) : (
                <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted"><Image className="size-5 text-muted-foreground" /></div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.seller?.name} · {l.city} · {formatRupiahFull(l.price)}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge className="bg-red-100 text-red-700"><Clock className="mr-0.5 size-3" /> Expired</Badge>
                  {l.paymentExpiry && <span className="text-[10px] text-muted-foreground">Berakhir: {fmtDate(l.paymentExpiry)}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => renew.mutate({ id: l.id, days: 30 })} className="grid size-8 place-items-center rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200" title="Perpanjang 30 hari"><RefreshCw className="size-4" /></button>
                <button onClick={() => del.mutate(l.id)} className="grid size-8 place-items-center rounded bg-red-100 text-red-600 hover:bg-red-200" title={tr("admDelete")}><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
        <Clock className="mr-1 inline size-4" />
        Iklan expired adalah iklan yang masa tayangnya sudah habis (paymentExpiry terlewati). Perpanjang untuk aktifkan kembali, atau hapus jika tidak diperlukan.
      </div>

      {/* PREVIEW DIALOG */}
      {previewListing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewListing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="line-clamp-1 text-base font-bold">{previewListing.title}</h3>
              <button onClick={() => setPreviewListing(null)} className="grid size-8 place-items-center rounded-lg hover:bg-accent"><XCircle className="size-5" /></button>
            </div>
            <div className="p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {previewListing.images?.[activeImg] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewListing.images[activeImg]} alt={previewListing.title} className="size-full object-cover" />
                )}
                {previewListing.images?.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg((p) => (p - 1 + previewListing.images.length) % previewListing.images.length)} className="absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"><ChevronLeft className="size-4" /></button>
                    <button onClick={() => setActiveImg((p) => (p + 1) % previewListing.images.length)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"><ChevronRight className="size-4" /></button>
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{activeImg + 1} / {previewListing.images.length}</span>
                  </>
                )}
              </div>
              {previewListing.images?.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                  {previewListing.images.map((img: string, i: number) => (
                    <button key={i} onClick={() => setActiveImg(i)} className={cn("relative size-14 shrink-0 overflow-hidden rounded-lg border-2", i === activeImg ? "border-primary" : "border-transparent opacity-60")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-700"><Clock className="mr-0.5 size-3" /> Expired</Badge>
                  {previewListing.paymentExpiry && <span className="text-xs text-muted-foreground">Berakhir: {fmtDate(previewListing.paymentExpiry)}</span>}
                </div>
                <p className="text-2xl font-bold text-primary">{formatRupiahFull(previewListing.price)}</p>
                <p className="text-sm text-muted-foreground">{previewListing.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Kategori:</span> {previewListing.category?.name}</div>
                  <div><span className="text-muted-foreground">Brand:</span> {previewListing.brand || "-"}</div>
                  <div><span className="text-muted-foreground">Lokasi:</span> {previewListing.city}, {previewListing.province}</div>
                  <div><span className="text-muted-foreground">Penjual:</span> {previewListing.seller?.name}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button size="sm" variant="default" onClick={() => { renew.mutate({ id: previewListing.id, days: 30 }); setPreviewListing(null); }}><RefreshCw className="size-4" /> Perpanjang 30 Hari</Button>
                <Button size="sm" variant="outline" onClick={() => { renew.mutate({ id: previewListing.id, days: 90 }); setPreviewListing(null); }}><RefreshCw className="size-4" /> Perpanjang 90 Hari</Button>
                <Button size="sm" variant="destructive" onClick={() => { del.mutate(previewListing.id); setPreviewListing(null); }}><Trash2 className="size-4" /> Hapus Iklan</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ IKLAN DITOLAK TAB ============
function IklanDitolakTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings"], queryFn: () => fetchJson("/api/admin/listings") });
  const [previewListing, setPreviewListing] = useState<any>(null);
  const [activeImg, setActiveImg] = useState(0);
  const restore = useMutation({
    mutationFn: ({ id }: { id: string }) => fetch("/api/admin/listings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "active", violationFlag: false, violationReason: null }) }),
    onSuccess: () => { toast.success(tr("admRestored")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => fetch("/api/admin/listings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }),
    onSuccess: () => { toast.success(tr("admDeletedPermanent")); qc.invalidateQueries({ queryKey: ["admin-listings"] }); },
  });
  if (isLoading || !data) return <SkeletonGrid count={3} />;

  const rejectedListings = data.listings.filter((l: any) => l.status === "rejected" || l.violationFlag === true);

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">Iklan Ditolak ({rejectedListings.length})</h2>
      {rejectedListings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
          <p className="mt-2 text-sm font-semibold">Tidak ada iklan ditolak</p>
          <p className="text-xs text-muted-foreground">Semua iklan dalam status baik.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rejectedListings.map((l: any, idx: number) => (
            <div
              key={l.id}
              onClick={() => { setPreviewListing(l); setActiveImg(0); }}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 transition hover:bg-red-100/50"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-200 text-xs font-bold text-red-700">{idx + 1}</span>
              {l.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.images[0]} alt="" className="size-12 shrink-0 rounded-lg object-cover opacity-60" />
              ) : (
                <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted"><Image className="size-5 text-muted-foreground" /></div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-muted-foreground">{l.seller?.name} · {l.city} · {formatRupiahFull(l.price)}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge className="bg-red-100 text-red-700"><XCircle className="mr-0.5 size-3" /> Ditolak</Badge>
                  {l.violationReason && <span className="text-[10px] text-red-600">{l.violationReason}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => restore.mutate({ id: l.id })} className="grid size-8 place-items-center rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200" title="Pulihkan & Tayangkan"><CheckCircle2 className="size-4" /></button>
                <button onClick={() => { if (confirm("Hapus permanen?")) del.mutate(l.id); }} className="grid size-8 place-items-center rounded bg-red-100 text-red-600 hover:bg-red-200" title="Hapus Permanen"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        <XCircle className="mr-1 inline size-4" />
        Iklan ditolak karena melanggar ketentuan atau ditolak admin. Pulihkan untuk tayang kembali, atau hapus permanen.
      </div>

      {/* PREVIEW DIALOG */}
      {previewListing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewListing(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="line-clamp-1 text-base font-bold">{previewListing.title}</h3>
              <button onClick={() => setPreviewListing(null)} className="grid size-8 place-items-center rounded-lg hover:bg-accent"><XCircle className="size-5" /></button>
            </div>
            <div className="p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                {previewListing.images?.[activeImg] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewListing.images[activeImg]} alt={previewListing.title} className="size-full object-cover" />
                )}
                {previewListing.images?.length > 1 && (
                  <>
                    <button onClick={() => setActiveImg((p) => (p - 1 + previewListing.images.length) % previewListing.images.length)} className="absolute left-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"><ChevronLeft className="size-4" /></button>
                    <button onClick={() => setActiveImg((p) => (p + 1) % previewListing.images.length)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/80 shadow hover:bg-white"><ChevronRight className="size-4" /></button>
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{activeImg + 1} / {previewListing.images.length}</span>
                  </>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-700"><XCircle className="mr-0.5 size-3" /> Ditolak</Badge>
                  {previewListing.violationReason && <span className="text-xs text-red-600">Alasan: {previewListing.violationReason}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{previewListing.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Kategori:</span> {previewListing.category?.name}</div>
                  <div><span className="text-muted-foreground">Penjual:</span> {previewListing.seller?.name}</div>
                  <div><span className="text-muted-foreground">Lokasi:</span> {previewListing.city}, {previewListing.province}</div>
                  <div><span className="text-muted-foreground">Harga:</span> {formatRupiahFull(previewListing.price)}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button size="sm" variant="default" onClick={() => { restore.mutate({ id: previewListing.id }); setPreviewListing(null); }}><CheckCircle2 className="size-4" /> Pulihkan & Tayangkan</Button>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Hapus permanen?")) { del.mutate(previewListing.id); setPreviewListing(null); } }}><Trash2 className="size-4" /> Hapus Permanen</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PENJUAL TAB ============
function PenjualTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-sellers"], queryFn: () => fetchJson("/api/admin/sellers") });
  const toggle = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) => fetch("/api/admin/sellers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, verified }) }),
    onSuccess: () => { toast.success(tr("admSellerStatusUpdated")); qc.invalidateQueries({ queryKey: ["admin-sellers"] }); },
  });
  if (isLoading || !data) return <SkeletonGrid count={3} />;
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">Verifikasi Penjual ({data.sellers.length})</h2>
      <div className="space-y-2">
        {data.sellers.map((s: any) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{s.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1"><p className="truncate text-sm font-semibold">{s.name}</p>{s.verified && <BadgeCheck className="size-4 shrink-0 text-primary" />}</div>
              <p className="truncate text-xs text-muted-foreground">{s.phone} · {s.city}, {s.province}</p>
              <p className="text-[10px] text-muted-foreground">{s.listingCount} iklan · ⭐ {s.rating} ({s.reviewCount} ulasan)</p>
            </div>
            <Button size="sm" variant={s.verified ? "outline" : "default"} onClick={() => toggle.mutate({ id: s.id, verified: !s.verified })}>
              {s.verified ? <><XCircle className="size-3.5" /> Cabut</> : <><CheckCircle2 className="size-3.5" /> Verifikasi</>}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ KATEGORI TAB ============
function KategoriTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-categories"], queryFn: () => fetchJson("/api/admin/categories") });
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [icon, setIcon] = useState("Cog");
  const create = useMutation({
    mutationFn: () => fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), icon }) }),
    onSuccess: () => { toast.success(tr("admCategoryAdded")); setShowForm(false); setName(""); setSlug(""); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success(tr("admCategoryDeleted")); qc.invalidateQueries({ queryKey: ["admin-categories"] }); },
  });
  if (isLoading || !data) return <SkeletonGrid count={3} />;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Kelola Kategori ({data.categories.length})</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="size-4" /> Tambah</Button>
      </div>
      {showForm && (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
          <div><Label className="text-xs">Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kategori" /></div>
          <div><Label className="text-xs">Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" /></div>
          <div><Label className="text-xs">Icon</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Cog" /></div>
          <div className="flex items-end"><Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? <Loader2 className="size-4 animate-spin" /> : "Simpan"}</Button></div>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {data.categories.map((c: any) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <span className="text-xs font-bold text-muted-foreground">#{c.sortOrder}</span>
            <div className="flex-1"><p className="text-sm font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.slug} · {c.listingCount} iklan</p></div>
            <button onClick={() => del.mutate(c.id)} className="grid size-7 place-items-center rounded bg-red-100 text-red-600 hover:bg-red-200" title={tr("admDelete")}><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ PENGGUNA TAB ============
function PenggunaTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchJson("/api/admin/users") });
  const [previewUser, setPreviewUser] = useState<any>(null);
  const del = useMutation({
    mutationFn: (id: string) => fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }),
    onSuccess: () => { toast.success(tr("admUserDeleted")); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => { const msg = e?.message || tr("admDeleteFailed2"); toast.error(msg); },
  });
  if (isLoading || !data) return <SkeletonGrid count={3} />;
  const users = data.users;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const isAdmin = (u: any) => u.role === "admin" || u.role === "superadmin";

  const handleDelete = (u: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin(u)) { toast.error(tr("admCannotDeleteAdmin")); return; }
    if (confirm(`Hapus user "${u.name}" (${u.email})?`)) {
      del.mutate(u.id);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">Pengguna Terdaftar ({users.length})</h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
            <th className="p-2">Nama</th><th className="p-2">Email</th><th className="hidden p-2 sm:table-cell">No. HP</th><th className="hidden p-2 sm:table-cell">Kota</th><th className="p-2">Role</th><th className="hidden p-2 sm:table-cell">Daftar</th><th className="p-2 text-center">Aksi</th>
          </tr></thead>
          <tbody>
            {users.map((u: any) => (
              <tr
                key={u.id}
                onClick={() => setPreviewUser(u)}
                className="cursor-pointer border-b border-border hover:bg-accent/30"
              >
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {u.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                    </span>
                    <span className="text-xs font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="p-2 text-xs text-muted-foreground">{u.email}</td>
                <td className="hidden p-2 text-xs sm:table-cell">{u.phone || "-"}</td>
                <td className="hidden p-2 text-xs sm:table-cell">{u.city || "-"}</td>
                <td className="p-2"><Badge className={isAdmin(u) ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}>{u.role}</Badge></td>
                <td className="hidden p-2 text-xs text-muted-foreground sm:table-cell">{fmtDate(u.createdAt)}</td>
                <td className="p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <button
                      onClick={(e) => handleDelete(u, e)}
                      disabled={isAdmin(u) || del.isPending}
                      className={cn(
                        "grid size-7 place-items-center rounded transition",
                        isAdmin(u) ? "cursor-not-allowed bg-muted text-muted-foreground/40" : "bg-red-100 text-red-600 hover:bg-red-200"
                      )}
                      title={isAdmin(u) ? "Tidak dapat menghapus admin" : "Hapus user"}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* POPUP DATA USER LENGKAP */}
      {previewUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewUser(null)}
        >
          <div
            className="w-full max-w-md overflow-y-auto rounded-xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-base font-bold">Detail Pengguna</h3>
              <button onClick={() => setPreviewUser(null)} className="grid size-8 place-items-center rounded-lg hover:bg-accent">
                <XCircle className="size-5" />
              </button>
            </div>

            {/* content */}
            <div className="p-4 space-y-4">
              {/* avatar + name */}
              <div className="flex items-center gap-3">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {previewUser.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-bold">{previewUser.name}</p>
                  <Badge className={isAdmin(previewUser) ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}>{previewUser.role}</Badge>
                </div>
              </div>

              {/* data lengkap */}
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="size-3.5" /> Email</span>
                  <span className="font-medium">{previewUser.email}</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3.5" /> No. HP</span>
                  <span className="font-medium">{previewUser.phone || "-"}</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-3.5" /> Kota</span>
                  <span className="font-medium">{previewUser.city || "-"}</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="size-3.5" /> Tanggal Daftar</span>
                  <span className="font-medium">{fmtDate(previewUser.createdAt)}</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="size-3.5" /> Role</span>
                  <Badge className={isAdmin(previewUser) ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}>{previewUser.role}</Badge>
                </div>
              </div>

              {/* actions */}
              {!isAdmin(previewUser) ? (
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => {
                    if (confirm(`Hapus user "${previewUser.name}"?`)) {
                      del.mutate(previewUser.id);
                      setPreviewUser(null);
                    }
                  }}
                  disabled={del.isPending}
                >
                  <Trash2 className="size-4" /> Hapus User
                </Button>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
                  <ShieldCheck className="mx-auto mb-1 size-5" />
                  Akun admin tidak dapat dihapus
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MEREK TAB ============
function MerekTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings"], queryFn: () => fetchJson("/api/admin/listings") });
  const [extraBrands, setExtraBrands] = useState<string[]>([]);
  const [newBrand, setNewBrand] = useState("");

  if (isLoading || !data) return <SkeletonGrid count={3} />;

  // Compute brands from listings + extra brands added by admin
  const brands: Record<string, number> = {};
  data.listings.forEach((l: any) => { if (l.brand) brands[l.brand] = (brands[l.brand] || 0) + 1; });
  extraBrands.forEach((b) => { if (!(b in brands)) brands[b] = 0; });
  const sorted = Object.entries(brands).sort((a, b) => b[1] - a[1]);

  const addBrand = () => {
    const name = newBrand.trim();
    if (!name) return;
    if (name in brands) { toast.error(tr("admBrandExists")); return; }
    setExtraBrands([...extraBrands, name]);
    setNewBrand("");
    toast.success(tr("admBrandAdded"));
  };

  const deleteBrand = (name: string) => {
    setExtraBrands(extraBrands.filter((b) => b !== name));
    toast.success(tr("admBrandDeleted"));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Kelola Merek ({sorted.length})</h2>
      </div>
      <div className="flex gap-2">
        <Input
          value={newBrand}
          onChange={(e) => setNewBrand(e.target.value)}
          placeholder="Nama merek baru (mis. Heidelberg)"
          className="h-9"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBrand(); } }}
        />
        <Button size="sm" onClick={addBrand} disabled={!newBrand.trim()}>
          <Plus className="size-4" /> Tambah
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {sorted.map(([brand, count]) => (
          <div key={brand} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 min-w-0">
              <Award className="size-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{brand}</p>
                <p className="text-xs text-muted-foreground">{count} iklan</p>
              </div>
            </div>
            <button
              onClick={() => deleteBrand(brand)}
              className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Hapus merek"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Belum ada merek. Tambah merek baru di atas.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ LOKASI TAB ============
function LokasiTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings"], queryFn: () => fetchJson("/api/admin/listings") });
  const [extraCities, setExtraCities] = useState<string[]>([]);
  const [extraProvinces, setExtraProvinces] = useState<string[]>([]);
  const [newCity, setNewCity] = useState("");
  const [newProvince, setNewProvince] = useState("");

  if (isLoading || !data) return <SkeletonGrid count={3} />;

  // Compute from listings + extra entries
  const cities: Record<string, number> = {};
  const provinces: Record<string, number> = {};
  data.listings.forEach((l: any) => {
    cities[l.city] = (cities[l.city] || 0) + 1;
    provinces[l.province] = (provinces[l.province] || 0) + 1;
  });
  extraCities.forEach((c) => { if (!(c in cities)) cities[c] = 0; });
  extraProvinces.forEach((p) => { if (!(p in provinces)) provinces[p] = 0; });
  const cityList = Object.entries(cities).sort((a, b) => b[1] - a[1]);
  const provList = Object.entries(provinces).sort((a, b) => b[1] - a[1]);

  const addCity = () => {
    const name = newCity.trim();
    if (!name) return;
    if (name in cities) { toast.error(tr("admCityExists")); return; }
    setExtraCities([...extraCities, name]);
    setNewCity("");
    toast.success(tr("admCityAdded"));
  };
  const addProvince = () => {
    const name = newProvince.trim();
    if (!name) return;
    if (name in provinces) { toast.error(tr("admProvinceExists")); return; }
    setExtraProvinces([...extraProvinces, name]);
    setNewProvince("");
    toast.success(tr("admProvinceAdded"));
  };
  const deleteCity = (name: string) => {
    setExtraCities(extraCities.filter((c) => c !== name));
    toast.success(tr("admCityDeleted"));
  };
  const deleteProvince = (name: string) => {
    setExtraProvinces(extraProvinces.filter((p) => p !== name));
    toast.success(tr("admProvinceDeleted"));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold">Kelola Lokasi</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Cities */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Kota ({cityList.length})</h3>
          </div>
          <div className="mb-2 flex gap-2">
            <Input
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Tambah kota..."
              className="h-9"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCity(); } }}
            />
            <Button size="sm" onClick={addCity} disabled={!newCity.trim()}>
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {cityList.map(([city, count]) => (
              <div key={city} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span className="flex items-center gap-1"><MapPin className="size-3 text-primary" />{city}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{count}</Badge>
                  <button onClick={() => deleteCity(city)} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Hapus kota">
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            ))}
            {cityList.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Belum ada kota.</div>
            )}
          </div>
        </div>
        {/* Provinces */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Provinsi ({provList.length})</h3>
          </div>
          <div className="mb-2 flex gap-2">
            <Input
              value={newProvince}
              onChange={(e) => setNewProvince(e.target.value)}
              placeholder="Tambah provinsi..."
              className="h-9"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProvince(); } }}
            />
            <Button size="sm" onClick={addProvince} disabled={!newProvince.trim()}>
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {provList.map(([prov, count]) => (
              <div key={prov} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span>{prov}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{count}</Badge>
                  <button onClick={() => deleteProvince(prov)} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Hapus provinsi">
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            ))}
            {provList.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Belum ada provinsi.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ BANNER TAB ============
function BannerTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const [banners, setBanners] = useState([
    { id: 1, title: tr("admBanner1Title"), status: "active", placement: "Home Hero", clicks: 342 },
    { id: 2, title: tr("admBanner2Title"), status: "scheduled", placement: "Category Page", clicks: 0 },
    { id: 3, title: tr("admBanner3Title"), status: "active", placement: "Sidebar", clicks: 128 },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPlacement, setNewPlacement] = useState("Home Hero");

  const addBanner = () => {
    if (!newTitle.trim()) return;
    setBanners([...banners, { id: Date.now(), title: newTitle.trim(), status: "scheduled", placement: newPlacement, clicks: 0 }]);
    setNewTitle("");
    setShowForm(false);
    toast.success(tr("admBannerAdded"));
  };
  const toggleStatus = (id: number) => {
    setBanners(banners.map(b => b.id === id ? { ...b, status: b.status === "active" ? "scheduled" : "active" } : b));
  };
  const deleteBanner = (id: number) => {
    setBanners(banners.filter(b => b.id !== id));
    toast.success(tr("admBannerDeleted"));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Banner Promosi ({banners.length})</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" /> {showForm ? "Batal" : "Tambah Banner"}
        </Button>
      </div>

      {/* Add banner form */}
      {showForm && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Judul banner (mis. Promo Lebaran)"
            className="h-9"
          />
          <div className="flex gap-2">
            <select
              value={newPlacement}
              onChange={(e) => setNewPlacement(e.target.value)}
              className="h-9 flex-1 rounded-md border border-border bg-card px-2 text-sm"
            >
              <option value="Home Hero">Home Hero</option>
              <option value="Category Page">Category Page</option>
              <option value="Sidebar">Sidebar</option>
              <option value="Detail Page">Detail Page</option>
            </select>
            <Button size="sm" onClick={addBanner} disabled={!newTitle.trim()}>
              <CheckCircle2 className="size-4" /> Simpan
            </Button>
          </div>
        </div>
      )}

      {/* Banner list */}
      <div className="space-y-2">
        {banners.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Image className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.placement} · {b.clicks} klik</p>
            </div>
            <button
              onClick={() => toggleStatus(b.id)}
              className="shrink-0"
              title="Toggle aktif"
            >
              <Badge className={b.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                {b.status === "active" ? tr("admActive2") : tr("admScheduled")}
              </Badge>
            </button>
            <button
              onClick={() => deleteBanner(b.id)}
              className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Hapus banner"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {tr("admNoBanner")}
          </div>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">Kelola banner promosi yang tampil di beranda & halaman kategori.</p>
    </div>
  );
}

// ============ PAKET TAB ============
function PaketTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-paket"], queryFn: () => fetchJson("/api/admin/paket") });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editFeatures, setEditFeatures] = useState("");

  const saveMutation = useMutation({
    mutationFn: (payload: any) => fetch("/api/admin/paket", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
    onSuccess: () => { toast.success("Paket berhasil disimpan"); setEditingId(null); qc.invalidateQueries({ queryKey: ["admin-paket"] }); },
    onError: (e: any) => { toast.error("Gagal menyimpan paket"); },
  });

  if (isLoading || !data) return <SkeletonGrid count={3} />;

  const pakets = data.pakets || [];
  const iconMap: Record<string, any> = { gratis: Tag, sundul: TrendingUp, highlight: Zap, spotlight: Crown };
  const colorMap: Record<string, string> = {
    gratis: "border-border",
    sundul: "border-purple-400 ring-1 ring-purple-200",
    highlight: "border-orange-400 ring-1 ring-orange-200",
    spotlight: "border-amber-400 ring-1 ring-amber-200",
  };
  const iconColorMap: Record<string, string> = {
    gratis: "text-muted-foreground",
    sundul: "text-purple-500",
    highlight: "text-orange-500",
    spotlight: "text-amber-500",
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(String(p.price));
    setEditDuration(String(p.duration));
    setEditFeatures((p.features || []).join("\n"));
  };

  const saveEdit = (p: any) => {
    saveMutation.mutate({
      id: p.id,
      name: editName,
      price: Number(editPrice),
      duration: Number(editDuration),
      features: editFeatures.split("\n").map((f: string) => f.trim()).filter(Boolean),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Paket Iklan</h2>
        <p className="text-xs text-muted-foreground">Klik Edit untuk mengubah paket</p>
      </div>

      {/* paket cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pakets.map((p: any) => {
          const Icon = iconMap[p.key] || Tag;
          const isEditing = editingId === p.id;
          return (
            <div key={p.id} className={cn("rounded-xl border-2 bg-card p-5", colorMap[p.key] || "border-border")}>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-lg bg-secondary">
                  <Icon className={cn("size-5", iconColorMap[p.key] || "text-muted-foreground")} />
                </span>
                {p.active ? <Badge variant="secondary">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>}
              </div>

              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama paket" className="w-full rounded border border-border px-2 py-1 text-sm" />
                  <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" placeholder="Harga (Rp)" className="w-full rounded border border-border px-2 py-1 text-sm" />
                  <input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} type="number" placeholder="Durasi (hari)" className="w-full rounded border border-border px-2 py-1 text-sm" />
                  <textarea value={editFeatures} onChange={(e) => setEditFeatures(e.target.value)} placeholder="Fitur (1 per baris)" rows={4} className="w-full rounded border border-border px-2 py-1 text-xs" />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1" onClick={() => saveEdit(p)} disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Simpan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Batal</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-lg font-bold">{p.name}</p>
                  <p className="mt-1 text-2xl font-extrabold text-primary">
                    {p.price === 0 ? "Gratis" : formatRupiahFull(p.price)}
                    <span className="text-xs font-normal text-muted-foreground">/{p.duration} hari</span>
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {(p.features || []).map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" className="mt-4 w-full gap-1.5" onClick={() => startEdit(p)}>
                    <Edit className="size-3.5" /> Edit Paket
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ TRANSAKSI TAB ============
function TransaksiTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const { data, isLoading } = useQuery({ queryKey: ["admin-listings"], queryFn: () => fetchJson("/api/admin/listings") });
  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading || !data) return <SkeletonGrid count={3} />;

  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday); const dow = (startWeek.getDay() + 6) % 7; startWeek.setDate(startWeek.getDate() - dow);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const all = data.listings;
  // Harga pasang iklan diambil dari field `adFee` yang sudah dihitung di sisi
  // server (/api/admin/listings) dari tabel Paket — sehingga realtime, tidak
  // perlu fetch paket terpisah dan tidak ada race condition.
  const adFee = (l: any) => l.adFee ?? 0;

  const daily = all.filter((l: any) => new Date(l.createdAt) >= startToday);
  const weekly = all.filter((l: any) => new Date(l.createdAt) >= startWeek);
  const monthly = all.filter((l: any) => new Date(l.createdAt) >= startMonth && new Date(l.createdAt) < now);
  const lastMonth = all.filter((l: any) => {
    const d = new Date(l.createdAt);
    return d >= startLastMonth && d < startMonth;
  });

  const sumFee = (list: any[]) => list.reduce((a, l) => a + adFee(l), 0);
  const sumViews = (list: any[]) => list.reduce((a, l) => a + (l.views || 0), 0);

  const periods = [
    { key: "harian", label: tr("admToday"), icon: Clock, data: daily, fee: sumFee(daily), views: sumViews(daily), color: "text-blue-500", bg: "bg-blue-50" },
    { key: "mingguan", label: tr("admThisWeek"), icon: Clock, data: weekly, fee: sumFee(weekly), views: sumViews(weekly), color: "text-primary", bg: "bg-primary/10" },
    { key: "bulanan", label: tr("admThisMonth"), icon: Clock, data: monthly, fee: sumFee(monthly), views: sumViews(monthly), color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "bulanlalu", label: tr("admLastMonth"), icon: Clock, data: lastMonth, fee: sumFee(lastMonth), views: sumViews(lastMonth), color: "text-amber-500", bg: "bg-amber-50" },
  ];

  const toggle = (key: string) => setExpanded(expanded === key ? null : key);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold">Riwayat Penjualan</h2>

      {/* summary cards — clickable to expand */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => toggle(p.key)}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition",
              expanded === p.key ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/30"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{p.label}</span>
              <span className={cn("grid size-8 place-items-center rounded-lg", p.bg)}><p.icon className={cn("size-4", p.color)} /></span>
            </div>
            <p className="mt-2 text-lg font-bold text-emerald-600">{formatRupiahFull(p.fee)}</p>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{p.data.length} iklan</span>
              <span>{p.views.toLocaleString("id-ID")} views</span>
            </div>
            <div className="mt-2 text-[10px] font-semibold text-primary">
              {expanded === p.key ? "▲ Tutup Perincian" : "▼ Lihat Perincian"}
            </div>
          </button>
        ))}
      </div>

      {/* expanded detail table */}
      {expanded && (() => {
        const p = periods.find(x => x.key === expanded);
        if (!p) return null;
        return (
          <div className="rounded-xl border border-border bg-card animate-fade-up">
            <div className="border-b border-border p-3">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <p.icon className={cn("size-4", p.color)} />
                {p.label} — {p.data.length} Iklan
                <span className="ml-auto text-xs font-normal text-muted-foreground">Total: {formatRupiahFull(p.fee)}</span>
              </h3>
            </div>
            {p.data.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Belum ada iklan pada periode ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
                    <th className="p-2">Iklan</th><th className="hidden p-2 sm:table-cell">Penjual</th><th className="p-2 text-right">Harga Pasang</th><th className="hidden p-2 sm:table-cell">Tanggal</th><th className="p-2 text-center">Views</th>
                  </tr></thead>
                  <tbody>
                    {p.data.map((l: any) => (
                      <tr key={l.id} className="border-b border-border hover:bg-accent/30">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {l.images?.[0] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.images[0]} alt="" className="size-8 shrink-0 rounded object-cover" />
                            )}
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-xs font-medium">{l.title}</p>
                              <p className="text-[10px] text-muted-foreground">{l.category?.name} · {l.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden p-2 text-xs sm:table-cell">{l.seller?.name}</td>
                        <td className="p-2 text-right text-xs font-bold text-emerald-600">{adFee(l) === 0 ? "Gratis" : formatRupiahFull(adFee(l))}</td>
                        <td className="hidden p-2 text-xs sm:table-cell">{new Date(l.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="p-2 text-center text-xs text-muted-foreground">{l.views?.toLocaleString("id-ID") || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ============ LAPORAN TAB ============
function LaporanTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchJson("/api/admin/stats") });
  if (isLoading || !data) return <SkeletonGrid count={3} />;
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold">Laporan Lengkap</h2>
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Ringkasan Umum</h3>
        <div className="space-y-2 text-sm">
          <Row label={tr("admTotalUsers")} value={data.totals.users} />
          <Row label={tr("admTotalListings")} value={data.totals.listings} />
          <Row label={tr("admTotalRevenue")} value={formatRupiahFull(data.totals.omzetAll)} />
          <Row label={tr("admNewUsers")} value={data.users.today} />
          <Row label={tr("admNewUsersWeek")} value={data.users.week} />
          <Row label={tr("admNewUsersMonth")} value={data.users.month} />
          <Row label={tr("admNewAdsToday")} value={data.listings.today} />
          <Row label={tr("admNewAdsWeek")} value={data.listings.week} />
          <Row label={tr("admNewAdsMonth")} value={data.listings.month} />
          <Row label={tr("admOmzetToday")} value={formatRupiahFull(data.omzet.today)} />
          <Row label={tr("admOmzetWeek")} value={formatRupiahFull(data.omzet.week)} />
          <Row label={tr("admOmzetMonth")} value={formatRupiahFull(data.omzet.month)} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Kategori Terpopuler</h3>
        <div className="space-y-1.5 text-sm">
          {data.topCategories.map((c: any, i: number) => (
            <Row key={i} label={`#${i + 1} ${c.name}`} value={`${c.count} iklan`} />
          ))}
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={() => toast.info("Export laporan segera hadir")}><FileText className="size-4" /> Export PDF/Excel</Button>
    </div>
  );
}

// ============ LAPORAN BULANAN TAB (dipisah per bulan) ============
function MonthlyReportTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-monthly-report", year],
    queryFn: () => fetchJson(`/api/admin/monthly-report?year=${year}`),
  });

  if (isLoading || !data) return <SkeletonGrid count={3} />;

  const months: any[] = data.months || [];
  const yearTotal = data.yearTotal || { omzet: 0, listings: 0, users: 0 };
  const years: number[] = data.years || [year];

  // Bulan yang dipilih (untuk drill-down detail).
  const selMonthData = selectedMonth ? months.find((m) => m.month === selectedMonth) : null;
  const selListings = selectedMonth ? (data.listingsByMonth?.[selectedMonth] || []) : [];
  const selUsers = selectedMonth ? (data.usersByMonth?.[selectedMonth] || []) : [];

  return (
    <div className="space-y-4">
      {/* Header + pemilih tahun */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{tr("admMonthlyTitle")}</h2>
          <p className="text-xs text-muted-foreground">{tr("admMonthlyDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">{tr("admMonthlyYear")}</Label>
          <select
            value={year}
            onChange={(e) => { setYear(Number(e.target.value)); setSelectedMonth(null); }}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kartu total tahunan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{tr("admMonthlyTotal")} — {tr("admMonthlyOmzet")}</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatRupiahFull(yearTotal.omzet)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{tr("admMonthlyTotal")} — {tr("admMonthlyListings")}</p>
          <p className="mt-1 text-xl font-bold text-primary">{yearTotal.listings}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{tr("admMonthlyTotal")} — {tr("admMonthlyUsers")}</p>
          <p className="mt-1 text-xl font-bold text-blue-500">{yearTotal.users}</p>
        </div>
      </div>

      {/* Tabel 12 bulan (dipisah per bulan) */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-left text-xs font-semibold text-muted-foreground">
              <th className="p-3">{tr("admMonthlyMonth")}</th>
              <th className="p-3 text-right">{tr("admMonthlyOmzet")}</th>
              <th className="p-3 text-right">{tr("admMonthlyListings")}</th>
              <th className="p-3 text-right">{tr("admMonthlyUsers")}</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const hasData = m.listings > 0 || m.users > 0;
              const isCurrent = now.getMonth() + 1 === m.month && now.getFullYear() === year;
              return (
                <tr
                  key={m.month}
                  className={cn(
                    "border-b border-border hover:bg-accent/30",
                    !hasData && "opacity-50",
                    selectedMonth === m.month && "bg-primary/5"
                  )}
                >
                  <td className="p-3 font-medium">
                    {m.label}
                    {isCurrent && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">Now</span>}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-600">{m.omzet > 0 ? formatRupiahFull(m.omzet) : "—"}</td>
                  <td className="p-3 text-right">{m.listings > 0 ? m.listings : "—"}</td>
                  <td className="p-3 text-right">{m.users > 0 ? m.users : "—"}</td>
                  <td className="p-3 text-center">
                    {hasData ? (
                      <button
                        onClick={() => setSelectedMonth(selectedMonth === m.month ? null : m.month)}
                        className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                      >
                        {selectedMonth === m.month ? "Tutup" : tr("admMonthlyDetail")}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/30 font-bold">
              <td className="p-3">{tr("admMonthlyTotal")}</td>
              <td className="p-3 text-right text-emerald-600">{formatRupiahFull(yearTotal.omzet)}</td>
              <td className="p-3 text-right">{yearTotal.listings}</td>
              <td className="p-3 text-right">{yearTotal.users}</td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Drill-down: detail bulan terpilih */}
      {selMonthData && (
        <div className="space-y-3 rounded-xl border-2 border-primary/30 bg-card p-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">
              {tr("admMonthlyDetail")} — {selMonthData.label} {year}
            </h3>
            <Button variant="outline" size="sm" onClick={() => toast.info("Export bulan ini segera hadir")}>
              <FileText className="size-4" /> {tr("admMonthlyExport")}
            </Button>
          </div>

          {/* Ringkasan bulan */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 p-2">
              <p className="text-[10px] text-muted-foreground">{tr("admMonthlyOmzet")}</p>
              <p className="text-sm font-bold text-emerald-600">{formatRupiahFull(selMonthData.omzet)}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <p className="text-[10px] text-muted-foreground">{tr("admMonthlyListings")}</p>
              <p className="text-sm font-bold text-primary">{selMonthData.listings}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2">
              <p className="text-[10px] text-muted-foreground">{tr("admMonthlyUsers")}</p>
              <p className="text-sm font-bold text-blue-500">{selMonthData.users}</p>
            </div>
          </div>

          {/* Rincian per paket */}
          {Object.keys(selMonthData.byPackage).length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-muted-foreground">{tr("admMonthlyByPkg")}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selMonthData.byPackage).map(([pkg, info]: [string, any]) => (
                  <span key={pkg} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs">
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{pkg}</Badge>
                    <span className="font-semibold">{info.count} iklan</span>
                    <span className="text-emerald-600">{formatRupiahFull(info.omzet)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Daftar iklan bulan ini */}
          {selListings.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-muted-foreground">{tr("admMonthlyListings")} ({selListings.length})</p>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-secondary/80">
                    <tr className="text-left text-muted-foreground">
                      <th className="p-2">Iklan</th>
                      <th className="p-2">Paket</th>
                      <th className="p-2 text-right">Harga</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selListings.map((l: any) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="p-2 font-medium">{l.title}</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">{l.packageType}</Badge></td>
                        <td className="p-2 text-right">{formatRupiahFull(l.price)}</td>
                        <td className="p-2"><Badge className={cn("text-[10px]", l.status === "active" ? "bg-emerald-100 text-emerald-700" : l.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{l.status}</Badge></td>
                        <td className="p-2 text-muted-foreground">{new Date(l.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daftar user baru bulan ini */}
          {selUsers.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-bold text-muted-foreground">{tr("admMonthlyUsers")} ({selUsers.length})</p>
              <div className="flex flex-wrap gap-2">
                {selUsers.map((u: any) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs">
                    <span className="font-semibold">{u.name}</span>
                    <span className="text-muted-foreground">{u.email}</span>
                    {u.role === "admin" && <Badge className="text-[10px]">admin</Badge>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ AUDIT LOG TAB ============
function AuditTab() {
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const allLogs = [
    { id: 1, action: "LOGIN", user: "admin@gomesin.id", detail: tr("admAuditDetail1"), time: tr("admAuditTime1"), icon: Lock, category: "auth" },
    { id: 2, action: "IKLAN_APPROVE", user: "admin@gomesin.id", detail: tr("admAuditDetail2"), time: tr("admAuditTime2"), icon: CheckCircle2, category: "iklan" },
    { id: 3, action: "PENJUAL_VERIFY", user: "admin@gomesin.id", detail: tr("admAuditDetail3"), time: tr("admAuditTime3"), icon: BadgeCheck, category: "penjual" },
    { id: 4, action: "KATEGORI_CREATE", user: "admin@gomesin.id", detail: tr("admAuditDetail4"), time: tr("admAuditTime4"), icon: FolderTree, category: "kategori" },
    { id: 5, action: "IKLAN_DELETE", user: "admin@gomesin.id", detail: tr("admAuditDetail5"), time: tr("admAuditTime5"), icon: Trash2, category: "iklan" },
    { id: 6, action: "IKLAN_CREATE", user: "budi@gomesin.id", detail: tr("admAuditDetail6"), time: tr("admAuditTime5"), icon: Plus, category: "iklan" },
    { id: 7, action: "USER_REGISTER", user: "siti@gomesin.com", detail: tr("admAuditDetail7"), time: tr("admAuditTime6"), icon: Users, category: "user" },
    { id: 8, action: "LOGIN", user: "budi@gomesin.id", detail: tr("admAuditDetail8"), time: tr("admAuditTime6"), icon: Lock, category: "auth" },
    { id: 9, action: "IKLAN_VIOLATION", user: "admin@gomesin.id", detail: tr("admAuditDetail9"), time: tr("admAuditTime7"), icon: XCircle, category: "iklan" },
    { id: 10, action: "BANNER_CREATE", user: "admin@gomesin.id", detail: tr("admAuditDetail10"), time: tr("admAuditTime8"), icon: Image, category: "banner" },
  ];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = allLogs.filter((l) => {
    const matchSearch = l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.detail.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Audit Log ({filtered.length})</h2>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari aktivitas, user, detail..."
          className="h-9 sm:flex-1"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-card px-2 text-sm"
        >
          <option value="all">Semua Kategori</option>
          <option value="auth">Autentikasi</option>
          <option value="iklan">Iklan</option>
          <option value="penjual">Penjual</option>
          <option value="kategori">Kategori</option>
          <option value="user">User</option>
          <option value="banner">Banner</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { label: tr("admAuditTotal"), value: allLogs.length, color: "text-primary" },
          { label: tr("admAuditAuth"), value: allLogs.filter(l => l.category === "auth").length, color: "text-blue-500" },
          { label: tr("admAuditIklan"), value: allLogs.filter(l => l.category === "iklan").length, color: "text-emerald-600" },
          { label: tr("admAuditUser"), value: allLogs.filter(l => l.category === "user").length, color: "text-amber-500" },
          { label: tr("admAuditPenjual"), value: allLogs.filter(l => l.category === "penjual").length, color: "text-purple-500" },
          { label: tr("admAuditBanner"), value: allLogs.filter(l => l.category === "banner").length, color: "text-rose-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-2 text-center">
            <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Log list */}
      <div className="space-y-2">
        {filtered.map((l) => (
          <div key={l.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10">
              <l.icon className="size-4 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{l.action}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">{l.time}</span>
              </div>
              <p className="text-xs text-muted-foreground">{l.detail}</p>
              <p className="text-[10px] text-muted-foreground">by {l.user}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Tidak ada log yang cocok. Coba kata kunci atau filter lain.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ HELPERS ============
function Row({ label, value }: { label: string; value: any }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}
function SkeletonGrid({ count = 4 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: count }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div>;
}
function BadgeCheck({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z" /></svg>;
}
