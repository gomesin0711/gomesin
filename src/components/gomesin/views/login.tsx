"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Send,
  RefreshCw,
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
/*  OTP Hook – shared by login & register tabs                        */
/* ------------------------------------------------------------------ */

type OtpState = "idle" | "sending" | "sent" | "verifying" | "verified";

function useOtp() {
  const [otpState, setOtpState] = useState<OtpState>("idle");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const sendOtp = useCallback(async (phone: string, tr: (k: any) => any, email?: string) => {
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error(tr("errPhoneRequired"));
      return;
    }
    setOtpState("sending");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "send", email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal mengirim OTP");
        setOtpState("idle");
        return;
      }
      // If OTP sent via WhatsApp (production mode)
      if (data.sentViaWhatsApp) {
        toast.success(tr("otpSent"));
      } else if (data._devCode) {
        // Fallback dev mode — show OTP code in toast
        toast.info(`OTP: ${data._devCode}`, { duration: 10000 });
        toast.success(tr("otpSent"));
      }
      setOtpState("sent");
      setOtpCode("");
      setCooldown(60);
    } catch {
      toast.error(tr("errConnection"));
      setOtpState("idle");
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, tr: (k: any) => any) => {
    if (otpCode.length !== 6) {
      toast.error(tr("errOtpRequired"));
      return;
    }
    setOtpState("verifying");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "verify", code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal verifikasi OTP");
        setOtpState("sent");
        return;
      }
      setOtpState("verified");
      toast.success(tr("otpVerified"));
    } catch {
      toast.error(tr("errConnection"));
      setOtpState("sent");
    }
  }, [otpCode]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) { clearTimer(); return; }
    timerRef.current = setInterval(() => {
      setCooldown((p) => {
        if (p <= 1) { clearTimer(); return 0; }
        return p - 1;
      });
    }, 1000);
    return clearTimer;
  }, [cooldown, clearTimer]);

  const reset = useCallback(() => {
    setOtpState("idle");
    setOtpCode("");
    setCooldown(0);
    clearTimer();
  }, [clearTimer]);

  return { otpState, setOtpState, otpCode, setOtpCode, cooldown, sendOtp, verifyOtp, reset };
}

/* ------------------------------------------------------------------ */
/*  WhatsApp OTP Input Field                                          */
/* ------------------------------------------------------------------ */

