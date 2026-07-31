"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Download, Smartphone, Monitor, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";
type Browser = "chrome" | "edge" | "samsung" | "huawei" | "opera" | "firefox" | "safari" | "other";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DISMISSED_KEY = "gomesin-pwa-dismissed";
const INSTALLED_KEY = "gomesin-pwa-installed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    ("standalone" in navigator && (navigator as unknown as Record<string, boolean>).standalone === true)
  );
}

function canShow(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return true;
    const ts = Number(raw);
    if (isNaN(ts)) return true;
    return Date.now() - ts > DISMISS_MS;
  } catch {
    return true;
  }
}

function markDismissed() {
  try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
}

function markInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
}

function isInstalled(): boolean {
  try { return localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/HuaweiBrowser/i.test(ua) || (/HUAWEI/i.test(ua) && /Mobile/i.test(ua))) return "huawei";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Edg/i.test(ua)) return "edge";
  if (/OPR|Opera/i.test(ua)) return "opera";
  if (/Chrome/i.test(ua)) return "chrome";
  if (/Safari/i.test(ua)) return "safari";
  return "other";
}

function isChromium(b: Browser): boolean {
  return ["chrome", "edge", "samsung", "huawei", "opera"].includes(b);
}

/* ------------------------------------------------------------------ */
/*  Translations                                                       */
/* ------------------------------------------------------------------ */

const T: Record<string, Record<string, string>> = {
  title:      { id: "Install Gomesin App", en: "Install Gomesin App", zh: "\u5b89\u88c5 Gomesin" },
  desc:       { id: "Akses langsung dari home screen", en: "Access directly from home screen", zh: "\u4ece\u4e3b\u5c4f\u5e55\u76f4\u63a5\u8bbf\u95ee" },
  install:    { id: "Install", en: "Install", zh: "\u5b89\u88c5" },
  later:      { id: "Nanti", en: "Later", zh: "\u4ee5\u540e\u518d\u8bf4" },
  iosHint:    { id: "Tekan tombol di bawah, lalu pilih \"Tambahkan ke Layar Utama\"", en: "Tap the button below, then select \"Add to Home Screen\"", zh: "\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\uff0c\u7136\u540e\u9009\u62e9\u201c\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55\u201d" },
  androidHint:{ id: "Tekan tombol di bawah untuk install otomatis", en: "Tap the button below to auto-install", zh: "\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u81ea\u52a8\u5b89\u88c5" },
};

function tr(key: string, lang: string): string {
  return T[key]?.[lang] ?? T[key]?.["id"] ?? key;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PwaInstallPrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { lang } = useLang();
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const autoFiredRef = useRef(false);

  const platform: Platform = typeof window !== "undefined" ? detectPlatform() : "desktop";
  const browser: Browser = typeof window !== "undefined" ? detectBrowser() : "chrome";
  const chromium = isChromium(browser);

  /* ------ Chromium: capture beforeinstallprompt & AUTO-FIRE it ------ */
  useEffect(() => {
    if (isStandalone() || isInstalled() || !canShow()) return;

    if (chromium) {
      const handler = (e: Event) => {
        e.preventDefault();
        const evt = e as BeforeInstallPromptEvent;
        deferredRef.current = evt;

        // AUTO-FIRE the native install dialog after 2 seconds
        if (!autoFiredRef.current) {
          autoFiredRef.current = true;
          setTimeout(() => {
            evt.prompt().then(() => {
              evt.userChoice.then((choice) => {
                if (choice.outcome === "accepted") {
                  markInstalled();
                  setShowBanner(false);
                } else {
                  markDismissed();
                  setShowBanner(false);
                }
                deferredRef.current = null;
              });
            }).catch(() => {
              // prompt() rejected or failed — show fallback banner
              setShowBanner(true);
            });
          }, 2000);
        }
      };

      window.addEventListener("beforeinstallprompt", handler);

      // Fallback: if no beforeinstallprompt after 5s, show manual banner
      const fallback = setTimeout(() => {
        if (!autoFiredRef.current && !isStandalone() && canShow()) {
          setShowBanner(true);
        }
      }, 5000);

      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(fallback);
      };
    }

    // Non-Chromium: show banner after 2s
    if (!chromium && canShow()) {
      const timer = setTimeout(() => {
        if (!isStandalone()) setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------ listen for appinstalled ------ */
  useEffect(() => {
    const handler = () => {
      deferredRef.current = null;
      setShowBanner(false);
      markInstalled();
    };
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  /* ------ handle install button tap ------ */
  const handleInstall = useCallback(async () => {
    // If we have the deferred prompt (Chromium), trigger it
    if (deferredRef.current) {
      setInstalling(true);
      try {
        await deferredRef.current.prompt();
        const { outcome } = await deferredRef.current.userChoice;
        if (outcome === "accepted") markInstalled();
        else markDismissed();
        deferredRef.current = null;
      } catch {}
      setInstalling(false);
      setShowBanner(false);
      return;
    }

    // iOS Safari: try Web Share API to open native share sheet
    // (which includes "Add to Home Screen" as an option)
    if (platform === "ios" && navigator.share) {
      try {
        await navigator.share({
          title: "Gomesin",
          text: "Marketplace Mesin Industri #1 di Indonesia",
          url: window.location.href,
        });
      } catch {
        // User cancelled or share not supported — dismiss silently
      }
      setShowBanner(false);
      markDismissed();
      return;
    }

    // Fallback: dismiss
    setShowBanner(false);
    markDismissed();
  }, [platform]);

  /* ------ dismiss ------ */
  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    markDismissed();
  }, []);

  /* ------ don't render if standalone or hidden ------ */
  if (isStandalone() || isInstalled() || !showBanner) return null;

  const icon = platform === "ios" ? <Tablet className="size-5 text-primary" /> : platform === "android" ? <Smartphone className="size-5 text-primary" /> : <Monitor className="size-5 text-primary" />;
  const hint = platform === "ios" ? tr("iosHint", lang) : tr("androidHint", lang);

  return (
    <div className="fixed inset-x-0 bottom-16 z-[90] animate-in slide-in-from-bottom-2 duration-300 md:bottom-0">
      <div className="mx-auto max-w-lg px-3 pb-2">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md">
          {/* Logo */}
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 overflow-hidden">
            <img src="/pwa-icon-192.png" alt="" className="size-7 rounded-lg object-cover" />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-foreground">{tr("title", lang)}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{hint}</p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              className="h-9 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90 gap-1.5"
              onClick={handleInstall}
              disabled={installing}
            >
              <Download className="size-3.5" />
              {installing ? "..." : tr("install", lang)}
            </Button>
            <button
              onClick={handleDismiss}
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
