/**
 * Share JPG/PNG image to WhatsApp — GRATIS, tanpa API key.
 *
 * Cara kerja:
 *   - Mobile (Android/iOS): Web Share API → buka WhatsApp app dengan gambar
 *     AUTO-ATTACHED. User tinggal klik kirim. Tidak download, tidak manual!
 *   - Desktop: Web Share API jika browser support. Jika tidak, langsung buka
 *     WhatsApp dengan caption (gambar di-clipboard untuk paste manual).
 *
 * TIDAK ADA download file ke device. Gambar langsung dikirim/dibagikan.
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

/**
 * Copy image blob ke clipboard (desktop fallback).
 * User bisa langsung paste (Ctrl+V) di WhatsApp — gambar muncul tanpa download.
 */
async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || !window.ClipboardItem) return false;
    const item = new ClipboardItem({ [blob.type || "image/jpeg"]: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

export type ShareImageResult =
  | { status: "shared" }      // Web Share API sukses — gambar langsung ke WhatsApp
  | { status: "copied" }      // Gambar di-copy ke clipboard (desktop) — paste di WA
  | { status: "cancelled" }   // User batal share (mobile)
  | { status: "error"; error: string };

/**
 * Bagikan gambar ke WhatsApp — TANPA download.
 * - Mobile: Web Share API → gambar auto-attach ke WhatsApp app.
 * - Desktop: copy gambar ke clipboard + buka WhatsApp (paste Ctrl+V).
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
        // Error lain → fallback ke clipboard
      }
    }
  }

  // Desktop: copy gambar ke clipboard (supaya bisa paste di WhatsApp tanpa
  // download). Lalu buka WhatsApp dengan caption.
  const copied = await copyImageToClipboard(blob);

  // Buka WhatsApp dengan caption. location.href (bukan window.open) supaya
  // tidak diblokir popup blocker.
  const msg = encodeURIComponent(
    caption + (copied ? "\n\nGambar bukti sudah di-copy. Tekan Ctrl+V untuk paste." : "")
  );
  window.location.href = `https://wa.me/${phone}?text=${msg}`;

  return copied ? { status: "copied" } : { status: "shared" };
}
