"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Download, Smartphone, Monitor, Tablet, Share2, ArrowUpFromLine, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Platform = "ios" | "android" | "desktop";
type Browser = "chrome" | "edge" | "samsung" | "huawei" | "opera" | "firefox" | "safari" | "other";

interface DeferredPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DISMISSED_KEY = "gomesin-pwa-dismissed";
const INSTALLED_KEY = "gomesin-pwa-installed";
const DISMISS_MS = 24 * 60 * 60 * 1000; // 1 day
const SHOW_DELAY_MS = 1000; // 1 second after SW is ready
const PROMPT_WAIT_MS = 5000; // wait up to 5s for beforeinstallprompt on Chromium

/* ------------------------------------------------------------------ */
/*  Globals                                                            */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    __deferredInstallPrompt: DeferredPrompt | null;
    __swReady: boolean;
  }
}

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
  if (/CriOS/i.test(ua)) return "safari"; // Chrome on iOS uses Safari engine
  if (/Chrome/i.test(ua)) return "chrome";
  if (/Safari/i.test(ua)) return "safari";
  return "other";
}

function isChromium(b: Browser): boolean {
  return ["chrome", "edge", "samsung", "huawei", "opera"].includes(b);
}

function getNativePrompt(): DeferredPrompt | null {
  return window.__deferredInstallPrompt ?? null;
}

/* ------------------------------------------------------------------ */
/*  Translations                                                       */
/* ------------------------------------------------------------------ */

const T: Record<string, Record<string, string>> = {
  popupTitle:    { id: "Install Aplikasi Gomesin", en: "Install Gomesin App", zh: "\u5b89\u88c5 Gomesin \u5e94\u7528" },
  popupDesc:     { id: "Akses marketplace mesin industri terlengkap langsung dari home screen Anda.", en: "Access the largest industrial machinery marketplace directly from your home screen.", zh: "\u4ece\u4e3b\u5c4f\u5e55\u76f4\u63a5\u8bbf\u95ee\u6700\u5927\u7684\u5de5\u4e1a\u673a\u68b0\u5e02\u573a\u3002" },
  install:       { id: "Install Sekarang", en: "Install Now", zh: "\u7acb\u5373\u5b89\u88c5" },
  later:         { id: "Nanti Saja", en: "Not Now", zh: "\u4ee5\u540e\u518d\u8bf4" },
  benefit1:      { id: "Buka langsung dari home screen", en: "Open directly from home screen", zh: "\u4ece\u4e3b\u5c4f\u5e55\u76f4\u63a5\u6253\u5f00" },
  benefit2:      { id: "Tampilan seperti aplikasi native", en: "Native app-like experience", zh: "\u7c7b\u4f3c\u539f\u751f\u5e94\u7528\u4f53\u9a8c" },
  benefit3:      { id: "Notifikasi instan untuk chat & iklan", en: "Instant notifications for chat & ads", zh: "\u804a\u5929\u548c\u5e7f\u544a\u5373\u65f6\u901a\u77e5" },
  iosTitle:      { id: "Cara Install di iOS", en: "How to Install on iOS", zh: "iOS \u5b89\u88c5\u65b9\u6cd5" },
  iosStep1:      { id: "Tekan tombol", en: "Tap the", zh: "\u70b9\u51fb" },
  iosStep1Icon:  { id: "Share", en: "Share", zh: "\u5206\u4eab" },
  iosStep2:      { id: "di bilah bawah browser Safari", en: "button in Safari bottom bar", zh: "Safari \u5e95\u90e8\u680f\u7684\u6309\u94ae" },
  iosStep3:      { id: 'Lalu pilih \"Tambahkan ke Layar Utama\"', en: 'Then select \"Add to Home Screen\"', zh: '\u7136\u540e\u9009\u62e9\u201c\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55\u201d' },
  chromiumNoPromptTitle: { id: "Install dari Browser", en: "Install from Browser", zh: "\u4ece\u6d4f\u89c8\u5668\u5b89\u88c5" },
  chromiumHint:  { id: 'Klik ikon install (\u2295) di bilah alamat browser Anda, lalu pilih \"Install\"', en: 'Click the install icon (\u2295) in your browser address bar, then select \"Install\"', zh: '\u70b9\u51fb\u6d4f\u89c8\u5668\u5730\u5740\u680f\u4e2d\u7684\u5b89\u88c5\u56fe\u6807 (\u2295)\uff0c\u7136\u540e\u9009\u62e9\u201c\u5b89\u88c5\u201d' },
  androidHint:  { id: 'Klik ikon install di bilah alamat Chrome, atau menu (\u22ef) > \"Install app\" / \"Tambahkan ke Layar Utama\"', en: 'Tap the install icon in Chrome address bar, or menu (\u22ef) > \"Install app\" / \"Add to Home Screen\"', zh: '\u70b9\u51fb Chrome \u5730\u5740\u680f\u4e2d\u7684\u5b89\u88c5\u56fe\u6807\uff0c\u6216\u83dc\u5355 (\u22ef) > \"\u5b89\u88c5\u5e94\u7528\"' },
  gotIt:        { id: "Mengerti", en: "Got it", zh: "\u660e\u767d\u4e86" },
};

