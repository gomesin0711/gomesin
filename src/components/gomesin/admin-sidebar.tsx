"use client";

import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { translations as i18nTranslations } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import {
  LayoutDashboard,
  Tag,
  Users,
  FolderTree,
  Receipt,
  FileText,
  ShieldCheck,
  X,
  ArrowLeft,
  Award,
  MapPin,
  Image as ImageIcon,
  Crown,
  ScrollText,
  Sparkle,
  Clock,
  XCircle,
  Calendar,
  Lock,
} from "lucide-react";

const ADMIN_MENU = [
  { view: "admin" as const, labelKey: "adminDashboard", icon: LayoutDashboard },
  { view: "admin-new-listings" as const, labelKey: "adminNewListings", icon: Sparkle },
  { view: "admin-listings" as const, labelKey: "adminActiveListings", icon: Tag },
  { view: "admin-expired-listings" as const, labelKey: "adminExpiredListings", icon: Clock },
  { view: "admin-rejected-listings" as const, labelKey: "adminRejectedListings", icon: XCircle },
  { view: "admin-categories" as const, labelKey: "adminManageCategories", icon: FolderTree },
  { view: "admin-transactions" as const, labelKey: "adminTransactions", icon: Receipt },
  { view: "admin-reports" as const, labelKey: "adminReports", icon: FileText },
  { view: "admin-monthly-report" as const, labelKey: "adminMonthlyReport", icon: Calendar },
  { view: "admin-users" as const, labelKey: "adminUsers", icon: Users },
  { view: "admin-paket" as const, labelKey: "adminPackages", icon: Crown },
];

const ADMIN_SUB_MENU = [
  { view: "admin-merek" as const, labelKey: "adminManageBrands", icon: Award },
  { view: "admin-lokasi" as const, labelKey: "adminManageLocations", icon: MapPin },
  { view: "admin-banner" as const, labelKey: "adminBanners", icon: ImageIcon },
  { view: "admin-audit" as const, labelKey: "adminAuditLog", icon: ScrollText },
];

export function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const view = useStore((s) => s.view);
  const goHome = useStore((s) => s.goHome);
  const goToAdmin = useStore((s) => s.goToAdmin);
  const goToAdminSub = useStore((s) => s.goToAdminSub);
  const user = useStore((s) => s.user);

  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  const { data: listingsData } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/listings");
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    staleTime: 0,
  });

  const allListings = listingsData?.listings ?? [];
  const counts: Record<string, number> = {
    "admin-new-listings": allListings.filter((l: any) => l.status === "pending").length,
    "admin-listings": allListings.filter((l: any) => l.status === "active" && !l.violationFlag).length,
    "admin-expired-listings": allListings.filter((l: any) => {
      if (!l.paymentExpiry) return false;
      return new Date(l.paymentExpiry) < new Date();
    }).length,
    "admin-rejected-listings": allListings.filter((l: any) => l.status === "rejected" || l.violationFlag === true).length,
  };

  if (!isAdmin) return null;

  const handleNav = (v: string) => {
    if (v === "admin") goToAdmin();
    else goToAdminSub(v as any);
    onClose();
  };

  return (
    <>
      {/* ===== MOBILE DRAWER (like profile page) ===== */}
      {open && (
        <div className="fixed inset-0 z-[90] flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="relative z-10 flex h-full w-64 max-w-[80vw] flex-col overflow-y-auto bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{tr("adminPanel")}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user?.email || ""}</p>
                </div>
              </div>
              <button onClick={onClose} className="grid size-8 place-items-center rounded-full hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 px-1 py-0.5">
              <p className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50">Menu Utama</p>
              {ADMIN_MENU.map((item) => {
                const active = view === item.view;
                const count = counts[item.view];
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNav(item.view)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-[11px] text-left text-[15px] transition",
                      active
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground/80 hover:bg-accent"
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    <span className="truncate">{tr(item.labelKey)}</span>
                    {count !== undefined && count > 0 && (
                      <span className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                        active ? "bg-white/20 text-primary-foreground" : "bg-primary/10 text-primary"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              <p className="px-2 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50">Lainnya</p>
              {ADMIN_SUB_MENU.map((item) => {
                const active = view === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNav(item.view)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-[11px] text-left text-[15px] transition",
                      active
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "text-foreground/80 hover:bg-accent"
                    )}
                  >
                    <item.icon className="size-[18px] shrink-0" />
                    <span className="truncate">{tr(item.labelKey)}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-border px-1 py-1">
              <button
                onClick={() => { goHome(); onClose(); }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-[11px] text-left text-[15px] text-foreground/80 transition hover:bg-accent"
              >
                <ArrowLeft className="size-[18px] shrink-0" />
                <span className="truncate">Beranda</span>
              </button>
              <button
                onClick={() => { goHome(); onClose(); }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-[11px] text-left text-[15px] text-destructive transition hover:bg-destructive/5"
              >
                <Lock className="size-[18px] shrink-0" />
                <span className="truncate">{tr("adminExit")}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ===== DESKTOP SIDEBAR (permanent) ===== */}
      <aside className="sticky top-16 z-30 hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-card md:flex">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{tr("adminPanel")}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {ADMIN_MENU.map((item) => {
            const active = view === item.view;
            const count = counts[item.view];
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {tr(item.labelKey)}
                {count !== undefined && count > 0 && (
                  <span className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                    active ? "bg-white/20 text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="my-1.5 border-t border-border" />
          {ADMIN_SUB_MENU.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {tr(item.labelKey)}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-2">
          <button
            onClick={goHome}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {tr("adminExit")}
          </button>
        </div>
      </aside>
    </>
  );
}
