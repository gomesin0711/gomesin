"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { translations as i18nTranslations } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import { Header } from "./header";
import { Footer } from "./footer";
import { BottomNav } from "./bottom-nav";
import { AdminSidebar } from "./admin-sidebar";
import { HomeView } from "./views/home";
import { ListingsView } from "./views/listings";
import { DetailView } from "./views/detail";
import { PostAdView } from "./views/post-ad";
import { EditAdView } from "./views/edit-ad";
import { ProfileView } from "./views/profile";
import { LoginView } from "./views/login";
import { UpgradeView } from "./views/upgrade";
import { SellerView } from "./views/seller";
import { AdminView } from "./views/admin";
import { Menu, ShieldCheck } from "lucide-react";

const ADMIN_VIEWS = ["admin", "admin-sellers", "admin-categories", "admin-listings", "admin-new-listings", "admin-expired-listings", "admin-rejected-listings", "admin-transactions", "admin-reports", "admin-monthly-report", "admin-users", "admin-paket", "admin-merek", "admin-lokasi", "admin-banner", "admin-audit"];

export function AppShell() {
  const view = useStore((s) => s.view);
  const user = useStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  useEffect(() => {
    import("@/lib/i18n").then(({ useLang }) => {
      useLang.persist.rehydrate();
    });
  }, []);

  useEffect(() => {
    useStore.persist.rehydrate();
    const uid = useStore.getState().user?.id;
    if (uid) {
      fetch(`/api/auth/profile?userId=${uid}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.user) {
            useStore.getState().setUser(data.user);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [view]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.gomesin) {
        useStore.getState()._popBack();
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.history.replaceState({ gomesin: true }, "");
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const isAdminView = ADMIN_VIEWS.includes(view);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const showSidebar = isAdminView && isAdmin;

  const adminContent = (
    <>
      {view === "admin" && <AdminView />}
      {view === "admin-sellers" && <AdminView initialTab="penjual" />}
      {view === "admin-categories" && <AdminView initialTab="kategori" />}
      {view === "admin-listings" && <AdminView initialTab="iklan" />}
      {view === "admin-new-listings" && <AdminView initialTab="iklanbaru" />}
      {view === "admin-expired-listings" && <AdminView initialTab="iklanexpired" />}
      {view === "admin-rejected-listings" && <AdminView initialTab="iklanditolak" />}
      {view === "admin-transactions" && <AdminView initialTab="transaksi" />}
      {view === "admin-reports" && <AdminView initialTab="laporan" />}
      {view === "admin-monthly-report" && <AdminView initialTab="laporanbulanan" />}
      {view === "admin-users" && <AdminView initialTab="pengguna" />}
      {view === "admin-paket" && <AdminView initialTab="paket" />}
      {view === "admin-merek" && <AdminView initialTab="merek" />}
      {view === "admin-lokasi" && <AdminView initialTab="lokasi" />}
      {view === "admin-banner" && <AdminView initialTab="banner" />}
      {view === "admin-audit" && <AdminView initialTab="audit" />}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {showSidebar ? (
        <div className="flex flex-1">
          <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="min-w-0 flex-1">
            <div className="sticky top-16 z-20 flex items-center gap-2 border-b border-border bg-card px-4 py-2 md:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Menu"
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
              >
                <Menu className="size-5" />
              </button>
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="size-4 text-primary" />
                {tr("adminMenu")}
              </div>
            </div>
            {adminContent}
          </main>
        </div>
      ) : (
        <main className="flex-1">
          {view === "home" && <HomeView />}
          {view === "listings" && <ListingsView />}
          {view === "detail" && <DetailView />}
          {view === "post" && <PostAdView />}
          {view === "edit" && <EditAdView />}
          {view === "profile" && <ProfileView />}
          {view === "login" && <LoginView />}
          {view === "upgrade" && <UpgradeView />}
          {view === "seller" && <SellerView />}
          {isAdminView && !isAdmin && <AdminView />}
        </main>
      )}
      {![["profile"], ["dashboard"], ["favorites"], ["login"], ["post"], ...ADMIN_VIEWS].flat().includes(view) && <Footer />}
      <div className="h-[4.25rem] shrink-0 md:hidden" aria-hidden="true" />
      <BottomNav />
    </div>
  );
}
