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
import { PROVINCES, PROVINCE_CITIES, formatRupiahFull } from "@/lib/types";
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
  Save,
  Crown,
  Zap,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { shareImageToWhatsApp } from "@/lib/share-image";
import { useChatSocket } from "@/lib/use-chat-socket";
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

const SPEC_OPTIONS = [
  "Daya Listrik",
  "Tegangan",
  "Berat Mesin",
  "Dimensi (P×L×T)",
  "Kapasitas",
  "Kecepatan",
  "Jumlah Warna",
  "Ukuran Cetak Maks",
  "Tahun Produksi",
  "Bahan Bakar",
  "Sistem Kontrol",
  "Jumlah Unit",
  "Kelengkapan",
  "Kondisi Mesin",
  "Garansi",
  "Merek Motor",
  "Tipe",
  "Model",
  "Serial Number",
  "Negara Asal",
  "Lainnya",
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
  const paketMap: Record<string, { price: number; originalPrice: number; duration: number; name: string; features: string[] }> = {};
  (paketData?.pakets || []).forEach((p: any) => {
    paketMap[p.key] = { price: p.price, originalPrice: p.originalPrice ?? 0, duration: p.duration, name: p.name, features: p.features };
  });
  const goToDetail = useStore((s) => s.goToDetail);
  const goHome = useStore((s) => s.goHome);
  const goToDashboard = useStore((s) => s.goToDashboard);
  const goToProfilePanel = useStore((s) => s.goToProfilePanel);
  const user = useStore((s) => s.user);
  // Socket realtime chat — used to send payment proof to admin chat (with image).
  const { sendMessage } = useChatSocket();

  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState("negotiable");
  const [condition, setCondition] = useState("bekas");
  const [availability, setAvailability] = useState("tersedia");
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
  const [selectedPackage, setSelectedPackage] = useState("colek");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPayment, setShowPayment] = useState(true);
  const [qrisModal, setQrisModal] = useState(false);
  const [qrisAmount, setQrisAmount] = useState(0);
  const [proofImage, setProofImage] = useState<string>("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
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
      const wasDraft = savingDraft;
      setSavingDraft(false);
      toast.success(wasDraft ? "Iklan disimpan (Belum Aktif)." : tr("adPosted"));
      if (wasDraft) {
        goHome();
      } else {
        goToProfilePanel("iklan-saya"); // Langsung ke halaman Iklan Saya di akun
      }
    },
    onError: (e: any) => {
      setSavingDraft(false);
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

  const submit = async (e: React.FormEvent) => {
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
      // Kode unik: fetch dari API (unik per user, stored in DB, tidak berubah).
      // Hanya generate jika belum ada (qrisAmount === 0).
      if (qrisAmount === 0) {
        try {
          const codeRes = await fetch("/api/listings/unique-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id, packageType: selectedPackage }),
          });
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            setQrisAmount(pkgPrice + codeData.uniqueCode);
          } else {
            setQrisAmount(pkgPrice);
          }
        } catch {
          setQrisAmount(pkgPrice);
        }
      }
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
      availability,
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

  // Package card styling maps (matching admin Paket Iklan)
  const pkgIconMap: Record<string, any> = { colek: Tag, sundul: TrendingUp, highlight: Zap, spotlight: Crown };
  const pkgColorMap: Record<string, string> = {
    colek: 'border-blue-400 ring-1 ring-blue-200',
    sundul: 'border-purple-400 ring-1 ring-purple-200',
    highlight: 'border-orange-400 ring-1 ring-orange-200',
    spotlight: 'border-amber-400 ring-1 ring-amber-200',
  };
  const pkgIconColorMap: Record<string, string> = {
    colek: 'text-blue-500',
    sundul: 'text-purple-500',
    highlight: 'text-orange-500',
    spotlight: 'text-amber-500',
  };
  const pkgSelectedColorMap: Record<string, string> = {
    colek: 'border-blue-500 ring-2 ring-blue-400 bg-blue-50/50',
    sundul: 'border-purple-500 ring-2 ring-purple-400 bg-purple-50/50',
    highlight: 'border-orange-500 ring-2 ring-orange-400 bg-orange-50/50',
    spotlight: 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/50',
  };
  const pkgKeys = ['colek', 'highlight', 'spotlight', 'sundul'];

  return (
    <div className="mx-auto max-w-3xl px-2 md:px-4 py-5 md:py-6 animate-fade-up">
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
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={tr("selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {(cats ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon name={c.icon} className="size-4 shrink-0 text-primary" />
                    {categoryName(c.name, mounted ? lang : "id")}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!cats && (
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
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
              <Select value={priceType} onValueChange={setPriceType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negotiable">{tr("negotiable")}</SelectItem>
                  <SelectItem value="fixed">{tr("fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {adType === "mesin" && (
            <Field label={tr("condition")}>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bekas">{tr("used")}</SelectItem>
                  <SelectItem value="baru">{tr("new")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            )}
            <Field label={tr("availability")}>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tersedia">{tr("available")}</SelectItem>
                  <SelectItem value="preorder">{tr("preorder")}</SelectItem>
                  <SelectItem value="indent">{tr("indent")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
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
                {s.k === "Lainnya" ? (
                  <Input
                    value={s.k}
                    onChange={(e) =>
                      setSpecs((p) => p.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))
                    }
                    placeholder={tr("specNameCustom")}
                    className="flex-1"
                  />
                ) : (
                  <Select
                    value={s.k}
                    onValueChange={(v) =>
                      setSpecs((p) => p.map((x, j) => (j === i ? { ...x, k: v } : x)))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={tr("specName")} />
                    </SelectTrigger>
                    <SelectContent>
                      {SPEC_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
            <Field label={tr("province")} required>
              <Select value={province} onValueChange={(v) => { setProvince(v); setCity(""); }}>
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
            <Field label={tr("city")} required>
              <Select value={city} onValueChange={setCity} disabled={!province}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={province ? tr("selectCity") : tr("selectProvinceFirst")} />
                </SelectTrigger>
                <SelectContent>
                  {(PROVINCE_CITIES[province] || []).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={img} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
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

        {/* SIMPAN DULU — tombol hijau untuk tunda pasang iklan (simpan sebagai draft) */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-orange-600 bg-orange-600 text-white hover:bg-orange-700 hover:text-white"
          disabled={mutation.isPending || savingDraft}
          onClick={() => {
            if (!title.trim()) { toast.error("Judul wajib diisi untuk menyimpan dulu."); return; }
            setSavingDraft(true);
            const finalImages = images.length ? images : PLACEHOLDER_IMAGES.slice(0, 1);
            const specObj: Record<string, string> = {};
            for (const s of specs) {
              if (s.k.trim() && s.v.trim()) specObj[s.k.trim()] = s.v.trim();
            }
            mutation.mutate({
              title,
              categoryId: categoryId || undefined,
              description: description || "(Draft)",
              price: price || "0",
              priceType,
              condition: adType === "jasa" ? "jasa" : condition,
              availability,
              adType,
              brand: adType === "jasa" ? undefined : (brand || undefined),
              yearProduced: yearProduced || undefined,
              city: city || "Draft",
              province: province || "Draft",
              images: finalImages,
              specs: specObj,
              featured: false,
              package: "colek",
              userId: user?.id,
              userName: user?.name,
              userPhone: user?.phone,
              saveAsDraft: true,
            } as any);
          }}
        >
          {savingDraft ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {savingDraft ? "Menyimpan..." : "Simpan Dulu"}
        </Button>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Simpan dulu untuk menunda pasang iklan. Iklan tersimpan dengan status "Belum Aktif" dan bisa Anda terbitkan nanti.
        </p>

        {/* PACKAGE SELECTION — matches admin Paket Iklan layout */}
        <Section title={tr("packageName")} required>
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            {tr("packageDesc")}
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {pkgKeys.map((key) => {
              const pk = paketMap[key];
              const isUpgradeOnly = key === 'sundul';
              const Icon = pkgIconMap[key] || Tag;
              const name = pk?.name || key;
              const price = pk?.price ?? 0;
              const origPrice = pk?.originalPrice ?? 0;
              const dur = pk?.duration || 30;
              const feats = (pk?.features && pk.features.length > 0) ? pk.features : [];
              const disc = origPrice > 0 && origPrice > price ? Math.round((1 - price / origPrice) * 100) : 0;
              const savings = origPrice > price ? origPrice - price : 0;
              return (
                <button
                  type="button"
                  key={key}
                  disabled={isUpgradeOnly}
                  onClick={() => { setSelectedPackage(key); setShowPayment(price > 0); setPaymentMethod(''); }}
                  className={cn(
                    'relative rounded-lg border-2 bg-card p-3 text-left transition',
                    isUpgradeOnly
                      ? 'cursor-not-allowed border-border bg-muted/40 opacity-60'
                      : selectedPackage === key
                        ? pkgSelectedColorMap[key] || 'border-primary'
                        : (pkgColorMap[key] || 'border-border') + ' hover:shadow-md'
                  )}
                  title={isUpgradeOnly ? 'Paket Colek hanya untuk iklan yang sudah terbit (upgrade)' : undefined}
                >
                  {key === 'highlight' && !isUpgradeOnly && (
                    <span className="absolute -top-2 left-2 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-foreground">Populer</span>
                  )}
                  {isUpgradeOnly && (
                    <span className="absolute -top-2 right-1 rounded-full bg-slate-500 px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">Upgrade saja</span>
                  )}
                  {disc > 0 && (
                    <span className={cn('absolute -top-2 right-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white', key === 'highlight' && '-top-7')}>-{disc}%</span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="grid size-7 place-items-center rounded-md bg-secondary">
                      <Icon className={cn('size-4', pkgIconColorMap[key] || 'text-muted-foreground')} />
                    </span>
                    {selectedPackage === key && !isUpgradeOnly && (
                      <span className="rounded-full bg-primary p-0.5">
                        <CheckCircle2 className="size-3 text-primary-foreground" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-bold">{name}</p>
                  <p className="mt-0.5 text-sm font-extrabold text-primary">
                    {formatRupiahFull(price)}
                    {origPrice > 0 && origPrice > price && (
                      <span className="ml-1 text-[10px] font-medium text-muted-foreground line-through">{formatRupiahFull(origPrice)}</span>
                    )}
                    <span className="text-[10px] font-normal text-muted-foreground">/{dur}hari</span>
                  </p>
                  {savings > 0 && (
                    <p className="mt-0.5 text-[10px] font-semibold text-red-500">Hemat {formatRupiahFull(savings)}</p>
                  )}
                  {feats.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {feats.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5 text-[10px] leading-tight text-foreground">
                          <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-orange-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
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
                { key: "bca", label: "Transfer ke Blu BCA", desc: "Transfer manual ke rekening Blu BCA" },
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
              <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
                <CheckCircle2 className="mr-1 inline size-4" />
                {formatT(tr("paymentChosen"), { method: paymentMethod.toUpperCase() })}
                <br />
                <span className="text-[10px] text-orange-600">{tr("paymentSim")}</span>
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
              <h2 className="text-xl font-bold sm:text-2xl">{paymentMethod === "bca" ? "Transfer ke Blu BCA" : "Pembayaran QRIS"}</h2>
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
                      <li>Buka aplikasi m-banking / ATM Blu BCA</li>
                      <li>Transfer ke rekening <strong className="text-foreground">0011 2208 8800</strong> a.n. Lina Listiawati</li>
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
                      <span className="text-[10px] text-muted-foreground/70">JPG, PNG (maks 120KB)</span>
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

                        // Convert base64 → Blob untuk Web Share API.
                        const matches = proofImage.match(/^data:image\/(\w+);base64,(.+)$/);
                        if (!matches) { toast.error("Format gambar tidak valid"); return; }
                        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
                        const byteString = atob(matches[2]);
                        const buf = new Uint8Array(byteString.length);
                        for (let i = 0; i < byteString.length; i++) buf[i] = byteString.charCodeAt(i);
                        const blob = new Blob([buf], { type: `image/${matches[1]}` });
                        const fileName = `bukti-pembayaran-${pkgName.toLowerCase()}-${Date.now()}.${ext}`;

                        // 1) Kirim bukti pembayaran (gambar) ke WhatsApp admin via Web Share API.
                        const result = await shareImageToWhatsApp({ blob, fileName, caption, phone: "6285888082208" });
                        if (result.status === "shared") toast.success("Gambar bukti dibagikan ke WhatsApp!");
                        else if (result.status === "opened") toast.success("Bukti pembayaran terkirim ke WhatsApp admin!");
                        else if (result.status === "cancelled") { setUploadingProof(false); return; }

                        // 2) Kirim bukti pembayaran + gambar ke CHAT ADMIN (in-app) via socket.
                        //    Jika user belum login atau admin tidak ditemukan, lewati (non-fatal).
                        if (user?.id) {
                          try {
                            const adminRes = await fetch("/api/admin/info");
                            if (adminRes.ok) {
                              const { admin } = await adminRes.json() as { admin: { id: string; name: string } };
                              const methodLabel = paymentMethod === "bca" ? "Transfer Blu BCA" : "QRIS";
                              const chatCaption =
                                `*Bukti Pembayaran Iklan*\n\n` +
                                `Judul Iklan: ${title}\n` +
                                `Paket: ${pkgName}\n` +
                                `Jumlah: ${formatRupiahFull(qrisAmount)}\n` +
                                `Metode: ${methodLabel}\n` +
                                `User: ${user.name || "-"} (${user.email || "-"})\n\n` +
                                `Bukti pembayaran terlampir. Mohon diverifikasi agar iklan segera aktif.`;

                              const ack = await sendMessage({
                                senderId: user.id,
                                receiverId: admin.id,
                                content: chatCaption,
                                image: proofImage, // base64 data URL — gambar bukti
                                listingTitle: `Bukti Pembayaran — ${title}`,
                              });

                              if (!ack?.ok) {
                                // Fallback ke REST POST /api/messages (tetap tersimpan di DB).
                                await fetch("/api/messages", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    senderId: user.id,
                                    receiverId: admin.id,
                                    content: chatCaption,
                                    image: proofImage,
                                    listingTitle: `Bukti Pembayaran — ${title}`,
                                  }),
                                });
                              }
                              toast.success("Bukti pembayaran dikirim ke chat admin");
                            }
                          } catch (chatErr) {
                            // Non-fatal: jangan blokir submit iklan jika pengiriman chat gagal.
                            console.error("Gagal kirim bukti ke chat admin:", chatErr);
                            toast.error("Bukti terkirim ke WhatsApp, tapi gagal ke chat admin");
                          }
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
                    {/* Blu BCA bank info */}
                    <div className="rounded-2xl border-2 border-blue-500 bg-white p-8 shadow-lg text-center">
                      <p className="text-sm font-bold text-blue-600">Blu BCA</p>
                      <p className="mt-2 text-3xl font-extrabold tracking-wider text-foreground">0011 2208 8800</p>
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