function WaOtpField({
  phone, setPhone, otp, tr, email,
}: {
  phone: string; setPhone: (v: string) => void;
  otp: ReturnType<typeof useOtp>;
  tr: (k: any) => any;
  email?: string;
}) {
  const { otpState, otpCode, setOtpCode, cooldown, sendOtp, verifyOtp } = otp;
  const digits = phone.replace(/\D/g, "");
  const prevDigitsRef = useRef("");

  // Auto-send OTP when digits reach 10+
  useEffect(() => {
    if (digits.length >= 10 && digits.length > prevDigitsRef.current.length && otpState === "idle") {
      prevDigitsRef.current = digits;
      sendOtp(phone, tr, email);
    } else {
      prevDigitsRef.current = digits;
    }
  }, [digits, otpState, phone, sendOtp, tr, email]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && (otpState === "sent" || otpState === "verifying")) {
      verifyOtp(phone, tr);
    }
  }, [otpCode, otpState, phone, verifyOtp, tr]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="wa-phone">{tr("whatsapp")}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="wa-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/[^0-9+\- ]/g, ""));
                if (otpState === "verified") otp.reset();
              }}
              placeholder={tr("whatsappPlaceholder")}
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={digits.length < 10 || otpState === "sending" || cooldown > 0}
            onClick={() => sendOtp(phone, tr, email)}
            className="shrink-0 gap-1.5 px-3"
          >
            {otpState === "sending" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : cooldown > 0 ? (
              <>{cooldown}s</>
            ) : otpState === "sent" || otpState === "verified" ? (
              <RefreshCw className="size-3.5" />
            ) : (
              <Send className="size-3.5" />
            )}
            {cooldown > 0
              ? tr("resendOtp")
              : otpState === "sent" || otpState === "verified"
                ? tr("resendOtp")
                : tr("sendOtp")}
          </Button>
        </div>
      </div>

      {(otpState === "sent" || otpState === "verifying" || otpState === "verified") && (
        <div className="space-y-1.5 animate-fade-up">
          <Label htmlFor="otp-code">{tr("enterOtp")}</Label>
          <div className="relative">
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              className={cn(
                "pl-9 tracking-[0.3em] text-center font-mono text-lg",
                otpState === "verified" && "border-green-500 bg-green-50 dark:bg-green-950/30"
              )}
              disabled={otpState === "verifying"}
            />
            {otpState === "verifying" && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-primary" />
            )}
            {otpState === "verified" && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-green-500" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main LoginView Component                                          */
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
  const [loginMethod, setLoginMethod] = useState<"email" | "whatsapp">("whatsapp");
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass] = useState("");
  const [lPhone, setLPhone] = useState("");
  const loginOtp = useOtp();

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
  const registerOtp = useOtp();

  // Reset OTP when switching tabs
  useEffect(() => {
    loginOtp.reset();
    registerOtp.reset();
  }, [tab, loginOtp.reset, registerOtp.reset]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let body: Record<string, string>;
      if (loginMethod === "email") {
        if (!lEmail.trim() || !lPass) {
          toast.error(tr("errEmailPass"));
          return;
        }
        body = { email: lEmail, password: lPass };
      } else {
        if (lPhone.replace(/\D/g, "").length < 10) {
          toast.error(tr("errPhoneRequired"));
          return;
        }
        if (loginOtp.otpState !== "verified") {
          toast.error(tr("errPhoneNotVerified"));
          return;
        }
        body = { phone: lPhone };
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || tr("errLogin"));
        return;
      }
      const setUser = useStore.getState().setUser;
      const goToProfile = useStore.getState().goToProfile;
      const goToAdmin = useStore.getState().goToAdmin;
      setUser(data.user);
      setSuccess(true);
      toast.success(formatT(tr("welcomeBack"), { name: data.user.name }));
      const isAdmin = data.user.role === "admin" || data.user.role === "superadmin";
      setTimeout(() => isAdmin ? goToAdmin() : goToProfile(), 900);
    } catch {
      toast.error(tr("errConnection"));
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName.trim() || !rEmail.trim() || !rPass) {
      toast.error(tr("errRequired"));
      return;
    }
    if (rPhone.replace(/\D/g, "").length < 10) {
      toast.error(tr("errPhoneRequired"));
      return;
    }
    if (registerOtp.otpState !== "verified") {
      toast.error(tr("errPhoneNotVerified"));
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
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("loginRedirect")}
        </p>
        <Loader2 className="mt-4 size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* ===== MOBILE: compact single column ===== */}
      <div className="flex min-h-[calc(100vh-4rem)] flex-col px-4 py-6 md:hidden">
        <button
          onClick={goBack}
          className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
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
            loginMethod={loginMethod} setLoginMethod={setLoginMethod}
            lEmail={lEmail} setLEmail={setLEmail}
            lPass={lPass} setLPass={setLPass}
            lPhone={lPhone} setLPhone={setLPhone}
            loginOtp={loginOtp}
            rName={rName} setRName={setRName}
            rEmail={rEmail} setREmail={setREmail}
            rPhone={rPhone} setRPhone={setRPhone}
            registerOtp={registerOtp}
            rCity={rCity} setRCity={setRCity}
            rProvince={rProvince} setRProvince={setRProvince}
            rPass={rPass} setRPass={setRPass}
            rPass2={rPass2} setRPass2={setRPass2}
            agree={agree} setAgree={setAgree}
            doLogin={doLogin} doRegister={doRegister}
            tr={tr}
          />
        </div>
      </div>

      {/* ===== DESKTOP: 1/2 orange block + 1/2 centered form ===== */}
      <div className="hidden md:grid md:grid-cols-2 md:min-h-[calc(100vh-4rem)]">
        {/* LEFT: Orange block with logo + marketing text */}
        <div className="relative flex flex-col items-center justify-center bg-primary px-12 py-16 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-24 -left-24 size-72 rounded-full bg-white/20" />
            <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-white/5" />
          </div>
          <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpeg"
              alt="Gomesin"
              className="size-24 rounded-3xl shadow-2xl object-cover ring-4 ring-white/20"
            />
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-primary-foreground">
              <span className="text-white">go</span>mesin
            </h1>
            <h2 className="mt-5 text-2xl font-black leading-tight text-white">
              Jual &amp; beli mesin industri, lebih cepat, lebih aman.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-primary-foreground/80">
              Ribuan listing MESIN CETAK, CNC, Laser, kompresor, alat berat &amp; sparepart — baru dan bekas dari seller terverifikasi se-Indonesia.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { icon: ShieldCheck, label: "Seller Terverifikasi" },
                { icon: MapPin, label: "Se-Indonesia" },
                { icon: Cog, label: "Mesin Berkualitas" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
                >
                  <Icon className="size-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Centered login/register form */}
        <div className="flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            <button
              onClick={goBack}
              className="mb-6 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
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
              loginMethod={loginMethod} setLoginMethod={setLoginMethod}
              lEmail={lEmail} setLEmail={setLEmail}
              lPass={lPass} setLPass={setLPass}
              lPhone={lPhone} setLPhone={setLPhone}
              loginOtp={loginOtp}
              rName={rName} setRName={setRName}
              rEmail={rEmail} setREmail={setREmail}
              rPhone={rPhone} setRPhone={setRPhone}
              registerOtp={registerOtp}
              rCity={rCity} setRCity={setRCity}
              rProvince={rProvince} setRProvince={setRProvince}
              rPass={rPass} setRPass={setRPass}
              rPass2={rPass2} setRPass2={setRPass2}
              agree={agree} setAgree={setAgree}
              doLogin={doLogin} doRegister={doRegister}
              tr={tr}
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

/* ===== Reusable form section (used in both mobile & desktop) ===== */
function FormSection({
  tab, setTab, showPass, setShowPass, loading,
  loginMethod, setLoginMethod,
  lEmail, setLEmail, lPass, setLPass,
  lPhone, setLPhone, loginOtp,
  rName, setRName, rEmail, setREmail, rPhone, setRPhone, registerOtp,
  rCity, setRCity, rProvince, setRProvince,
  rPass, setRPass, rPass2, setRPass2, agree, setAgree,
  doLogin, doRegister, tr,
}: {
  tab: string; setTab: (v: "login" | "register") => void;
  showPass: boolean; setShowPass: (v: boolean | ((p: boolean) => boolean)) => void;
  loading: boolean;
  loginMethod: "email" | "whatsapp";
  setLoginMethod: (v: "email" | "whatsapp") => void;
  lEmail: string; setLEmail: (v: string) => void;
  lPass: string; setLPass: (v: string) => void;
  lPhone: string; setLPhone: (v: string) => void;
  loginOtp: ReturnType<typeof useOtp>;
  rName: string; setRName: (v: string) => void;
  rEmail: string; setREmail: (v: string) => void;
  rPhone: string; setRPhone: (v: string) => void;
  registerOtp: ReturnType<typeof useOtp>;
  rCity: string; setRCity: (v: string) => void;
  rProvince: string; setRProvince: (v: string) => void;
  rPass: string; setRPass: (v: string) => void;
  rPass2: string; setRPass2: (v: string) => void;
  agree: boolean; setAgree: (v: boolean) => void;
  doLogin: (e: React.FormEvent) => void;
  doRegister: (e: React.FormEvent) => void;
  tr: (key: any) => any;
}) {
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">{tr("tabLogin")}</TabsTrigger>
        <TabsTrigger value="register">{tr("tabRegister")}</TabsTrigger>
      </TabsList>

      {/* ========== LOGIN TAB ========== */}
      <TabsContent value="login">
        <form onSubmit={doLogin} className="space-y-4 rounded-xl border border-border bg-card p-5">
          {/* Login method dropdown */}
          <div className="space-y-1.5">
            <Label>{tr("loginMethod")}</Label>
            <Select value={loginMethod} onValueChange={(v) => { setLoginMethod(v as "email" | "whatsapp"); loginOtp.reset(); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">
                  <span className="inline-flex items-center gap-2">
                    <Phone className="size-4 text-[#25D366]" />
                    {tr("whatsapp")}
                  </span>
                </SelectItem>
                <SelectItem value="email">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="size-4" />
                    {tr("email")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email + Password fields */}
          {loginMethod === "email" && (
            <>
              <div className="space-y-1.5 animate-fade-up">
                <Label htmlFor="l-email">{tr("email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="l-email" type="email" autoComplete="email" value={lEmail} onChange={(e) => setLEmail(e.target.value)} placeholder="nama@email.com" className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-pass">{tr("password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="l-pass" type={showPass ? "text" : "password"} autoComplete="current-password" value={lPass} onChange={(e) => setLPass(e.target.value)} placeholder="••••••••" className="px-9" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPass ? tr("hidePass") : tr("showPass")}>
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* WhatsApp OTP fields */}
          {loginMethod === "whatsapp" && (
            <div className="animate-fade-up">
              <WaOtpField phone={lPhone} setPhone={setLPhone} otp={loginOtp} tr={tr} />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || (loginMethod === "whatsapp" && loginOtp.otpState !== "verified")}
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

      {/* ========== REGISTER TAB ========== */}
      <TabsContent value="register">
        <form onSubmit={doRegister} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">{`${tr("fullName")} *`}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="r-name" value={rName} onChange={(e) => setRName(e.target.value)} placeholder={tr("fullNamePlaceholder")} className="pl-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-email">{`${tr("email")} *`}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="r-email" type="email" autoComplete="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="nama@email.com" className="pl-9" />
            </div>
          </div>

          <WaOtpField phone={rPhone} setPhone={setRPhone} otp={registerOtp} tr={tr} email={rEmail} />

          {/* Province BEFORE City */}
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

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-primary" />
            <span>{tr("agreeTerms")}</span>
          </label>

          <Button type="submit" disabled={loading} className="w-full gap-2 bg-primary font-semibold" size="lg">
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