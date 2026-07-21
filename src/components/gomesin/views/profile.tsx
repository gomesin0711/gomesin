"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Heart,
  Tag,
  Plus,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Package,
  MessageSquare,
  MessageCircle,
  Wallet,
  ShieldCheck,
  Shield,
  X,
  CheckCircle2,
  Clock,
  CreditCard,
  BellRing,
  Lock,
  KeyRound,
  Smartphone,
  Mail,
  Eye,
  EyeOff,
  SlidersHorizontal,
  LifeBuoy,
  Send,
  Loader2,
  ChevronLeft,
  BadgeCheck,
  AlertTriangle,
  Monitor,
  MapPin,
  Phone,
  BookOpen,
  PlayCircle,
  Search,
  ExternalLink,
  Ban,
  Trash2,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { timeAgo } from "@/lib/types";
import { translations as i18nTranslations } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useChatSocket, type ChatMessage } from "@/lib/use-chat-socket";

type PanelType =
  | "pesan"
  | "pesanan"
  | "saldo"
  | "notifikasi"
  | "keamanan"
  | "pengaturan"
  | "bantuan"
  | "iklan-saya"
  | "favorit-saya"
  | null;

export function ProfileView() {
  const goToFavorites = useStore((s) => s.goToFavorites);
  const goToListings = useStore((s) => s.goToListings);
  const goHome = useStore((s) => s.goHome);
  const goToPost = useStore((s) => s.goToPost);
  const goToLogin = useStore((s) => s.goToLogin);
  const goToDashboard = useStore((s) => s.goToDashboard);
  const goToAdmin = useStore((s) => s.goToAdmin);
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const logout = useStore((s) => s.logout);
  const favCount = useStore((s) => s.favorites.length);
  const storeProfilePanel = useStore((s) => s.profilePanel);
  const clearProfilePanel = useStore((s) => s.clearProfilePanel);

  // Fetch user's listing count
  const { data: myListingsData } = useQuery({
    queryKey: ["my-listing-count", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/my-listings?userId=${user!.id}`);
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 0,
  });
  const myAdsCount = myListingsData?.listings?.length ?? 0;

  const { t, lang } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;

  const [panel, setPanel] = useState<PanelType>(storeProfilePanel);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { sendMessage, markRead, subscribe } = useChatSocket();

  // Fetch user's messages (conversations) — NO polling, socket invalidates on change.
  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ["messages", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/messages?userId=${user!.id}`);
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Socket invalidates on new message / read receipt.
  });
  const conversations: any[] = messagesData?.conversations ?? [];
  const unreadCount = conversations.reduce((a: number, c: any) => a + (c.unread || 0), 0);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<number, { role: "user" | "assistant"; content: string }[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [convMenu, setConvMenu] = useState<{ visible: boolean; x: number; y: number; convId: string | null }>({ visible: false, x: 0, y: 0, convId: null });
  // edit profile state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  // security state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  // help state
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportMessages, setSupportMessages] = useState<{ role: "user" | "support"; content: string }[]>([
    { role: "support", content: tr("profSupportGreeting") },
  ]);
  const [supportInput, setSupportInput] = useState("");
  const [activeGuide, setActiveGuide] = useState<number | null>(null);
  // wallet state
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentList, setPaymentList] = useState<any[]>([]);
  const [newPaymentType, setNewPaymentType] = useState("bank");
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newPaymentNumber, setNewPaymentNumber] = useState("");
  const [balance] = useState(0);
  const [transactions] = useState<any[]>([]);

  // sync: when store profilePanel changes (e.g. from bottom nav Chat button), open it
  const [prevStorePanel, setPrevStorePanel] = useState(storeProfilePanel);
  if (storeProfilePanel !== prevStorePanel) {
    setPrevStorePanel(storeProfilePanel);
    setPanel(storeProfilePanel as PanelType);
  }

  const closePanel = () => {
    setPanel(null);
    setActiveChatId(null);
    clearProfilePanel();
  };

  // sample data for panels — per-user (empty for new users)
  const orders: any[] = [];
  const wallets: any[] = [];
  const notifications: any[] = [];

  const faqs = [
    { q: tr("profFaqQ1"), a: tr("profFaqA1") },
    { q: tr("profFaqQ2"), a: "Tidak. Pasang iklan di Gomesin 100% gratis. Fitur 'Featured' opsional berbayar untuk menonjolkan iklan Anda." },
    { q: tr("profFaqQ3"), a: "Buka detail iklan, klik 'Chat Penjual' untuk chat AI, atau 'WhatsApp' untuk chat langsung via WA." },
    { q: tr("profFaqQ4"), a: "Selalu survei mesin langsung sebelum membayar. Gunakan rekening pribadi penjual dan hindari transfer ke pihak ketiga." },
    { q: tr("profFaqQ5"), a: "Masuk ke Dashboard Iklan Saya, pilih iklan yang ingin dihapus, lalu klik tombol hapus." },
  ];

  const menu = [
    ...(user?.role === "admin" ? [{ icon: ShieldCheck, label: tr("adminPanel"), desc: "Statistik user, iklan & omzet", action: goToAdmin }] : []),
    { icon: Tag, label: tr("profMyAds"), desc: tr("profManageAds"), action: goToDashboard },
    { icon: Heart, label: tr("myFavorites"), desc: `${favCount} iklan disimpan`, action: goToFavorites },
    { icon: MessageSquare, label: tr("messages"), desc: `${unreadCount} pesan belum dibaca`, action: () => setPanel("pesan") },
    { icon: Package, label: tr("orders"), desc: `${orders.length} transaksi`, action: () => setPanel("pesanan") },
    { icon: Wallet, label: tr("wallet"), desc: `${wallets.length} metode pembayaran`, action: () => setPanel("saldo") },
    { icon: Bell, label: tr("notifications"), desc: `${notifications.length} notifikasi baru`, action: () => setPanel("notifikasi") },
    { icon: Lock, label: tr("security"), desc: "Verifikasi & privasi", action: () => setPanel("keamanan") },
    { icon: Settings, label: tr("settings"), desc: "Akun & preferensi", action: () => setPanel("pengaturan") },
    { icon: HelpCircle, label: tr("help"), desc: "Pusat bantuan Gomesin", action: () => setPanel("bantuan") },
  ];

  const initials = user
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "GU";

  const requireLogin = (action: () => void) => () => {
    if (!user) {
      toast.info(tr("profLoginRequired2"), {
        action: { label: tr("chatLoginAction"), onClick: goToLogin },
      });
      return;
    }
    action();
  };

  const openChat = (convId: string) => {
    const conv = conversations.find((c: any) => c.id === convId);
    setActiveChatId(convId as any);
    syncChatMessages(convId);
    if (user && conv?.partnerId) {
      fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, partnerId: conv.partnerId }),
      }).then(() => refetchMessages());
    }
  };

  // ===== Conversation context menu actions =====
  const handleConvContextMenu = (e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConvMenu({ visible: true, x: e.clientX, y: e.clientY, convId });
  };

  const handleBlockUser = useCallback(() => {
    const conv = conversations.find((c: any) => c.id === convMenu.convId);
    if (conv) toast.success(`${conv.name} diblokir`);
    setConvMenu({ visible: false, x: 0, y: 0, convId: null });
  }, [convMenu.convId, conversations]);

  const handleClearChat = useCallback(async () => {
    const conv = conversations.find((c: any) => c.id === convMenu.convId);
    if (!conv || !user) { setConvMenu({ visible: false, x: 0, y: 0, convId: null }); return; }
    try {
      await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, partnerId: conv.partnerId, listingTitle: conv.listingTitle }),
      });
      setChatMessages(prev => { const n = { ...prev }; delete n[convMenu.convId as any]; return n; });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Chat dibersihkan");
    } catch { toast.error("Gagal membersihkan chat"); }
    setConvMenu({ visible: false, x: 0, y: 0, convId: null });
  }, [convMenu.convId, conversations, user, queryClient]);

  const handleDeleteChat = useCallback(async () => {
    const conv = conversations.find((c: any) => c.id === convMenu.convId);
    if (!conv || !user) { setConvMenu({ visible: false, x: 0, y: 0, convId: null }); return; }
    try {
      await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, partnerId: conv.partnerId, listingTitle: conv.listingTitle }),
      });
      setChatMessages(prev => { const n = { ...prev }; delete n[convMenu.convId as any]; return n; });
      if (activeChatId === convMenu.convId) setActiveChatId(null);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      toast.success("Chat dihapus");
    } catch { toast.error("Gagal menghapus chat"); }
    setConvMenu({ visible: false, x: 0, y: 0, convId: null });
  }, [convMenu.convId, conversations, user, queryClient, activeChatId]);

  // Close menu on outside click
  useEffect(() => {
    if (!convMenu.visible) return;
    const close = () => setConvMenu({ visible: false, x: 0, y: 0, convId: null });
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => { window.removeEventListener("click", close); window.removeEventListener("contextmenu", close); };
  }, [convMenu.visible]);

  // Sync chat messages from conversations data — populate local state from DB snapshot.
  const syncChatMessages = (convId: string) => {
    const conv = conversations.find((c: any) => c.id === convId);
    if (!conv) return;
    const dbCount = conv.messages?.length || 0;
    const localCount = chatMessages[convId as any]?.length || 0;
    // Only initialize from DB if local is empty (first open).
    if (localCount === 0 && dbCount > 0) {
      const history = [...conv.messages].reverse().map((m: any) => ({
        role: m.sent ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));
      setChatMessages((prev) => ({ ...prev, [convId as any]: history }));
    } else if (dbCount === 0 && localCount === 0) {
      setChatMessages((prev) => ({ ...prev, [convId as any]: [] }));
    }
  };

  // Realtime: subscribe to incoming / echo messages via socket.
  useEffect(() => {
    if (!user) return;
    const off = subscribe<ChatMessage>("message:new", (msg) => {
      // Find the conversation this message belongs to (by partnerId + listingTitle).
      const isMine = msg.senderId === user.id;
      const partnerId = isMine ? msg.receiverId : msg.senderId;
      const conv = conversations.find(
        (c: any) => c.partnerId === partnerId && (c.listingTitle || null) === (msg.listingTitle || null)
      );
      // Refresh conversation list so last message preview + unread count update.
      queryClient.invalidateQueries({ queryKey: ["messages"] });

      // If this conversation is currently open in the chat view, append the message.
      if (conv && activeChatId !== null && String(activeChatId) === String(conv.id)) {
        setChatMessages((prev) => {
          const existing = prev[conv.id as any] || [];
          // Dedupe by content+role (avoid optimistic + echo double-add).
          const last = existing[existing.length - 1];
          if (
            last &&
            last.role === (isMine ? "user" : "assistant") &&
            last.content === msg.content
          ) {
            return prev;
          }
          return {
            ...prev,
            [conv.id as any]: [...existing, { role: isMine ? "user" : "assistant", content: msg.content }],
          };
        });
        // Auto-mark incoming as read since the chat is open.
        if (!isMine) {
          markRead(user.id, partnerId);
        }
      }
    });
    return off;
  }, [user, activeChatId, conversations, subscribe, markRead, queryClient]);

  // Realtime: subscribe to read receipts — refresh unread counts.
  useEffect(() => {
    if (!user) return;
    const off = subscribe<{ partnerId: string }>("message:read-update", () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    });
    return off;
  }, [user, subscribe, queryClient]);

  // Auto-scroll to bottom when chat messages change
  useEffect(() => {
    if (activeChatId !== null && panel === "pesan") {
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [chatMessages, activeChatId, panel]);

  // Lock body scroll when Pesan panel is open on mobile (full-screen chat overlay)
  useEffect(() => {
    if (panel !== "pesan" || typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      if (mq.matches) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, [panel]);

  const sendChat = async () => {
    const content = chatInput.trim();
    if (!content || chatSending || activeChatId === null || !user) return;
    const conv = conversations.find((c: any) => c.id === activeChatId);
    if (!conv) return;

    setChatInput("");
    // Optimistic: show immediately.
    const history = chatMessages[activeChatId as any] || [];
    const next = [...history, { role: "user" as const, content }];
    setChatMessages((prev) => ({ ...prev, [activeChatId as any]: next }));
    setChatSending(true);

    try {
      // Send via socket — server saves to DB AND broadcasts to receiver instantly.
      const ack = await sendMessage({
        senderId: user.id,
        receiverId: conv.partnerId,
        content,
        listingTitle: conv.listingTitle,
      });
      if (!ack?.ok) {
        // Fallback to REST.
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: user.id,
            receiverId: conv.partnerId,
            content,
            listingTitle: conv.listingTitle,
          }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    } catch {
      toast.error(tr("chatSendFailed"));
    } finally {
      setChatSending(false);
    }
  };

  const panelTitle: Record<Exclude<PanelType, null>, string> = {
    pesan: tr("messages"),
    pesanan: tr("orders"),
    saldo: tr("wallet"),
    notifikasi: tr("notifications"),
    keamanan: tr("security"),
    pengaturan: tr("settings"),
    bantuan: tr("help"),
    "iklan-saya": tr("profMyAds"),
    "favorit-saya": tr("myFavorites"),
  };

  return (
    <div className="flex animate-fade-up">
      {/* ===== LEFT — SIDEBAR (sticky, like admin panel) ===== */}
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-card md:block">
        {/* User info at top of sidebar */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user?.name || "Pengguna"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email || "Belum login"}</p>
            </div>
          </div>
          {user?.role === "admin" && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              <ShieldCheck className="size-3" /> Admin
            </span>
          )}
        </div>

        {/* Menu items */}
        <nav className="p-2">
          {/* Section: Iklan & Transaksi */}
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">Iklan & Transaksi</p>
          {[
            ...(user?.role === "admin" ? [{ icon: ShieldCheck, label: tr("adminPanel"), action: goToAdmin, navigate: true, key: "admin" }] : []),
            { icon: Tag, label: tr("profMyAds"), action: () => setPanel("iklan-saya"), navigate: false, key: "iklan-saya" },
            { icon: Heart, label: tr("myFavorites"), action: () => setPanel("favorit-saya"), navigate: false, key: "favorit-saya" },
            { icon: MessageSquare, label: tr("messages"), action: () => setPanel("pesan"), navigate: false, key: "pesan" },
            { icon: Package, label: tr("orders"), action: () => setPanel("pesanan"), navigate: false, key: "pesanan" },
            { icon: Wallet, label: tr("wallet"), action: () => setPanel("saldo"), navigate: false, key: "saldo" },
          ].map((m, i) => {
            const isActive = panel === m.key;
            return (
              <button
                key={i}
                onClick={m.action}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                  isActive ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80 hover:bg-accent"
                )}
              >
                <m.icon className="size-4 shrink-0" />
                <span className="truncate">{m.label}</span>
                {m.key === "pesan" && unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unreadCount}</span>
                )}
              </button>
            );
          })}

          {/* Section: Akun & Keamanan */}
          <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">Akun & Keamanan</p>
          {[
            { icon: Bell, label: tr("notifications"), action: () => setPanel("notifikasi"), key: "notifikasi" },
            { icon: Lock, label: tr("security"), action: () => setPanel("keamanan"), key: "keamanan" },
            { icon: Settings, label: tr("settings"), action: () => setPanel("pengaturan"), key: "pengaturan" },
          ].map((m, i) => {
            const isActive = panel === m.key;
            return (
              <button
                key={i}
                onClick={m.action}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
                  isActive ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80 hover:bg-accent"
                )}
              >
                <m.icon className="size-4 shrink-0" />
                <span className="truncate">{m.label}</span>
              </button>
            );
          })}

          {/* Section: Bantuan */}
          <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">Bantuan</p>
          <button
            onClick={() => setPanel("bantuan")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
              panel === "bantuan" ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80 hover:bg-accent"
            )}
          >
            <HelpCircle className="size-4 shrink-0" />
            <span className="truncate">{tr("help")}</span>
          </button>
          <button
            onClick={() => { if (user) { logout(); toast.success(tr("profLogoutSuccess")); goHome(); } else { goToLogin(); } }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/5"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="truncate">{user ? tr("logout") : tr("loginRegister")}</span>
          </button>
        </nav>
      </aside>

      {/* ===== RIGHT — MAIN CONTENT (like admin panel) ===== */}
      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        {/* breadcrumb */}
        <div className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
          <button onClick={goHome} className="hover:text-primary">{tr("home2")}</button>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{tr("account")}</span>
        </div>

        {/* Header — like admin panel */}
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
            <User className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{user?.name || "Akun Gomesin"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email || "Kelola akun & preferensi Anda"}</p>
          </div>
        </div>

        {/* Quick Stats — 4 compact cards (desktop only, hidden on mobile) */}
        <div className="mb-4 hidden grid-cols-2 gap-2 sm:grid-cols-4 md:grid">
          {[
            { label: tr("myFavorites"), value: favCount, icon: Heart, color: "text-rose-500", bg: "bg-rose-50", action: () => setPanel("favorit-saya") },
            { label: tr("profMyAds"), value: myAdsCount, icon: Tag, color: "text-primary", bg: "bg-primary/10", action: () => setPanel("iklan-saya") },
            { label: tr("messages"), value: unreadCount, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50", action: () => setPanel("pesan") },
            { label: tr("orders"), value: orders.length, icon: Package, color: "text-amber-500", bg: "bg-amber-50", action: () => setPanel("pesanan") },
          ].map((s) => (
            <button
              key={s.label}
              onClick={s.action}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary hover:shadow-sm"
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", s.bg)}>
                <s.icon className={cn("size-4", s.color)} />
              </span>
              <div className="min-w-0 text-left">
                <p className="text-xl font-bold leading-tight">{s.value}</p>
                <p className="truncate text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Mobile menu selector (hidden on desktop — sidebar handles it) */}
        <div className="mb-4 md:hidden">
          <select
            value={panel || ""}
            onChange={(e) => setPanel(e.target.value || null)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">— Pilih Menu —</option>
            <optgroup label="Iklan & Transaksi">
              {user?.role === "admin" && <option value="admin">Panel Admin</option>}
              <option value="iklan-saya">{tr("profMyAds")}</option>
              <option value="favorit-saya">{tr("myFavorites")}</option>
              <option value="pesan">{tr("messages")}</option>
              <option value="pesanan">{tr("orders")}</option>
              <option value="saldo">{tr("wallet")}</option>
            </optgroup>
            <optgroup label="Akun & Keamanan">
              <option value="notifikasi">{tr("notifications")}</option>
              <option value="keamanan">{tr("security")}</option>
              <option value="pengaturan">{tr("settings")}</option>
            </optgroup>
            <optgroup label="Bantuan">
              <option value="bantuan">{tr("help")}</option>
            </optgroup>
          </select>
        </div>

        {/* Content Area — on mobile, Pesan panel renders as a fixed full-screen overlay so we hide the card chrome */}
        <div className={cn(
          "min-h-[400px] rounded-xl border border-border bg-card",
          panel === "pesan" && "max-md:border-0 max-md:p-0 max-md:min-h-0"
        )}>
          {panel !== null ? (
            <div className="h-full">
              {/* Panel header — hidden on mobile when Pesan (the WhatsApp green bar replaces it) */}
              <div className={cn(
                "flex items-center justify-between border-b border-border p-3",
                panel === "pesan" && "max-md:hidden"
              )}>
                <h2 className="text-sm font-bold">{panelTitle[panel]}</h2>
                <button onClick={closePanel} className="grid size-7 place-items-center rounded-full hover:bg-accent">
                  <X className="size-4" />
                </button>
              </div>
              {/* Panel content — WhatsApp split view (desktop) / full-screen overlay (mobile Pesan) */}
              <div className={cn(
                "flex overflow-hidden",
                panel === "pesan"
                  ? "max-md:h-screen max-md:fixed max-md:inset-0 max-md:z-[60] h-[calc(100vh-12rem)]"
                  : "h-[calc(100vh-12rem)]"
              )}>

                {/* ===== LEFT: Conversation list (full pane on mobile, sidebar on desktop) ===== */}
                {panel === "pesan" && (
                  <div className={cn(
                    "flex-col border-r border-border bg-card w-full",
                    // Mobile: full width when no chat open; hidden when a chat is open (chat pane takes over)
                    // Desktop: 320px sidebar always visible
                    activeChatId !== null
                      ? "hidden md:flex md:w-[320px] md:shrink-0"
                      : "flex md:w-[320px] md:shrink-0"
                  )}>
                    {/* Mobile top bar — WhatsApp green with back button (no title) */}
                    <div className="flex items-center bg-[#075E54] px-1 py-2 md:hidden">
                      <button onClick={closePanel} aria-label="Kembali" className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10">
                        <ChevronLeft className="size-5" />
                      </button>
                    </div>
                    {/* Search bar */}
                    <div className="border-b border-border bg-[#f0f2f5] p-2">
                      <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm">
                        <Search className="size-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Cari chat..."
                          className="flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                    </div>
                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto">
                      {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <MessageSquare className="size-12 text-muted-foreground/30" />
                          <p className="mt-3 text-sm font-semibold">Belum ada pesan</p>
                          <p className="mt-1 text-xs text-muted-foreground">Pesan dari pembeli akan muncul di sini.</p>
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => { setPanel(null); goToListings({}); }}>
                            Jelajahi iklan
                          </Button>
                        </div>
                      ) : (
                        conversations.map((c: any) => (
                          <button
                            key={c.id}
                            onClick={() => openChat(c.id)}
                            onContextMenu={(e) => handleConvContextMenu(e, c.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 text-left transition border-b border-border/30",
                              activeChatId === c.id ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                            )}
                          >
                            <Avatar className="size-12 shrink-0 rounded-full">
                              <AvatarFallback className="bg-[#075E54]/10 text-sm font-bold text-[#075E54]">
                                {c.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                                <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastTime, mounted ? lang : "id")}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                                {c.unread > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#25D366] text-[9px] font-bold text-white">{c.unread}</span>}
                              </div>
                              {c.listingTitle && <p className="mt-0.5 truncate text-[10px] text-[#075E54]">{c.listingTitle}</p>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ===== Conversation context menu (right-click) ===== */}
                {convMenu.visible && (
                  <div
                    className="fixed z-[100] min-w-[180px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl animate-fade-up"
                    style={{ left: Math.min(convMenu.x, window.innerWidth - 200), top: Math.min(convMenu.y, window.innerHeight - 200) }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={handleBlockUser}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-accent"
                    >
                      <Ban className="size-4" /> Blokir Pengguna
                    </button>
                    <button
                      onClick={handleClearChat}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition hover:bg-accent"
                    >
                      <Eraser className="size-4" /> Bersihkan Chat
                    </button>
                    <button
                      onClick={handleDeleteChat}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-accent"
                    >
                      <Trash2 className="size-4" /> Hapus Chat
                    </button>
                  </div>
                )}

                {/* ===== RIGHT: Chat view or placeholder (full pane on mobile when chat open) ===== */}
                {panel === "pesan" && (
                  <div className={cn(
                    "flex-col bg-card w-full",
                    // Mobile: full width when a chat is open; hidden when no chat (list is shown)
                    // Desktop: flex-1 pane always visible
                    activeChatId !== null
                      ? "flex md:flex-1"
                      : "hidden md:flex md:flex-1"
                  )}>
                    {activeChatId !== null ? (() => {
                      const conv = conversations.find((c: any) => c.id === activeChatId);
                      if (!conv) return null;
                      const convo = chatMessages[activeChatId as any] || [];
                      return (
                        <>
                          {/* Chat header — WhatsApp green on mobile, light gray on desktop */}
                          <div className="flex items-center gap-2 bg-[#075E54] p-2.5 text-white md:gap-3 md:border-b md:border-border md:bg-[#f0f2f5] md:text-foreground">
                            <button
                              onClick={() => setActiveChatId(null)}
                              aria-label="Kembali"
                              className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/10 md:hidden"
                            >
                              <ChevronLeft className="size-5" />
                            </button>
                            <Avatar className="size-9 shrink-0 rounded-full md:size-10">
                              <AvatarFallback className="bg-white/20 text-xs font-bold text-white md:bg-[#075E54]/10 md:text-[#075E54]">
                                {conv.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <p className="truncate text-sm font-bold">{conv.name}</p>
                                <BadgeCheck className="size-3.5 shrink-0 text-white/80 md:text-[#075E54]" />
                              </div>
                              <p className="text-[10px] text-white/70 md:text-muted-foreground">online</p>
                            </div>
                          </div>
                          {/* Listing card */}
                          {conv.listingTitle && (
                            <div className="border-b border-border bg-white p-2">
                              <div className="flex items-center gap-2">
                                <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                                  {conv.listingImage ? (
                                    <img src={conv.listingImage} alt="" className="size-full object-cover" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">
                                      <Tag className="size-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-foreground">{conv.listingTitle}</p>
                                  {conv.listingPrice && (
                                    <p className="text-xs font-bold text-[#075E54]">Rp {conv.listingPrice.toLocaleString("id-ID")}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Messages */}
                          <div
                            ref={chatScrollRef}
                            className="flex-1 space-y-1.5 overflow-y-auto p-4"
                            style={{
                              backgroundColor: "#e5ddd5",
                              backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.03) 1px, transparent 1px)",
                              backgroundSize: "20px 20px",
                            }}
                          >
                            <div className="flex justify-center py-1">
                              <span className="rounded-full bg-white/80 px-3 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">Hari ini</span>
                            </div>
                            {convo.map((c, i) => (
                              <div key={i} className={c.role === "user" ? "flex justify-end" : "flex justify-start"}>
                                <div
                                  className={cn(
                                    "max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm",
                                    c.role === "user"
                                      ? "rounded-tr-sm bg-[#dcf8c6] text-foreground"
                                      : "rounded-tl-sm bg-white text-foreground"
                                  )}
                                >
                                  <p className="whitespace-pre-wrap break-words">{c.content}</p>
                                  <span className="mt-0.5 block text-right text-[9px] text-muted-foreground/60">
                                    {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                    {c.role === "user" && <span className="ml-1 text-blue-500">✓✓</span>}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {chatSending && (
                              <div className="flex justify-start">
                                <div className="flex items-center gap-1 rounded-lg rounded-tl-sm bg-white px-3 py-2.5 shadow-sm">
                                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Input */}
                          <form
                            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                            className="flex items-center gap-2 bg-[#f0f2f5] p-2"
                          >
                            <input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Tulis pesan..."
                              className="h-10 flex-1 rounded-lg border border-transparent bg-white px-4 text-sm outline-none shadow-sm"
                              disabled={chatSending}
                            />
                            <Button
                              type="submit"
                              size="icon"
                              className="size-10 shrink-0 rounded-full bg-[#075E54] hover:bg-[#054c42]"
                              disabled={chatSending || !chatInput.trim()}
                            >
                              {chatSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 text-white" />}
                            </Button>
                          </form>
                        </>
                      );
                    })() : (
                      /* Placeholder when no chat selected */
                      <div className="flex flex-1 flex-col items-center justify-center bg-[#f0f2f5]">
                        <div className="text-center">
                          <MessageCircle className="mx-auto size-16 text-muted-foreground/20" />
                          <p className="mt-4 text-lg font-light text-muted-foreground">Gomesin Web</p>
                          <p className="mt-1 text-xs text-muted-foreground/60">Pilih chat di sebelah kiri untuk mulai pesan</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/40">Pesan terenkripsi end-to-end</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

            {/* PESANAN */}
            {panel === "pesanan" && (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">{o.id}</p>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        o.status === tr("profOrderSelesai") ? "bg-emerald-100 text-emerald-700" :
                        o.status === tr("profOrderDiproses") ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      )}>{o.status}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold">{o.item}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {o.date}</span>
                      <span className="font-bold text-foreground">{o.total}</span>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="mt-2 w-full" onClick={() => goToListings({})}>
                  Lihat iklan lain
                </Button>
              </div>
            )}

            {/* SALDO & PEMBAYARAN */}
            {panel === "saldo" && (() => {
              const totalIn = transactions.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0);
              const totalOut = transactions.filter((t) => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);

              return (
                <div className="space-y-4">
                  {/* Balance Card */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-emerald-600 p-5 text-primary-foreground shadow-lg">
                    <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/10" />
                    <div className="absolute -bottom-10 right-16 size-20 rounded-full bg-white/10" />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
                            <Wallet className="size-3.5" /> Saldo Gomesin
                          </p>
                          <p className="mt-1 text-3xl font-extrabold">Rp {balance.toLocaleString("id-ID")}</p>
                        </div>
                        <span className="grid size-12 place-items-center rounded-xl bg-white/20 backdrop-blur">
                          <Wallet className="size-6" />
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="bg-white text-primary hover:bg-white/90"
                          onClick={() => toast.success(tr("profTopUpSuccess"))}
                        >
                          <Plus className="size-4" /> Top Up
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/20 backdrop-blur hover:bg-white/30"
                          onClick={() => toast.info(tr("profTxHistoryInfo"))}
                        >
                          <CreditCard className="size-4" /> Riwayat
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Income/Expense Summary */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="flex items-center gap-1 text-[11px] text-emerald-700">
                        <span className="text-emerald-500">↓</span> Masuk
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">Rp {totalIn.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                      <p className="flex items-center gap-1 text-[11px] text-red-700">
                        <span className="text-red-500">↑</span> Keluar
                      </p>
                      <p className="mt-1 text-sm font-bold text-red-700">Rp {totalOut.toLocaleString("id-ID")}</p>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold">Metode Pembayaran</p>
                      <button
                        onClick={() => setShowAddPayment(!showAddPayment)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {showAddPayment ? tr("profCancel") : tr("profAdd")}
                      </button>
                    </div>

                    {/* Add Payment Form */}
                    {showAddPayment && (
                      <div className="mb-3 space-y-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Tipe</Label>
                          <div className="flex gap-2">
                            {[
                              { v: "bank", l: tr("commonBank") },
                              { v: "ewallet", l: "E-Wallet" },
                              { v: "qris", l: "QRIS" },
                            ].map((t) => (
                              <button
                                key={t.v}
                                onClick={() => setNewPaymentType(t.v)}
                                className={cn(
                                  "flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                                  newPaymentType === t.v
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card hover:bg-accent"
                                )}
                              >
                                {t.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Nama {newPaymentType === "bank" ? "Bank" : newPaymentType === "ewallet" ? "E-Wallet" : ""}</Label>
                          <Input
                            value={newPaymentName}
                            onChange={(e) => setNewPaymentName(e.target.value)}
                            placeholder={newPaymentType === "bank" ? "BCA, Mandiri, BNI..." : newPaymentType === "ewallet" ? "GoPay, OVO, DANA..." : "QRIS"}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{newPaymentType === "qris" ? "ID QRIS" : "Nomor Rekening / HP"}</Label>
                          <Input
                            value={newPaymentNumber}
                            onChange={(e) => setNewPaymentNumber(e.target.value)}
                            placeholder={newPaymentType === "bank" ? "1234567890" : "0812-xxxx-xxxx"}
                            className="h-9 text-sm"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!newPaymentName.trim() || !newPaymentNumber.trim()}
                          onClick={() => {
                            const newPayment = {
                              id: Date.now(),
                              type: newPaymentType,
                              name: newPaymentName.trim(),
                              number: newPaymentType === "bank" ? "**** " + newPaymentNumber.trim().slice(-4) : newPaymentNumber.trim(),
                              holder: user?.name || tr("commonGomesinUser"),
                              isPrimary: paymentList.length === 0,
                            };
                            setPaymentList([...paymentList, newPayment]);
                            setNewPaymentName("");
                            setNewPaymentNumber("");
                            setShowAddPayment(false);
                            toast.success(tr("profPaymentAdded"));
                          }}
                        >
                          <CheckCircle2 className="size-4" /> Simpan
                        </Button>
                      </div>
                    )}

                    {/* Payment List */}
                    <div className="space-y-2">
                      {paymentList.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                          <span className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-lg",
                            p.type === "bank" && "bg-blue-50 text-blue-600",
                            p.type === "ewallet" && "bg-purple-50 text-purple-600",
                            p.type === "qris" && "bg-emerald-50 text-emerald-600"
                          )}>
                            {p.type === "qris" ? <Smartphone className="size-5" /> : <CreditCard className="size-5" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{p.number} · {p.holder}</p>
                          </div>
                          {p.isPrimary && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Utama</span>
                          )}
                          {!p.isPrimary && (
                            <button
                              onClick={() => {
                                setPaymentList(paymentList.map((x) => ({ ...x, isPrimary: x.id === p.id })));
                                toast.success(`${p.name} dijadikan metode utama`);
                              }}
                              className="text-[10px] font-medium text-primary hover:underline"
                            >
                              Jadikan Utama
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setPaymentList(paymentList.filter((x) => x.id !== p.id));
                              toast.success(tr("profPaymentDeleted"));
                            }}
                            className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Hapus"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      {paymentList.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                          Belum ada metode pembayaran. Klik "+ Tambah" untuk menambah.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div>
                    <p className="mb-2 text-sm font-bold">Riwayat Transaksi</p>
                    <div className="space-y-1.5">
                      {transactions.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                          <span className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-lg",
                            t.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                            {t.amount > 0 ? <Plus className="size-4" /> : <CreditCard className="size-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{t.title}</p>
                            <p className="text-[11px] text-muted-foreground">{t.date}</p>
                          </div>
                          <span className={cn(
                            "shrink-0 text-sm font-bold",
                            t.amount > 0 ? "text-emerald-600" : "text-red-600"
                          )}>
                            {t.amount > 0 ? "+" : ""}Rp {Math.abs(t.amount).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* NOTIFIKASI */}
            {panel === "notifikasi" && (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                      <n.icon className={cn("size-4", n.color)} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{n.title}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="mt-2 w-full" onClick={() => { setPanel(null); toast.success("Semua notifikasi ditandai dibaca"); }}>
                  Tandai semua dibaca
                </Button>
              </div>
            )}

            {/* KEAMANAN */}
            {panel === "keamanan" && (() => {
              // Security score calculation
              const checks = [
                { label: tr("profEmailVerified"), passed: !!user?.email },
                { label: tr("profPhoneVerified"), passed: !!user?.phone },
                { label: tr("prof2FA"), passed: twoFAEnabled },
                { label: tr("profLoginAlertsOn"), passed: loginAlerts },
              ];
              const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 100);
              const scoreColor = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
              const scoreBg = score >= 75 ? "[&>div]:bg-emerald-500" : score >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500";
              const loginHistory = [
                { device: "Chrome — Windows", loc: "Jakarta, ID", time: tr("profTimeNow"), current: true, ip: "103.10.x.x" },
                { device: "Safari — iPhone", loc: "Jakarta, ID", time: tr("profTime2h"), current: false, ip: "103.10.x.x" },
                { device: "Chrome — Android", loc: "Bandung, ID", time: tr("profTimeYesterday"), current: false, ip: "36.71.x.x" },
              ];

              return (
                <div className="space-y-4">
                  {/* Security Score Card */}
                  <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-emerald-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("grid size-10 place-items-center rounded-lg bg-card shadow-sm", scoreColor)}>
                          <Shield className="size-5" />
                        </span>
                        <div>
                          <p className="text-sm font-bold">Skor Keamanan</p>
                          <p className="text-xs text-muted-foreground">{score >= 75 ? "Akun terlindungi" : score >= 50 ? "Cukup aman" : "Perlu diperkuat"}</p>
                        </div>
                      </div>
                      <span className={cn("text-2xl font-extrabold", scoreColor)}>{score}%</span>
                    </div>
                    <Progress value={score} className={cn("mt-3 h-2", scoreBg)} />
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      {checks.map((c, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                          {c.passed ? (
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                          )}
                          <span className={c.passed ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <KeyRound className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Ubah Kata Sandi</p>
                        <p className="truncate text-xs text-muted-foreground">Perbarui kata sandi akun Anda</p>
                      </div>
                      <ChevronRight className={cn("size-4 text-muted-foreground transition", showPasswordForm && "rotate-90")} />
                    </button>
                    {showPasswordForm && (
                      <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Kata Sandi Lama</Label>
                          <Input
                            type="password"
                            value={currentPass}
                            onChange={(e) => setCurrentPass(e.target.value)}
                            placeholder="••••••••"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Kata Sandi Baru</Label>
                          <Input
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder="Min. 6 karakter"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Ulangi Kata Sandi Baru</Label>
                          <Input
                            type="password"
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            placeholder="Ulangi kata sandi baru"
                            className="h-9 text-sm"
                          />
                          {confirmPass && newPass !== confirmPass && (
                            <p className="text-xs text-destructive">Kata sandi tidak cocok</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={savingPass || !currentPass || !newPass || newPass !== confirmPass}
                          onClick={async () => {
                            if (!user?.id) return;
                            setSavingPass(true);
                            try {
                              const res = await fetch("/api/auth/password", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId: user.id,
                                  currentPassword: currentPass,
                                  newPassword: newPass,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                toast.error(data.error || tr("profPasswordChangeFailed"));
                                return;
                              }
                              toast.success(tr("profPasswordChanged"));
                              setShowPasswordForm(false);
                              setCurrentPass("");
                              setNewPass("");
                              setConfirmPass("");
                            } catch {
                              toast.error(tr("profConnectionFailed"));
                            } finally {
                              setSavingPass(false);
                            }
                          }}
                        >
                          {savingPass ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                          {savingPass ? tr("profSaving") : tr("profChangePassword")}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 2FA Toggle */}
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Smartphone className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Autentikasi Dua Faktor</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {twoFAEnabled ? tr("prof2FAOn") : tr("prof2FAOff")}
                      </p>
                    </div>
                    <Switch
                      checked={twoFAEnabled}
                      onCheckedChange={(v) => {
                        setTwoFAEnabled(v);
                        toast.success(v ? "2FA berhasil diaktifkan" : "2FA dinonaktifkan");
                      }}
                    />
                  </div>

                  {/* Login Alerts Toggle */}
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <BellRing className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Notifikasi Login</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {loginAlerts ? tr("profAlertsOn") : tr("profAlertsOff")}
                      </p>
                    </div>
                    <Switch
                      checked={loginAlerts}
                      onCheckedChange={(v) => {
                        setLoginAlerts(v);
                        toast.success(v ? tr("profLoginAlertsEnabled") : tr("profLoginAlertsDisabled"));
                      }}
                    />
                  </div>

                  {/* Email & Phone Verification Status */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className={cn("flex items-center gap-2 rounded-xl border p-3", user?.email ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                      <Mail className={cn("size-4 shrink-0", user?.email ? "text-emerald-600" : "text-amber-600")} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">Email</p>
                        <p className={cn("truncate text-[11px]", user?.email ? "text-emerald-700" : "text-amber-700")}>
                          {user?.email ? tr("profVerified") : tr("profNotVerified")}
                        </p>
                      </div>
                      <CheckCircle2 className={cn("ml-auto size-4 shrink-0", user?.email ? "text-emerald-600" : "text-amber-600/40")} />
                    </div>
                    <div className={cn("flex items-center gap-2 rounded-xl border p-3", user?.phone ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                      <Smartphone className={cn("size-4 shrink-0", user?.phone ? "text-emerald-600" : "text-amber-600")} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">Nomor HP</p>
                        <p className={cn("truncate text-[11px]", user?.phone ? "text-emerald-700" : "text-amber-700")}>
                          {user?.phone ? tr("profVerified") : tr("profNotVerified")}
                        </p>
                      </div>
                      <CheckCircle2 className={cn("ml-auto size-4 shrink-0", user?.phone ? "text-emerald-600" : "text-amber-600/40")} />
                    </div>
                  </div>

                  {/* Login History */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <button
                      onClick={() => setShowLoginHistory(!showLoginHistory)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Monitor className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">Riwayat Login</p>
                        <p className="truncate text-xs text-muted-foreground">Lihat aktivitas login akun</p>
                      </div>
                      <ChevronRight className={cn("size-4 text-muted-foreground transition", showLoginHistory && "rotate-90")} />
                    </button>
                    {showLoginHistory && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {loginHistory.map((h, i) => (
                          <div key={i} className={cn("flex items-start gap-2.5 rounded-lg p-2.5", h.current ? "bg-emerald-50" : "bg-secondary/40")}>
                            <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold">{h.device}</p>
                                {h.current && (
                                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">SEKARANG</span>
                                )}
                              </div>
                              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <MapPin className="size-3" /> {h.loc} · {h.ip}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{h.time}</span>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/5" onClick={() => toast.success("Semua sesi lain telah diakhiri")}>
                          <LogOut className="size-3.5" /> Akhiri Semua Sesi Lain
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* PENGATURAN */}
            {panel === "pengaturan" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-bold">Profil</p>
                    {!editMode ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditName(user?.name || "");
                          setEditPhone(user?.phone || "");
                          setEditCity(user?.city || "");
                          setEditMode(true);
                        }}
                      >
                        <SlidersHorizontal className="size-4" /> Edit Profil
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditMode(false)}
                          disabled={savingProfile}
                        >
                          Batal
                        </Button>
                        <Button
                          size="sm"
                          disabled={savingProfile}
                          onClick={async () => {
                            if (!user?.id) return;
                            if (!editName.trim()) {
                              toast.error(tr("profNameEmpty"));
                              return;
                            }
                            setSavingProfile(true);
                            try {
                              const res = await fetch("/api/auth/profile", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId: user.id,
                                  name: editName,
                                  phone: editPhone,
                                  city: editCity,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                toast.error(data.error || tr("profUpdateFailed"));
                                return;
                              }
                              setUser(data.user);
                              setEditMode(false);
                              toast.success(tr("profProfileUpdated"));
                            } catch {
                              toast.error(tr("profConnectionFailed"));
                            } finally {
                              setSavingProfile(false);
                            }
                          }}
                        >
                          {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          Simpan
                        </Button>
                      </div>
                    )}
                  </div>

                  {!editMode ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Nama</span><span className="font-medium">{user?.name || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="max-w-[60%] truncate text-right font-medium">{user?.email || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">No. HP</span><span className="font-medium">{user?.phone || "-"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Kota</span><span className="font-medium">{user?.city || "-"}</span></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Nama</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nama lengkap"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <Input
                          value={user?.email || ""}
                          disabled
                          className="h-9 text-sm text-muted-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground">Email tidak dapat diubah</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">No. HP</Label>
                        <Input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="0812-xxxx-xxxx"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Kota</Label>
                        <Input
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          placeholder="Kota"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-3 text-sm font-bold">Preferensi</p>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between text-sm">
                      <span>Notifikasi push</span>
                      <input type="checkbox" defaultChecked className="accent-primary" />
                    </label>
                    <label className="flex items-center justify-between text-sm">
                      <span>Email newsletter</span>
                      <input type="checkbox" defaultChecked className="accent-primary" />
                    </label>
                    <label className="flex items-center justify-between text-sm">
                      <span>Tampilkan iklan disarankan</span>
                      <input type="checkbox" className="accent-primary" />
                    </label>
                  </div>
                </div>
                <Button variant="destructive" className="w-full" onClick={() => {
                  if (confirm(tr("profDeleteAccountConfirm"))) {
                    toast.info(tr("profDeleteAccountProcessing"));
                  }
                }}>
                  Hapus Akun
                </Button>
              </div>
            )}

            {/* BANTUAN */}
            {panel === "bantuan" && (() => {
              const filteredFaqs = faqs.filter(
                (f) =>
                  f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
                  f.a.toLowerCase().includes(faqSearch.toLowerCase())
              );
              const guides = [
                {
                  icon: BookOpen,
                  title: tr("profGuide1Title"),
                  desc: tr("profGuide1Desc"),
                  content: [
                    "1. Klik tombol 'Jual' (hijau) di bagian bawah layar atau tombol 'Pasang Iklan' di halaman akun.",
                    "2. Pilih kategori mesin yang sesuai (Mesin Cetak, CNC, Alat Berat, dll).",
                    "3. Isi judul iklan yang jelas, contoh: 'Mesin Cetak Offset Heidelberg SM 52 4 Warna'.",
                    "4. Tulis deskripsi lengkap: kondisi mesin, tahun produksi, kelengkapan, alasan jual.",
                    "5. Masukkan harga yang wajar. Pilih 'Bisa Nego' jika harga masih dapat ditawar.",
                    "6. Unggah minimal 1 foto mesin (maks 200KB, otomatis dikompres).",
                    "7. Pilih paket: Gratis (365 hari), Premium (Rp 50.000/30 hari), atau Bisnis (Rp 150.000/90 hari).",
                    "8. Klik 'Pasang Iklan Sekarang'. Iklan akan masuk antrian verifikasi admin (1-2 jam).",
                    "9. Setelah diverifikasi, iklan tayang di beranda dan bisa dilihat pembeli.",
                  ],
                },
                {
                  icon: Tag,
                  title: tr("profGuide2Title"),
                  desc: tr("profGuide2Desc"),
                  content: [
                    "GRATIS (Rp 0 — 365 hari):",
                    "• Pasang iklan tanpa batas",
                    "• Maksimal 3 foto per iklan",
                    "• Chat penjual via WhatsApp",
                    "• Tayang 365 hari",
                    "",
                    "PREMIUM (Rp 50.000 — 30 hari):",
                    "• Semua fitur Gratis",
                    "• Maksimal 10 foto per iklan",
                    "• Badge 'Featured' di hasil pencarian",
                    "• Prioritas tampil di beranda",
                    "• Tayang 30 hari",
                    "",
                    "BISNIS (Rp 150.000 — 90 hari):",
                    "• Semua fitur Premium",
                    "• Banner promosi di beranda",
                    "• Laporan performa iklan",
                    "• Prioritas tertinggi",
                    "• Tayang 90 hari",
                  ],
                },
                {
                  icon: ShieldCheck,
                  title: tr("profGuide3Title"),
                  desc: tr("profGuide3Desc"),
                  content: [
                    "1. SURVEI LANGSUNG — Selalu lihat mesin secara langsung sebelum membayar. Jangan hanya percaya foto.",
                    "2. CEK DOKUMEN — Pastikan kelengkapan dokumen (faktur, manual book, sertifikat) sesuai iklan.",
                    "3. REKENING PRIBADI — Transfer hanya ke rekening pribadi penjual, bukan ke pihak ketiga atau agen.",
                    "4. HINDARI DP BESAR — Jangan membayar DP besar sebelum melihat mesin. Bayar lunas saat serah terima.",
                    "5. UJI MESIN — Minta demo mesin berjalan. Cek suara, getaran, dan output produksi.",
                    "6. HATI-HATI HARGA MURAH — Jika harga terlalu murah dari pasaran, waspadai penipuan.",
                    "7. GUNAKAN CHAT GOMESIN — Hubungi penjual via chat Gomesin atau WhatsApp yang tercatat di sistem.",
                    "8. LAPOR PELANGGARAN — Jika menemui penjual curiga, laporkan ke admin via menu 'Keamanan'.",
                  ],
                },
                {
                  icon: CreditCard,
                  title: tr("profGuide4Title"),
                  desc: "BCA, GoPay, QRIS",
                  content: [
                    tr("profPaymentMethodsDesc"),
                    "",
                    "1. TRANSFER BCA (Virtual Account):",
                    "• Bayar via ATM/mobile banking BCA",
                    "• Nomor VA otomatis dibuat saat checkout",
                    "• Konfirmasi otomatis (1-5 menit)",
                    "",
                    "2. GOPAY (E-Wallet):",
                    "• Bayar via aplikasi Gojek",
                    "• Saldo GoPay harus mencukupi",
                    "• Konfirmasi instan",
                    "",
                    "3. QRIS (Scan QR Code):",
                    "• Scan QR pakai e-wallet mana saja (GoPay, OVO, DANA, ShopeePay)",
                    "• Bayar sesuai nominal",
                    "• Konfirmasi instan",
                    "",
                    tr("profPaymentNote"),
                  ],
                },
              ];

              return (
                <div className="space-y-4">
                  {/* Support Chat View */}
                  {showSupportChat ? (
                    <div className="flex flex-col" style={{ minHeight: 320 }}>
                      {/* chat header */}
                      <div className="flex items-center gap-2 border-b border-border pb-3">
                        <button
                          onClick={() => setShowSupportChat(false)}
                          className="grid size-8 place-items-center rounded-md hover:bg-accent"
                          aria-label="Kembali"
                        >
                          <ChevronLeft className="size-5" />
                        </button>
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            <LifeBuoy className="size-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-bold">Tim Support Gomesin</p>
                            <span className="size-2 rounded-full bg-green-500" />
                          </div>
                          <p className="text-[11px] text-muted-foreground">Online · 08.00-20.00 WIB</p>
                        </div>
                      </div>
                      {/* messages */}
                      <div className="gomesin-scroll flex-1 space-y-2.5 overflow-y-auto bg-muted/30 p-3" style={{ maxHeight: 260 }}>
                        {supportMessages.map((m, i) => (
                          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                            <div
                              className={
                                m.role === "user"
                                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                                  : "max-w-[80%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm"
                              }
                            >
                              {m.content}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!supportInput.trim()) return;
                          const userMsg = supportInput.trim();
                          setSupportMessages((m) => [...m, { role: "user", content: userMsg }]);
                          setSupportInput("");
                          // Simulated auto-reply
                          setTimeout(() => {
                            setSupportMessages((m) => [
                              ...m,
                              { role: "support", content: tr("profSupportReply") },
                            ]);
                          }, 1200);
                        }}
                        className="flex items-center gap-2 border-t border-border pt-3"
                      >
                        <input
                          value={supportInput}
                          onChange={(e) => setSupportInput(e.target.value)}
                          placeholder="Tulis pesan..."
                          className="h-10 flex-1 rounded-full border border-border bg-card px-4 text-sm outline-none focus:border-primary"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          className="size-10 shrink-0 rounded-full bg-primary"
                          disabled={!supportInput.trim()}
                        >
                          <Send className="size-4" />
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <>
                      {/* Hero Support Card */}
                      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-emerald-600 p-4 text-primary-foreground">
                        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/10" />
                        <div className="absolute -bottom-10 right-12 size-20 rounded-full bg-white/10" />
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <span className="grid size-10 place-items-center rounded-lg bg-white/20 backdrop-blur">
                              <LifeBuoy className="size-5" />
                            </span>
                            <div>
                              <p className="text-base font-bold">Pusat Bantuan Gomesin</p>
                              <p className="text-xs text-primary-foreground/80">Tim support siap membantu 7 hari · 08.00-20.00 WIB</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              className="bg-white/20 backdrop-blur hover:bg-white/30"
                              onClick={() => setShowSupportChat(true)}
                            >
                              <MessageSquare className="size-4" /> Chat Support
                            </Button>
                            <a
                              href="https://wa.me/6285888082208?text=Halo%20Gomesin%2C%20saya%20butuh%20bantuan"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-green-500 px-3 text-sm font-semibold text-white hover:bg-green-600"
                            >
                              <Phone className="size-4" /> WhatsApp
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Quick Guides */}
                      <div>
                        <p className="mb-2 text-sm font-bold">Panduan Cepat</p>
                        <div className="grid grid-cols-2 gap-2">
                          {guides.map((g, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveGuide(activeGuide === i ? null : i)}
                              className={cn(
                                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                                activeGuide === i
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-card hover:border-primary hover:bg-accent"
                              )}
                            >
                              <span className={cn("grid size-8 place-items-center rounded-lg", activeGuide === i ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                                <g.icon className="size-4" />
                              </span>
                              <p className="text-xs font-bold">{g.title}</p>
                              <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                            </button>
                          ))}
                        </div>
                        {/* Guide Content — expandable */}
                        {activeGuide !== null && guides[activeGuide] && (
                          <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-fade-up">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                                {(() => { const Icon = guides[activeGuide].icon; return <Icon className="size-3.5" />; })()}
                              </span>
                              <p className="text-sm font-bold">{guides[activeGuide].title}</p>
                              <button
                                onClick={() => setActiveGuide(null)}
                                className="ml-auto grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent"
                                aria-label="Tutup"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              {guides[activeGuide].content.map((line, li) => (
                                <p key={li} className={cn(
                                  "text-xs leading-relaxed",
                                  line === "" ? "h-2" : "text-foreground/80",
                                  line.endsWith(":") && "font-bold text-foreground"
                                )}>
                                  {line || "\u00A0"}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* FAQ with Search */}
                      <div>
                        <p className="mb-2 text-sm font-bold">Pertanyaan yang Sering Diajukan</p>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={faqSearch}
                            onChange={(e) => setFaqSearch(e.target.value)}
                            placeholder={tr("profSearchFaq")}
                            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
                          />
                        </div>
                        {filteredFaqs.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                            Tidak ada FAQ yang cocok. Coba kata kunci lain atau hubungi support.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {filteredFaqs.map((f, i) => {
                              const actualIndex = faqs.indexOf(f);
                              const isOpen = openFaq === actualIndex;
                              return (
                                <div
                                  key={actualIndex}
                                  className={cn(
                                    "overflow-hidden rounded-lg border bg-card transition",
                                    isOpen ? "border-primary" : "border-border"
                                  )}
                                >
                                  <button
                                    onClick={() => setOpenFaq(isOpen ? null : actualIndex)}
                                    className="flex w-full items-center justify-between gap-2 p-3 text-left"
                                  >
                                    <span className="text-sm font-semibold">{f.q}</span>
                                    <ChevronRight
                                      className={cn("size-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-90")}
                                    />
                                  </button>
                                  {isOpen && (
                                    <div className="border-t border-border bg-secondary/30 px-3 py-2.5">
                                      <p className="text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="mb-3 text-sm font-bold">Hubungi Kami</p>
                        <div className="space-y-2">
                          <a
                            href="mailto:halo@gomesin.id"
                            className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition hover:bg-accent"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Mail className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-semibold">halo@gomesin.id</p>
                            </div>
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          </a>
                          <a
                            href="https://wa.me/6285888082208"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition hover:bg-accent"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-green-500/10 text-green-600">
                              <Phone className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">WhatsApp / Telepon</p>
                              <p className="text-sm font-semibold">0812-3000-4000</p>
                            </div>
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          </a>
                          <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <MapPin className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Kantor</p>
                              <p className="text-sm font-semibold">Surabaya, Indonesia</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* ===== IKLAN SAYA PANEL ===== */}
            {panel === "iklan-saya" && (
              <div className="space-y-2">
                {myAdsCount > 0 ? (
                  <Button onClick={goToDashboard} className="w-full gap-2">
                    <Tag className="size-4" /> Kelola {myAdsCount} Iklan
                  </Button>
                ) : (
                  <div className="py-8 text-center">
                    <Tag className="mx-auto size-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">Belum ada iklan dipasang.</p>
                    <Button size="sm" className="mt-3 gap-1.5" onClick={goToPost}>
                      <Plus className="size-4" /> Pasang Iklan
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ===== FAVORIT SAYA PANEL ===== */}
            {panel === "favorit-saya" && (
              <div className="space-y-2">
                {favCount > 0 ? (
                  <Button onClick={goToFavorites} className="w-full gap-2">
                    <Heart className="size-4" /> Lihat {favCount} Favorit
                  </Button>
                ) : (
                  <div className="py-8 text-center">
                    <Heart className="mx-auto size-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">Belum ada favorit.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Tekan ikon hati pada iklan untuk menyimpan.</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={goHome}>Jelajahi Iklan</Button>
                  </div>
                )}
              </div>
                )}
                </div>
              </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <Settings className="size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">Pilih menu di samping untuk melihat detail</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
