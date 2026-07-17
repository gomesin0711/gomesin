"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Plus, Heart, User, ChevronDown, Cog, Home, MessageSquare } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { translations as i18nTranslations } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { PROVINCES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryNav } from "./category-nav";
import { useChatSocket } from "@/lib/use-chat-socket";

function Logo() {
  return (
    <button
      onClick={() => useStore.getState().goHome()}
      className="flex shrink-0 items-center gap-2"
      aria-label="Gomesin Beranda"
    >
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Cog className="size-5" />
      </span>
      <span className="text-xl font-extrabold tracking-tight">
        <span className="text-primary">go</span>mesin
      </span>
    </button>
  );
}

export function Header() {
  const goToListings = useStore((s) => s.goToListings);
  const goHome = useStore((s) => s.goHome);
  const goToPost = useStore((s) => s.goToPost);
  const goToFavorites = useStore((s) => s.goToFavorites);
  const goToProfile = useStore((s) => s.goToProfile);
  const goToProfilePanel = useStore((s) => s.goToProfilePanel);
  const goToLogin = useStore((s) => s.goToLogin);
  // Badge = unseen favorites (added since last visit to favorites page)
  const favCount = Math.max(0, useStore((s) => s.favorites.length - s.favoritesSeenCount));
  const user = useStore((s) => s.user);
  const filters = useStore((s) => s.filters);
  const currentView = useStore((s) => s.view);
  const { lang, setLang, t } = useLang();
  const mounted = useMounted();
  const [langOpenMobile, setLangOpenMobile] = useState(false);

  // Fetch unread messages for badge — NO polling, socket invalidates on change.
  const queryClient = useQueryClient();
  const { subscribe } = useChatSocket();
  const { data: messagesData } = useQuery({
    queryKey: ["messages", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/messages?userId=${user!.id}`);
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Socket invalidates on new message / read receipt.
  });
  const unreadCount = messagesData?.conversations?.reduce((a: number, c: any) => a + (c.unread || 0), 0) ?? 0;

  // Realtime: refresh unread count instantly when a new message arrives or a read receipt comes in.
  useEffect(() => {
    if (!user) return;
    const offNew = subscribe("message:new", () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    });
    const offRead = subscribe("message:read-update", () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    });
    return () => {
      offNew();
      offRead();
    };
  }, [user, subscribe, queryClient]);

  const [langOpenDesktop, setLangOpenDesktop] = useState(false);

  const changeLang = (l: "id" | "en" | "zh") => {
    setLang(l);
    setLangOpenMobile(false);
    setLangOpenDesktop(false);
  };
  const langFlag = (l: Lang) => (l === "id" ? "🇮🇩" : l === "zh" ? "🇨🇳" : "🇬🇧");
  // Before mounted: always use Indonesian to match SSR. After: use actual lang.
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const hideCategoryNav = ["home", "admin", "admin-sellers", "admin-categories", "admin-listings", "admin-new-listings", "admin-expired-listings", "admin-rejected-listings", "admin-transactions", "admin-reports", "admin-users", "admin-paket", "post", "edit", "login", "profile", "dashboard", "favorites", "detail", "seller"].includes(currentView);

  const [q, setQ] = useState(filters.q ?? "");
  const [prevQ, setPrevQ] = useState(filters.q);
  const [province, setProvince] = useState(filters.province ?? "Indonesia");

  // Sync local search input when the store query changes externally (render-time adjustment)
  if (filters.q !== prevQ) {
    setPrevQ(filters.q);
    setQ(filters.q ?? "");
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goToListings({
      q,
      province: province === "Indonesia" ? undefined : province,
    });
  };

  const renderLocations = () => (
    <div className="max-h-80 overflow-y-auto gomesin-scroll py-1">
      <button
        onClick={() => setProvince("Indonesia")}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
          province === "Indonesia" && "font-semibold text-primary"
        )}
      >
        <MapPin className="size-4" /> {tr("allIndonesia")}
      </button>
      <div className="my-1 border-t border-border" />
      {PROVINCES.map((p) => (
        <button
          key={p}
          onClick={() => setProvince(p)}
          className={cn(
            "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
            province === p && "font-semibold text-primary"
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* ===== MOBILE (below md) ===== */}
      <div className="md:hidden">
        {/* Row 1: Logo (left) + Favorit & Location (top-right, aligned with logo) */}
        <div className="flex h-14 items-center gap-1 px-3">
          <Logo />
          <div className="ml-auto flex items-center gap-0.5">
            <Popover open={langOpenMobile} onOpenChange={setLangOpenMobile}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-xs font-bold text-foreground hover:bg-accent"
                  aria-label="Bahasa"
                >
                  <span className="text-base leading-none">{langFlag(lang)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-1" align="end">
                <button
                  onClick={() => changeLang("id")}
                  className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent", lang === "id" && "font-bold text-primary")}
                >
                  🇮🇩 Indonesia
                </button>
                <button
                  onClick={() => changeLang("en")}
                  className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent", lang === "en" && "font-bold text-primary")}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => changeLang("zh")}
                  className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent", lang === "zh" && "font-bold text-primary")}
                >
                  🇨🇳 中文
                </button>
              </PopoverContent>
            </Popover>
            <button
              onClick={goToFavorites}
              className="relative grid size-9 place-items-center rounded-lg text-foreground hover:bg-accent"
              aria-label="Favorit"
            >
              <Heart className="size-5" />
              {favCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 size-4 rounded-full bg-rose-500 p-0 text-[9px] text-white">
                  {favCount}
                </Badge>
              )}
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
                  aria-label="Pilih lokasi"
                >
                  <MapPin className="size-4 text-primary" />
                  <span className="max-w-[90px] truncate">{province}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              {renderLocations()}
            </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Row 2: Search (below logo, full width) */}
        <div className="px-3 pb-2">
          <form onSubmit={submitSearch} className="relative">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tr("searchPlaceholder")}
              className="h-10 rounded-full border-border bg-card pr-10 pl-4 text-sm"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Search className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ===== DESKTOP (md and up) ===== */}
      <div className="hidden md:flex mx-auto h-16 max-w-7xl items-center gap-3 px-4">
        <Logo />

        {/* location */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
              <MapPin className="size-4 text-primary" />
              <span className="max-w-[120px] truncate">{province}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            {renderLocations()}
          </PopoverContent>
        </Popover>

        {/* search */}
        <form onSubmit={submitSearch} className="relative flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr("searchPlaceholder")}
            className="h-10 rounded-full border-border bg-card pr-10 pl-4 text-sm"
          />
          <button
            type="submit"
            aria-label="Cari"
            className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Search className="size-4" />
          </button>
        </form>

        {/* actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={goHome}
            className="flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-foreground hover:bg-accent"
            aria-label={tr("home2")}
          >
            <Home className="size-5" />
            <span className="text-[10px] font-medium leading-none">{tr("home2")}</span>
          </button>
          {user && (
            <button
              onClick={() => goToProfilePanel("pesan")}
              className="relative flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-foreground hover:bg-accent"
              aria-label={tr("chat")}
            >
              <div className="relative">
                <MessageSquare className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{tr("chat")}</span>
            </button>
          )}
          <Popover open={langOpenDesktop} onOpenChange={setLangOpenDesktop}>
            <PopoverTrigger asChild>
              <button
                className="flex h-10 items-center gap-1 rounded-lg px-2 text-sm font-bold text-foreground hover:bg-accent"
                aria-label="Language"
              >
                <span className="text-base leading-none">{langFlag(lang)}</span>
                
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="end">
              <button
                onClick={() => changeLang("id")}
                className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent", lang === "id" && "font-bold text-primary")}
              >
                🇮🇩 Indonesia
              </button>
              <button
                onClick={() => changeLang("en")}
                className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent", lang === "en" && "font-bold text-primary")}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => changeLang("zh")}
                className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent", lang === "zh" && "font-bold text-primary")}
              >
                🇨🇳 中文
              </button>
            </PopoverContent>
          </Popover>
          <button
            onClick={goToFavorites}
            className="relative hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-accent md:flex"
            aria-label="Favorit"
          >
            <Heart className="size-5" />
            {favCount > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 size-4 rounded-full bg-rose-500 p-0 text-[9px] text-white">
                {favCount}
              </Badge>
            )}
          </button>

          {user ? (
            <button
              onClick={goToProfile}
              className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-foreground hover:bg-accent"
              aria-label="Akun"
            >
              <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </span>
              <span className="hidden max-w-[100px] truncate lg:inline">{user.name.split(" ")[0]}</span>
            </button>
          ) : (
            <button
              onClick={goToLogin}
              className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-accent"
              aria-label="Masuk atau Daftar"
            >
              <User className="size-5" />
              <span className="hidden lg:inline">{user ? user.name.split(" ")[0] : tr("login")}</span>
            </button>
          )}

          <Button
            onClick={goToPost}
            className="h-10 gap-1.5 rounded-full bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="size-4" />
            <span>{tr("sell")}</span>
          </Button>
        </div>
      </div>

      {/* Category nav (hidden on admin/post/login views) */}
      {!hideCategoryNav && (
        <div className="border-t border-border">
          <CategoryNav />
        </div>
      )}
    </header>
  );
}
