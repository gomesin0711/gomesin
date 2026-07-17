"use client";

import { useState } from "react";
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
} from "lucide-react";
import { PROVINCES } from "@/lib/types";
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

export function LoginView() {
  const goBack = useStore((s) => s.goBack);
  const goHome = useStore((s) => s.goHome);
  const setUser = useStore((s) => s.setUser);
  const goToPost = useStore((s) => s.goToPost);
  const goToAdmin = useStore((s) => s.goToAdmin);

  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  // shared
  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // login fields
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass] = useState("");

  // register fields
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rCity, setRCity] = useState("");
  const [rProvince, setRProvince] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");
  const [agree, setAgree] = useState(false);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lEmail.trim() || !lPass) {
      toast.error(tr("errEmailPass"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lEmail, password: lPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || tr("errLogin"));
        return;
      }
      setUser(data.user);
      setSuccess(true);
      toast.success(formatT(tr("welcomeBack"), { name: data.user.name }));
      // Admin users go to admin panel, regular users go home
      const isAdmin = data.user.role === "admin" || data.user.role === "superadmin";
      setTimeout(() => isAdmin ? goToAdmin() : goHome(), 900);
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
      setUser(data.user);
      setSuccess(true);
      toast.success(tr("registerSuccess"));
      // Admin users go to admin panel, regular users go to post ad
      const isAdmin = data.user.role === "admin" || data.user.role === "superadmin";
      setTimeout(() => isAdmin ? goToAdmin() : goToPost(), 1100);
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
    <div className="mx-auto max-w-md px-4 py-6 animate-fade-up">
      <button
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4" /> {tr("back")}
      </button>

      {/* brand header */}
      <div className="mb-5 flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Cog className="size-8" />
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
          <span className="text-primary">go</span>mesin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr("loginTitle")}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{tr("tabLogin")}</TabsTrigger>
          <TabsTrigger value="register">{tr("tabRegister")}</TabsTrigger>
        </TabsList>

        {/* ===== LOGIN ===== */}
        <TabsContent value="login">
          <form
            onSubmit={doLogin}
            className="space-y-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="l-email">{tr("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="l-email"
                  type="email"
                  autoComplete="email"
                  value={lEmail}
                  onChange={(e) => setLEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l-pass">{tr("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="l-pass"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={lPass}
                  onChange={(e) => setLPass(e.target.value)}
                  placeholder="••••••••"
                  className="px-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPass ? tr("hidePass") : tr("showPass")}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-muted-foreground">
                <input type="checkbox" className="accent-primary" /> {tr("rememberMe")}
              </label>
              <button
                type="button"
                onClick={() => toast.info(tr("forgotPasswordSoon"))}
                className="font-medium text-primary hover:underline"
              >
                {tr("forgotPassword")}
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-primary font-semibold"
              size="lg"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? tr("processing") : tr("tabLogin")}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {tr("noAccount")}{" "}
              <button
                type="button"
                onClick={() => setTab("register")}
                className="font-semibold text-primary hover:underline"
              >
                {tr("registerNow")}
              </button>
            </p>
          </form>
        </TabsContent>

        {/* ===== REGISTER ===== */}
        <TabsContent value="register">
          <form
            onSubmit={doRegister}
            className="space-y-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="r-name">{`${tr("fullName")} *`}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="r-name"
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  placeholder={tr("fullNamePlaceholder")}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-email">{`${tr("email")} *`}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="r-email"
                  type="email"
                  autoComplete="email"
                  value={rEmail}
                  onChange={(e) => setREmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="r-phone">{tr("whatsapp")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="r-phone"
                    value={rPhone}
                    onChange={(e) => setRPhone(e.target.value)}
                    placeholder={tr("whatsappPlaceholder")}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-city">{tr("cityLabel")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="r-city"
                    value={rCity}
                    onChange={(e) => setRCity(e.target.value)}
                    placeholder={tr("cityLabelPlaceholder")}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tr("province")}</Label>
              <Select value={rProvince} onValueChange={setRProvince}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tr("selectProvince")} />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-pass">{`${tr("password")} *`}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="r-pass"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={rPass}
                  onChange={(e) => setRPass(e.target.value)}
                  placeholder={tr("passwordPlaceholder")}
                  className="px-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPass ? tr("hidePass") : tr("showPass")}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-pass2">{`${tr("passwordConfirm")} *`}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="r-pass2"
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={rPass2}
                  onChange={(e) => setRPass2(e.target.value)}
                  placeholder={tr("passwordConfirmPlaceholder")}
                  className="pl-9"
                />
              </div>
              {rPass2 && rPass !== rPass2 && (
                <p className="text-xs text-destructive">{tr("passwordMismatch")}</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span>{tr("agreeTerms")}</span>
            </label>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 bg-primary font-semibold"
              size="lg"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? tr("processing") : tr("registerBtn")}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {tr("haveAccount")}{" "}
              <button
                type="button"
                onClick={() => setTab("login")}
                className="font-semibold text-primary hover:underline"
              >
                {tr("loginHere")}
              </button>
            </p>
          </form>
        </TabsContent>
      </Tabs>

      {/* trust note */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className={cn("size-3.5 text-primary")} />
        {tr("dataSecure")}
      </div>
    </div>
  );
}
