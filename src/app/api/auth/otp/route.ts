import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  In-memory OTP store (works on serverless / Vercel)                */
/* ------------------------------------------------------------------ */

type OtpEntry = {
  code: string;
  expiresAt: number;
  verified: boolean;
};

const otpStore = new Map<string, OtpEntry>();
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;

function generateCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

function normalizePhone(phone: string): string {
  // Strip all non-digit chars
  let p = phone.replace(/[^0-9]/g, "");
  // If starts with 0, replace with 62
  if (p.startsWith("0")) p = "62" + p.slice(1);
  // If starts with +62, strip the +
  if (p.startsWith("+")) p = p.slice(1);
  return p;
}

/* ------------------------------------------------------------------ */
/*  POST /api/auth/otp                                                 */
/*  Body: { phone, action: "send" | "verify", code? }                */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone: rawPhone, action, code } = body as {
      phone: string;
      action: "send" | "verify";
      code?: string;
    };

    if (!rawPhone || !action) {
      return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);

    if (action === "send") {
      // Rate limit: max 1 OTP per 60 seconds
      const existing = otpStore.get(phone);
      if (existing && Date.now() - (existing.expiresAt - OTP_TTL_MS) < 60_000) {
        const waitSec = Math.ceil(60 - (Date.now() - (existing.expiresAt - OTP_TTL_MS)) / 1000);
        return NextResponse.json({ error: `Tunggu ${waitSec} detik sebelum mengirim ulang`, waitSec });
      }

      const otpCode = generateCode();
      otpStore.set(phone, {
        code: otpCode,
        expiresAt: Date.now() + OTP_TTL_MS,
        verified: false,
      });

      // In production, send OTP via WhatsApp API here.
      // For dev/testing, return the code so frontend can display it.
      console.log(`[OTP] Phone: ${phone}, Code: ${otpCode}`);

      return NextResponse.json({ success: true, message: "OTP terkirim", _devCode: otpCode });
    }

    if (action === "verify") {
      if (!code) {
        return NextResponse.json({ error: "Kode OTP wajib diisi" }, { status: 400 });
      }

      const entry = otpStore.get(phone);
      if (!entry) {
        return NextResponse.json({ error: "OTP tidak ditemukan. Silakan kirim ulang." }, { status: 400 });
      }

      if (Date.now() > entry.expiresAt) {
        otpStore.delete(phone);
        return NextResponse.json({ error: "OTP sudah expired. Silakan kirim ulang." }, { status: 400 });
      }

      if (entry.code !== code) {
        return NextResponse.json({ error: "Kode OTP salah" }, { status: 400 });
      }

      // Mark as verified
      entry.verified = true;
      return NextResponse.json({ success: true, message: "OTP terverifikasi" });
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Gagal memproses OTP" }, { status: 500 });
  }
}

// Check if a phone number has been verified (used by login/register)
export function isPhoneVerified(phone: string): boolean {
  const normalized = normalizePhone(phone);
  const entry = otpStore.get(normalized);
  return entry?.verified === true;
}

// Mark phone as verified (after successful login/register, keep for session)
export function markPhoneVerified(phone: string) {
  const normalized = normalizePhone(phone);
  const entry = otpStore.get(normalized);
  if (entry) entry.verified = true;
}
