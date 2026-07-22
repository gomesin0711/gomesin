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
  Smile,
  Paperclip,
  Image as ImageIcon,
  X as XIcon,
  Sticker,
  Camera,
  Menu,
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
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";

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

// Estimate byte size of a base64 data URL (approx — 4 chars = 3 bytes, minus header).
function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1);
  // base64: 4 chars ≈ 3 bytes
  return Math.floor((b64.length * 3) / 4);
}

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
  const myListings: any[] = myListingsData?.listings ?? [];

  // Fetch favorited listings (fetch all, filter by id client-side)
  const favIds = useStore((s) => s.favorites);
  const { data: favListingsData } = useQuery({
    queryKey: ["fav-listings", favIds.join(",")],
    queryFn: async () => {
      if (favIds.length === 0) return { listings: [] };
      const res = await fetch(`/api/listings?limit=200`);
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      return { listings: (data.listings || []).filter((l: any) => favIds.includes(l.id)) };
    },
    enabled: favIds.length > 0,
    staleTime: 0,
  });
  const favListings: any[] = favListingsData?.listings ?? [];

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
  const [chatMessages, setChatMessages] = useState<{ [key: number]: { role: "user" | "assistant"; content: string; image?: string; animation?: string }[] }>({});
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [msgMenu, setMsgMenu] = useState<{ visible: boolean; x: number; y: number; msgIndex: number | null }>({ visible: false, x: 0, y: 0, msgIndex: null });
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const longPressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; msgIndex: number | null }>({ timer: null, msgIndex: null });
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; emoji: string; label: string; animation: string }[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
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
        image: m.image || undefined,
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

      // (Notification sound handled in Header.tsx — global, works in all views)

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
            [conv.id as any]: [...existing, { role: isMine ? "user" : "assistant", content: msg.content, image: msg.image || undefined }],
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

  // (body scroll lock removed — Pesan panel now renders inline, not as a fixed overlay)

  const sendChat = async () => {
    const content = chatInput.trim();
    const image = pendingImage;
    if ((!content && !image) || chatSending || activeChatId === null || !user) return;
    const conv = conversations.find((c: any) => c.id === activeChatId);
    if (!conv) return;

    setChatInput("");
    setPendingImage(null);
    setShowEmoji(false);
    // Optimistic: show immediately.
    const history = chatMessages[activeChatId as any] || [];
    const next = [...history, { role: "user" as const, content: content || (image ? "📷 Gambar" : ""), image: image || undefined }];
    setChatMessages((prev) => ({ ...prev, [activeChatId as any]: next }));
    setChatSending(true);

    try {
      // Send via socket — server saves to DB AND broadcasts to receiver instantly.
      const ack = await sendMessage({
        senderId: user.id,
        receiverId: conv.partnerId,
        content: content || (image ? "📷 Gambar" : ""),
        image: image || null,
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
            content: content || (image ? "📷 Gambar" : ""),
            image: image || null,
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

  // Handle image file selection → convert to base64 data URL
  // Compress image to max 200KB PNG via canvas. Returns base64 data URL.
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const MAX_BYTES = 200 * 1024; // 200KB
          // Start with original dimensions (capped to max 1280px on longest side)
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          // Try decreasing quality (PNG is lossless, so we reduce dimensions to hit <200KB)
          const tryCompress = (w: number, h: number): string | null => {
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/png");
            return dataUrl;
          };
          let result = tryCompress(width, height);
          // If still > 200KB, progressively reduce dimensions
          let curW = width;
          let curH = height;
          while (result && dataUrlBytes(result) > MAX_BYTES && curW > 100) {
            curW = Math.round(curW * 0.8);
            curH = Math.round(curH * 0.8);
            result = tryCompress(curW, curH);
          }
          resolve(result || "");
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    try {
      const compressed = await compressImage(file);
      if (!compressed) {
        toast.error("Gagal memproses gambar");
        return;
      }
      setPendingImage(compressed);
    } catch {
      toast.error("Gagal memuat gambar");
    }
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  // Fetch stickers from /api/gifs — trending by default, search if query
  const fetchGifs = useCallback(async (q: string) => {
    setGifLoading(true);
    try {
      const url = q ? `/api/gifs?q=${encodeURIComponent(q)}` : "/api/gifs";
      const res = await fetch(url);
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setGifResults(data.stickers || []);
    } catch {
      setGifResults([]);
    } finally {
      setGifLoading(false);
    }
  }, []);

  // Load trending GIFs when GIF picker opens (only once per open)
  const gifFetchRef = useRef(false);
  useEffect(() => {
    if (showGifs && !gifFetchRef.current && gifResults.length === 0) {
      fetchGifs("");
      gifFetchRef.current = true;
    }
    if (!showGifs) {
      gifFetchRef.current = false;
    }
  }, [showGifs, fetchGifs, gifResults.length]);

  // Debounced GIF search
  useEffect(() => {
    if (!showGifs) return;
    const t = setTimeout(() => {
      fetchGifs(gifQuery);
    }, 400);
    return () => clearTimeout(t);
  }, [gifQuery, showGifs, fetchGifs]);

  // Send a sticker (animated emoji) as a big animated message
  const sendGif = async (sticker: { emoji: string; animation: string }) => {
    if (chatSending || activeChatId === null || !user) return;
    const conv = conversations.find((c: any) => c.id === activeChatId);
    if (!conv) return;
    setShowGifs(false);
    const history = chatMessages[activeChatId as any] || [];
    const next = [...history, { role: "user" as const, content: sticker.emoji, animation: sticker.animation }];
    setChatMessages((prev) => ({ ...prev, [activeChatId as any]: next }));
    setChatSending(true);
    try {
      const ack = await sendMessage({
        senderId: user.id,
        receiverId: conv.partnerId,
        content: sticker.emoji,
        listingTitle: conv.listingTitle,
      });
      if (!ack?.ok) {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: user.id,
            receiverId: conv.partnerId,
            content: sticker.emoji,
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

  // Long-press handlers for message delete
  const handleMsgLongPressStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const y = "touches" in e ? e.touches[0].clientY : e.clientY;
    longPressRef.current.timer = setTimeout(() => {
      setMsgMenu({ visible: true, x, y, msgIndex: index });
    }, 500);
    longPressRef.current.msgIndex = index;
  };
  const handleMsgLongPressEnd = () => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  };
  const deleteMessage = () => {
    if (msgMenu.msgIndex === null || activeChatId === null) {
      setMsgMenu({ visible: false, x: 0, y: 0, msgIndex: null });
      return;
    }
    const history = chatMessages[activeChatId as any] || [];
    const next = history.filter((_, i) => i !== msgMenu.msgIndex);
    setChatMessages((prev) => ({ ...prev, [activeChatId as any]: next }));
    setMsgMenu({ visible: false, x: 0, y: 0, msgIndex: null });
    toast.success("Pesan dihapus");
  };

  const panelTitle: { [K in Exclude<PanelType, null>]: string } = {
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
    <div className="animate-fade-up">
      {/* ===== HAMBURGER MENU BUTTON (top-left, opens drawer) ===== */}
      <div className={cn("flex items-center gap-2 px-4 pt-4 md:px-6", panel === "pesan" && "max-md:hidden")}>
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Menu"
          className="grid size-10 place-items-center rounded-lg border border-border bg-card hover:bg-accent"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="text-lg font-bold sm:text-xl">{tr("account")}</h1>
      </div>

      {/* ===== DRAWER (hamburger menu — slide-in from left) ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[90] flex">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          {/* drawer panel */}
          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-card shadow-2xl">
            {/* drawer header */}
            <div className="flex items-center justify-between border-b border-border p-4">
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
              <button onClick={() => setDrawerOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>
            {user?.role === "admin" && (
              <div className="px-4 pt-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  <ShieldCheck className="size-3" /> Admin
                </span>
              </div>
            )}
        {/* Menu items */}
        <nav className="p-2">
          {/* Section: Iklan & Transaksi */}
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60">Iklan & Transaksi</p>
          {[
            ...(user?.role === "admin" ? [{ icon: ShieldCheck, label: tr("adminPanel"), action: goToAdmin, navigate: true, key: "admin" }] : []),
            { icon: Tag, label: tr("profMyAds"), action: () => { setPanel("iklan-saya"); setDrawerOpen(false); }, navigate: false, key: "iklan-saya" },
            { icon: Heart, label: tr("myFavorites"), action: () => { setPanel("favorit-saya"); setDrawerOpen(false); }, navigate: false, key: "favorit-saya" },
            { icon: MessageSquare, label: tr("messages"), action: () => { setPanel("pesan"); setDrawerOpen(false); }, navigate: false, key: "pesan" },
            { icon: Package, label: tr("orders"), action: () => { setPanel("pesanan"); setDrawerOpen(false); }, navigate: false, key: "pesanan" },
            { icon: Wallet, label: tr("wallet"), action: () => { setPanel("saldo"); setDrawerOpen(false); }, navigate: false, key: "saldo" },
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
            { icon: Bell, label: tr("notifications"), action: () => { setPanel("notifikasi"); setDrawerOpen(false); }, key: "notifikasi" },
            { icon: Lock, label: tr("security"), action: () => { setPanel("keamanan"); setDrawerOpen(false); }, key: "keamanan" },
            { icon: Settings, label: tr("settings"), action: () => { setPanel("pengaturan"); setDrawerOpen(false); }, key: "pengaturan" },
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
            onClick={() => { setPanel("bantuan"); setDrawerOpen(false); }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition",
              panel === "bantuan" ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80 hover:bg-accent"
            )}
          >
            <HelpCircle className="size-4 shrink-0" />
            <span className="truncate">{tr("help")}</span>
          </button>
          <button
            onClick={() => { setDrawerOpen(false); if (user) { logout(); toast.success(tr("profLogoutSuccess")); goHome(); } else { goToLogin(); } }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/5"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="truncate">{user ? tr("logout") : tr("loginRegister")}</span>
          </button>
        </nav>
          </aside>
        </div>
      )}

      {/* ===== MAIN CONTENT (full width — no permanent sidebar) ===== */}
      <main className={cn("min-w-0 px-4 py-4 md:px-6 md:py-6", panel === "pesan" && "max-md:px-0 max-md:pt-2 max-md:pb-0")}>
        {/* breadcrumb — hidden on mobile when Pesan (cleaner chat view) */}
        <div className={cn("mb-4 flex items-center gap-1 text-xs text-muted-foreground", panel === "pesan" && "max-md:hidden")}>
          <button onClick={goHome} className="hover:text-primary">{tr("home2")}</button>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{tr("account")}</span>
        </div>

        {/* Header — hidden on mobile when Pesan (cleaner chat view) */}
        <div className={cn("mb-5 flex items-center gap-3", panel === "pesan" && "max-md:hidden")}>
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
            <User className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{user?.name || "Akun Gomesin"}</h1>
            <p className="text-sm text-muted-foreground">{user?.email || "Kelola akun & preferensi Anda"}</p>
          </div>
        </div>

        {/* Quick Stats — 4 compact cards (2x2 on mobile, 4-col on desktop). Hidden when in Pesan chat on mobile. */}
        <div className={cn(
          "mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4",
          panel === "pesan" && "max-md:hidden"
        )}>
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

        {/* (mobile dropdown menu removed — replaced by hamburger drawer above) */}

        {/* Content Area — full page for iklan-saya, favorit-saya, saldo, keamanan, pengaturan, bantuan, pesan; card for others */}
        <div className={cn(
          "min-h-[400px]",
          (panel === "pesan" || panel === "iklan-saya" || panel === "favorit-saya" || panel === "saldo" || panel === "keamanan" || panel === "pengaturan" || panel === "bantuan")
            ? "max-md:rounded-none max-md:border-0 max-md:p-0"
            : "rounded-xl border border-border bg-card"
        )}>
          {panel !== null ? (
            <div className="h-full">
              {/* Panel header — hidden on mobile for full-page panels */}
              <div className={cn(
                "flex items-center justify-between border-b border-border p-3",
                (panel === "pesan" || panel === "iklan-saya" || panel === "favorit-saya" || panel === "saldo" || panel === "keamanan" || panel === "pengaturan" || panel === "bantuan") && "max-md:hidden"
              )}>
                <h2 className="text-sm font-bold">{panelTitle[panel]}</h2>
                <button onClick={closePanel} className="grid size-7 place-items-center rounded-full hover:bg-accent">
                  <X className="size-4" />
                </button>
              </div>
              {/* Panel content — WhatsApp split view (desktop) / inline full-width (mobile Pesan) */}
              <div className={cn(
                "flex overflow-hidden",
                panel === "pesan"
                  ? "h-[calc(100vh-12rem)] max-md:h-[calc(100dvh-11rem)]"
                  : "h-[calc(100vh-12rem)]"
              )}>

                {/* ===== LEFT: Conversation list (full pane on mobile, sidebar on desktop) ===== */}
                {panel === "pesan" && (
                  <div className={cn(
                    "flex-col border-r border-border bg-card w-full",
                    activeChatId !== null
                      ? "hidden md:flex md:w-[320px] md:shrink-0"
                      : "flex md:w-[320px] md:shrink-0"
                  )}>
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
                          {/* Chat header — light gray, back arrow on mobile only */}
                          <div className="flex items-center gap-2 border-b border-border bg-[#f0f2f5] p-2.5">
                            <button
                              onClick={() => setActiveChatId(null)}
                              aria-label="Kembali"
                              className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-black/5 md:hidden"
                            >
                              <ChevronLeft className="size-5" />
                            </button>
                            <Avatar className="size-9 shrink-0 rounded-full md:size-10">
                              <AvatarFallback className="bg-[#075E54]/10 text-xs font-bold text-[#075E54]">
                                {conv.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <p className="truncate text-sm font-bold text-foreground">{conv.name}</p>
                                <BadgeCheck className="size-3.5 shrink-0 text-[#075E54]" />
                              </div>
                              <p className="text-[10px] text-muted-foreground">online</p>
                            </div>
                          </div>
                          {/* Messages — listing shown as a chat bubble (not a banner) */}
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
                            {/* Listing as a chat bubble (left-aligned, from partner) */}
                            {conv.listingTitle && (
                              <div className="flex justify-start">
                                <div className="max-w-[75%] overflow-hidden rounded-lg rounded-tl-sm bg-white shadow-sm">
                                  {conv.listingImage ? (
                                    <img src={conv.listingImage} alt={conv.listingTitle} className="max-h-44 w-full object-cover" />
                                  ) : (
                                    <div className="flex h-20 items-center justify-center bg-muted text-muted-foreground">
                                      <Tag className="size-6" />
                                    </div>
                                  )}
                                  <div className="p-2">
                                    <p className="truncate text-xs font-semibold text-foreground">{conv.listingTitle}</p>
                                    {conv.listingPrice != null && (
                                      <p className="text-xs font-bold text-[#075E54]">Rp {conv.listingPrice.toLocaleString("id-ID")}</p>
                                    )}
                                    <span className="mt-0.5 block text-right text-[9px] text-muted-foreground/60">
                                      {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Chat messages */}
                            {convo.map((c, i) => {
                              // Detect emoji-only messages (render big, WhatsApp-style)
                              const isEmojiOnly = !!c.content && c.content.trim().length > 0 && /^[\s\p{Extended_Pictographic}\u200d\ufe0f]+$/u.test(c.content.trim()) && c.content.trim().length <= 12;
                              return (
                              <div key={i} className={c.role === "user" ? "flex justify-end" : "flex justify-start"}>
                                <div
                                  onContextMenu={(e) => { e.preventDefault(); setMsgMenu({ visible: true, x: e.clientX, y: e.clientY, msgIndex: i }); }}
                                  onTouchStart={(e) => handleMsgLongPressStart(e, i)}
                                  onTouchEnd={handleMsgLongPressEnd}
                                  onTouchMove={handleMsgLongPressEnd}
                                  onMouseDown={(e) => handleMsgLongPressStart(e, i)}
                                  onMouseUp={handleMsgLongPressEnd}
                                  onMouseLeave={handleMsgLongPressEnd}
                                  className={cn(
                                    "rounded-lg shadow-sm select-none",
                                    isEmojiOnly
                                      ? cn(
                                          "px-2 py-1 bg-transparent shadow-none",
                                          c.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                                        )
                                      : cn(
                                          "max-w-[70%] px-3 py-2 text-sm",
                                          c.role === "user"
                                            ? "rounded-tr-sm bg-[#dcf8c6] text-foreground"
                                            : "rounded-tl-sm bg-white text-foreground"
                                        )
                                  )}
                                >
                                  {c.image && (
                                    <img
                                      src={c.image}
                                      alt="Gambar"
                                      onClick={() => setLightbox(c.image!)}
                                      className="mb-1 max-h-48 cursor-pointer rounded-md object-cover transition hover:opacity-90"
                                    />
                                  )}
                                  {c.content && (
                                    <p className={cn(
                                      "whitespace-pre-wrap break-words",
                                      isEmojiOnly ? "text-3xl leading-tight" : ""
                                    )}>
                                      {c.animation ? (
                                        <span className="sticker-anim inline-block" data-anim={c.animation}>{c.content}</span>
                                      ) : c.content}
                                    </p>
                                  )}
                                  <span className={cn(
                                    "block text-right text-[9px] text-muted-foreground/60",
                                    isEmojiOnly ? "mt-1" : "mt-0.5"
                                  )}>
                                    {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                    {c.role === "user" && <span className="ml-1 text-blue-500">✓✓</span>}
                                  </span>
                                </div>
                              </div>
                              );
                            })}
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
                          {/* Image preview (before sending) */}
                          {pendingImage && (
                            <div className="flex items-center gap-2 border-t border-border bg-white p-2">
                              <img src={pendingImage} alt="Preview" className="size-16 rounded-lg object-cover" />
                              <button
                                type="button"
                                onClick={() => setPendingImage(null)}
                                className="grid size-7 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
                              >
                                <XIcon className="size-4" />
                              </button>
                              <p className="text-xs text-muted-foreground">Gambar siap dikirim</p>
                            </div>
                          )}
                          {/* Emoji picker popover — full emoji library (large native emoji, search, categories) */}
                          {showEmoji && (
                            <div className="border-t border-border bg-white">
                              <EmojiPicker
                                onEmojiClick={(emoji) => { setChatInput((prev) => prev + emoji.emoji); }}
                                emojiStyle={EmojiStyle.NATIVE}
                                theme={Theme.LIGHT}
                                width="100%"
                                height={280}
                                previewConfig={{ showPreview: false }}
                                searchPlaceHolder="Cari emoji..."
                                lazyLoadEmojis
                                skinTonesDisabled
                              />
                            </div>
                          )}
                          {/* GIF / Sticker picker popover — animated emoji stickers */}
                          {showGifs && (
                            <div className="flex h-[280px] flex-col border-t border-border bg-white">
                              <div className="border-b border-border p-2">
                                <input
                                  type="text"
                                  value={gifQuery}
                                  onChange={(e) => setGifQuery(e.target.value)}
                                  placeholder="Cari sticker (senang, sedih, halo, cinta, terima)..."
                                  className="h-8 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm outline-none focus:border-primary"
                                />
                              </div>
                              <div className="flex-1 overflow-y-auto p-2">
                                {gifLoading && gifResults.length === 0 ? (
                                  <div className="grid place-items-center py-8 text-muted-foreground">
                                    <Loader2 className="size-5 animate-spin" />
                                    <p className="mt-2 text-xs">Memuat sticker...</p>
                                  </div>
                                ) : gifResults.length === 0 ? (
                                  <div className="grid place-items-center py-8 text-center text-muted-foreground">
                                    <Sticker className="size-8 text-muted-foreground/30" />
                                    <p className="mt-2 text-xs">Tidak ada sticker ditemukan</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                                    {gifResults.map((g) => (
                                      <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => sendGif({ emoji: g.emoji, animation: g.animation })}
                                        title={g.label}
                                        className="group grid aspect-square place-items-center rounded-lg bg-muted/30 text-3xl transition hover:bg-primary/10 hover:scale-110"
                                      >
                                        <span className="sticker-anim" data-anim={g.animation}>{g.emoji}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Hidden file input for image attachment (gallery) */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                          {/* Hidden file input for camera capture */}
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                          {/* Input — emoji + text field with paperclip inside + send button */}
                          <form
                            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                            className="flex items-center gap-1 bg-[#f0f2f5] p-2"
                          >
                            <button
                              type="button"
                              onClick={() => setShowEmoji((v) => !v)}
                              aria-label="Emoji"
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-full hover:bg-black/5",
                                showEmoji ? "text-[#075E54]" : "text-muted-foreground"
                              )}
                            >
                              <Smile className="size-5" />
                            </button>
                            {/* Text field with paperclip + camera icons inside (right side) */}
                            <div className="relative flex-1">
                              <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Tulis pesan..."
                                className="h-10 w-full rounded-lg border border-transparent bg-white pr-20 pl-4 text-sm outline-none shadow-sm"
                                disabled={chatSending}
                              />
                              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  aria-label="Lampirkan gambar"
                                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-black/5"
                                >
                                  <Paperclip className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cameraInputRef.current?.click()}
                                  aria-label="Buka kamera"
                                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-black/5"
                                >
                                  <Camera className="size-4" />
                                </button>
                              </div>
                            </div>
                            <Button
                              type="submit"
                              size="icon"
                              className="size-10 shrink-0 rounded-full bg-[#075E54] hover:bg-[#054c42]"
                              disabled={chatSending || (!chatInput.trim() && !pendingImage)}
                            >
                              {chatSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 text-white" />}
                            </Button>
                          </form>
                          {/* Message context menu (long-press / right-click) — delete */}
                          {msgMenu.visible && (
                            <>
                              <div className="fixed inset-0 z-[70]" onClick={() => setMsgMenu({ visible: false, x: 0, y: 0, msgIndex: null })} />
                              <div
                                className="fixed z-[71] min-w-[160px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl animate-fade-up"
                                style={{ left: Math.min(msgMenu.x, window.innerWidth - 180), top: Math.min(msgMenu.y, window.innerHeight - 100) }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={deleteMessage}
                                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-accent"
                                >
                                  <Trash2 className="size-4" /> Hapus Pesan
                                </button>
                              </div>
                            </>
                          )}
                          {/* Image lightbox — click image to view full size */}
                          {lightbox && (
                            <div
                              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
                              onClick={() => setLightbox(null)}
                            >
                              <button
                                aria-label="Tutup"
                                className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                              >
                                <XIcon className="size-6" />
                              </button>
                              <img
                                src={lightbox}
                                alt="Gambar besar"
                                className="max-h-[90vh] max-w-full rounded-lg object-contain"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
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
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Iklan Saya ({myAdsCount})</h3>
                  <Button size="sm" className="gap-1.5" onClick={goToPost}>
                    <Plus className="size-4" /> Pasang Iklan
                  </Button>
                </div>
                {myAdsCount > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {myListings.slice(0, 10).map((l: any) => {
                      let imgs: string[] = [];
                      try { imgs = Array.isArray(l.images) ? l.images : JSON.parse(l.images || "[]"); } catch {}
                      return (
                        <div key={l.id} className="overflow-hidden rounded-lg border border-border bg-card">
                          <div className="relative aspect-square w-full overflow-hidden bg-muted">
                            {imgs[0] ? (
                              <img src={imgs[0]} alt={l.title} className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center text-muted-foreground"><Tag className="size-6" /></div>
                            )}
                            <span className={cn(
                              "absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow",
                              l.status === "active" ? "bg-emerald-500 text-white" :
                              l.status === "pending" ? "bg-amber-500 text-white" :
                              "bg-muted text-muted-foreground"
                            )}>{l.status}</span>
                          </div>
                          <div className="p-2">
                            <p className="line-clamp-2 text-xs font-semibold leading-tight">{l.title}</p>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.city || "-"} • {l.condition}</p>
                            <p className="mt-0.5 text-xs font-bold text-primary">Rp {(l.price ?? 0).toLocaleString("id-ID")}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Tag className="mx-auto size-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">Belum ada iklan dipasang.</p>
                  </div>
                )}
                {myAdsCount > 10 && (
                  <Button variant="outline" size="sm" className="w-full" onClick={goToDashboard}>Lihat semua {myAdsCount} iklan</Button>
                )}
              </div>
            )}

            {/* ===== FAVORIT SAYA PANEL ===== */}
            {panel === "favorit-saya" && (
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Favorit Saya ({favCount})</h3>
                  <Button size="sm" variant="outline" onClick={goHome}>Jelajahi Iklan</Button>
                </div>
                {favCount > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {favListings.map((l: any) => {
                      let imgs: string[] = [];
                      try { imgs = Array.isArray(l.images) ? l.images : JSON.parse(l.images || "[]"); } catch {}
                      return (
                        <div key={l.id} className="overflow-hidden rounded-lg border border-border bg-card">
                          <div className="relative aspect-square w-full overflow-hidden bg-muted">
                            {imgs[0] ? (
                              <img src={imgs[0]} alt={l.title} className="size-full object-cover" />
                            ) : (
                              <div className="grid size-full place-items-center text-muted-foreground"><Tag className="size-6" /></div>
                            )}
                            <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-white/90 shadow">
                              <Heart className="size-3.5 fill-rose-500 text-rose-500" />
                            </span>
                          </div>
                          <div className="p-2">
                            <p className="line-clamp-2 text-xs font-semibold leading-tight">{l.title}</p>
                            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{l.city || "-"} • {l.condition}</p>
                            <p className="mt-0.5 text-xs font-bold text-primary">Rp {(l.price ?? 0).toLocaleString("id-ID")}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Heart className="mx-auto size-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">Belum ada favorit.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Tekan ikon hati pada iklan untuk menyimpan.</p>
                  </div>
                )}
              </div>
                )}
                </div>
              </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* User Profile Card — CRUD style */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border bg-muted/30 p-4">
                  <Avatar className="size-14 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-bold">{user?.name || "Pengguna"}</p>
                      {user?.role === "admin" && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                          <ShieldCheck className="size-2.5" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{user?.email || "-"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPanel("pengaturan")} className="shrink-0 gap-1.5">
                    <SlidersHorizontal className="size-3.5" /> Edit
                  </Button>
                </div>
                {/* Info table */}
                <div className="divide-y divide-border text-sm">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Nama Lengkap</span>
                    <span className="font-medium">{user?.name || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Email</span>
                    <span className="max-w-[60%] truncate text-right font-medium">{user?.email || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">No. HP</span>
                    <span className="font-medium">{user?.phone || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Kota</span>
                    <span className="font-medium">{user?.city || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Bergabung</span>
                    <span className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}</span>
                  </div>
                </div>
              </div>

              {/* Stats Summary — table style */}
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                  <p className="text-sm font-bold">Ringkasan Aktivitas</p>
                </div>
                <div className="divide-y divide-border">
                  <button onClick={() => setPanel("iklan-saya")} className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-accent">
                    <span className="flex items-center gap-2.5 text-muted-foreground"><Tag className="size-4" /> Iklan Dipasang</span>
                    <span className="font-bold">{myAdsCount}</span>
                  </button>
                  <button onClick={() => setPanel("favorit-saya")} className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-accent">
                    <span className="flex items-center gap-2.5 text-muted-foreground"><Heart className="size-4" /> Favorit</span>
                    <span className="font-bold">{favCount}</span>
                  </button>
                  <button onClick={() => setPanel("pesan")} className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-accent">
                    <span className="flex items-center gap-2.5 text-muted-foreground"><MessageSquare className="size-4" /> Pesan Belum Dibaca</span>
                    <span className="font-bold">{unreadCount}</span>
                  </button>
                  <button onClick={() => setPanel("pesanan")} className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-accent">
                    <span className="flex items-center gap-2.5 text-muted-foreground"><Package className="size-4" /> Transaksi</span>
                    <span className="font-bold">{orders.length}</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Button variant="outline" className="flex-col h-auto py-3 gap-1.5" onClick={() => setPanel("iklan-saya")}>
                  <Tag className="size-5" />
                  <span className="text-[11px]">{tr("profMyAds")}</span>
                </Button>
                <Button variant="outline" className="flex-col h-auto py-3 gap-1.5" onClick={() => setPanel("pesan")}>
                  <MessageSquare className="size-5" />
                  <span className="text-[11px]">{tr("messages")}</span>
                </Button>
                <Button variant="outline" className="flex-col h-auto py-3 gap-1.5" onClick={() => setPanel("saldo")}>
                  <Wallet className="size-5" />
                  <span className="text-[11px]">{tr("wallet")}</span>
                </Button>
                <Button variant="outline" className="flex-col h-auto py-3 gap-1.5" onClick={() => setPanel("pengaturan")}>
                  <Settings className="size-5" />
                  <span className="text-[11px]">{tr("settings")}</span>
                </Button>
              </div>

              {/* Logout */}
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive hover:bg-destructive/5"
                onClick={() => { if (user) { logout(); toast.success(tr("profLogoutSuccess")); goHome(); } else { goToLogin(); } }}
              >
                <LogOut className="size-4" />
                {user ? tr("logout") : tr("loginRegister")}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
