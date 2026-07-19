/**
 * Share image to WhatsApp — kirim LANGSUNG ke nomor admin (085888082208).
 *
 * === MOBILE (Android/iOS) ===
 * Pakai Web Share API (navigator.share) → gambar AUTO-ATTACH ke WhatsApp app
 * user + caption pre-fill. User tinggal pilih chat admin → kirim.
 * Ini SATU-SATUNYA cara yang bisa attach gambar langsung ke WhatsApp di mobile
 * (wa.me link cuma bisa isi text, tidak bisa attach gambar).
 *
 * === DESKTOP ===
 * Upload gambar ke tmpfiles.org → dapat URL publik → buka wa.me link dengan
 * caption + link gambar. Popup-blocker-safe: window.open dipanggil sync di
 * click handler sebelum await, location di-set setelah upload selesai.
 * Fallback: window.location.href kalau popup benar-benar diblokir.
 *
 * Admin number: 085888082208 (6285888082208).
 */

export interface ShareImageOptions {
  blob: Blob;
  fileName: string;
  caption: string;
  phone?: string;
}

export type ShareImageResult =
  | { status: "shared" }
  | { status: "opened" }
  | { status: "cancelled" }
  | { status: "error"; error: string };

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Upload blob ke tmpfiles.org → return direct image URL.
 */
async function uploadToTmpfiles(blob: Blob, fileName: string): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("file", blob, fileName);
    const upRes = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: fd,
    });
    if (!upRes.ok) return null;
    const upData = await upRes.json();
    const viewerUrl: string = upData?.data?.url || "";
    if (!viewerUrl) return null;
    // Ekstrak direct image URL dari viewer page HTML.
    const viewerRes = await fetch(viewerUrl);
    const html = await viewerRes.text();
    const directMatch = html.match(/https:\/\/tmpfiles\.org\/dl\/[^"' ]+\.(?:png|jpg|jpeg|gif|webp)/i);
    return directMatch?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Bangun URL wa.me dengan caption + optional image URL.
 * Phone dinormalisasi: "085888082208" → "6285888082208".
 */
function buildWhatsAppUrl(phone: string, caption: string, imageUrl: string | null): string {
  const msg = encodeURIComponent(
    caption + "\n\n" +
    (imageUrl
      ? `Bukti pembayaran (gambar):\n${imageUrl}`
      : `Bukti pembayaran terlampir — silakan kirim screenshot di chat ini.`)
  );
  const normalizedPhone = phone.replace(/[\s\-()+]/g, "").replace(/^0/, "62");
  return `https://wa.me/${normalizedPhone}?text=${msg}`;
}

export async function shareImageToWhatsApp({
  blob,
  fileName,
  caption,
  phone = "6285888082208",
}: ShareImageOptions): Promise<ShareImageResult> {
  // ============================================================
  // MOBILE: Web Share API → gambar AUTO-ATTACH ke WhatsApp app.
  // Ini satu-satunya cara attach gambar langsung ke WhatsApp mobile.
  // wa.me link di mobile TIDAK BISA attach gambar, hanya text.
  // ============================================================
  if (isMobile() && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption });
        return { status: "shared" };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return { status: "cancelled" };
        }
        // Jika share gagal (bukan abort), fallback ke wa.me link di bawah.
      }
    }
  }

  // ============================================================
  // DESKTOP (atau mobile fallback): upload ke tmpfiles → wa.me link
  // Popup-blocker-safe: window.open dipanggil sync di click handler
  // sebelum await, location di-set setelah upload selesai.
  // ============================================================
  let popupWin: Window | null = null;
  try {
    popupWin = window.open("", "_blank");
  } catch {
    popupWin = null;
  }

  // Upload gambar ke tmpfiles.org → dapat direct image URL publik.
  const imageUrl = await uploadToTmpfiles(blob, fileName);

  // Bangun URL WhatsApp ke nomor admin (6285888082208).
  const waUrl = buildWhatsAppUrl(phone, caption, imageUrl);

  if (popupWin && !popupWin.closed) {
    try {
      popupWin.location.href = waUrl;
      return { status: "opened" };
    } catch {
      try { popupWin.close(); } catch {}
    }
  }

  // Fallback: navigasi tab saat ini ke wa.me URL.
  try {
    window.location.href = waUrl;
    return { status: "opened" };
  } catch {
    return { status: "error", error: "Tidak bisa membuka WhatsApp" };
  }
}
