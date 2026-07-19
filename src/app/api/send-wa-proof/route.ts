import { NextRequest, NextResponse } from "next/server";

// POST /api/send-wa-proof
// Kirim bukti pembayaran (gambar) LANGSUNG ke WhatsApp admin via WhatsApp
// Cloud API (resmi Meta). Gambar MUNCUL sebagai gambar di chat admin, bukan link.
//
// BUTUH env vars (dapatkan di https://developers.facebook.com/apps):
//   WHATSAPP_TOKEN        — access token
//   WHATSAPP_PHONE_ID     — phone number ID dari WhatsApp Business
//   WHATSAPP_ADMIN_NUMBER — nomor admin penerima (format 62..., tanpa +)
//
// Jika env vars belum diset, return error supaya frontend tahu fallback ke
// wa.me link.
export async function POST(req: NextRequest) {
  try {
    const { imageUrl, caption } = (await req.json()) as {
      imageUrl: string;
      caption?: string;
    };

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl wajib" }, { status: 400 });
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER || "6285888082208";

    if (!token || !phoneId) {
      return NextResponse.json(
        { error: "WhatsApp Cloud API belum dikonfigurasi. Set WHATSAPP_TOKEN & WHATSAPP_PHONE_ID." },
        { status: 503 }
      );
    }

    // Kirim gambar via WhatsApp Cloud API (type: image, link: imageUrl).
    // imageUrl harus URL publik yang bisa diakses server Meta.
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: adminNumber,
          type: "image",
          image: {
            link: imageUrl,
            caption: caption || "Bukti Pembayaran Iklan Gomesin",
          },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "WhatsApp API error" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      method: "cloud_api",
      messageId: data?.messages?.[0]?.id,
      success: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal kirim WA: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
