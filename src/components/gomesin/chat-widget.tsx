"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, BadgeCheck, MessageCircle, Loader2, MapPin, Tag } from "lucide-react";
import type { Listing, Seller } from "@/lib/types";
import { formatRupiahFull } from "@/lib/types";
import { toast } from "sonner";
import { useLang, translations as i18nTranslations, formatT } from "@/lib/i18n";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { useChatSocket, type ChatMessage } from "@/lib/use-chat-socket";

type Msg = { role: "user" | "assistant"; content: string; time?: string };

export function ChatWidget({
  listing,
  open,
  onOpenChange,
}: {
  listing: Listing;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  const quick = [tr("quick1"), tr("quick2"), tr("quick3"), tr("quick4")];

  const seller: Seller = listing.seller;
  const ownerId = (listing as any).user?.id || null;
  const ownerName = (listing as any).user?.name || seller.name;
  const currentUser = useStore((s) => s.user);
  const goToLogin = useStore((s) => s.goToLogin);

  const queryClient = useQueryClient();
  const { sendMessage, markRead, subscribe } = useChatSocket();

  // Fetch conversation history ONCE on open — NO polling (socket handles realtime).
  const { data: historyData } = useQuery({
    queryKey: ["chat-history", currentUser?.id, ownerId, listing.id],
    queryFn: async () => {
      if (!currentUser || !ownerId) return { conversations: [] };
      const res = await fetch(`/api/messages?userId=${currentUser.id}`);
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    enabled: !!currentUser && !!ownerId && open,
    staleTime: Infinity, // Never auto-refetch — socket handles realtime
  });

  // Initial load: populate messages from DB history (oldest-first, newest-last).
  useEffect(() => {
    if (open && historyData?.conversations && !loadedHistory) {
      const conv = historyData.conversations.find(
        (c: any) => c.partnerId === ownerId && c.listingTitle === listing.title
      );
      if (conv?.messages?.length) {
        const dbMsgs: Msg[] = [...conv.messages].reverse().map((m: any) => ({
          role: m.sent ? "user" : "assistant",
          content: m.content,
          time: new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        }));
        setMessages(dbMsgs);
        // Mark as read since user just opened the chat.
        if (currentUser) markRead(currentUser.id, ownerId!);
      } else {
        setMessages([]);
      }
      setLoadedHistory(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, historyData, ownerId, listing.title, loadedHistory]);

  // Realtime: subscribe to incoming messages via socket.
  useEffect(() => {
    if (!open || !currentUser || !ownerId) return;
    const off = subscribe<ChatMessage>("message:new", (msg) => {
      // Only handle messages relevant to THIS conversation:
      //   - incoming (sent=false) from the listing owner to me, OR
      //   - echo-back of my own message (sent=true) to this owner (for cross-tab sync).
      const isRelevant =
        (msg.sent === false && msg.senderId === ownerId && msg.receiverId === currentUser.id) ||
        (msg.sent === true && msg.senderId === currentUser.id && msg.receiverId === ownerId);
      if (!isRelevant) return;
      const time = new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => {
        // Dedupe by content+time window to avoid double-add from optimistic + echo.
        const last = prev[prev.length - 1];
        if (
          last &&
          last.role === (msg.sent ? "user" : "assistant") &&
          last.content === msg.content &&
          last.time === time
        ) {
          return prev;
        }
        return [...prev, { role: msg.sent ? "user" : "assistant", content: msg.content, time }];
      });
      // Auto-mark incoming as read since the chat is open.
      if (!msg.sent) {
        markRead(currentUser.id, ownerId);
        // Refresh sidebar unread counts.
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      }
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUser, ownerId, subscribe, markRead, queryClient]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setLoadedHistory(false);
      setMessages([]);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;

    if (!currentUser) {
      toast.info(tr("chatLoginRequired"), {
        action: { label: tr("chatLoginAction"), onClick: goToLogin },
      });
      return;
    }

    if (!ownerId) {
      toast.info(tr("chatSellerNotRegistered"));
      return;
    }

    if (currentUser.id === ownerId) {
      toast.info(tr("chatOwnListing"));
      return;
    }

    setInput("");
    const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    // Optimistic: show immediately.
    setMessages(prev => [...prev, { role: "user", content, time: now }]);
    setSending(true);

    try {
      // Send via socket — server saves to DB AND broadcasts to receiver instantly.
      const ack = await sendMessage({
        senderId: currentUser.id,
        receiverId: ownerId,
        content,
        listingId: listing.id,
        listingTitle: listing.title,
      });
      if (!ack?.ok) {
        // Fallback to REST if socket failed.
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: currentUser.id,
            receiverId: ownerId,
            content,
            listingId: listing.id,
            listingTitle: listing.title,
          }),
        });
      }
      // Refresh sidebar conversation list (last message preview).
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    } catch {
      toast.error(tr("chatSendFailed"));
    } finally {
      setSending(false);
    }
  };

  const initials = ownerName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const img = listing.images?.[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md" showCloseButton={false}>
        {/* ===== HEADER: Seller info ===== */}
        <DialogHeader className="border-b border-border bg-primary p-3 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-sm font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-1.5 text-sm text-primary-foreground">
                <span className="truncate">{ownerName}</span>
                {seller.verified && <BadgeCheck className="size-3.5 shrink-0" />}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1 text-[11px] text-primary-foreground/80">
                <span className="size-1.5 rounded-full bg-green-400" /> {tr("chatOnline")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ===== LISTING CARD: 120px square image + title + price ===== */}
        <div className="border-b border-border bg-card p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative size-[120px] shrink-0 overflow-hidden rounded-lg bg-muted">
              {img ? (
                <img src={img} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Tag className="size-6" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-foreground">{listing.title}</p>
              <p className="mt-0.5 text-sm font-bold text-primary">{formatRupiahFull(listing.price)}</p>
              <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="size-2.5" /> {listing.city}
              </p>
            </div>
          </div>
        </div>

        {/* ===== MESSAGES: Chat history (realtime) ===== */}
        <div
          ref={scrollRef}
          className="gomesin-scroll max-h-[40vh] min-h-[180px] space-y-2 overflow-y-auto p-3"
          style={{
            backgroundColor: "#e5ddd5",
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {messages.length === 0 && loadedHistory && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="size-8 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">Belum ada pesan. Mulai chat dengan penjual.</p>
            </div>
          )}
          {/* Date separator */}
          {messages.length > 0 && (
            <div className="flex justify-center py-1">
              <span className="rounded-full bg-white/80 px-3 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                Hari ini
              </span>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div className={cn(
                "flex flex-col gap-0.5",
                m.role === "user" ? "items-end" : "items-start"
              )}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-white text-foreground"
                  )}
                >
                  {m.content}
                </div>
                {m.time && (
                  <span className="px-1 text-[9px] text-muted-foreground">{m.time}</span>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
                <span className="size-2 animate-bounce rounded-full bg-white/70 [animation-delay:-0.3s] inline-block" />
                <span className="size-2 animate-bounce rounded-full bg-white/70 [animation-delay:-0.15s] inline-block ml-0.5" />
                <span className="size-2 animate-bounce rounded-full bg-white/70 inline-block ml-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* ===== QUICK REPLIES ===== */}
        {messages.length === 0 && loadedHistory && (
          <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ===== INPUT ===== */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-border bg-card p-3"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={tr("chatPlaceholder")}
            className="h-10 rounded-full"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="size-10 shrink-0 rounded-full bg-primary"
            disabled={sending || !input.trim()}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChatButton({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const mounted = useMounted();
  const tr = mounted ? t : (key: any) => (i18nTranslations.id as any)[key] ?? key;
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="flex-1 gap-2 rounded-full bg-primary font-semibold"
        size="lg"
      >
        <MessageCircle className="size-5" /> {tr("chatSeller")}
      </Button>
      <ChatWidget listing={listing} open={open} onOpenChange={setOpen} />
    </>
  );
}
