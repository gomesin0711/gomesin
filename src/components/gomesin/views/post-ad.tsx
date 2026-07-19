"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PROVINCES, formatRupiahFull } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "../category-icon";
import { useLang, translations as i18nTranslations, formatT, categoryName } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import {
  Plus,
  X,
  ImagePlus,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Tag,
  Upload,
  Camera,
  FileImage,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { shareImageToWhatsApp } from "@/lib/share-image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PLACEHOLDER_IMAGES = [
  "https://sfile.chatglm.cn/images-ppt/dae3b28e3c96.jpg",
  "https://sfile.chatglm.cn/images-ppt/c66b63ef4400.jpg",
  "https://sfile.chatglm.cn/images-ppt/9ef9dd58c181.jpg",
];

async function fetchCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("fail");
  return (await res.json()).categories as Array<{
    id: string;
    name: string;
    slug: string;
    icon: string;
  }>;
}

async function postListing(payload: any) {
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || tr("postFailed"));
  return data.listing;
}

export function PostAdView() {
  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 0,
  });
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
  const paketMap: Record<string, { price: number; duration: number; name: string; features: string[] }> = {};
  (paketData?.pakets || []).forEach((p: any) => {
    paketMap[p.key] = { price: p.price, duration: p.duration, name: p.name, features: p.features };
  });
  const goToDetail = useStore((s) => s.goToDetail);
  const goHome = useStore((s) => s.goHome);
  const goToDashboard = useStore((s) => s.goToDashboard);
  const user = useStore((s) => s.user);

  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("negotiable");
  const [condition, setCondition] = useState("bekas");
  const [adType, setAdType] = useState<"mesin" | "jasa">("mesin");
  const [brand, setBrand] = useState("");
  const [yearProduced, setYearProduced] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<{ k: string; v: string }[]>([
    { k: "", v: "" },
  ]);
  const [success, setSuccess] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("highlight");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPayment, setShowPayment] = useState(true);
  const [qrisModal, setQrisModal] = useState(false);
  const [qrisAmount, setQrisAmount] = useState(0);
  const [proofImage, setProofImage] = useState<string>("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top when QRIS page opens + lock body scroll (hilangkan scrollbar browser)
  useEffect(() => {
    if (qrisModal) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [qrisModal]);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: postListing,
    onSuccess: (listing: any) => {
      setSuccess(true);
      toast.success(tr("adPosted"));
      setTimeout(() => {
        goToDashboard();
      }, 1500);
    },
    onError: (e: any) => {
      toast.error(e.message || tr("postFailed"));
    },
  });

  const addImage = (url?: string) => {
    const u = (url ?? "").trim();
    if (!u) return;
    setImages((p) => [...p, u]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setCompressing(true);
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        setImages((p) => [...p, compressed]);
      }
      toast.success(tr("photoAdded"));
    } catch (err: any) {
      toast.error(err?.message || tr("photoError"));
    } finally {
      setCompressing(false);
      // reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !categoryId || !description || !price || !city || !province) {
      toast.error(tr("completeFields"));
      return;
    }
    const selPkgPrice = paketMap[selectedPackage]?.price ?? 0;
    if (selPkgPrice > 0 && selectedPackage !== "simpan" && !paymentMethod) {
      toast.error(tr("choosePayment"));
      return;
    }
    // For paid packages, show QRIS payment modal first
    const pk = paketMap[selectedPackage];
    const pkgPrice = pk?.price ?? 0;
    if (pkgPrice > 0 && selectedPackage !== "simpan") {
      // Add 2 random digits to the price for payment identification
      const randomDigits = Math.floor(Math.random() * 100);
      const amountWithDigits = pkgPrice + randomDigits;
      setQrisAmount(amountWithDigits);
      setQrisModal(true);
      return;
    }
    doSubmit();
  };

  const doSubmit = () => {
    const finalImages = images.length ? images : PLACEHOLDER_IMAGES.slice(0, 1);
    const specObj: Record<string, string> = {};
    for (const s of specs) {
      if (s.k.trim() && s.v.trim()) specObj[s.k.trim()] = s.v.trim();
    }
    mutation.mutate({
      title,
      categoryId,
      description,
      price,
      priceType,
      condition: adType === "jasa" ? "jasa" : condition,
      adType,
      brand: adType === "jasa" ? undefined : (brand || undefined),
      yearProduced: yearProduced || undefined,
      city,
      province,
      images: finalImages,
      specs: specObj,
      featured: selectedPackage === "spotlight" || selectedPackage === "highlight",
      package: selectedPackage,
      paymentMethod: paymentMethod || undefined,
      userId: user?.id,
      userName: user?.name,
      userPhone: user?.phone,
    });
  };

  if (success) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center animate-fade-up">
        <div className="grid size-20 place-items-center rounded-full bg-primary/10">
          <CheckCircle2 className="size-12 text-primary" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">{tr("postSuccess")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("postSuccessDesc")}
        </p>
        <Loader2 className="mt-4 size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 animate-fade-up">
      {/* breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <button onClick={goHome} className="hover:text-primary">{tr("home2")}</button>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{tr("postAdCrumb")}</span>
      </div>

      <div className="mb-5">
        <h1 className="text-2xl font-bold">{tr("postAd")}</h1>
        <p className="text-sm text-muted-foreground">
          {tr("postAdDesc")}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* category */}
        <Section title={tr("category")} required>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(cats ?? []).map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition ${
                  categoryId === c.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                <CategoryIcon name={c.icon} className="size-4 shrink-0 text-primary" />
                <span className="line-clamp-1">{categoryName(c.name, mounted ? lang : "id")}</span>
              </button>
            ))}
          </div>
          {!cats && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}
        </Section>

        {/* basic info */}
        <Section title={tr("detailSection")} required>
          <Field label={tr("adTypeLabel")} required>
            <RadioGroup
              value={adType}
              onValueChange={(v) => {
                setAdType(v as "mesin" | "jasa");
                if (v === "jasa") {
                  setCondition("baru");
                }
              }}
              className="flex gap-4 pt-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="mesin" id="at-mesin" />
                <Label htmlFor="at-mesin" className="cursor-pointer text-sm">{tr("adTypeMachine")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="jasa" id="at-jasa" />
                <Label htmlFor="at-jasa" className="cursor-pointer text-sm">{tr("adTypeService")}</Label>
              </div>
            </RadioGroup>
          </Field>
          <Field label={tr("adTitle")} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={adType === "jasa" ? tr("serviceTitlePlaceholder") || "Contoh: Jasa Servis Mesin Cetak, Jasa Installasi CNC" : tr("adTitlePlaceholder")}
              maxLength={120}
            />
          </Field>
          <Field label={tr("description")} required>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr("descPlaceholder")}
              rows={5}
              maxLength={2000}
            />
            <p className="text-right text-[11px] text-muted-foreground">{description.length}/2000</p>
          </Field>
        </Section>

        {/* price & condition */}
        <Section title={tr("priceCondition")} required>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("priceLabel")} required>
              <Input
                type="text"
                inputMode="numeric"
                value={price ? Number(price.replace(/[^0-9]/g, "")).toLocaleString("de-DE") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "");
                  setPrice(digits);
                }}
                placeholder={tr("pricePlaceholder")}
              />
            </Field>
            <Field label={tr("priceType")}>
              <RadioGroup
                value={priceType}
                onValueChange={setPriceType}
                className="flex gap-4 pt-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="negotiable" id="pt-nego" />
                  <Label htmlFor="pt-nego" className="cursor-pointer text-sm">{tr("negotiable")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fixed" id="pt-fixed" />
                  <Label htmlFor="pt-fixed" className="cursor-pointer text-sm">{tr("fixed")}</Label>
                </div>
              </RadioGroup>
            </Field>
            {adType === "mesin" && (
            <Field label={tr("condition")}>
              <RadioGroup
                value={condition}
                onValueChange={setCondition}
                className="flex gap-4 pt-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bekas" id="cd-bekas" />
                  <Label htmlFor="cd-bekas" className="cursor-pointer text-sm">{tr("used")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="baru" id="cd-baru" />
                  <Label htmlFor="cd-baru" className="cursor-pointer text-sm">{tr("new")}</Label>
                </div>
              </RadioGroup>
            </Field>
            )}
            {adType === "mesin" && (
            <Field label={tr("brand")}>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={tr("brandPlaceholder")} />
            </Field>
            )}
            {adType === "mesin" && (
            <Field label={tr("yearProduced")}>
              <Input
                type="number"
                value={yearProduced}
                onChange={(e) => setYearProduced(e.target.value)}
                placeholder={tr("yearPlaceholder")}
              />
            </Field>
            )}
          </div>
        </Section>

        {/* specs */}
        <Section title={tr("specsOptional")}>
          <p className="-mt-1 mb-2 text-xs text-muted-foreground">
            {tr("specsDesc")}
          </p>
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s.k}
                  onChange={(e) =>
                    setSpecs((p) => p.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))
                  }
                  placeholder={tr("specName")}
                  className="flex-1"
                />
                <Input
                  value={s.v}
                  onChange={(e) =>
                    setSpecs((p) => p.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))
                  }
                  placeholder={tr("specValue")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))}
                  disabled={specs.length === 1}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setSpecs((p) => [...p, { k: "", v: "" }])}
          >
            <Plus className="size-4" /> {tr("addSpec")}
          </Button>
        </Section>

        {/* location */}
        <Section title={tr("location")} required>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("city")} required>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder={tr("cityPlaceholder")} />
            </Field>
            <Field label={tr("province")} required>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tr("selectProvince")} />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>

        {/* images */}
        <Section title={tr("machinePhotos")}>
          <p className="-mt-1 mb-2 text-xs text-muted-foreground">
            {tr("uploadDesc")}
          </p>

          {/* hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex gap-2">
            <Popover open={photoMenuOpen} onOpenChange={setPhotoMenuOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" disabled={compressing}>
                  {compressing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {compressing ? tr("compressing") : tr("addPhoto")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <FileImage className="size-4 text-primary" />
                  {tr("selectFile")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoMenuOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <Camera className="size-4 text-primary" />
                  {tr("camera")}
                </button>
              </PopoverContent>
            </Popover>
          </div>

          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative size-20 overflow-hidden rounded-lg border border-border">
                  <img src={img} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-3" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-primary px-1 py-0.5 text-[8px] font-bold text-primary-foreground">
                      {tr("mainPhoto")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {images.length === 0 && (
            <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              <Upload className="mx-auto mb-1 size-5" />
              {tr("noPhotosYet")}
              <button
                type="button"
                onClick={() => setImages(PLACEHOLDER_IMAGES.slice(0, 2))}
                className="ml-1 font-semibold text-primary hover:underline"
              >
                {tr("useExample")}
              </button>
            </div>
          )}
        </Section>

        {/* PACKAGE SELECTION */}
        <Section title={tr("packageName")} required>
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            {tr("packageDesc")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {["gratis", "sundul", "highlight", "spotlight"].map((key) => {
              const pk = paketMap[key];
              const p = {
                key,
                name: pk?.name || tr(key === "gratis" ? "free" : key),
                price: pk?.price ?? 0,
                duration: pk ? `${pk.duration} hari` : tr("duration30"),
                features: (pk?.features && pk.features.length > 0) ? pk.features.join(", ") : tr("pkgGratisFeatures"),
                popular: key === "highlight",
              };
              return (
              <button
                type="button"
                key={p.key}
                onClick={() => { setSelectedPackage(p.key); setShowPayment(p.price > 0); setPaymentMethod(""); }}
                className={cn(
                  "relative rounded-lg border-2 p-3 text-left transition",
                  selectedPackage === p.key ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                )}
              >
                {p.popular && (
                  <span className="absolute -top-2 left-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                    Populer
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{p.name}</span>
                  {selectedPackage === p.key && <CheckCircle2 className="size-4 text-primary" />}
                </div>
                <p className="mt-1 text-lg font-extrabold text-primary">
                  {p.price === 0 ? tr("free") : formatRupiahFull(p.price)}
                </p>
                <p className="text-[10px] text-muted-foreground">/{p.duration}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{p.features}</p>
              </button>
              );
            })}
          </div>
        </Section>

        {/* PAYMENT (only for paid packages — check actual price from DB, not key name) */}
        {showPayment && (paketMap[selectedPackage]?.price ?? 0) > 0 && (
          <Section title={tr("payment")} required>
            <p className="-mt-1 mb-3 text-xs text-muted-foreground">
              {tr("paymentDesc")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { key: "bca", label: "Transfer ke BCA", desc: "Transfer manual ke rekening BCA" },
                { key: "qris", label: "QRIS GoPay", desc: "Scan QR dari GoPay / e-wallet" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition",
                    paymentMethod === m.key ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                  )}
                >
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
            {paymentMethod && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="mr-1 inline size-4" />
                {formatT(tr("paymentChosen"), { method: paymentMethod.toUpperCase() })}
                <br />
                <span className="text-[10px] text-emerald-600">{tr("paymentSim")}</span>
              </div>
            )}
          </Section>
        )}

        {/* submit */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={goHome} className="sm:w-auto">
            {tr("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="gap-2 bg-primary font-semibold sm:w-auto"
            size="lg"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Tag className="size-4" />
            )}
            {mutation.isPending ? tr("processing") : (paketMap[selectedPackage]?.price ?? 0) > 0 && paymentMethod ? tr("payAndPost") : tr("postNow")}
          </Button>
        </div>
      </form>

      {/* QRIS PAYMENT PAGE — fit to desktop, scrollable on mobile */}
      {qrisModal && (
        <div className="no-scrollbar fixed inset-0 z-[70] overflow-y-auto bg-background md:overflow-hidden">
          <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:py-6 md:h-screen">
            {/* Header */}
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <h2 className="text-xl font-bold sm:text-2xl">{paymentMethod === "bca" ? "Transfer ke BCA" : "Pembayaran QRIS"}</h2>
              <button
                type="button"
                onClick={() => { setQrisModal(false); setProofImage(""); }}
                className="grid size-10 place-items-center rounded-full border border-border bg-card hover:bg-accent"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content — scrollable on mobile, fit on desktop.
                Urutan: QR+Total di-render pertama (order-1) supaya di mobile
                tampil di atas. Desktop: kembali ke 2 kolom (kiri instr, kanan QR). */}
            <div className="grid flex-1 gap-6 md:grid-cols-2 md:overflow-hidden">
              {/* LEFT — instructions + upload proof (di mobile tampil di BAWAH QR) */}
              <div className="order-2 space-y-3 md:order-1 md:overflow-hidden">
                {/* Instructions */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-bold">Cara Pembayaran:</p>
                  {paymentMethod === "bca" ? (
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                      <li>Buka aplikasi m-banking / ATM BCA</li>
                      <li>Transfer ke rekening <strong className="text-foreground">8770338221</strong> a.n. Lina Listiawati</li>
                      <li>Pastikan jumlah sesuai: <strong className="text-foreground">{formatRupiahFull(qrisAmount)}</strong></li>
                      <li>Konfirmasi & selesaikan transfer</li>
                      <li>Upload foto / screenshot bukti transfer di bawah</li>
                    </ol>
                  ) : (
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
                      <li>Buka aplikasi e-wallet / m-banking</li>
                      <li>Pilih menu Scan / Bayar QRIS</li>
                      <li>Arahkan kamera ke QR code di sebelah kanan</li>
                      <li>Pastikan jumlah sesuai: <strong className="text-foreground">{formatRupiahFull(qrisAmount)}</strong></li>
                      <li>Konfirmasi & selesaikan pembayaran</li>
                      <li>Upload foto / screenshot bukti pembayaran di bawah</li>
                    </ol>
                  )}
                </div>

                {/* Upload proof of payment */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-bold">Kirim Bukti Pembayaran</p>
                  {proofImage ? (
                    <div className="relative">
                      <img src={proofImage} alt="Bukti Pembayaran" className="max-h-40 w-full rounded-lg border border-border object-contain" />
                      <button
                        type="button"
                        onClick={() => setProofImage("")}
                        className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-red-500 text-white shadow"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:border-primary hover:bg-accent">
                      <Upload className="size-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Klik untuk upload bukti pembayaran</span>
                      <span className="text-[10px] text-muted-foreground/70">JPG, PNG (maks 200KB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const compressed = await compressImage(file);
                            setProofImage(compressed);
                            toast.success("Bukti pembayaran diunggah");
                          } catch (err: any) {
                            toast.error("Gagal upload: " + (err?.message || ""));
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setQrisModal(false); setProofImage(""); toast.info("Pembayaran dibatalkan"); }}
                  >
                    Batal
                  </Button>
                  <Button
                    className="flex-1 gap-1.5"
                    disabled={mutation.isPending || uploadingProof || !proofImage}
                    onClick={async () => {
                      const pkgName = paketMap[selectedPackage]?.name || selectedPackage;

                      setUploadingProof(true);
                      try {
                        const caption =
                          `*Bukti Pembayaran Iklan Gomesin*\n\n` +
                          `Paket: ${pkgName}\n` +
                          `Jumlah: ${formatRupiahFull(qrisAmount)}\n` +
                          `User: ${user?.name || "-"}\n` +
                          `Email: ${user?.email || "-"}\n` +
                          `Judul Iklan: ${title}`;

                        // Kirim gambar bukti ke WhatsApp admin via Fonnte API.
                        const sendRes = await fetch("/api/send-wa-proof", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            imageBase64: proofImage,
                            caption,
                            fileName: `bukti-pembayaran-${pkgName.toLowerCase()}-${Date.now()}.jpg`,
                          }),
                        });
                        const sendData = await sendRes.json();
                        if (sendData.success) {
                          toast.success("Bukti pembayaran terkirim ke WhatsApp admin!");
                        } else {
                          toast.error("Gagal kirim via Fonnte: " + (sendData.error || "unknown"));
                        }
                      } catch {
                        toast.error("Gagal mengirim bukti");
                      } finally {
                        setUploadingProof(false);
                      }
                      setQrisModal(false);
                      doSubmit();
                    }}
                  >
                    {uploadingProof ? <Loader2 className="size-4 animate-spin" /> : mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {uploadingProof ? "Mengirim bukti..." : mutation.isPending ? "Memproses..." : "Kirim & Pasang Iklan"}
                  </Button>
                </div>
                {!proofImage && (
                  <p className="text-center text-[11px] text-amber-600">Upload bukti pembayaran dulu untuk melanjutkan</p>
                )}
              </div>

              {/* RIGHT — total pembayaran + QR code / BCA info (di mobile di ATAS) */}
              <div className="order-1 flex flex-col items-center justify-start pb-6 md:order-2 md:pb-0">
                {/* Total pembayaran */}
                <div className="mb-4 text-center">
                  <p className="text-xs text-muted-foreground">Total Pembayaran</p>
                  <p className="text-3xl font-extrabold text-primary sm:text-4xl">{formatRupiahFull(qrisAmount)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Harga paket + kode unik untuk identifikasi pembayar
                  </p>
                </div>
                {paymentMethod === "bca" ? (
                  <>
                    {/* BCA bank info */}
                    <div className="rounded-2xl border-2 border-blue-500 bg-white p-8 shadow-lg text-center">
                      <p className="text-sm font-bold text-blue-600">BCA</p>
                      <p className="mt-2 text-3xl font-extrabold tracking-wider text-foreground">8770338221</p>
                      <p className="mt-2 text-sm text-muted-foreground">a.n. Lina Listiawati</p>
                    </div>
                    <p className="mt-3 text-center text-sm font-semibold text-muted-foreground">Transfer ke rekening di atas</p>
                  </>
                ) : (
                  <>
                    {/* QR code */}
                    <div className="rounded-2xl border-2 border-border bg-white p-4 shadow-lg sm:p-6">
                      <img
                        src="/qris-gomesin.jpeg"
                        alt="QRIS Gomesin"
                        className="h-auto w-full max-w-[250px] object-contain"
                      />
                    </div>
                    <p className="mt-3 text-center text-sm font-semibold text-muted-foreground">Scan QRIS untuk membayar</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-1 text-base font-bold">
        {title}
        {required && <span className="text-destructive">*</span>}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
