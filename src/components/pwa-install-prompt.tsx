"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Smartphone, Monitor, Share2, MoreVertical, ArrowUpFromLine, MonitorSmartphone, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Platform = "ios" | "android" | "desktop";

declare global {
  interface Window {
    __deferredInstallPrompt: Event & {
      prompt(): Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    } | null;
  }
}

/* ------------------------------------------------------------------ */
/*  Translations                                                       */
/* ------------------------------------------------------------------ */

const T: Record<string, Record<string, string>> = {
  install_app:     { id: "Install Aplikasi Gomesin", en: "Install Gomesin App", zh: "安装 Gomesin 应用" },
  install_subtitle:{ id: "Akses lebih cepat langsung dari home screen", en: "Faster access directly from home screen", zh: "从主屏幕直接快速访问" },
  like_app:        { id: "Buka seperti Aplikasi", en: "Open like an App", zh: "像应用一样打开" },
  like_app_desc:   { id: "Tampilan fullscreen tanpa address bar", en: "Fullscreen view without address bar", zh: "全屏显示，无地址栏" },
  quick_access:    { id: "Akses Cepat dari Home Screen", en: "Quick Access from Home Screen", zh: "从主屏幕快速访问" },
  quick_access_desc:{ id: "Satu klik langsung buka aplikasi", en: "One click to open the app", zh: "一键打开应用" },
  works_offline:   { id: "Works Offline", en: "Works Offline", zh: "离线可用" },
  works_offline_desc:{ id: "Data tersimpan lokal, tetap bisa diakses", en: "Data stored locally, still accessible", zh: "数据本地存储，仍可访问" },
  install_now:     { id: "Install Sekarang", en: "Install Now", zh: "立即安装" },
  installing:      { id: "Menginstall...", en: "Installing...", zh: "安装中..." },
  waiting_browser: { id: "Menunggu browser...", en: "Waiting for browser...", zh: "等待浏览器..." },
  try_again:      { id: "Coba Lagi", en: "Try Again", zh: "重试" },
  later:          { id: "Nanti Saja", en: "Not Now", zh: "以后再说" },
  installed_title: { id: "Berhasil Diinstall!", en: "Successfully Installed!", zh: "安装成功！" },
  installed_desc:  { id: "Buka dari home screen untuk mulai", en: "Open from home screen to start", zh: "从主屏幕打开开始使用" },
  ios_title:       { id: "Cara Install di iPhone/iPad:", en: "How to Install on iPhone/iPad:", zh: "iPhone/iPad 安装方法：" },
  ios_step1_pre:  { id: "1. Tap", en: "1. Tap", zh: "1. 点击" },
  ios_step1_post: { id: "di toolbar Safari", en: "in Safari toolbar", zh: "Safari 工具栏中的" },
  ios_step2:      { id: "2. Pilih", en: "2. Select", zh: "2. 选择" },
  ios_step3:      { id: "3. Tap", en: "3. Tap", zh: "3. 点击" },
  add_to_home:    { id: '"Tambahkan ke Layar Utama"', en: '"Add to Home Screen"', zh: '"添加到主屏幕"' },
  add:            { id: '"Tambah"', en: '"Add"', zh: '"添加"' },
  android_title:   { id: "Cara Install di Android:", en: "How to Install on Android:", zh: "Android 安装方法：" },
  android_step1:  { id: "1. Tap", en: "1. Tap", zh: "1. 点击" },
  android_step1_post:{ id: "(titik 3) di kanan atas Chrome", en: "(3 dots) at top right of Chrome", zh: "Chrome 右上角（三个点）" },
  android_step2:  { id: "2. Pilih", en: "2. Select", zh: "2. 选择" },
  android_step3:  { id: "3. Tap", en: "3. Tap", zh: "3. 点击" },
  install_app_label:{ id: '"Install app"', en: '"Install app"', zh: '"安装应用"' },
  install_label:   { id: '"Install"', en: '"Install"', zh: '"安装"' },
  desktop_title:   { id: "Cara Install di Desktop:", en: "How to Install on Desktop:", zh: "桌面安装方法：" },
  desktop_chrome:  { id: "Chrome: Klik icon install (⊕) di address bar", en: "Chrome: Click the install icon (⊕) in address bar", zh: "Chrome：点击地址栏中的安装图标 (⊕)" },
  desktop_edge:    { id: "Edge: Menu → Apps → Install", en: "Edge: Menu → Apps → Install", zh: "Edge：菜单 → 应用 → 安装" },
};

