"use client";

/**
 * useChatSocket — real-time chat manager.
 *
 * TWO TRANSPORTS:
 *   1. Supabase Realtime (production / when NEXT_PUBLIC_SUPABASE_URL is set)
 *      → listens to postgres_changes on the Message table.
 *      → sending via REST POST /api/messages.
 *   2. Socket.IO (local dev — when no Supabase URL)
 *      → connects to chat-service mini-service on port 3003.
 *
 * The hook interface is IDENTICAL regardless of transport.
 * Components don't need to know which transport is active.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { createClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types — mirror the chat-service protocol
// ---------------------------------------------------------------------------
export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  image?: string | null;
  listingId: string | null;
  listingTitle: string | null;
  createdAt: string; // ISO
  sent: boolean; // true = I sent it; false = incoming
  read?: boolean;
};

export type TypingUpdate = {
  typerId: string;
  isTyping: boolean;
};

export type ReadUpdate = {
  partnerId: string;
};

type MessageSendPayload = {
  senderId: string;
  receiverId: string;
  content: string;
  image?: string | null;
  listingId?: string | null;
  listingTitle?: string | null;
};

// ---------------------------------------------------------------------------
// Detect transport mode
// ---------------------------------------------------------------------------
const SUPABASE_URL = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_SUPABASE_URL || "") : "";
const SUPABASE_KEY = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "") : "";
const USE_SUPABASE_RT = !!(SUPABASE_URL && SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Listener registry (shared across transports)
// ---------------------------------------------------------------------------
const listeners: Record<string, Set<(payload: any) => void>> = {};

function dispatch(event: string, payload: any) {
  const set = listeners[event];
  if (set) set.forEach((cb) => cb(payload));
}

// ---------------------------------------------------------------------------
// Supabase Realtime transport
// ---------------------------------------------------------------------------
let supabaseClient: ReturnType<typeof createClient> | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let realtimeJoined = false;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabaseClient;
}

function subscribeSupabaseRealtime(userId: string) {
  if (realtimeJoined) return;
  const client = getSupabaseClient();

  realtimeChannel = client
    .channel("chat-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Message",
      },
      (payload) => {
        const newMsg = payload.new as any;
        if (!newMsg) return;
        // Only dispatch if the message involves our user
        if (newMsg.senderId !== userId && newMsg.receiverId !== userId) return;

        const isMine = newMsg.senderId === userId;
        const chatMsg: ChatMessage = {
          id: newMsg.id,
          senderId: newMsg.senderId,
          receiverId: newMsg.receiverId,
          content: newMsg.content || "",
          image: newMsg.image || null,
          listingId: newMsg.listingId || null,
          listingTitle: newMsg.listingTitle || null,
          createdAt: typeof newMsg.createdAt === "string" ? newMsg.createdAt : new Date(newMsg.createdAt).toISOString(),
          sent: isMine,
          read: newMsg.read || false,
        };
        dispatch("message:new", chatMsg);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "Message",
        filter: `receiverId=eq.${userId}`,
      },
      (payload) => {
        const updated = payload.new as any;
        if (updated?.read === true) {
          dispatch("message:read-update", { partnerId: updated.senderId });
        }
      }
    )
    .subscribe();

  realtimeJoined = true;
}

function unsubscribeSupabaseRealtime() {
  if (realtimeChannel) {
    getSupabaseClient().removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  realtimeJoined = false;
}

// ---------------------------------------------------------------------------
// Socket.IO transport (local dev only)
// ---------------------------------------------------------------------------
let socketRef: any = null;
let socketJoinedUserId: string | null = null;

async function getSocketIO(): Promise<any> {
  if (socketRef) return socketRef;

  const { io } = await import("socket.io-client");
  const loc = typeof window !== "undefined" ? window.location : null;
  const isDevDirect =
    loc &&
    (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") &&
    loc.port === "3000";
  const socketUrl = isDevDirect ? "http://localhost:3003" : "/";
  const socketOpts: any = {
    transports: ["websocket", "polling"],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  };
  if (!isDevDirect) {
    socketOpts.query = { XTransformPort: "3003" };
  }

  const socket = io(socketUrl, socketOpts);

  // Wire internal dispatchers
  socket.on("message:new", (p: ChatMessage) => dispatch("message:new", p));
  socket.on("message:read-update", (p: ReadUpdate) => dispatch("message:read-update", p));
  socket.on("typing:update", (p: TypingUpdate) => dispatch("typing:update", p));

  socket.on("connect", () => {
    if (socketJoinedUserId) {
      socket.emit("user:join", { userId: socketJoinedUserId });
    }
  });

  socketRef = socket;
  return socket;
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------
export function useChatSocket() {
  const user = useStore((s) => s.user);
  const [connected, setConnected] = useState(false);
  const subscriptionsRef = useRef<Array<() => void>>([]);
  const hasSubscribedRef = useRef(false);

  // ------- Supabase Realtime transport -------
  useEffect(() => {
    if (!USE_SUPABASE_RT || !user?.id) return;
    subscribeSupabaseRealtime(user.id);
    if (!hasSubscribedRef.current) {
      hasSubscribedRef.current = true;
      // Defer setState out of the synchronous effect body
      const id = setTimeout(() => setConnected(true), 0);
      return () => clearTimeout(id);
    }
  }, [user?.id]);
  // ------- Socket.IO transport (local dev) -------
  useEffect(() => {
    if (USE_SUPABASE_RT) return; // Skip if Supabase is active

    let socket: any = null;
    let mounted = true;

    (async () => {
      socket = await getSocketIO();
      if (!mounted) return;

      const onConn = () => Promise.resolve().then(() => setConnected(true));
      const onDisc = () => Promise.resolve().then(() => setConnected(false));
      socket.on("connect", onConn);
      socket.on("disconnect", onDisc);
      if (socket.connected) Promise.resolve().then(() => setConnected(true));

      if (user?.id) {
        socketJoinedUserId = user.id;
        socket.emit("user:join", { userId: user.id });
      }
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
      }
    };
  }, [USE_SUPABASE_RT, user?.id]);

  // Cleanup all subscriptions on unmount.
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((off) => off());
      subscriptionsRef.current = [];
    };
  }, []);

  // -----------------------------------------------------------------------
  // sendMessage — ALWAYS uses REST (works for both transports)
  // -----------------------------------------------------------------------
  const sendMessage = useCallback(
    async (payload: MessageSendPayload): Promise<{ ok: boolean; message?: ChatMessage; error?: string }> => {
      // Supabase Realtime: always use REST (the realtime channel handles delivery)
      if (USE_SUPABASE_RT) {
        try {
          const res = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            return { ok: true, message: data.message };
          }
          return { ok: false, error: data.error || "REST POST failed" };
        } catch (e: any) {
          return { ok: false, error: e.message };
        }
      }

      // Socket.IO transport: try socket first, fallback to REST
      const socket = socketRef;
      if (socket?.connected) {
        return new Promise((resolve) => {
          socket.emit("message:send", payload, (ack: any) =>
            resolve(ack || { ok: false, error: "No ack" })
          );
        });
      }

      // Fallback to REST
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          return { ok: true, message: data.message };
        }
        return { ok: false, error: data.error || "REST POST failed" };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },
    []
  );

  // -----------------------------------------------------------------------
  // markRead — REST PATCH (works for both transports)
  // -----------------------------------------------------------------------
  const markRead = useCallback(
    async (userId: string, partnerId: string) => {
      if (USE_SUPABASE_RT) {
        // REST-based read — Supabase Realtime will broadcast the UPDATE
        fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, partnerId }),
        }).catch(() => {});
        return;
      }
      // Socket.IO
      const socket = socketRef;
      if (socket?.connected) {
        socket.emit("message:read", { userId, partnerId });
      }
    },
    []
  );

  // -----------------------------------------------------------------------
  // typing — Socket.IO only (not critical for production)
  // -----------------------------------------------------------------------
  const startTyping = useCallback(
    (senderId: string, receiverId: string) => {
      if (USE_SUPABASE_RT) return; // Not supported via Supabase Realtime
      const socket = socketRef;
      if (socket?.connected) {
        socket.emit("typing:start", { senderId, receiverId });
      }
    },
    []
  );

  const stopTyping = useCallback(
    (senderId: string, receiverId: string) => {
      if (USE_SUPABASE_RT) return;
      const socket = socketRef;
      if (socket?.connected) {
        socket.emit("typing:stop", { senderId, receiverId });
      }
    },
    []
  );

  // -----------------------------------------------------------------------
  // subscribe helper — auto-cleans on unmount
  // -----------------------------------------------------------------------
  const subscribe = useCallback(
    <T = any>(event: "message:new" | "message:read-update" | "typing:update", cb: (payload: T) => void) => {
      if (!listeners[event]) listeners[event] = new Set();
      listeners[event].add(cb as (p: any) => void);
      const off = () => {
        listeners[event]?.delete(cb as (p: any) => void);
      };
      subscriptionsRef.current.push(off);
      return off;
    },
    []
  );

  return {
    socket: USE_SUPABASE_RT ? null : socketRef,
    connected,
    sendMessage,
    markRead,
    startTyping,
    stopTyping,
    subscribe,
  };
}