function tr(key: string, lang: string): string {
  return T[key]?.[lang] ?? T[key]?.["id"] ?? key;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PwaInstallPrompt() {
  const [showPopup, setShowPopup] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [promptExpired, setPromptExpired] = useState(false);
  const { lang } = useLang();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const platform: Platform = typeof window !== "undefined" ? detectPlatform() : "desktop";
  const browser: Browser = typeof window !== "undefined" ? detectBrowser() : "chrome";
  const chromium = isChromium(browser);
  const isIOS = platform === "ios";

  /* ------ Cleanup helper ------ */
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /* ------ Single effect: listen for events, check initial state, manage popup timing ------ */
  useEffect(() => {
    if (isStandalone() || isInstalled() || !canShow()) return;

    let cancelled = false;

    const handleSwReady = () => {
      if (cancelled) return;
      console.log('[PWA-UI] SW ready');
      schedulePopup();
    };

    const handlePromptReady = () => {
      if (cancelled) return;
      console.log('[PWA-UI] Prompt ready');
      setHasNativePrompt(true);
    };

    const handleInstalled = () => {
      if (cancelled) return;
      console.log('[PWA-UI] Installed');
      clearAllTimers();
      setHasNativePrompt(false);
      setShowPopup(false);
    };

    window.addEventListener('pwa-sw-ready', handleSwReady);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleInstalled);

    /* --- Schedule popup: called once SW is ready (or immediately if already ready) --- */
    let popupScheduled = false;

    function schedulePopup() {
      if (popupScheduled || cancelled) return;
      popupScheduled = true;

      // For iOS: show after 1s (no beforeinstallprompt on iOS)
      if (isIOS) {
        const t = setTimeout(() => {
          if (!cancelled) setShowPopup(true);
        }, SHOW_DELAY_MS);
        timersRef.current.push(t);
        return;
      }

      // For Chromium: check if we already have the prompt
      if (getNativePrompt()) {
        setHasNativePrompt(true);
        const t = setTimeout(() => {
          if (!cancelled) setShowPopup(true);
        }, SHOW_DELAY_MS);
        timersRef.current.push(t);
        return;
      }

      // Chromium: poll for beforeinstallprompt
      const poll = setInterval(() => {
        if (getNativePrompt()) {
          clearInterval(poll);
          intervalRef.current = null;
          setHasNativePrompt(true);
          const t = setTimeout(() => {
            if (!cancelled) setShowPopup(true);
          }, SHOW_DELAY_MS);
          timersRef.current.push(t);
        }
      }, 300);
      intervalRef.current = poll;

      // Timeout: if no prompt after PROMPT_WAIT_MS, show instructions popup
      const timeout = setTimeout(() => {
        clearInterval(poll);
        intervalRef.current = null;
        if (!cancelled && !getNativePrompt()) {
          setPromptExpired(true);
          const t = setTimeout(() => {
            if (!cancelled) setShowPopup(true);
          }, SHOW_DELAY_MS);
          timersRef.current.push(t);
        }
      }, PROMPT_WAIT_MS);
      timersRef.current.push(timeout);
    }

    // Check if SW and/or prompt are already ready (events fired before React hydrated)
    // Use queueMicrotask to defer setState (avoids synchronous setState in effect body)
    queueMicrotask(() => {
      if (cancelled) return;
      if (window.__swReady || window.__deferredInstallPrompt) {
        console.log('[PWA-UI] Detected pre-hydration state: swReady=', !!window.__swReady, 'prompt=', !!window.__deferredInstallPrompt);
        if (window.__deferredInstallPrompt) {
          setHasNativePrompt(true);
        }
        schedulePopup();
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener('pwa-sw-ready', handleSwReady);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleInstalled);
      clearAllTimers();
    };
  }, []);

  /* ------ Handle install button ------ */
  const handleInstall = useCallback(async () => {
    const prompt = getNativePrompt();

    if (prompt) {
      // We have a native prompt — use it!
      setInstalling(true);
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          try { localStorage.setItem(INSTALLED_KEY, "1"); } catch {}
        } else {
          markDismissed();
        }
        window.__deferredInstallPrompt = null;
        setHasNativePrompt(false);
      } catch (err) {
        console.warn('[PWA] Install prompt error:', err);
        markDismissed();
      }
      setInstalling(false);
      setShowPopup(false);
      return;
    }

    // iOS or Chromium without prompt: close popup (instructions already shown)
    setShowPopup(false);
    markDismissed();
  }, []);

  /* ------ Dismiss ------ */
  const handleDismiss = useCallback(() => {
    setShowPopup(false);
    markDismissed();
  }, []);

  /* ------ Don't render if standalone, installed, or hidden ------ */
  if (isStandalone() || isInstalled() || !showPopup) return null;

  /* ------ Determine what to show ------ */
  const canNativeInstall = hasNativePrompt;

  /* ------ Platform icon ------ */
  const platformIcon =
    platform === "ios" ? <Tablet className="size-5" /> :
    platform === "android" ? <Smartphone className="size-5" /> :
    <Monitor className="size-5" />;

  /* ------ Install button label ------ */
  const installBtnLabel = canNativeInstall
    ? tr("install", lang)
    : (isIOS ? tr("install", lang) : tr("gotIt", lang));

  /* ------ Instructions panel ------ */
  const renderInstructions = () => {
    if (isIOS) {
      return (
        <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 p-4">
          <p className="text-center text-sm font-bold text-foreground mb-2">
            {tr("iosTitle", lang)}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <span>{tr("iosStep1", lang)}</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500 text-white">
              <Share2 className="size-3.5" />
            </div>
            <span className="font-semibold text-blue-600">{tr("iosStep1Icon", lang)}</span>
            <span>{tr("iosStep2", lang)}</span>
          </div>
          <div className="mt-2 rounded-lg bg-background/80 p-2.5 text-center">
            <p className="text-xs font-bold text-foreground">
              {tr("iosStep3", lang)}
            </p>
          </div>
        </div>
      );
    }

    // Chromium without native prompt
    if (chromium && !canNativeInstall) {
      return (
        <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 p-4">
          <div className="flex items-start gap-2.5">
            <MonitorSmartphone className="size-5 shrink-0 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground mb-1">
                {tr("chromiumNoPromptTitle", lang)}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {platform === "android" ? tr("androidHint", lang) : tr("chromiumHint", lang)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Non-Chromium desktop (Firefox, etc.)
    return (
      <div className="mt-4 rounded-xl bg-muted/50 p-3">
        <div className="flex items-start gap-2.5">
          <MonitorSmartphone className="size-5 shrink-0 mt-0.5 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {tr("chromiumHint", lang)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* Popup Card */}
      <div className="relative w-full max-w-sm animate-in zoom-in-95 fade-in duration-300 slide-in-from-bottom-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Top gradient header */}
          <div className="relative bg-gradient-to-br from-primary to-orange-600 px-6 pb-8 pt-6 text-center">
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </button>

            <div className="mx-auto mb-3 grid size-20 place-items-center rounded-2xl bg-white shadow-lg">
              <img src="/pwa-icon-192.png" alt="Gomesin" className="size-16 rounded-xl" />
            </div>

            <h2 className="text-lg font-bold text-white">
              {tr("popupTitle", lang)}
            </h2>
            <p className="mt-1 text-xs text-white/80 leading-relaxed">
              {tr("popupDesc", lang)}
            </p>
          </div>

          {/* Benefits */}
          <div className="px-5 pt-5 pb-2">
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ArrowUpFromLine className="size-4" />
                </div>
                <span className="text-sm text-foreground">{tr("benefit1", lang)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Smartphone className="size-4" />
                </div>
                <span className="text-sm text-foreground">{tr("benefit2", lang)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {platformIcon}
                </div>
                <span className="text-sm text-foreground">{tr("benefit3", lang)}</span>
              </div>
            </div>
          </div>

          {/* Platform instructions */}
          <div className="px-5">
            {renderInstructions()}
          </div>

          {/* Action buttons */}
          <div className="px-5 pt-3 pb-5">
            {canNativeInstall ? (
              <>
                <Button
                  className="w-full h-12 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90 gap-2 shadow-md"
                  onClick={handleInstall}
                  disabled={installing}
                >
                  <Download className="size-5" />
                  {installing ? "Menginstall..." : installBtnLabel}
                </Button>
                <button
                  onClick={handleDismiss}
                  className="mt-2 w-full py-2.5 text-center text-sm text-muted-foreground hover:text-foreground transition"
                >
                  {tr("later", lang)}
                </button>
              </>
            ) : (
              <button
                onClick={handleDismiss}
                className="w-full h-12 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90 gap-2 shadow-md flex items-center justify-center transition"
              >
                {installBtnLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
