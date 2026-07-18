import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";

// POST /api/upload-proof
// Menerima bukti pembayaran (base64 data URL) → simpan ke folder proofs/ di
// luar public/ → return URL ke /api/proof/[id] yang serve gambar LANGSUNG
// (content-type: image/png, tanpa redirect). URL ini disisipkan ke pesan
// WhatsApp. Karena response = gambar murni (bukan HTML/redirect), WhatsApp
// akan menampilkan PREVIEW gambar, bukan link teks.
//
// File disimpan di server (self-hosted). URL pakai host request + gateway
// sehingga admin bisa akses dari luar sandbox.

const PROOFS_DIR = join(process.cwd(), "proofs");

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

    // Generate unique ID & simpan ke proofs/ (di luar public supaya tidak
    // di-cache/served oleh Next.js static handler — kita serve via API route
    // agar full control atas content-type & headers).
    const id = randomUUID();
    const filename = `${id}.${ext}`;
    await mkdir(PROOFS_DIR, { recursive: true });
    await writeFile(join(PROOFS_DIR, filename), buffer);

    // Bangun URL publik berdasarkan host request.
    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const url = `${proto}://${host}/api/proof/${filename}`;

    return NextResponse.json({ url, id: filename });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Gagal upload bukti: " + (e?.message || "unknown") },
      { status: 500 }
    );
  }
}
