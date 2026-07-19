/**
 * Share image to WhatsApp — dari WhatsApp USER ke WhatsApp ADMIN.
 *
 * Mobile (Android/iOS): Web Share API → buka WhatsApp app user dengan
 *   gambar AUTO-ATTACHED + caption. User tinggal pilih chat admin → kirim.
 * Desktop: upload gambar ke tmpfiles.org → dapat URL publik → buka wa.me
 *   dengan caption + link gambar. Admin klik link → lihat gambar.
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

  // Desktop: upload gambar ke tmpfiles.org → dapat URL → buka wa.me dengan
  // caption + link gambar. Admin klik link → lihat gambar bukti.
  const imageUrl = await uploadToTmpfiles(blob, fileName);

  const msg = encodeURIComponent(
    caption + "\n\n" +
    (imageUrl
      ? `Bukti pembayaran (gambar):\n${imageUrl}`
      : `Bukti pembayaran terlampir — silakan kirim screenshot di chat ini.`)
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");

  return { status: "opened" };
}
