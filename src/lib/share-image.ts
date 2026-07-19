/**
 * Share JPG/PNG image to WhatsApp — GRATIS, tanpa API key.
 *
 * Cara kerja (dari DokuPro):
 *   - Mobile (Android/iOS): Web Share API → buka WhatsApp app dengan gambar
 *     AUTO-ATTACHED. User tinggal klik kirim. Tidak perlu langkah manual!
 *   - Desktop: download gambar ke device + buka WhatsApp Web dengan caption.
 *     User klik 📎 + pilih file → kirim.
 *
 * Ini cara native browser, gratis selamanya, tidak perlu Fonnte/Cloud API.
 */

export interface ShareImageOptions {
  /** Image blob (JPG/PNG) untuk dibagikan */
  blob: Blob;
  /** Nama file mis. "bukti-pembayaran-titanium-xxx.jpg" */
  fileName: string;
  /** Caption pesan */
  caption: string;
  /** Nomor WhatsApp tujuan (untuk desktop fallback) */
  phone?: string;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export type ShareImageResult =
  | { status: "shared" }     // Web Share API sukses (mobile) — gambar auto-attached
  | { status: "downloaded" } // File didownload (desktop)
  | { status: "cancelled" }  // User batal share (mobile)
  | { status: "error"; error: string };

/**
 * Bagikan gambar ke WhatsApp.
 * - Mobile: Web Share API → WhatsApp app dengan gambar auto-attached.
 * - Desktop: download gambar + buka WhatsApp Web dengan caption.
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
        // Error lain → fallback ke download
      }
    }
  }

  // Desktop (atau mobile tanpa Web Share): download gambar + buka WhatsApp Web.
  downloadBlob(blob, fileName);

  // Buka WhatsApp Web dengan caption (desktop).
  const msg = encodeURIComponent(caption + "\n\nGambar bukti sudah terunduh. Klik 📎 untuk lampirkan.");
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");

  return { status: "downloaded" };
}
