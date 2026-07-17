"use client";

import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Loader2, CheckCircle2, Sparkles, Zap, TrendingUp, Star, ImageIcon, Clock, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatRupiahFull, type Listing } from "@/lib/types";
import { useLang, translations as i18nTranslations, listingTitle } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";

type PackageKey = "simpan" | "gratis" | "sundul" | "highlight" | "spotlight";

type PaymentMethod = "bca" | "gopay" | "qris";

const PACKAGES: Array<{
  key: PackageKey;
  name: string;
  price: number;
  duration: string;
  badge?: string;
  color: string;
  ring: string;
  icon: typeof Star;
  description: string;
}> = [
  {
    key: "gratis",
    name: "Standard",
    price: 40000,
    duration: "30 hari",
    color: "border-blue-400 bg-blue-50",
    ring: "ring-blue-400",
    icon: CheckCircle2,
    description: "Iklan tampil normal di daftar.",
  },
  {
    key: "sundul",
    name: "Colek",
    price: 25000,
    duration: "10 hari",
    color: "border-purple-400 bg-purple-50",
    ring: "ring-purple-400",
    icon: TrendingUp,
    description: "Iklan didorong ke posisi teratas.",
  },
  {
    key: "highlight",
    name: "Highlight",
    price: 68000,
    duration: "30 hari",
    badge: "Populer",
    color: "border-orange-400 bg-orange-50",
    ring: "ring-orange-400",
    icon: Zap,
    description: "Iklan ditandai border orange + muncul di atas.",
  },
  {
    key: "spotlight",
    name: "Spotlight",
    price: 99000,
    duration: "30 hari",
    color: "border-amber-400 bg-amber-50",
    ring: "ring-amber-400",
    icon: Sparkles,
    description: "Tampilan terluas: 3 foto + latar amber + di puncak.",
  },
];

const PAYMENT_METHODS: Array<{
  key: PaymentMethod;
  name: string;
  desc: string;
  color: string;
}> = [
  { key: "bca", name: "BCA Virtual Account", desc: "Transfer otomatis via VA BCA", color: "border-blue-500" },
  { key: "gopay", name: "GoPay", desc: "Bayar dengan saldo GoPay", color: "border-emerald-500" },
  { key: "qris", name: "QRIS", desc: "Scan QR dari semua e-wallet/bank", color: "border-purple-500" },
];

