import { NextRequest, NextResponse } from "next/server";

// POST /api/upload-proof
// Menerima bukti pembayaran (base64 data URL) → upload ke tmpfiles.org (host
// gambar gratis, anonymous) → return URL gambar LANGSUNG (bukan viewer page).
// URL ini disisipkan ke pesan WhatsApp admin. Karena URL mengarah ke gambar
// langsung (content-type: image/png), WhatsApp akan menampilkan PREVIEW gambar,
// bukan cuma link teks.
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

    // Upload ke tmpfiles.org via multipart/form-data.
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: `image/${matches[1]}` }), `proof.${ext}`);

    const upRes = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: form,
    });

    if (!upRes.ok) {
      return NextResponse.json(
        { error: `Gagal upload ke tmpfiles: ${upRes.status}` },
        { status: 502 }
      );
    }

    const upData = await upRes.json();
    // Response: { status: "success", data: { url: "https://tmpfiles.org/XXXX/proof.png" } }
    // Itu adalah VIEWER page (HTML), BUKAN gambar langsung. Perlu ekstrak URL
    // gambar sebenarnya dari HTML viewer page.
    const viewerUrl: string = upData?.data?.url;
    if (!viewerUrl) {
      return NextResponse.json({ error: "Response tmpfiles tidak ada URL" }, { status: 502 });
    }

    // Fetch viewer page HTML → cari URL gambar langsung (pattern: /dl/{token}/...)
    const viewerRes = await fetch(viewerUrl);
    const html = await viewerRes.text();
    const directMatch = html.match(/https:\/\/tmpfiles\.org\/dl\/[^"' ]+\.(?:png|jpg|jpeg|gif|webp)/i);
    const directUrl = directMatch?.[0];

    if (!directUrl) {
      // Fallback: pakai viewer URL (kurang ideal — WhatsApp tampil sebagai link, bukan gambar)
      return NextResponse.json({ url: viewerUrl, direct: false });
    }

    return NextResponse.json({ url: directUrl, direct: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal upload bukti: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
