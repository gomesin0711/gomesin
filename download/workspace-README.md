# Gomesin Workspace Source Code

Archive ini berisi **source code** aplikasi marketplace Gomesin (Next.js 16 + TypeScript + Prisma + SQLite).

## Statistik Archive

| File | Ukuran | Format |
|------|--------|--------|
| `workspace-src.tar.gz` | 3.4 MB | tarball (Linux/Mac) |
| `workspace-src.zip` | 4.6 MB | ZIP (Windows/Mac/Linux) |

## Yang Termasuk

✅ `src/` — semua source code (app, components, lib, hooks)
✅ `prisma/` — schema database
✅ `public/` — asset statis (logo, icon, QRIS image, cat-icons)
✅ `mini-services/chat-service/` — service chat realtime
✅ `db/custom.db` — SQLite database (data seed + transaksi)
✅ `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
✅ `worklog.md` — log development lengkap

## Yang Tidak Termasuk (perlu di-regenerate)

❌ `node_modules/` — jalankan `npm install` atau `bun install` untuk regenerate
❌ `.next/` — jalankan `npm run build` untuk regenerate
❌ `next-service-dist/` — di-generate saat build

## Cara Setup

```bash
# 1. Extract archive
tar -xzf workspace-src.tar.gz
# atau
unzip workspace-src.zip

# 2. Masuk ke folder
cd workspace

# 3. Install dependencies
npm install
# atau
bun install

# 4. Generate Prisma client
npx prisma generate

# 5. (Opsional) Reset database ke kondisi awal
npx prisma db push

# 6. Jalankan dev server
npm run dev

# 7. Buka http://localhost:3000
```

## Akun Default

- **Admin**: `admin@gomesin.id` / `admin123`
- **User**: register baru via halaman login

## Fitur Utama

- Marketplace mesin industri (kategorisasi lengkap)
- Sistem paket: Gold, Colek, Platinum, Spotlight
- Pembayaran via QRIS & BCA
- Bukti pembayaran otomatis terkirim ke WhatsApp admin (0858-8808-2208)
- Chat realtime user ↔ seller (socket.io)
- Panel admin: dashboard, verifikasi iklan, kelola kategori, transaksi, laporan, audit log, **chat pengguna** (baru!)
- Multi-bahasa: ID, EN, ZH

## Teknologi

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM + SQLite
- TanStack Query
- Zustand
- Socket.io (chat realtime)
- z-ai-web-dev-sdk (AI chat reply)
