import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/messages?userId=<id>
// Returns all conversations for the user, grouped by partner + listingTitle.
// Each conversation includes ALL messages (newest-first from DB).
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "User ID wajib" }, { status: 400 });
    }

    const messages = await db.message.findMany({
      where: {
        OR: [{ receiverId: userId }, { senderId: userId }],
      },
      include: { sender: true, receiver: true },
      orderBy: { createdAt: "desc" }, // newest first
    });

    // Group by composite key: partnerId::listingTitle
    const convMap = new Map<string, any>();
    const listingIds = new Set<string>();

    for (const m of messages) {
      const isSender = m.senderId === userId;
      const partnerId = isSender ? m.receiverId : m.senderId;
      const partnerName = isSender ? m.receiver.name : m.sender.name;
      const key = `${partnerId}::${m.listingTitle || ""}`;

      if (m.listingId) listingIds.add(m.listingId);

      if (!convMap.has(key)) {
        convMap.set(key, {
          id: key,
          partnerId,
          name: partnerName,
          lastMessage: m.content,
          lastTime: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
          unread: 0,
          listingId: m.listingId || null,
          listingTitle: m.listingTitle || null,
          messages: [],
        });
      }

      const conv = convMap.get(key)!;
      conv.messages.push({
        id: m.id,
        content: m.content,
        sent: isSender,
        read: m.read,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
      });

      if (!isSender && !m.read) {
        conv.unread += 1;
      }
    }

    // Fetch listing images/prices in one query
    const listings = listingIds.size > 0
      ? await db.listing.findMany({ where: { id: { in: Array.from(listingIds) } }, select: { id: true, price: true, images: true } })
      : [];
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    // Attach listingImage + listingPrice to conversations
    const conversations = Array.from(convMap.values()).map((c: any) => {
      let listingImage: string | null = null;
      let listingPrice: number | null = null;
      if (c.listingId && listingMap.has(c.listingId)) {
        const l = listingMap.get(c.listingId);
        const lp = l?.price;
        listingPrice = typeof lp === "bigint" ? Number(lp) : lp ?? null;
        try {
          const imgs = JSON.parse(l.images || "[]");
          if (Array.isArray(imgs) && imgs.length > 0) listingImage = imgs[0];
        } catch {}
      }
      delete c.listingId; // don't leak
      return { ...c, listingImage, listingPrice };
    });

    // Sort conversations by lastTime desc (most recent first)
    conversations.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

    return NextResponse.json({ conversations });
  } catch (e: any) {
    console.error("GET /api/messages error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/messages — save a new message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderId, receiverId, content, listingId, listingTitle } = body;

    if (!senderId || !receiverId || !content?.trim()) {
      return NextResponse.json({ error: "senderId, receiverId, content wajib diisi" }, { status: 400 });
    }
    if (senderId === receiverId) {
      return NextResponse.json({ error: "Tidak bisa kirim pesan ke diri sendiri" }, { status: 400 });
    }

    const msg = await db.message.create({
      data: {
        senderId,
        receiverId,
        content: content.trim(),
        listingId: listingId || null,
        listingTitle: listingTitle || null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: msg.id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        listingId: msg.listingId,
        listingTitle: msg.listingTitle,
        createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : new Date(msg.createdAt).toISOString(),
        read: msg.read,
      },
    }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/messages error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/messages — mark messages from partnerId to userId as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, partnerId } = body;

    if (!userId || !partnerId) {
      return NextResponse.json({ error: "userId dan partnerId wajib diisi" }, { status: 400 });
    }

    const result = await db.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: userId,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (e: any) {
    console.error("PATCH /api/messages error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/messages — clear chat (delete all messages between 2 users for a listing)
// Body: { userId, partnerId, listingTitle } → delete all messages between them for that listing
// Body: { messageId } → delete single message
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    // Delete single message
    if (body.messageId) {
      await db.message.delete({ where: { id: body.messageId } });
      return NextResponse.json({ ok: true, deleted: 1 });
    }

    // Clear all messages between userId and partnerId for a listing
    const { userId, partnerId, listingTitle } = body;
    if (!userId || !partnerId) {
      return NextResponse.json({ error: "userId dan partnerId wajib" }, { status: 400 });
    }

    const result = await db.message.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
        ...(listingTitle ? { listingTitle } : {}),
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (e: any) {
    console.error("DELETE /api/messages error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
