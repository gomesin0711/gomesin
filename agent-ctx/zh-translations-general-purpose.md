# Task: zh-translations — Add Chinese (zh) as third language

Agent: general-purpose (Chinese translations)
Task ID: zh-translations

## Work Log
- Read `/home/z/my-project/src/lib/i18n.ts` (1024 lines): existing `id` (Indonesian, lines 9-499) and `en` (English, lines 500-970) blocks. `Lang` type already extended to `"id" | "en" | "zh"`.
- Read full `en` block (470 keys).
- Authored a natural Simplified Chinese `zh: { ... }` block covering all 470 keys, including:
  - Header / hero / sections / listings / detail page strings
  - Post-ad form labels & placeholders, payment & package strings
  - Login / register / profile / bottom nav strings
  - Dashboard / favorites / chat widget strings
  - Footer / category nav / time-ago / toast misc strings
  - Full admin panel strings (admin dashboard, listings verification, expired, rejected, sellers, categories, users, brands, locations, banners, packages, transactions, reports, audit log)
- Kept all `{placeholder}` variables unchanged: `{name}`, `{title}`, `{method}`, `{count}`, `{user}`, `{n}`, `{email}`.
- Used common Chinese e-commerce terminology:
  - "广告" for ad/listing
  - "卖家"/"买家" for seller/buyer
  - "全新"/"二手" for new/used
  - "可议价"/"一口价" for negotiable/fixed
  - "认证" for verified
  - "置顶"/"高亮"/"焦点推荐" for sundul/highlight/spotlight (since these are Gomesin-specific terms)
  - "Rp" prefix kept as-is for Indonesian Rupiah
  - Brand names (Heidelberg, MAZAK, Komatsu, BCA, GoPay, QRIS) kept in English
  - City "Surabaya" translated as "泗水" (common Chinese name for that city)
- Inserted `zh` block immediately after `en` block (before the closing `}` of the `translations` object), at lines 971-1461.
- Updated `CATEGORY_NAME_MAP` (was `Record<string, string>` English-only) to `Record<string, { en: string; zh: string }>` with Chinese equivalents:
  - Mesin Cetak → 印刷机
  - Mesin Digital Printing → 数码印刷机
  - Mesin Kemasan & Packaging → 包装机
  - Mesin Plastik & Injeksi → 塑料与注塑机
  - Kompressor & Generator → 空压机与发电机
  - Mesin CNC & Laser → CNC 与激光机
  - Mesin Bubut → 车床
  - Mesin Makanan & Minuman → 食品饮料机械
  - Mesin Tekstil & Garment → 纺织与服装机械
  - Mesin Kayu & Perkakas → 木工机械与工具
  - Alat Berat & Konstruksi → 重型设备与工程机械
  - Sparepart & Aksesoris → 零配件与附件
- Updated `categoryName(name, lang)` to look up the per-language value.
- Updated `/home/z/my-project/src/components/gomesin/header.tsx`:
  - Changed `changeLang` param type from `"id" | "en"` to `"id" | "en" | "zh"`.
  - Added a `langFlag(l: Lang)` helper returning 🇮🇩 / 🇬🇧 / 🇨🇳.
  - Replaced both flag emoji spans (mobile + desktop) with `{langFlag(lang)}`.
  - Added 🇨🇳 中文 option to both mobile and desktop language popovers.
- Verified with `bun run lint`: 0 errors, 19 pre-existing warnings (all in unrelated files: chat-widget.tsx eslint-disable directives, admin.tsx img-element warnings). No new issues introduced by this task.

## Stage Summary
- Added zh translations for ALL 470 i18n keys (verified key-by-key against the `en` block).
- Updated header language switcher (mobile + desktop) with 🇨🇳 中文 option, and updated flag-emoji display to handle `zh`.
- Refactored `CATEGORY_NAME_MAP` to support both English and Chinese; `categoryName()` now returns the correct language.
- `bun run lint` passes with 0 errors.

## Files modified
- `src/lib/i18n.ts`
- `src/components/gomesin/header.tsx`
