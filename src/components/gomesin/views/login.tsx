"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Cog,
  ChevronLeft,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { PROVINCES, PROVINCE_CITIES } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLang, translations as i18nTranslations, formatT } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";

/* ------------------------------------------------------------------ */
/*  OTP Pin Input Component                                            */
/* ------------------------------------------------------------------ */

function OtpPinInput({ length = 6, onComplete }: { length?: number; onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    const clean = value.replace(/[^0-9]/g, "");
    if (clean.length === 0) {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    const digit = clean[0];
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    // Auto-focus next
    if (index < length - 1) {
      refs.current[index + 1]?.focus();
    }
    // Check complete
    const newDigits = [...digits];
    newDigits[index] = digit;
    if (newDigits.every((d) => d !== "")) {
      onComplete(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
    if (!paste) return;
    const newDigits = [...digits];
    for (let i = 0; i < paste.length && i < length; i++) {
      newDigits[i] = paste[i];
    }
    setDigits(newDigits);
    // Focus last filled or next empty
    const focusIdx = Math.min(paste.length, length - 1);
    refs.current[focusIdx]?.focus();
    if (newDigits.every((d) => d !== "")) {
      onComplete(newDigits.join(""));
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            "size-11 rounded-lg border-2 text-center text-lg font-bold outline-none transition-all sm:size-12 sm:text-xl",
            d
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border bg-background text-foreground"
          )}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LoginView() {
  const goBack = useStore((s) => s.goBack);

  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Login state
  const [lPhone, setLPhone] = useState("");

  // Register state
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rCity, setRCity] = useState("");
  const [rProvince, setRProvince] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");
  const [agree, setAgree] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [devOtpCode, setDevOtpCode] = useState("");
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phone for current tab
  const phone = tab === "login" ? lPhone : rPhone;
  const setPhone = tab === "login" ? setLPhone : setRPhone;

  // Auto-send OTP when phone has 10+ digits
  const hasEnoughDigits = phone.replace(/[^0-9]/g, "").length >= 10;

  useEffect(() => {
    if (hasEnoughDigits && !otpSent && !otpVerified && !otpSending) {
      sendOtp();
    }
  }, [hasEnoughDigits]);

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setOtpCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
    }
  }, [otpCooldown > 0]);

  const sendOtp = useCallback(async () => {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 10) return;
    if (otpCooldown > 0) return;

    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mengirim OTP");
        if (data.waitSec) setOtpCooldown(data.waitSec);
        return;
      }
      setOtpSent(true);
      setOtpCooldown(60);
      // Show dev code for testing
      if (data._devCode) {
        setDevOtpCode(data._devCode);
        toast.info(`OTP: ${data._devCode}`, { duration: 10000 });
      } else {
        toast.success("OTP terkirim ke WhatsApp Anda");
      }
    } catch {
      toast.error("Gagal mengirim OTP");
    } finally {
      setOtpSending(false);
    }
  }, [phone, otpCooldown, otpSent]);

  const handleOtpComplete = useCallback(async (code: string) => {
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, action: "verify" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "OTP salah");
        return;
      }
      setOtpVerified(true);
      toast.success("Nomor WhatsApp terverifikasi");
    } catch {
      toast.error("Gagal memverifikasi OTP");
    } finally {
      setOtpVerifying(false);
    }
  }, [phone]);

  // Reset OTP when tab changes
  useEffect(() => {
    setOtpSent(false);
    setOtpVerified(false);
    setDevOtpCode("");
    setOtpCooldown(0);
  }, [tab]);

  // Reset OTP when phone changes significantly
  const prevPhoneRef = useRef(phone);
  useEffect(() => {
    if (prevPhoneRef.current && phone !== prevPhoneRef.current) {
      const prevDigits = prevPhoneRef.current.replace(/[^0-9]/g, "");
      const currDigits = phone.replace(/[^0-9]/g, "");
      // If phone changed (not just added digits), reset OTP
      if (!currDigits.startsWith(prevDigits) && prevDigits.length >= 5) {
        setOtpSent(false);
        setOtpVerified(false);
        setDevOtpCode("");
      }
    }
    prevPhoneRef.current = phone;
  }, [phone]);

  /* ------ Login (WhatsApp OTP-based) ------ */
  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      toast.error("Verifikasi WhatsApp terlebih dahulu");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: lPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login gagal");
        return;
      }
      const setUser = useStore.getState().setUser;
      const goHome = useStore.getState().goHome;
      const goToAdmin = useStore.getState().goToAdmin;
      setUser(data.user);
      setSuccess(true);
      toast.success(formatT(tr("welcomeBack"), { name: data.user.name }));
      const isAdmin = data.user.role === "admin" || data.user.role === "superadmin";
      setTimeout(() => isAdmin ? goToAdmin() : goHome(), 900);
    } catch {
      toast.error(tr("errConnection"));
    } finally {
      setLoading(false);
    }
  };

  /* ------ Register ------ */
  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      toast.error("Verifikasi WhatsApp terlebih dahulu");
      return;
    }
    if (!rName.trim() || !rEmail.trim() || !rPass) {
      toast.error(tr("errRequired"));
      return;
    }
    if (rPass.length < 6) {
      toast.error(tr("errPassLength"));
      return;
    }
    if (rPass !== rPass2) {
      toast.error(tr("errPassMatch"));
      return;
    }
    if (!agree) {
      toast.error(tr("errAgree"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rName,
          email: rEmail,
          password: rPass,
          phone: rPhone,
          city: rCity || rProvince,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || tr("errRegister"));
        return;
      }
      const setUser = useStore.getState().setUser;
      const goToProfile = useStore.getState().goToProfile;
      const goToAdmin = useStore.getState().goToAdmin;
      setUser(data.user);
      setSuccess(true);
      toast.success(tr("registerSuccess"));
      const isAdmin = data.user.role === "admin" || data.user.role === "superadmin";
      setTimeout(() => isAdmin ? goToAdmin() : goToProfile(), 1100);
    } catch {
      toast.error(tr("errConnection"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center animate-fade-up">
        <div className="grid size-20 place-items-center rounded-full bg-primary/10">
          <CheckCircle2 className="size-12 text-primary" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">{tr("loginSuccess")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tr("loginRedirect")}</p>
        <Loader2 className="mt-4 size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* ===== MOBILE ===== */}
      <div className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6 md:hidden">
        <button onClick={goBack} className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="size-4" /> {tr("back")}
        </button>
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="Gomesin" className="size-16 rounded-2xl shadow-lg object-cover" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
            <span className="text-primary">go</span>mesin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr("loginTitle")}</p>
        </div>
        <div className="mt-6 w-full max-w-md mx-auto">
          <FormSection
            tab={tab} setTab={setTab}
            showPass={showPass} setShowPass={setShowPass}
            loading={loading}
            lPhone={lPhone} setLPhone={setLPhone}
            rName={rName} setRName={setRName}
            rEmail={rEmail} setREmail={setREmail}
            rPhone={rPhone} setRPhone={setRPhone}
            rCity={rCity} setRCity={setRCity}
            rProvince={rProvince} setRProvince={setRProvince}
            rPass={rPass} setRPass={setRPass}
            rPass2={rPass2} setRPass2={setRPass2}
            agree={agree} setAgree={setAgree}
            doLogin={doLogin} doRegister={doRegister}
            tr={tr}
            otpSent={otpSent} otpVerified={otpVerified}
            otpSending={otpSending} otpVerifying={otpVerifying}
            otpCooldown={otpCooldown} devOtpCode={devOtpCode}
            sendOtp={sendOtp} handleOtpComplete={handleOtpComplete}
          />
        </div>
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:grid md:grid-cols-2 md:min-h-[calc(100vh-4rem)]">
        <div className="relative flex flex-col items-center justify-center bg-primary px-12 py-16 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-24 -left-24 size-72 rounded-full bg-white/20" />
            <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-white/5" />
          </div>
          <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpeg" alt="Gomesin" className="size-24 rounded-3xl shadow-2xl object-cover ring-4 ring-white/20" />
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-primary-foreground">
              <span className="text-white">go</span>mesin
            </h1>
            <h2 className="mt-5 text-2xl font-black leading-tight text-white">
              Jual &amp; beli mesin industri, lebih cepat, lebih aman.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
              Ribuan listing MESIN CETAK, CNC, Laser, kompresor, alat berat &amp; sparepart — baru dan bekas dari seller terverifikasi se-Indonesia. <strong className="text-white">TANPA KOMISI</strong>
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { icon: ShieldCheck, label: "Seller Terverifikasi" },
                { icon: MapPin, label: "Se-Indonesia" },
                { icon: Cog, label: "Mesin Berkualitas" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                  <Icon className="size-3.5" />{label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            <button onClick={goBack} className="mb-6 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ChevronLeft className="size-4" /> {tr("back")}
            </button>
            <div className="mb-6 flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpeg" alt="Gomesin" className="size-10 rounded-xl object-cover shadow-sm" />
              <h1 className="text-xl font-extrabold tracking-tight">
                <span className="text-primary">go</span>mesin
              </h1>
            </div>
            <FormSection
              tab={tab} setTab={setTab}
              showPass={showPass} setShowPass={setShowPass}
              loading={loading}
              lPhone={lPhone} setLPhone={setLPhone}
              rName={rName} setRName={setRName}
              rEmail={rEmail} setREmail={setREmail}
              rPhone={rPhone} setRPhone={setRPhone}
              rCity={rCity} setRCity={setRCity}
              rProvince={rProvince} setRProvince={setRProvince}
              rPass={rPass} setRPass={setRPass}
              rPass2={rPass2} setRPass2={setRPass2}
              agree={agree} setAgree={setAgree}
              doLogin={doLogin} doRegister={doRegister}
              tr={tr}
              otpSent={otpSent} otpVerified={otpVerified}
              otpSending={otpSending} otpVerifying={otpVerifying}
              otpCooldown={otpCooldown} devOtpCode={devOtpCode}
              sendOtp={sendOtp} handleOtpComplete={handleOtpComplete}
            />
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className={cn("size-3.5 text-primary")} />
              {tr("dataSecure")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Form Section (shared mobile + desktop)                             */
/* ================================================================== */

function FormSection({
  tab, setTab, showPass, setShowPass, loading,
  lPhone, setLPhone,
  rName, setRName, rEmail, setREmail, rPhone, setRPhone,
  rCity, setRCity, rProvince, setRProvince,
  rPass, setRPass, rPass2, setRPass2, agree, setAgree,
  doLogin, doRegister, tr,
  otpSent, otpVerified, otpSending, otpVerifying,
  otpCooldown, devOtpCode, sendOtp, handleOtpComplete,
}: {
  tab: string; setTab: (v: "login" | "register") => void;
  showPass: boolean; setShowPass: (v: boolean | ((p: boolean) => boolean)) => void;
  loading: boolean;
  lPhone: string; setLPhone: (v: string) => void;
  rName: string; setRName: (v: string) => void;
  rEmail: string; setREmail: (v: string) => void;
  rPhone: string; setRPhone: (v: string) => void;
  rCity: string; setRCity: (v: string) => void;
  rProvince: string; setRProvince: (v: string) => void;
  rPass: string; setRPass: (v: string) => void;
  rPass2: string; setRPass2: (v: string) => void;
  agree: boolean; setAgree: (v: boolean) => void;
  doLogin: (e: React.FormEvent) => void;
  doRegister: (e: React.FormEvent) => void;
  tr: (key: any) => any;
  otpSent: boolean; otpVerified: boolean;
  otpSending: boolean; otpVerifying: boolean;
  otpCooldown: number; devOtpCode: string;
  sendOtp: () => void;
  handleOtpComplete: (code: string) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">{tr("tabLogin")}</TabsTrigger>
        <TabsTrigger value="register">{tr("tabRegister")}</TabsTrigger>
      </TabsList>

      {/* ============ LOGIN TAB ============ */}
      <TabsContent value="login">
        <form onSubmit={doLogin} className="space-y-4 rounded-xl border border-border bg-card p-5">
          {/* WhatsApp Number */}
          <div className="space-y-1.5">
            <Label htmlFor="l-phone">Nomor WhatsApp *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="l-phone"
                type="tel"
                inputMode="numeric"
                value={lPhone}
                onChange={(e) => setLPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                placeholder="08xx xxxx xxxx"
                className="pl-9 pr-24"
              />
              {otpSending && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* OTP Section */}
          {otpSent && !otpVerified && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <p className="text-sm font-medium">Masukkan kode OTP yang dikirim ke WhatsApp Anda</p>
              </div>
              {otpVerifying ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <OtpPinInput onComplete={handleOtpComplete} />
              )}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpCooldown > 0}
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {otpCooldown > 0 ? `Kirim ulang (${otpCooldown}s)` : "Kirim ulang"}
                </button>
                {devOtpCode && (
                  <span className="text-muted-foreground">Dev: {devOtpCode}</span>
                )}
              </div>
            </div>
          )}

          {/* Verified badge */}
          {otpVerified && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Nomor WhatsApp terverifikasi</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !otpVerified}
            className="w-full gap-2 bg-primary font-semibold"
            size="lg"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? tr("processing") : tr("tabLogin")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {tr("noAccount")}{" "}
            <button type="button" onClick={() => setTab("register")} className="font-semibold text-primary hover:underline">
              {tr("registerNow")}
            </button>
          </p>
        </form>
      </TabsContent>

      {/* ============ REGISTER TAB ============ */}
      <TabsContent value="register">
        <form onSubmit={doRegister} className="space-y-4 rounded-xl border border-border bg-card p-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="r-name">{`${tr("fullName")} *`}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="r-name" value={rName} onChange={(e) => setRName(e.target.value)} placeholder={tr("fullNamePlaceholder")} className="pl-9" />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="r-email">{`${tr("email")} *`}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="r-email" type="email" autoComplete="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="nama@email.com" className="pl-9" />
            </div>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="r-phone">Nomor WhatsApp *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="r-phone"
                type="tel"
                inputMode="numeric"
                value={rPhone}
                onChange={(e) => setRPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                placeholder="08xx xxxx xxxx"
                className="pl-9 pr-24"
              />
              {otpSending && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* OTP Section (Register) */}
          {otpSent && !otpVerified && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <p className="text-sm font-medium">Masukkan kode OTP dari WhatsApp</p>
              </div>
              {otpVerifying ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <OtpPinInput onComplete={handleOtpComplete} />
              )}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={otpCooldown > 0}
                  className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {otpCooldown > 0 ? `Kirim ulang (${otpCooldown}s)` : "Kirim ulang"}
                </button>
                {devOtpCode && (
                  <span className="text-muted-foreground">Dev: {devOtpCode}</span>
                )}
              </div>
            </div>
          )}

          {/* Verified badge (Register) */}
          {otpVerified && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">WhatsApp terverifikasi</span>
            </div>
          )}

          {/* Province (BEFORE City — swapped) */}
          <div className="space-y-1.5">
            <Label>{tr("province")}</Label>
            <Select value={rProvince} onValueChange={(v) => { setRProvince(v); setRCity(""); }}>
              <SelectTrigger className="w-full"><SelectValue placeholder={tr("selectProvince")} /></SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City (AFTER Province — swapped) */}
          <div className="space-y-1.5">
            <Label>{tr("cityLabel")}</Label>
            <Select value={rCity} onValueChange={(v) => { setRCity(v); }} disabled={!rProvince}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={rProvince ? tr("selectCity") : tr("selectProvinceFirst")} />
              </SelectTrigger>
              <SelectContent>
                {(PROVINCE_CITIES[rProvince] || []).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="r-pass">{`${tr("password")} *`}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="r-pass" type={showPass ? "text" : "password"} autoComplete="new-password" value={rPass} onChange={(e) => setRPass(e.target.value)} placeholder={tr("passwordPlaceholder")} className="px-9" />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPass ? tr("hidePass") : tr("showPass")}>
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="r-pass2">{`${tr("passwordConfirm")} *`}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="r-pass2" type={showPass ? "text" : "password"} autoComplete="new-password" value={rPass2} onChange={(e) => setRPass2(e.target.value)} placeholder={tr("passwordConfirmPlaceholder")} className="pl-9" />
            </div>
            {rPass2 && rPass !== rPass2 && (
              <p className="text-xs text-destructive">{tr("passwordMismatch")}</p>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-primary" />
            <span>{tr("agreeTerms")}</span>
          </label>

          <Button
            type="submit"
            disabled={loading || !otpVerified}
            className="w-full gap-2 bg-primary font-semibold"
            size="lg"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? tr("processing") : tr("registerBtn")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {tr("haveAccount")}{" "}
            <button type="button" onClick={() => setTab("login")} className="font-semibold text-primary hover:underline">
              {tr("loginHere")}
            </button>
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