function tr(key: string, lang: string): string {
  return T[key]?.[lang] ?? T[key]?.["id"] ?? key;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PwaInstallPrompt() {
  const { lang } = useLang();
  const [showPrompt, setShowPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [waitingForPrompt, setWaitingForPrompt] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hasInitRef = useRef(false);

  // Detect platform
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);

  // Check for the deferred prompt captured by inline script
  const checkForPrompt = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    if (window.__deferredInstallPrompt) return true;
    return false;
  }, []);

  useEffect(() => {
    // Check if already running as standalone PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as Record<string, boolean>).standalone === true;

    if (standalone) {
      setIsStandalone(true);
      return;
    }

    if (hasInitRef.current) return;
    hasInitRef.current = true;

    // Detect platform
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
    setPlatform(ios && isSafari ? "ios" : /Android/.test(ua) ? "android" : "desktop");

    // Check if inline script already captured the prompt
    checkForPrompt();

    // Listen for beforeinstallprompt directly as backup
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e as Window["__deferredInstallPrompt"];
      setWaitingForPrompt(false);
      setShowManualInstall(false);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      window.__deferredInstallPrompt = null;
      setInstallSuccess(true);
      setInstalling(false);
      setWaitingForPrompt(false);
      setShowPrompt(false);
      setDismissed(true);
      setTimeout(() => setInstallSuccess(false), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("pwainstalled", handleAppInstalled);

    // Poll for the deferred prompt every 500ms for up to 30 seconds
    let pollCount = 0;
    const pollInterval = setInterval(() => {
      if (checkForPrompt() || pollCount >= 60) {
        clearInterval(pollInterval);
      }
      pollCount++;
    }, 500);

    // Show popup after 1 second
    const showTimer = setTimeout(() => {
      if (sessionStorage.getItem("gomesin-install-dismissed") === "1") return;
      setShowPrompt(true);
    }, 1000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pwainstalled", handleAppInstalled);
      clearInterval(pollInterval);
      clearTimeout(showTimer);
    };
  }, [checkForPrompt]);

  const handleInstallClick = async () => {
    const promptEvent = window.__deferredInstallPrompt;

    if (promptEvent) {
      // We have the prompt — use it!
      setInstalling(true);
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          setShowPrompt(false);
        } else {
          setInstalling(false);
        }
      } catch (e) {
        console.warn("[PWA] Install prompt error:", e);
        setInstalling(false);
      }
      window.__deferredInstallPrompt = null;
      return;
    }

    // No prompt yet — wait and retry (the tar's key innovation)
    setWaitingForPrompt(true);
    let retryCount = 0;
    const retryInterval = setInterval(() => {
      if (window.__deferredInstallPrompt) {
        clearInterval(retryInterval);
        setWaitingForPrompt(false);
        const prompt = window.__deferredInstallPrompt;
        setInstalling(true);
        window.__deferredInstallPrompt = null;
        prompt.prompt().then(() => {
          prompt.userChoice.then(({ outcome }) => {
            if (outcome === "accepted") {
              setShowPrompt(false);
            } else {
              setInstalling(false);
            }
          });
        }).catch(() => {
          setInstalling(false);
        });
      }
      retryCount++;
      if (retryCount >= 6) {
        // 3 seconds of retrying — give up, show manual instructions
        clearInterval(retryInterval);
        setWaitingForPrompt(false);
        setShowManualInstall(true);
      }
    }, 500);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("gomesin-install-dismissed", "1");
  };

  // Don't render if standalone PWA
  if (isStandalone) return null;

  // Show success message after install
  if (installSuccess) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setInstallSuccess(false)} />
        <div className="relative bg-card rounded-2xl shadow-2xl max-w-[260px] w-full overflow-hidden text-center py-6 px-5 animate-in zoom-in-95 fade-in duration-300">
          <div className="grid size-12 rounded-full bg-green-100 place-items-center mx-auto mb-2">
            <CheckCircle2 className="size-6 text-green-600" />
          </div>
          <h3 className="text-sm font-bold text-foreground">{tr("installed_title", lang)}</h3>
          <p className="text-xs text-muted-foreground mt-1">{tr("installed_desc", lang)}</p>
        </div>
      </div>
    );
  }

  // Floating FAB after dismissal
  const showFab = dismissed && !showPrompt && !installSuccess;

  const platformIcon =
    platform === "ios" ? <Smartphone className="size-3.5" /> :
    <Monitor className="size-3.5" />;

  return (
    <>
      {/* Floating FAB */}
      {showFab && (
        <button
          onClick={() => {
            setDismissed(false);
            setShowPrompt(true);
            setShowManualInstall(false);
            sessionStorage.removeItem("gomesin-install-dismissed");
          }}
          className="fixed bottom-20 right-4 z-[9998] size-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          title={tr("install_app", lang)}
        >
          <Download className="size-5" />
        </button>
      )}

      {/* Install Popup */}
      {showPrompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-300"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-br from-primary to-orange-600 px-5 pt-5 pb-4 text-center">
              <button
                onClick={handleDismiss}
                className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="size-3.5 text-white" />
              </button>
              <div className="mx-auto mb-2 grid size-14 place-items-center rounded-xl bg-white shadow-lg">
                <img src="/pwa-icon-192.png" alt="Gomesin" className="size-11 rounded-lg" />
              </div>
              <h2 className="text-base font-bold text-white">{tr("install_app", lang)}</h2>
              <p className="text-[10px] text-white/80 mt-0.5">{tr("install_subtitle", lang)}</p>
            </div>

            {/* Benefits */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10">
                  <Monitor className="size-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{tr("like_app", lang)}</p>
                  <p className="text-[10px] text-muted-foreground">{tr("like_app_desc", lang)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10">
                  <ArrowUpFromLine className="size-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{tr("quick_access", lang)}</p>
                  <p className="text-[10px] text-muted-foreground">{tr("quick_access_desc", lang)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10">
                  {platformIcon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{tr("works_offline", lang)}</p>
                  <p className="text-[10px] text-muted-foreground">{tr("works_offline_desc", lang)}</p>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="px-4 pb-4">
              {platform === "ios" ? (
                /* iOS: always show manual instructions */
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                  <p className="text-[10px] font-semibold text-foreground mb-1.5">{tr("ios_title", lang)}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{tr("ios_step1_pre", lang)}</span>
                    <div className="flex size-4 items-center justify-center rounded-md bg-blue-500 text-white">
                      <Share2 className="size-2.5" />
                    </div>
                    <span>{tr("ios_step1_post", lang)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{tr("ios_step2", lang)} <strong>{tr("add_to_home", lang)}</strong></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{tr("ios_step3", lang)} <strong>{tr("add", lang)}</strong></p>
                </div>
              ) : showManualInstall ? (
                /* Manual install instructions as fallback */
                <div className="space-y-2">
                  {platform === "android" ? (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                      <p className="text-[10px] font-semibold text-foreground mb-1.5">{tr("android_title", lang)}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>{tr("android_step1", lang)}</span>
                        <MoreVertical className="size-3" />
                        <span>{tr("android_step1_post", lang)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tr("android_step2", lang)} <strong>{tr("install_app_label", lang)}</strong></p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tr("android_step3", lang)} <strong>{tr("install_label", lang)}</strong></p>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                      <p className="text-[10px] font-semibold text-foreground mb-1.5">{tr("desktop_title", lang)}</p>
                      <p className="text-[10px] text-muted-foreground">{tr("desktop_chrome", lang)}</p>
                      <p className="text-[10px] text-muted-foreground">{tr("desktop_edge", lang)}</p>
                    </div>
                  )}
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md active:scale-[0.98] transition-all"
                  >
                    {tr("try_again", lang)}
                  </button>
                </div>
              ) : (
                /* Install button (or waiting state) */
                <button
                  onClick={handleInstallClick}
                  disabled={installing || waitingForPrompt}
                  className="w-full py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md transition-all disabled:opacity-60 disabled:cursor-wait active:scale-[0.98]"
                >
                  {installing
                    ? tr("installing", lang)
                    : waitingForPrompt
                      ? tr("waiting_browser", lang)
                      : tr("install_now", lang)}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="mt-2 w-full py-2 text-center text-xs text-muted-foreground hover:text-foreground transition"
              >
                {tr("later", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
