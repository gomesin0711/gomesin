/**
 * Share image to WhatsApp — dari WhatsApp USER ke WhatsApp ADMIN.
 *
 * Mobile (Android/iOS): Web Share API → buka WhatsApp app user dengan
 *   gambar AUTO-ATTACHED + caption. User tinggal pilih chat admin → kirim.
 * Desktop: copy gambar ke clipboard + buka WhatsApp Web ke nomor admin.
 *   User tekan Ctrl+V untuk paste gambar.
 *
 * TIDAK pakai Fonnte API — karena Fonnte device = nomor admin, tidak bisa
 * kirim ke diri sendiri. Yang mengirim adalah USER dari WhatsApp-nya sendiri.
 */

export interface ShareImageOptions {
  blob: Blob;
  fileName: string;
  caption: string;
  phone?: string;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export type ShareImageResult =
  | { status: "shared" }
  | { status: "copied" }
  | { status: "opened" }
  | { status: "cancelled" }
  | { status: "error"; error: string };

export async function shareImageToWhatsApp({
  blob,
  fileName,
  caption,
  phone = "6285888082208",
}: ShareImageOptions): Promise<ShareImageResult> {
  // Mobile: Web Share API → gambar auto-attach ke WhatsApp app user.
  if (isMobile() && navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption });
        return { status: "shared" };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return { status: "cancelled" };
        }
      }
    }
  }

  // Desktop: copy gambar ke clipboard + buka WhatsApp ke nomor admin.
  let copied = false;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({ [blob.type || "image/jpeg"]: blob });
      await navigator.clipboard.write([item]);
      copied = true;
    }
  } catch {}

  const msg = encodeURIComponent(
    caption + (copied ? "\n\n✅ Gambar bukti sudah di-copy. Tekan Ctrl+V di kolom chat WhatsApp untuk paste." : "\n\n📎 Klik ikon lampiran di WhatsApp untuk upload gambar bukti pembayaran.")
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");

  return copied ? { status: "copied" } : { status: "opened" };
}
