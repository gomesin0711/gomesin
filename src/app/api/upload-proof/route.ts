import { NextRequest, NextResponse } from "next/server";

// POST /api/upload-proof
// Menerima bukti pembayaran (base64 data URL) → upload ke uguu.se (host gambar
// publik gratis, anonymous, return URL gambar LANGSUNG tanpa redirect) →
// return URL publik. URL ini dipakai untuk:
//   1. Kirim via WhatsApp Cloud API (gambar asli muncul di chat admin)
//   2. Fallback: link preview di wa.me (karena direct image → WhatsApp preview)
export async function POST(req: NextRequest) {
  try {
    const { image } = (await req.json()) as { image: string };
    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Image data URL wajib" }, { status: 400 });
    }

    // Decode base64 data URL → binary buffer.
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: "Format data URL tidak valid" }, { status: 400 });
    }
    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    // Upload ke uguu.se via multipart/form-data (files[] field).
    // uguu.se return URL gambar LANGSUNG (https://d.uguu.se/xxx.png) dengan
    // content-type image/png, TANPA redirect → cocok untuk WhatsApp.
    const form = new FormData();
    form.append("files[]", new Blob([buffer], { type: `image/${matches[1]}` }), `proof.${ext}`);

    const upRes = await fetch("https://uguu.se/upload.php", {
      method: "POST",
      body: form,
    });

    if (!upRes.ok) {
      return NextResponse.json(
        { error: `Gagal upload ke uguu: ${upRes.status}` },
        { status: 502 }
      );
    }

    const upData = await upRes.json();
    const url: string = upData?.files?.[0]?.url;
    if (!url) {
      return NextResponse.json({ error: "Response uguu tidak ada URL" }, { status: 502 });
    }

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal upload bukti: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
