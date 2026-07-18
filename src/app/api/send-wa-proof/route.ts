import { NextRequest, NextResponse } from "next/server";

// POST /api/send-wa-proof
// Kirim bukti pembayaran (gambar) langsung ke WhatsApp admin via WhatsApp
// Cloud API (resmi dari Meta). Gambar MUNCUL sebagai gambar di chat admin,
// bukan link teks.
//
// BUTUH env vars (dapatkan di https://developers.facebook.com/apps):
//   WHATSAPP_TOKEN        — access token (permanent atau system user token)
//   WHATSAPP_PHONE_ID     — phone number ID dari WhatsApp Business
//   WHATSAPP_ADMIN_NUMBER — nomor admin penerima (format 62..., tanpa +)
//
// Jika env vars belum diset, fallback ke wa.me link (gambar tetap dikirim
// sebagai URL, WhatsApp akan preview karena uguu.se return direct image).
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

    // Fallback: jika env vars belum dikonfigurasi, kirim via wa.me link.
    // WhatsApp akan preview gambar karena uguu.se return direct image (no redirect).
    if (!token || !phoneId) {
      const msg = encodeURIComponent(
        (caption || "Bukti Pembayaran Iklan Gomesin") + "\n\n" + imageUrl
      );
      return NextResponse.json({
        method: "wa.me",
        url: `https://wa.me/${adminNumber}?text=${msg}`,
        note: "WhatsApp Cloud API belum dikonfigurasi. Gambar dikirim via link (WhatsApp akan preview).",
      });
    }

    // Kirim gambar via WhatsApp Cloud API.
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
      // Fallback ke wa.me jika API gagal.
      const msg = encodeURIComponent(
        (caption || "Bukti Pembayaran Iklan Gomesin") + "\n\n" + imageUrl
      );
      return NextResponse.json({
        method: "wa.me",
        url: `https://wa.me/${adminNumber}?text=${msg}`,
        error: data?.error?.message || "WhatsApp API error",
      });
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
