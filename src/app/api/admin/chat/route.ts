import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/chat
// Returns ALL conversations across ALL users — admin oversight view.
// Each conversation = composite key (userA, userB, listingTitle).
// Sorted by most recent activity (newest message first).
//
// Admin can use this to:
// - Monitor user-to-seller conversations (transparency, dispute resolution)
// - See who is active chatting
// - Detect spam / abuse patterns
// - Read full conversation history for moderation
//
// NOTE: This is ADMIN-ONLY endpoint. Frontend should verify user.role === "admin"
// before calling. For defense in depth, we could add session check here too.
export async function GET(req: NextRequest) {
  try {
    // Fetch ALL messages with sender/receiver info.
    const messages = await db.message.findMany({
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        receiver: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" }, // newest first
    });

    // Group by conversation key: sortedPairId::listingTitle
    // (sortedPairId ensures A↔B and B↔A map to same conversation)
    const convMap = new Map<string, any>();
    const listingIds = new Set<string>();

    for (const m of messages) {
      // Sort pair IDs so A→B and B→A map to same conversation.
      const [a, b] = [m.senderId, m.receiverId].sort();
      const pairKey = `${a}__${b}`;
      const key = `${pairKey}::${m.listingTitle || ""}`;

      if (m.listingId) listingIds.add(m.listingId);

      // First message in this conversation → initialize.
      // `lastMessage` & `lastTime` track most recent (since messages are desc-sorted).
      if (!convMap.has(key)) {
        convMap.set(key, {
          id: key,
          // Identify both participants (don't assume direction).
          userA: { id: m.sender.id, name: m.sender.name, email: m.sender.email, role: m.sender.role },
          userB: { id: m.receiver.id, name: m.receiver.name, email: m.receiver.email, role: m.receiver.role },
          lastMessage: m.content,
          lastMessageAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
          lastSenderId: m.senderId,
          totalMessages: 0,
          unreadCount: 0,
          listingId: m.listingId || null,
          listingTitle: m.listingTitle || null,
          messages: [],
        });
      }

      const conv = convMap.get(key)!;
      conv.totalMessages += 1;
      // Unread = message where receiver hasn't read it yet.
      if (!m.read) conv.unreadCount += 1;

      conv.messages.push({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        receiverId: m.receiverId,
        senderName: m.sender.name,
        receiverName: m.receiver.name,
        read: m.read,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
      });
    }

    // Fetch listing info for previews.
    const listings = listingIds.size > 0
      ? await db.listing.findMany({
          where: { id: { in: Array.from(listingIds) } },
          select: { id: true, price: true, images: true, status: true },
        })
      : [];
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    // Attach listing image + price to conversations.
    const conversations = Array.from(convMap.values()).map((c: any) => {
      let listingImage: string | null = null;
      let listingPrice: number | null = null;
      let listingStatus: string | null = null;
      if (c.listingId && listingMap.has(c.listingId)) {
        const l = listingMap.get(c.listingId);
        if (l) {
          const lp = l.price;
          listingPrice = typeof lp === "bigint" ? Number(lp) : lp ?? null;
          listingStatus = l.status ?? null;
          try {
            const imgs = JSON.parse(l.images || "[]");
            if (Array.isArray(imgs) && imgs.length > 0) listingImage = imgs[0];
          } catch {}
        }
      }
      // For privacy in list view: hide listingId (not needed in admin UI).
      delete c.listingId;
      return { ...c, listingImage, listingPrice, listingStatus };
    });

    // Sort by lastMessageAt desc (most recent activity first).
    conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    // Summary stats for admin dashboard.
    const summary = {
      totalConversations: conversations.length,
      totalMessages: messages.length,
      totalUnread: conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0),
      activeUsers: new Set(messages.flatMap((m) => [m.senderId, m.receiverId])).size,
    };

    return NextResponse.json({ conversations, summary });
  } catch (e: any) {
    console.error("GET /api/admin/chat error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