export function PackageActivateDialog({
  listing,
  open,
  onOpenChange,
  onEdit,
}: {
  listing: Listing;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (slug: string) => void;
}) {
  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const queryClient = useQueryClient();

  // Fetch paket pricing from DB (admin can edit)
  const { data: paketData } = useQuery({
    queryKey: ["admin-paket"],
    queryFn: async () => {
      const res = await fetch("/api/admin/paket");
      if (!res.ok) return null;
      return res.json() as Promise<{ pakets: any[] }>;
    },
    staleTime: 0,
  });
  const paketMap: Record<string, { price: number; duration: number; name: string }> = {};
  (paketData?.pakets || []).forEach((p: any) => {
    paketMap[p.key] = { price: p.price, duration: p.duration, name: p.name };
  });

  // Initialize selectedPackage from listing.packageType (or "gratis" for simpan)
  const [selectedPackage, setSelectedPackage] = useState<PackageKey>(() => {
    const p = (listing.packageType as PackageKey) || "gratis";
    return p === "simpan" ? "gratis" : p;
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bca");
  const [submitting, setSubmitting] = useState(false);

  const isPending = listing.status === "pending";
  const isSundulDisabled = isPending;

  // Merge DB paket data into PACKAGES (override price/duration/name)
  const packages = PACKAGES.map((p) => {
    const db = paketMap[p.key];
    return db ? { ...p, price: db.price, duration: `${db.duration} hari`, name: db.name } : p;
  });
  const selectedPkg = packages.find((p) => p.key === selectedPackage) || packages[0];
  // needsPayment = selectedPackage !== "simpan" && price > 0
  // (all packages including Standard require payment — only "simpan" is free)
  const needsPayment = selectedPackage !== "simpan" && selectedPkg.price > 0;

  // Status info for listing summary
  const statusInfo =
    listing.status === "pending"
      ? { color: "bg-amber-500", text: tr("pendingVerification"), icon: Clock }
      : listing.status === "rejected" || (listing as any).violationFlag
      ? {
          color: "bg-red-500",
          text: (listing as any).violationFlag ? tr("violation") : tr("rejected"),
          icon: (listing as any).violationFlag ? AlertTriangle : XCircle,
        }
      : { color: "bg-emerald-500", text: "Aktif", icon: CheckCircle2 };
  const StatusIcon = statusInfo.icon;

  // Current package label for listing summary
  const currentPkgLabel =
    listing.packageType === "spotlight"
      ? "Spotlight"
      : listing.packageType === "highlight"
      ? "Highlight"
      : listing.packageType === "sundul"
      ? "Colek"
      : listing.packageType === "simpan"
      ? "Simpan (Draft)"
      : "Standard";

  // Button label: "Aktifkan Sekarang" if pending, else "Upgrade Paket"
  const buttonLabel = isPending ? "Aktifkan Sekarang" : "Upgrade Paket";

  const handleSubmit = async () => {
    if (needsPayment && !paymentMethod) {
      toast.error("Pilih metode pembayaran terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/listings/${listing.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package: selectedPackage,
          paymentMethod: needsPayment ? paymentMethod : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengaktifkan paket");
      toast.success(
        selectedPackage === "simpan"
          ? "Iklan disimpan sebagai draft."
          : `Paket ${selectedPkg.name} berhasil diaktifkan!`
      );
      // Refresh dashboard + listings queries
      queryClient.invalidateQueries({ queryKey: ["dashboard-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Gagal mengaktifkan paket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aktifkan / Upgrade Paket Iklan</DialogTitle>
          <DialogDescription>
            Pilih paket untuk mengaktifkan atau meningkatkan visibilitas iklan Anda.
          </DialogDescription>
        </DialogHeader>

        {/* Listing summary */}
        <div className="flex gap-3 rounded-lg border border-border bg-secondary/30 p-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
            {listing.images?.[0] ? (
              <Image
                src={listing.images[0]}
                alt={listingTitle(listing, mounted ? lang : "id")}
                fill
                className="object-cover"
                unoptimized
                sizes="80px"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageIcon className="size-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold text-foreground">
              {listingTitle(listing, mounted ? lang : "id")}
            </p>
            <p className="mt-0.5 text-base font-bold text-primary">
              {formatRupiahFull(listing.price)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white",
                  statusInfo.color
                )}
              >
                <StatusIcon className="size-3" />
                {statusInfo.text}
              </span>
              <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Paket saat ini: {currentPkgLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Package cards */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {packages.map((p) => {
            const isSel = selectedPackage === p.key;
            const PkgIcon = p.icon;
            const isDisabled = p.key === "sundul" && isSundulDisabled;
            return (
              <button
                key={p.key}
                type="button"
                disabled={isDisabled}
                onClick={() => setSelectedPackage(p.key)}
                className={cn(
                  "relative rounded-lg border-2 p-3 text-left transition",
                  p.color,
                  isSel ? cn("ring-2", p.ring) : "opacity-90 hover:opacity-100",
                  isDisabled && "cursor-not-allowed opacity-40"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <PkgIcon
                      className={cn(
                        "size-4",
                        p.key === "spotlight"
                          ? "text-amber-600"
                          : p.key === "highlight"
                          ? "text-orange-600"
                          : p.key === "sundul"
                          ? "text-purple-600"
                          : "text-blue-600"
                      )}
                    />
                    <span className="text-sm font-bold text-foreground">{p.name}</span>
                  </div>
                  {p.badge && <Badge className="bg-primary text-[9px] text-white">{p.badge}</Badge>}
                </div>
                <p className="mt-1 text-lg font-extrabold text-foreground">
                  Rp {p.price.toLocaleString("id-ID")}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">/ {p.duration}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{p.description}</p>
                {isDisabled && (
                  <p className="mt-1 text-[10px] font-semibold text-red-600">
                    Tidak tersedia untuk iklan pending.
                  </p>
                )}
                {isSel && (
                  <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-white">
                    <CheckCircle2 className="size-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Payment method section (only for paid packages) */}
        {needsPayment && (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-bold text-foreground">Metode Pembayaran</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((m) => {
                const isSel = paymentMethod === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPaymentMethod(m.key)}
                    className={cn(
                      "rounded-lg border-2 p-2 text-left transition",
                      isSel ? cn("bg-secondary", m.color) : "border-border bg-background hover:bg-accent"
                    )}
                  >
                    <p className="text-xs font-bold text-foreground">{m.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Total */}
        {needsPayment && (
          <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Total Pembayaran</span>
            <span className="text-lg font-extrabold text-primary">
              {formatRupiahFull(selectedPkg.price)}
            </span>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onEdit(listing.slug);
            }}
            className="w-full gap-1.5 sm:w-auto"
          >
            <Edit className="size-4" /> Edit Iklan
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (needsPayment && !paymentMethod)}
            className="w-full gap-1.5 bg-primary sm:w-auto"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            {submitting ? "Memproses..." : buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
