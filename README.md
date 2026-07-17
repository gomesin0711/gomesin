# Gomesin — Marketplace Mesin Industri

Marketplace jual-beli mesin industri (mesin cetak, CNC, laser, woodworking, food processing, kompressor, alat berat, sparepart) bergaya OLX, dibangun dengan Next.js 16, TypeScript, Prisma (SQLite), dan shadcn/ui.

## Fitur Utama

- **Beranda** — hero, kategori, carousel produk terpopuler & terdahsyat, iklan terbaru
- **Pencarian & filter** — kata kunci, kategori, kondisi, rentang harga, provinsi, sorting
- **Detail iklan** — galeri foto, spesifikasi, kartu penjual, iklan serupa, tips keamanan
- **Pasang iklan** — form lengkap dengan pilih paket (Gold / Colek / Platinum / Titanium) + pembayaran simulasi (QRIS/VA/GoPay)
- **Verifikasi admin** — iklan baru berstatus *pending*, harus disetujui admin sebelum tayang
- **Panel administrator** — dashboard statistik & omset, kelola iklan (aktif/baru/expired/ditolak), penjual, kategori, paket, pengguna, laporan & audit
- **Chat realtime** — socket.io antar pengguna terdaftar, plus AI seller-chat (LLM) sebagai fallback
- **Multi-bahasa** — Indonesia / English / 中文
- **Responsif** — mobile-first dengan bottom navigation

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite |
| State | Zustand (client) + TanStack Query (server) |
| Realtime | Socket.io (mini-service terpisah, port 3003) |
| AI | z-ai-web-dev-sdk (LLM chat, image generation) |
| Auth | Custom scrypt-based password hashing |

## Paket Iklan

| Paket | Harga | Durasi | Keunggulan |
|-------|-------|--------|------------|
| Gold | Rp 50.000 | 30 hari | Tampil normal di pencarian |
| Colek | Rp 30.000 | 10 hari | Didorong ke posisi teratas |
| Platinum | Rp 88.000 | 30 hari | Foto 2x lebih besar, badge Platinum |
| Titanium | Rp 99.000 | 30 hari | 4 foto, badge Titanium, tampil di beranda |

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Siapkan database (schema + seed data)
cp .env.example .env        # atau set DATABASE_URL=file:./db/custom.db
bun run db:push
bun run prisma/seed.ts      # 12 kategori, 15 seller, 54 listing
bun run prisma/seed-admin.ts # admin@gomesin.id / admin123

# 3. Jalankan dev server (port 3000)
bun run dev

# 4. Jalankan chat-service (port 3003, terpisah)
cd mini-services/chat-service && bun install && bun run dev
```

Buka `http://localhost:3000`.

## Struktur Proyek

```
src/
├── app/
│   ├── api/            # route handlers (listings, auth, admin, chat, messages, paket)
│   ├── layout.tsx
│   └── page.tsx        # single-route SPA via Zustand view routing
├── components/
│   ├── gomesin/        # komponen domain (header, footer, listing-card, views/*)
│   ├── ui/             # shadcn/ui primitives
│   └── providers.tsx   # React Query provider
├── lib/                # db, auth, i18n, store (zustand), types, paket, utils
└── hooks/
mini-services/
└── chat-service/       # socket.io realtime chat (port 3003)
prisma/
├── schema.prisma       # Category, Seller, Listing, User, Message, Paket
└── seed.ts             # data dummy lengkap
```

## Akun Demo

- **Admin**: `admin@gomesin.id` / `admin123`
- Setelah login admin, klik tombol **Panel Admin** di profil.

## Catatan

- Database SQLite disertakan (`db/custom.db`) berisi data demo agar langsung bisa dijalankan.
- Pembayaran paket berbayar adalah **simulasi** (bukan gateway sungguhan).
- Realtime chat memerlukan chat-service berjalan di port 3003; bila mati, chat fallback ke REST (pesan tetap tersimpan).
