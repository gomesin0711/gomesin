/**
 * Share image to WhatsApp — LANGSUNG ke chat admin 085888082208.
 *
 * === CARA KERJA ===
 * Upload gambar bukti ke tmpfiles.org → dapat URL publik → buka
 * wa.me/6285888082208?text=caption+imageUrl → WhatsApp app/langganan
 * langsung buka CHAT ADMIN dengan pesan sudah pre-fill.
 * User tinggal tap "Kirim" — tidak perlu pilih kontak.
 *
 * === TRADE-OFF ===
 * Gambar tidak ter-attach sebagai file di WhatsApp, tapi sebagai URL link
 * di dalam pesan. Admin klik link untuk lihat gambar.
 *
 * Ini lebih baik daripada Web Share API (navigator.share) karena:
 * - Web Share API TIDAK BISA target nomor spesifik → user harus pilih
 *   kontak admin manual (085888082208).
 * - wa.me link LANGSUNG buka chat admin → user tinggal kirim.
 *
 * === MOBILE vs DESKTOP ===
 * Mobile: window.location.href = wa.me URL (paling reliable, langsung
 *   buka WhatsApp app di HP).
 * Desktop: window.open dengan popup-blocker-safe pattern (buka window
 *   sync di click handler sebelum await, set location setelah upload).
 *   Fallback ke location.href kalau popup diblokir.
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
  // Upload gambar ke tmpfiles.org → dapat direct image URL publik.
  const imageUrl = await uploadToTmpfiles(blob, fileName);

  // Bangun URL WhatsApp ke nomor admin (6285888082208).
  const waUrl = buildWhatsAppUrl(phone, caption, imageUrl);

  // ============================================================
  // MOBILE: window.location.href langsung ke wa.me URL.
  // Ini paling reliable di mobile — langsung buka WhatsApp app
  // dan navigate ke chat admin (085888082208) dengan pesan
  // pre-fill. User tinggal tap "Kirim".
  // ============================================================
  if (isMobile()) {
    try {
      window.location.href = waUrl;
      return { status: "opened" };
    } catch {
      return { status: "error", error: "Tidak bisa membuka WhatsApp" };
    }
  }

  // ============================================================
  // DESKTOP: popup-blocker-safe pattern.
  // Buka window KOSONG sync di click handler (sebelum await upload)
  // untuk preserve user gesture context → popup tidak diblokir.
  // Setelah upload selesai, set location window ke wa.me URL.
  // Fallback: window.location.href kalau popup benar-benar diblokir.
  // ============================================================
  let popupWin: Window | null = null;
  try {
    popupWin = window.open("", "_blank");
  } catch {
    popupWin = null;
  }

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
