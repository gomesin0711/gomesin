/**
 * Share image to WhatsApp — kirim LANGSUNG ke nomor admin (085888082208).
 *
 * Baik mobile maupun desktop: upload gambar ke tmpfiles.org → dapat URL publik
 * → buka wa.me/<phone>?text=<caption+imageURL> → langsung buka chat admin
 * dengan caption + link gambar. User tinggal tap "Kirim".
 *
 * PENTING (fix popup blocker):
 * Pada mobile browser, window.open() setelah `await fetch()` akan diblokir
 * karena bukan lagi dalam user gesture context. Solusinya: buka window KOSONG
 * secara synchronously di click handler, LALU set location-nya setelah upload
 * selesai. Ini mempertahankan user gesture context → popup tidak diblokir.
 *
 * Fallback: kalau window.open('') gagal (popup benar-benar diblokir), gunakan
 * window.location.href untuk navigasi tab saat ini ke wa.me link.
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
 */
function buildWhatsAppUrl(phone: string, caption: string, imageUrl: string | null): string {
  const msg = encodeURIComponent(
    caption + "\n\n" +
    (imageUrl
      ? `Bukti pembayaran (gambar):\n${imageUrl}`
      : `Bukti pembayaran terlampir — silakan kirim screenshot di chat ini.`)
  );
  // PENTING: phone harus format internasional tanpa "+" atau "0" di depan.
  // Mis. "085888082208" → "6285888082208".
  const normalizedPhone = phone.replace(/[\s\-()+]/g, "").replace(/^0/, "62");
  return `https://wa.me/${normalizedPhone}?text=${msg}`;
}

export async function shareImageToWhatsApp({
  blob,
  fileName,
  caption,
  phone = "6285888082208",
}: ShareImageOptions): Promise<ShareImageResult> {
  // === FIX POPUP BLOCKER ===
  // Buka window KOSONG secara SYNCHRONOUS di click handler (sebelum await).
  // Ini mempertahankan user gesture context → popup tidak diblokir di mobile.
  // Setelah upload selesai, set location window ke wa.me URL.
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
    // Popup berhasil dibuka sync — set location ke wa.me URL.
    try {
      popupWin.location.href = waUrl;
      return { status: "opened" };
    } catch {
      // Cross-origin restriction — fallback ke location.href.
      try { popupWin.close(); } catch {}
    }
  }

  // Fallback: navigasi tab saat ini ke wa.me URL (tidak butuh user gesture).
  // Ini selalu berhasil di mobile maupun desktop.
  try {
    window.location.href = waUrl;
    return { status: "opened" };
  } catch {
    return { status: "error", error: "Tidak bisa membuka WhatsApp" };
  }
}
