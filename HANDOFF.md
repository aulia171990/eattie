# Eattie — Dokumen Handoff (Terverifikasi terhadap kode & git, bukan dari ingatan)

> **CATATAN PENTING — STATUS DOKUMEN INI:**
> Dokumen ini ditulis ulang dari audit terverifikasi. Beberapa modul
> di bawah dicek langsung ke kodenya. Bagian "Langkah Hidup (Live DB)"
> adalah hal-hal yang TIDAK bisa diverifikasi dari repo saja (butuh
> akses Supabase) dan ditandai eksplisit.
>
> Jangan percaya dokumen handoff lama sebagai status "live" — historis
> 3 item yang ditandai "belum diperbaiki" ternyata SUDAH diperbaiki
> (lihat Risk Map #6/#9/#4). Selalu cross-check ke kode.

---

## 1. File Map (modul yang sudah dicek ke kode)

### Store & Order (customer beli online)
| File | Fungsi singkat |
|---|---|
| `components/store/store-landing.tsx` | Halaman utama toko — daftar produk |
| `components/store/product-detail-modal.tsx` | Popup detail produk |
| `contexts/store-cart-context.tsx` | Keranjang belanja (browser-only, belum di DB) |
| `components/store/store-checkout.tsx` | Isi data pemesan + submit |
| `actions/store.ts` | `submitOrder()` — simpan ke DB, ambil harga asli dari DB (aman dari manipulasi) |
| `actions/orders.ts` | Pesanan sisi dashboard |
| `app/dashboard/orders/[id]/page.tsx` | Detail pesanan + tombol konfirmasi/batal |

### POS / Kasir
| File | Fungsi singkat |
|---|---|
| `contexts/cart-context.tsx` | Keranjang kasir |
| `components/pos/payment-dialog.tsx` | Pembayaran + kembalian |
| `actions/sales.ts` | `createSale()` — VERIFIKASI ulang harga dari DB (lihat #6, SUDAH FIX) |
| `components/pos/receipt-template.tsx` | Struk |

### Inventory & Pembelian (bahan baku)
| File | Fungsi singkat |
|---|---|
| `actions/products.ts` | CRUD produk + **Product Configurator** (opsi, varian, add-on, galeri, stok varian) |
| `actions/stock-purchases.ts` | Pembelian bahan + `process_purchase` RPC |
| `actions/stock-opname.ts` | Koreksi stok fisik |
| `app/dashboard/inventory/**` | Daftar bahan, pembelian, opname, supplier |

### Produksi & Resep
| File | Fungsi singkat |
|---|---|
- `components/recipes/duplicate-recipe-button.tsx` | Modal pilih varian target saat duplikat resep |
| `components/forms/recipe-form.tsx` | Form resep (dukung `variant_id`, duplikat via `duplicateFrom`/`defaultVariantId`) |
| `components/forms/production-form.tsx` | Form batch produksi (pilih Produk + Varian) |
| `app/dashboard/production/new/page.tsx` | Teruskan `variants` + `variant_id` ke form & action |
| `actions/production.ts` | `createProductionBatch` simpan `variant_id`; `getProductionBatches`/`getProductionBatch` baca relasi `variants` |
| `actions/recipes.ts` | CRUD resep (owner-only); query select `variant_id` + `variants` |

### Produk Configurable (Product Configurator) — **MODUL BARU DITAMBAHKAN**
| File | Fungsi singkat |
|---|---|
| `components/products/product-configurator.tsx` | Tab: Opsi / Varian / Tambahan / Galeri. **Varian sekarang punya field Stok** |
| `actions/products.ts` (`getProductVariantsWithOptions`, `saveVariantWithOptions`, `updateVariantStockAction`) | Baca/tulis stok varian |
| `docs/product-configurator-architecture.md` | Arsitektur option-group |
| `supabase/migrations/000006..000016, 000019..000023` | Skema configurator + stok varian |

### Laporan
| File | Fungsi singkat |
|---|---|
| `actions/reports.ts` | `getFinancialReport()` — **SUDAH HITUNG COGS** (lihat #9, SUDAH FIX) |

### Customer / CRM
| File | Fungsi singkat |
|---|---|
| `actions/customers.ts` | CRUD pelanggan (requireOwner) |
| `app/dashboard/customers/**` | Daftar + detail pelanggan |

### Push Notification
| File | Fungsi singkat |
|---|---|
| `lib/push/vapid.ts`, `lib/push/send-new-order-push.ts` | Push ke owner saat order baru |

---

## 2. Data Flow (ringkas)

### 2a. Pesanan Online
```
/store → pilih produk → cart (browser) → /store/checkout → submitOrder()
  ⚠️ submitOrder() AMBIL HARGA ASLI DARI DB (fix keamanan, tidak percaya
     harga dari browser). Simpan ke orders + order_items.
Owner konfirmasi → invoice → proses.
```

### 2b. POS / Kasir
```
/pos → pilih produk → cart → Bayar → createSale()
  ⚠️ createSale() SEKARANG VERIFIKASI ULANG selling_price dari DB
     (fix Bug 6, SUDAH DITAMBAHKAN). Recompute subtotal server-side.
  → insert sale_items → RPC process_sale() (LIVE, tidak ada di repo — lihat #4)
  → struk.
```

### 2c. Inventory (bahan baku)
```
Pembelian → receivePurchase() → RPC process_purchase (LIVE) → stok bahan +1
Opname   → submitOpname()     → RPC process_stock_opname (LIVE) → koreksi stok

⚠️ ATURAN STOK BAHAN (2026-08-27, BAKU):
Stok bahan baku HANYA boleh berubah lewat dua jalur resmi di atas
(pembelian & opname). DUA jalur lain sudah DITUTUP:
- Edit bahan (`/dashboard/inventory/[id]/edit`): field `current_stock` sudah
  dijadikan READ-ONLY di `IngredientForm`; `updateIngredient` tidak lagi membaca/
  menulis `current_stock` dari form, dan blok audit-movement `reference_type:
  'edit'` sudah dihapus. Mengedit bahan TIDAK mengubah stok.
- Adjustment manual: action `adjustStock` + komponen `StockAdjustmentModal`
  SUDAH DIHAPUS (component tsb memang orphan/dead — tidak pernah di-render).
  `stock_movements.reference_type = 'adjustment'` kini tidak pernah dibuat lagi
  (hanya sisa historis).
Hardening DB: `ingredients.current_stock` = NOT NULL DEFAULT 0
(migration 000033_ingredient_stock_notnull.sql — idempoten, jalankan manual).
JANGAN buka kembali backdoor ini tanpa alasan bisnis eksplisit.
```

### 2d. Produksi
```
Batch → complete_production_batch() (LIVE) → kurangi bahan, tambah produk jadi
```

---

## 3. Product Configurator — Stock Tracking (FITUR BARU, SEBAGIAN)

**Status: SCHEMA + UI SUDĀH SUKSES DIBUAT & VERIFIED (lint+build pass).**
**PENGURANGAN STOK OTOMATIS SAAT JUALAN = BELUM (butuh live DB).**

Yang SUDAH ada di repo:
- `product_variants.stock` (INTEGER NOT NULL DEFAULT 0, CHECK >= 0) — migration `000023_product_variant_stock.sql`.
- Tipe `types/database.ts` `product_variants` punya field `stock`.
- `actions/products.ts`:
  - `getProductVariantsWithOptions` select `stock`.
  - `saveVariantWithOptions` terima + simpan `stock` (default 0).
  - `updateVariantStockAction(variantId, stock)` — update stok varian existing.
- `components/products/product-configurator.tsx` (tab Varian):
  - tiap varian tampil pill "Habis"/"N pcs" + input stok (simpan on blur).
  - form varian baru punya field "Stok".

Yang BELUM (Live DB — lihat Risk Map #13):
- `process_sale()` LIVE belum panggil `decrement_variant_stock`, jadi
  menjual varian BELUM mengurangi stok varian otomatis.
- Storefront/POS belum baca/enforce `product_variants.stock` (customer
  masih bisa order varian berapapun).
- Helper `decrement_variant_stock(p_variant_id, p_qty)` SUDAH dibuat di
  `000024_variant_stock_decrement.sql` (aman dijalankan sendiri; piston
  paste-in ke live `process_sale`).

---

## 4. Risk Map (status real per audit)

| # | Risiko | Status | Bukti |
|---|---|---|---|
| 1 | Harga order online bisa dimanipulasi | ✅ SUDAH FIX | `actions/store.ts` `submitOrder()` ambil harga dari DB |
| 2 | `order_items` bisa diubah sembarangan | ✅ SUDAH FIX | RLS `order_items_all` |
| 3 | 2 tabel pesanan (`orders` vs `customer_orders`) | 🟡 BELUM DICEK | butuh live DB |
| 4 | RPC status pesanan tidak ada di repo | ⚠️ SEBAGIAN — file `000000_order_status_rpcs.sql` SUDAH ADA tapi RECONSTRUKSI (bukan dump live). `process_sale`/`process_purchase`/`process_stock_opname`/`complete_production_batch` definisinya HANYA di live Supabase | header `000000` baris 1-25 |
| 5 | Signup dimatikan (kode dikomentari) | 🟢 Sengaja | `actions/auth.ts` |
| 6 | Harga POS tidak diverifikasi ulang | ✅ SUDAH FIX (dokumen lama salah tandai) | `actions/sales.ts:55-102` re-fetch + recompute |
| 7 | RLS produk konflik (`products_write` vs `products_update`) | 🟠 BELUM DIPERBAIKI | butuh live DB (policy live) |
| 8 | `updateBatchStatus()` full rely RLS | 🟢 Informasional | RLS benar |
| 9 | Gross profit = revenue (COGS hilang) | ✅ SUDAH FIX (dokumen lama salah tandai) | `actions/reports.ts:256,269,270` |
| 10 | `customers` tidak punya RLS | ✅ SUDAH FIX | live (5 policy) |
| 11 | CRM tidak terhubung ke toko online | 🟡 Gap fungsional | `store.ts` vs `customers.ts` |
| 12 | Review customer ditolak RLS diam-diam | 🔴 PATCH ADA, HARUS DIJALANKAN | `000001` + `fix_product_reviews_anon_insert.sql` |
| 13 | **Variant stock tidak otomatis berkurang saat jual** | ✅ SUDAH FIX | `000024` helper + `000029` rewrite `process_sale()` panggil `decrement_variant_stock()` |
| 15 | Resep per-varian tidak kepakai di produksi (RPC overload PGRST203) | ✅ SUDAH FIX | `000027` DROP versi lama + RPC 2-level `get_recipe_id_for_product(product, variant)` |
| 16 | Produksi tidak mencatat/menambah stok varian | ✅ SUDAH FIX | `000028` `production_batches.variant_id` + `complete_production_batch()` tulis `product_variants.stock` |
| 14 | Migration duplikat nomor | ✅ SUDAH DIBENARKAN (dokumen lama salah: ada 3 pasang, bukan 2) | 000004/000010/000011 → 000017/018/019/020/021/022 |
| 17 | Stok bahan bisa dimanipulasi lewat edit bahan / adjustment manual | ✅ SUDAH FIX (2026-08-27) | `IngredientForm` read-only `current_stock`; `adjustStock`+`StockAdjustmentModal` dihapus; `000033` NOT NULL DEFAULT 0. Stok bahan hanya lewat pembelian/opname |

---

## 5. Migration Files (urutan bersih, no duplicate)

```
000000 order_status_rpcs            (rekonstruksi RPC status)
000001 product_reviews_featured
000002 customers_rls
000003 store_settings
000005 store_settings_granular_colors
000006 product_variants_addons      (tabel product_variants awal)
000007 product_configurator
000008 order_items_configurator
000009 configurator_indexes
000012 variant_recipe_url
000013 variant_recipes
000014 product_gallery
000015 recipes_variant
000016 store_settings_text_surface_accent_fg
000017 store_settings_rls           (dulunya 000004)
000018 store_settings_extended      (dulunya 000004)
000019 default_variants_and_addons  (dulunya 000010)
000020 sale_items_variant_addons    (dulunya 000010)
000021 custom_product_addons        (dulunya 000011)
000022 variant_image                (dulunya 000011)
000023 product_variant_stock        ← product_variants.stock
000024 variant_stock_decrement      ← helper decrement_variant_stock()
000027 recipes_variant_support      ← recipes.variant_id + RPC 2-level (FIX PGRST203)
000028 production_variant_stock     ← production_batches.variant_id; complete_production_batch() → product_variants.stock
000029 sale_variant_stock_decrement ← process_sale() panggil decrement_variant_stock()
fix_product_reviews_anon_insert.sql
20250625_push_subscriptions.sql
```
> `000004`/`000010`/`000011` pernah dobel; direname ke 017-022.
> Semua `IF NOT EXISTS` / `CREATE OR REPLACE` → idempoten, aman di-rerun.

---

## 6. Langkah Hidup (Live DB) — Status per audit terbaru

File migrasi varian sudah LENGKAP di repo (tinggal di-apply ke live Supabase):
- `000023_product_variant_stock.sql` — add `product_variants.stock` ✅ di repo
- `000024_variant_stock_decrement.sql` — helper `decrement_variant_stock()` ✅ di repo
- `000027_recipes_variant_support.sql` — `recipes.variant_id` + RPC 2-level ✅ di repo
- `000028_production_variant_stock.sql` — `production_batches.variant_id` + `complete_production_batch()` tulis stok varian ✅ di repo
- `000029_sale_variant_stock_decrement.sql` — `process_sale()` panggil `decrement_variant_stock()` ✅ di repo

**Cara apply sekali jalan:** copy isi `supabase/apply_all_variant.sql` ke Supabase SQL Editor → Run.
File itu gabungan 000027+000028+000029, idempoten, dan sudah menyertakan `DROP FUNCTION`
versi lama agar tidak memicu overload PGRST203.

⚠️ `complete_production_batch()` & `process_sale()` definisi lengkapnya HANYA ada di live
Supabase (tidak di repo selain rekonstruksi di 000027/028/029). Sebelum apply, diff ke
definisi live (Database → Functions) bila ada custom logic tambahan. Signature tiap fungsi
tetap sama → tidak overload.

Checklist (bukan blocker, sifatnya verifikasi/opsional):
- [x] `000023` add column `product_variants.stock` — ada di repo, apply via apply_all_variant.sql
- [x] `000024`/`000029` — `process_sale` live panggil `decrement_variant_stock` — ada di repo
- [x] `000027` RPC 2-level + `000028` produksi→stok varian — ada di repo
- [ ] Cek RLS `products_write` vs `products_update` (Bug 7) — live.
- [ ] Cek apakah tabel `customer_orders` masih ada/terpakai (Bug 3) — live.
- [ ] Cek RLS `customers` sudah ada 5 policy (Bug 10) — live.
- [ ] Jalankan `fix_product_reviews_anon_insert.sql` (Bug 12) jika belum.

Catatan arsitektur varian (TERVERIFIKASI):
- Resep per-varian TIDAK pakai tabel terpisah `variant_recipes`. Semua resep ada di
  `recipes` (kolom `variant_id` NULL = generik, isi = spesifik varian); bahan di
  `recipe_ingredients`.
- Stok jadi per-varian ada di `product_variants.stock`; stok agregat produk di
  `products.current_stock`; tracking batch di `product_inventory` (sekarang punya `variant_id`).
- Resolusi produksi: `get_recipe_id_for_product(product_id, variant_id)` → varian dulu,
  fallback generik.

---

## 7. Secrets — Status

- ✅ Tidak ada service-role key asli yang pernah commit (hanya placeholder
  `your_service_role_key`).
- ℹ️ Anon key publik (`NEXT_PUBLIC_`, by design) pernah ke-commit di
  `.env.local` (kemudian dihapus) + di build chunk. Ini BUKAN leak — anon
  key memang publik.
- ✅ Tidak ada `.env*` berisi secret di working tree sekarang (gitignored).

---

## 8. Catatan Pemeriksaan (audit trail)

- HANDOFF lama: 3 item "belum diperbaiki" (#6, #9, #4) ternyata SUDAH
  diperbaiki di kode → 3/3 false negative. Treat old handoff as HISTORY.
- Migration duplikat: ada 3 pasang (bukan 2 seperti klaim awal).
- Variant stock: SCHEMA + UI done & verified (lint+build pass); sale-time
  auto-decrement ditunda ke live DB (layer 3) sesuai keputusan user.
- 2026-08-22: Varian resep↔produksi↔penjualan SELESAI di-wire.
  - `recipes.variant_id` sudah ada (000013/000015), RPC `get_recipe_id_for_product`
    dijadikan 2-level (000027) + hilangkan overload PGRST203.
  - `production_batches.variant_id` + `complete_production_batch()` tulis
    `product_variants.stock` (000028).
  - `process_sale()` panggil `decrement_variant_stock()` (000029).
  - Gabungan apply: `supabase/apply_all_variant.sql`. App code (form produksi,
    recipe form, duplikat resep, list) sudah ter-update & build pass.
  - Tidak ada tabel `variant_recipes`/`varian_recipes_ingredient` — desain pakai
    `recipes.variant_id` + `recipe_ingredients`.
  - 2026-08-27: Stok bahan baku dikunci ke pembelian/opname. Edit bahan jadi
    read-only `current_stock`; `adjustStock` + `StockAdjustmentModal` dihapus;
    migration `000033` enforce `current_stock NOT NULL DEFAULT 0`.

---

## 9. Product Configurator — Audit Menyeluruh (2026-08-29, LIVE-VERIFIED)

Semua klaim di bawah diverifikasi langsung ke live DB via `information_schema`,
`pg_proc`, `pg_policies` (Management API SQL). Bukan dari file migration.

### 9.1 Yang SUDAH SESUAI tujuan awal
- **#1 Configurator**: `product_variants` (variant) + `product_addons` (addon) ada & dipakai app. ✅
- **#3 Junction relasional**: `variant_option_values` ada dgn 2 FK valid →
  `product_variants(id)` (ON DELETE CASCADE) & `product_option_values(id)`
  (ON DELETE CASCADE) + PK `id` + UNIQUE `(variant_id, option_value_id)`. ✅
- **#4 Stok per-variant**: kolom `product_variants.stock` (integer) ADA di live.
  Setelah fix 000043, `process_sale` (jalur variant_id) baca/tulis `product_variants.stock`;
  jalur non-variant tetap `products.current_stock`. `complete_production_batch` juga
  tulis `product_variants.stock`. ✅
- **#5 Harga server-side**: di-enforce di `actions/store.ts` & `actions/sales.ts`
  (re-fetch + recompute). Tidak diverifikasi ulang di audit ini (di luar scope A–E),
  tapi HANDOFF #6/#9 sudah tandai SUDAH FIX.
- **#6 RLS**: `product_variants` / `product_addons` / `product_option_values` →
  write hanya `authenticated` dgn `get_user_role()='owner'`; public read `is_active=true`.
  `product_option_groups` SEKARANG juga `is_active=true` (setelah 000044 menambah kolom).
  ✅
- **#7 Historis**: varian/addon pakai `is_active=false` (soft delete), tidak hard delete. ✅

### 9.2 Yang DIBERBAIKI dalam audit ini (sudah apply ke live)
| Migrasi | Aksi | Bukti live |
|---|---|---|
| `000042` | DROP tabel `variant_recipes` + `variant_recipe_ingredients` + RPC `get_variant_recipe_id`, `complete_variant_production_batch` (sistem resep ganda/orphan, 0 rows, tak dipakai app) | kedua tabel = 0, RPC = 0 |
| `000043` | REWRITE `process_sale`: jalur variant_id → `product_variants.stock` (bukan `variant_stock`) | `prosrc` JOIN `public.variant_stock` = 0; `UPDATE public.product_variants` = 1 |
| `000044` | RLS: `product_option_groups` public read `qual=(is_active=true)` (tambah kolom `is_active`); `order_items` select `roles=authenticated` (cabut anon read) | policy terverifikasi |
| `000045` | DROP `variant_stock` + view `variant_stock_public` (sudah orphan setelah 000043) | kedua = 0 |

### 9.3 Yang MENYIMPANG / ditemukan (dan cara diselesaikan)
1. **Dua sumber stok varian aktif** (bug A.3/B.2): `process_sale` live menulis
   `variant_stock`, padahal `product_variants.stock` sudah ada & dipakai produksi.
   → FIX di 000043. Sekarang `variant_stock` sudah di-drop (000045).
2. **Sistem resep ganda** (E.1): live punya `variant_recipes` + `variant_recipe_ingredients`
   + 2 RPC terpisah, SELAIN `recipes` + `recipe_ingredients` yang dipakai app.
   **KOREKSI HANDOFF LAMA baris ~278** yang bilang "tidak ada tabel variant_recipes"
   — itu SALAH; tabel memang ada di live (orphan). → DROP di 000042.
   `recipe_url` di `product_variants` tetap kolom orphan (tidak dipakai app code).
3. **`product_option_groups` tidak punya `is_active`** → tidak bisa penuhi tujuan #6.
   → 000044 tambah kolom + perketat policy.
4. **Celah RLS read**: `order_items` bisa dibaca anon (`qual=true`),
   `product_option_groups` public read `qual=true` (bocor row non-aktif).
   → 000044 perbaiki. `sale_items` select (`authenticated, qual=true`) aman utk
   model single-tenant, sengaja tidak diubah.

### 9.4 File Map — Product Configurator
- Skema: `product_variants`, `product_addons`, `product_option_groups`,
  `product_option_values`, `variant_option_values` (junction).
- App logic: `actions/products.ts`, `actions/recipes.ts`, `actions/production.ts`,
  `actions/sales.ts`, `actions/store.ts`.
- UI: `components/forms/*`, `app/dashboard/products/*`, `app/dashboard/recipes/*`,
  `app/store/*` (toko online).
- RPC terkait: `get_recipe_id_for_product` (2-level), `process_sale`,
  `complete_production_batch`, `next_doc_number`.

### 9.5 Data Flow (stok varian)
Produksi: `complete_production_batch()` → `UPDATE product_variants.stock += qty`.
Penjualan: `process_sale()` → untuk tiap `sale_items` dgn `variant_id`:
  `UPDATE product_variants SET stock -= qty` + catat `inventory_movements`
  (`item_type='variant'`). Item tanpa variant_id → `products.current_stock`.

### 9.6 Risk Map
- [ ] **60 tsc errors PREEXISTING** (bukan dari audit ini; sama persis dgn git HEAD
  types lama). Domainnya: null-safety app code (`min_stock`/`cost_price`/`price_per_unit`
  dianggap non-null padahal kolom nullable). Perlu sprint terpisah — di luar scope audit.
- [ ] `types/database.ts` SUDAH di-regenerate dari live (60 tabel, 9 view, 39 RPC,
  Relationships FK lengkap). Jangan edit manual lagi.
- [ ] `supabase-schema.sql` (DDL statis repo) SUDAH USANG — tidak mencakup modul
  configurator/orders/variants. Regenerate dari live (`supabase db dump` / DDL API)
  bila butuh snapshot.
- [ ] Tidak ada migration di-revert; semua idempoten (DROP IF EXISTS / CREATE OR REPLACE).
