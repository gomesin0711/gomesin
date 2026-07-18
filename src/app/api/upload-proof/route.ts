import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// POST /api/upload-proof
// Menerima bukti pembayaran (base64 data URL) → simpan ke public/proofs/ →
// return URL publik. URL ini disisipkan ke pesan WhatsApp admin supaya admin
// bisa klik & melihat GAMBAR bukti, bukan cuma teks.
//
// File disimpan di server (self-hosted). Di sandbox preview, URL otomatis
// pakai host gateway sehingga admin bisa akses dari luar.
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

    // Generate unique filename & simpan ke public/proofs/.
    const filename = `proof-${randomUUID()}.${ext}`;
    const proofsDir = join(process.cwd(), "public", "proofs");
    await mkdir(proofsDir, { recursive: true });
    await writeFile(join(proofsDir, filename), buffer);

    // Bangun URL publik berdasarkan host request (supaya berfungsi di preview).
    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const url = `${proto}://${host}/proofs/${filename}`;

    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal upload bukti: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
