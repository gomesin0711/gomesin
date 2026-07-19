/**
 * Share JPG/PNG image to WhatsApp — GRATIS, tanpa API key.
 *
 * Cara kerja:
 *   - Mobile (Android/iOS): Web Share API → buka WhatsApp app dengan gambar
 *     AUTO-ATTACHED. User tinggal klik kirim. Langsung, tanpa download!
 *   - Desktop: buka WhatsApp langsung dengan caption. Jika browser support
 *     clipboard write (dengan user gesture), copy gambar supaya user bisa
 *     paste (Ctrl+V) di WhatsApp.
 *
 * TIDAK ADA download file ke device.
 */

export interface ShareImageOptions {
  /** Image blob (JPG/PNG) untuk dibagikan */
  blob: Blob;
  /** Nama file mis. "bukti-pembayaran-titanium-xxx.jpg" */
  fileName: string;
  /** Caption pesan */
  caption: string;
  /** Nomor WhatsApp tujuan */
  phone?: string;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export type ShareImageResult =
  | { status: "shared" }      // Web Share API sukses (mobile)
  | { status: "copied" }      // Gambar di-copy ke clipboard (desktop)
  | { status: "opened" }      // WhatsApp dibuka tanpa clipboard (desktop fallback)
  | { status: "cancelled" }   // User batal share (mobile)
  | { status: "error"; error: string };

/**
 * Bagikan gambar ke WhatsApp — TANPA download.
 * - Mobile: Web Share API → gambar auto-attach ke WhatsApp app.
 * - Desktop: copy gambar ke clipboard (jika diizinkan) + buka WhatsApp.
 */
export async function shareImageToWhatsApp({
  blob,
  fileName,
  caption,
  phone = "6285888082208",
}: ShareImageOptions): Promise<ShareImageResult> {
  // Mobile: pakai Web Share API → gambar auto-attach ke WhatsApp app.
  if (isMobile() && navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: caption,
        });
        return { status: "shared" };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return { status: "cancelled" };
        }
        // Error lain → fallback ke desktop flow
      }
    }
  }

  // Desktop: coba copy gambar ke clipboard.
  // Note: clipboard.write butuh user gesture. Karena fungsi ini dipanggil
  // dari onClick (user gesture), clipboard biasanya diizinkan. Jika ditolak
  // (mis. permission), tetap buka WhatsApp tanpa clipboard.
  let copied = false;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ [blob.type || "image/jpeg"]: blob });
      await navigator.clipboard.write([item]);
      copied = true;
    }
  } catch {
    // Clipboard ditolak — tetap buka WhatsApp tanpa copy.
  }

  // Buka WhatsApp dengan caption. Pakai window.open(_blank) — popup blocker
  // tidak berlaku karena dipanggil langsung dari user gesture (onClick), bukan
  // setelah async operation yang lama.
  const msg = encodeURIComponent(
    caption + (copied ? "\n\nGambar bukti sudah di-copy. Tekan Ctrl+V untuk paste." : "")
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");

  return copied ? { status: "copied" } : { status: "opened" };
}
