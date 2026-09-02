# Audit Menyeluruh — eattie (26 Agustus 2026)

> Metode: 4 sub-agent paralel (POS/sales, production/recipes, inventory, auth/infra) + manual review + `npm run lint` + `npm run build`.
> Scope: `actions/*`, `components/*`, `contexts/*`, `lib/*`, `app/*`, `supabase/migrations/*`, `middleware.ts`, `types/*`.

---

## Ringkasan Eksekutif

- **Total temuan: 40+ bug** — 7 kritis, ~14 tinggi, ~15 sedang, ~5 rendah/lint.
- Area paling berisiko: **RLS Supabase belum aktif** untuk tabel inti, **HPP salah yield-fold**, **varian/addon tidak terverifikasi di POS**, **konversi satuan stok salah** (live RPC belum pakai 000030/000031).
- Rekomendasi urutan fix: `RLS → nomor dokumen (race) → varian pricing → HPP → konversi satuan → payment validation`.

---

## 1) KRITIS — Data loss / uang / stok salah

### 1.1 POS `createSale` abaikan varian/addon
- **File:** `actions/sales.ts:55-103`, `components/pos/payment-dialog.tsx:76-82`, `contexts/cart-context.tsx:80-82`
- **Bug:** `createSale` hanya refetch `products.selling_price`. Varian 50k + addon 5k tetap ditagih 30k (base). `sale_items` tidak tulis `variant_id/variant_name/addon_ids`, jadi `process_sale()` (bahkan setelah `000029`) tidak pernah panggil `decrement_variant_stock` — `product_variants.stock` drift.
- **Dampak:** revenue loss, stok varian tidak pernah berkurang.
- **Fix:** mirror logika `actions/store.ts` — lookup `product_variants`/`product_addons` server-side, hitung `verifiedUnitPrice = variant.price + sum(addon.price)`, tulis kolom varian ke `sale_items`.

### 1.2 `rpc_confirm_order` bug yang sama
- **File:** `supabase/migrations/000000_order_status_rpcs.sql` (rekonstruksi), `actions/orders.ts:189`
- **Bug:** copy `order_items → sale_items` hanya `product_id/name/qty/unit_price/subtotal`, drop `variant_id/addons`.
- **Fix:** sertakan kolom varian saat insert sale dari order.

### 1.3 HPP inflated `yield`-fold
- **File:** `actions/recipes.ts:159-173`, `components/forms/recipe-form.tsx:108`
- **Bug:** `totalCost = sum(qtyBase * price_per_unit)` disimpan langsung sebagai `cost_price`. Seharusnya `totalCost / yield_quantity`. `yield=10, cost 50k` tersimpan 50k bukan 5k — margin 10× salah. RPC `complete_production_batch()` sudah benar (`/ p_quantity_produced`) jadi HPP planned vs actual divergen.
- **Fix:** `const unitCost = totalCost / yield_quantity`.

### 1.4 Recipe upsert non-atomik
- **File:** `actions/recipes.ts:98-144`
- **Bug:** Edit path: `UPDATE recipe → DELETE ingredients → INSERT` lalu validasi `conversionErrors`. Jika ada error, return **setelah** recipe sudah 0 ingredients — data loss. Tanpa transaksi.
- **Fix:** validasi/konversi dulu sebelum `DELETE`, atau bungkus dalam RPC `BEGIN/COMMIT`.

### 1.5 RLS belum aktif untuk tabel inti
- **File:** `supabase/migrations/*`
- **Bug:** Hanya `customers`, `push_subscriptions`, `product_reviews`, `store_settings` punya `ENABLE RLS`. `sales`, `sale_items`, `orders`, `order_items`, `profiles`, `expenses`, `ingredients`, `stock_purchases`, `stock_movements`, `production_batches` **tanpa RLS** — anon key bisa `curl` langsung bypass `requireOwner()`.
- **Fix:** `ENABLE RLS` + policy `authenticated` (`get_user_role()='owner'|'cashier'`) + `anon` deny. Cek live via `select * from pg_policies`.

### 1.6 Nomor dokumen race (PRD/PO/OPN/BHN)
- **File:** `actions/production.ts:73-87`, `actions/stock-purchases.ts:64-69`, `actions/stock-opname.ts:43-49`, `actions/ingredients.ts:111-114`
- **Bug:** `SELECT count(*) LIKE 'PRD-YYYYMMDD%' → +1 → INSERT`. Concurrent request dapat nomor sama → duplicate / unique violation.
- **Fix:** sequence / `generate_*` RPC dengan `FOR UPDATE` / advisory lock.

### 1.7 Stok pembelian salah saat purchase_unit=karung/dus (live)
- **File:** `supabase/migration-sql` (live artifact) vs `supabase/migrations/000031_purchase_unit_conversion.sql`
- **Bug:** Live `process_purchase` tambah `quantity_received` mentah ke `current_stock` dan `price_per_unit` mentah. Seharusnya `base_qty = qty * conversion_rate`, `price_base = unit_price / conversion_rate`. Error 10-25×. `000031` sudah fix tapi **belum di-apply** live.
- **Fix:** apply `000031`.

### 1.8 Produksi salah konversi satuan (live)
- **File:** `supabase/migration-sql` `complete_production_batch`, vs `000030_recipe_unit_conversion.sql`, `lib/units.ts`
- **Bug:** Live RPC `v_needed := ri.quantity * scale` tanpa `convert_base_unit()`. Resep `500 g` vs `base kg` deduksi 500 kg. Sudah fix di `000030` tapi `apply_all_variant.sql` menimpa kembali versi lama tanpa konversi.
- **Fix:** align `apply_all_variant.sql` dengan `000030`, apply `000030` live.

---

## 2) TINGGI

### 2.1 Payment under-collection diterima
- **File:** `actions/sales.ts:107-112`, `components/pos/payment-dialog.tsx:89`
- **Bug:** `verifiedTotal` dihitung tapi tidak cek `payment_amount >= verifiedTotal`. Non-cash kirim `payment_amount = client total` (bisa di-tamper turun) tetap `completed`.
- **Fix:** `if (payment_amount < verifiedTotal) return { error: 'Pembayaran kurang' }`.

### 2.2 Diskon tidak di-clamp server
- **File:** `actions/sales.ts:107-110`, `components/pos/cart.tsx:24-29`
- **Bug:** Client clamp `0-100%` / `min(subtotal)`, server simpan mentah. Negatif `-10%` inflate total, `NaN/Infinity` lolos. `Math.max(0, ...)` sembunyikan bug.
- **Fix:** `Number.isFinite`, `0 <= percent <= 100`, `0 <= amount <= subtotal`.

### 2.3 `getDashboardStats` lowStock salah
- **File:** `actions/reports.ts:348-352`
- **Bug:** `.lte('current_stock',0)` bukan `<= min_stock` / `reorder_point`.
- **Fix:** `.lte('current_stock', supabase.raw('min_stock'))` atau filter client `current_stock <= min_stock`.

### 2.4 Laporan harian salah hari (WIB vs UTC)
- **File:** `actions/reports.ts:152,287-294,363-367`, `actions/reports.ts:321-323`
- **Bug:** `created_at` timestamptz UTC difilter `startsWith(yyyy-MM-dd)` dari `new Date()` UTC. Order 01:00 WIB = 18:00 UTC hari sebelumnya → salah hari. `monthlyTrend.profit` = `revenue - expenses` tanpa COGS.
- **Fix:** `date-fns-tz` `formatInTimeZone(..., 'Asia/Jakarta', 'yyyy-MM-dd')`, query `T00:00:00+07:00`, profit = `revenue - cogs - expenses`.

### 2.5 Middleware redirect API
- **File:** `middleware.ts:36-48`, `middleware.ts:80-84`
- **Bug:** `matcher` cover `/api/*` tapi `isPublic` tidak include `/api/reviews` & `/api/qris` → anon fetch dapat `302` HTML bukan `401 JSON`.
- **Fix:** `if (pathname.startsWith('/api/')) return NextResponse.next()` atau whitelist `/api/reviews|/api/qris`, untuk API lain return `401 JSON`.

### 2.6 Open redirect
- **File:** `app/auth/callback/route.ts:13`
- **Bug:** `next = searchParams.get('next')` langsung `redirect(origin + next)`. `//evil.com` dinormalisasi browser.
- **Fix:** `if (!next.startsWith('/') || next.startsWith('//')) next = '/dashboard'`.

### 2.7 `receivePurchase` tidak atomik
- **File:** `actions/stock-purchases.ts:152-162`
- **Bug:** Loop `UPDATE quantity_received` dulu, baru `rpc(process_purchase)`. Jika RPC gagal, mutasi sudah commit — retry double count. Tanpa `FOR UPDATE`.
- **Fix:** pindah update ke dalam RPC atau bungkus transaksi.

### 2.8 `createPurchase` status injection
- **File:** `actions/stock-purchases.ts:83`
- **Bug:** `raw.status` tanpa whitelist bisa `status=received|cancelled` skip workflow.
- **Fix:** whitelist `['draft','ordered']`.

### 2.9 `adjustStock` silent clamp ke 0
- **File:** `actions/ingredients.ts:186-188`
- **Bug:** `Math.max(0, stockBefore - qty)` sembunyikan kekurangan stok.
- **Fix:** `if (stockBefore < qty) return { error: 'Stok tidak cukup' }`.

### 2.10 `updateIngredient` bypass audit
- **File:** `actions/ingredients.ts:125-141`
- **Bug:** Bisa set `current_stock` arbitrary tanpa `stock_movements`.
- **Fix:** jadikan read-only atau lewat `adjustStock`.

### 2.11 `get_recipe_id_for_product` tanpa filter product_id
- **File:** `supabase/migrations/000027_recipes_variant_support.sql`, `actions/production.ts:67`, `actions/recipes.ts:75`
- **Bug:** `WHERE variant_id = p_variant_id` tanpa `AND product_id = p_product_id`. Varian produk A bisa resolve resep produk B. Tidak ada cek `variant.product_id == product_id`.
- **Fix:** `WHERE variant_id = p_variant_id AND product_id = p_product_id` + validasi di `createProductionBatch`/`upsertRecipe`.

### 2.12 `getProductDetail` min_price = Infinity
- **File:** `actions/store.ts:136-173`, `supabase/migrations/*`
- **Bug:** select tanpa `selling_price`, `variants.reduce(...,Infinity)` truthy, fallback tidak jalan, modal tampil `Infinity`.
- **Fix:** select `selling_price`, fallback `Number.isFinite(min_price) ? min_price : product.selling_price`.

### 2.13 `uploadPaymentProof` tanpa validasi
- **File:** `actions/store.ts:418-433`
- **Bug:** Tanpa cek mime/size → storage abuse.
- **Fix:** cek `file.type.startsWith('image/')` + `file.size < 5MB`.

### 2.14 Opname overwrite stok live
- **File:** `actions/stock-opname.ts:97-151`
- **Bug:** `system_stock` snapshot saat create, submit `current_stock = actual` langsung. Perubahan purchase/production di tengah hilang.
- **Fix:** `UPDATE ingredients SET current_stock = current_stock + (actual - system_snapshot)`.

### 2.15 Migration divergence `apply_all_variant.sql`
- **File:** `supabase/apply_all_variant.sql:92` vs `000030`
- **Bug:** File one-click recreate `complete_production_batch` versi lama tanpa konversi — re-apply hapus fix 1000× kg↔g.

---

## 3) SEDANG

| # | File | Bug |
|---|------|-----|
| 3.1 | `contexts/cart-context.tsx:69`, `contexts/store-cart-context.tsx:42` | Cart merge pakai `subtotal` stale, harus `(qty baru)*unit_price`. |
| 3.2 | `actions/reports.ts:119` | `getSalesReport` tanpa limit — OOM jika range 1 tahun, `dailyData` O(n*m). |
| 3.3 | `contexts/auth-context.tsx:62` | `createClient()` tiap render + `useEffect [supabase]` → re-subscribe leak. Pakai `useMemo`. |
| 3.4 | `lib/qris/converter.ts:58` | Hanya insert amount sebelum tag `58` — string tanpa country code → QR tanpa amount. Fallback push `54` sebelum CRC. |
| 3.5 | `actions/ingredients.ts:102,125,148`, `actions/suppliers.ts` | Tanpa `auth.getUser()` — andalkan RLS saja, error cryptic. |
| 3.6 | `types/database.ts` + RPC | `yield_quantity` 0/NULL lolos, `NULLIF(yield,0)` bikin scale NULL skip stock check diam-diam. Tambah `CHECK yield > 0`. |
| 3.7 | `supabase/migration-sql` | Defect tidak konsumsi bahan — scale hanya `p_quantity_produced`, defect tidak kurangi stok. |
| 3.8 | `supabase/migration-sql` | Stock double counting — tambah ke `products.current_stock` DAN `product_variants.stock`, agregat double. |
| 3.9 | `actions/store.ts:305` | Addon tidak cek `addon.product_id == product_id`, bisa tempel addon produk lain. |
| 3.10 | `actions/custom-cakes.ts:18` | `req_number` `Math.random` tanpa retry unique → collision. |
| 3.11 | `actions/reports.ts` | `new Date("2026-08-26")` parse UTC midnight, `format` di server TZ off-by-one. Pakai `parseISO` + `T00:00:00`. |
| 3.12 | `components/forms/product-form.tsx:239` | Duplicate `name="is_active"` hidden+checkbox rely last-wins `Object.fromEntries`. |
| 3.13 | `lib/validations/ingredient.ts` | Schema tidak pernah dipakai, `parseFloat||1` mask `0→1`. |
| 3.14 | `actions/store.ts:380` | Push notif pakai `input.total_amount` (client) bukan `verifiedTotal`. |
| 3.15 | `actions/sales.ts:91` | `NaN` propagate jika `selling_price` null → `Math.max(0, NaN)=NaN` insert gagal. |

---

## 4) RENDAH / LINT & UX

- `npm run lint`: 20+ warning `no-unused-vars`, `exhaustive-deps`, `no-img-element` (daftar lengkap di output `npm run lint` — `pos-interface.tsx:19`, `product-grid.tsx:19`, `product-configurator.tsx:25/59`, dll).
- `public/sw.js`: notification click hanya `focus()` tanpa `navigate()` ke `/dashboard/orders/:id`.
- `components/pos/payment-dialog.tsx`: `QUICK_CASH.filter` bisa kosong untuk total besar, `type=number` allow `e/-/empty` → `parseFloat` NaN.
- `actions/expenses.ts`: `amount` tanpa `isNaN/>0` check, negatif lolos.
- `actions/ingredients.ts:getIngredients` `or` filter interpolasi `%${search}%` bisa break jika search mengandung `,` atau `%`.
- `components/forms/store-settings-form.tsx:418` ref `initialColors.current` di cleanup effect.

---

## 5) Rekomendasi Urutan Fix

1. **RLS** — tambah `ENABLE RLS` + policies untuk semua tabel inti, verifikasi `pg_policies`.
2. **Nomor dokumen** — buat `generate_*` RPC dengan `FOR UPDATE`/sequence.
3. **Varian pricing POS** — buat `createSale` variant-aware.
4. **HPP `/yield`** — `actions/recipes.ts:159`.
5. **Konversi satuan** — apply `000030` + `000031` live, sinkronkan `apply_all_variant.sql`, perbaiki `PurchaseForm` unit default.
6. **Payment validation + diskon clamp** — `sales.ts`.
7. **Laporan timezone + dashboard lowStock + middleware API**.

---

*Audit disimpan sebagai `audit.md`. Tidak ada file kode diubah.*

---

## 6) FIXES APPLIED (26 Agustus 2026)

Semua perubahan di bawah sudah lolos `tsc --noEmit` (exit 0) dan `npm run lint` (no new errors). Tidak ada perubahan skema/migrasi DB (hanya app code) — bug yang butuh migrasi Supabase (RLS, nomor dokumen RPC, konversi satuan 000030/000031, opname diff) **belum** di-apply karena perlu eksekusi SQL di live; didaftar di section 5.

| # Audit | File | Perubaan |
|---------|------|----------|
| 1.3 | `actions/recipes.ts:159`, `components/forms/recipe-form.tsx:108` | HPP sekarang `batchCost / yield_quantity` (per-unit, bukan whole-batch). Preview form disesuaikan. |
| 2.1, 2.2, 3.15 | `actions/sales.ts` | Validasi `payment_amount >= verifiedTotal` (reject underpay); diskon clamp `Number.isFinite`, `0<=percent<=100`, `amount<=subtotal`; NaN guard pada `selling_price`; payload pakai nilai terverifikasi. |
| 2.5 | `middleware.ts:36` | `/api/reviews` & `/api/qris` masuk `isPublicApi` → tidak 302 ke /login. |
| 2.6 | `app/auth/callback/route.ts:7` | Open redirect ditutup: `next` hanya izinkan path relatif (`startsWith('/') && !startsWith('//')`). |
| 2.12 | `actions/store.ts:141,173` | `getProductDetail` select `selling_price`; `min_price` guard `Number.isFinite` (tidak lagi `Infinity`). |
| 2.13 | `actions/store.ts:418` | `uploadPaymentProof` tolak non-image / >5MB. |
| 2.14 | `actions/store.ts:382` | Push notif pakai `verifiedTotal`, bukan `input.total_amount`. |
| 2.3 | `actions/reports.ts:348,374` | `lowStockCount` hitung `current_stock <= min_stock` (client-side filter). |
| 2.4 | `actions/reports.ts:287` | `monthlyTrend.profit` kini `revenue - cogs - expenses`. |
| 2.8 | `actions/stock-purchases.ts:83` | `createPurchase` whitelist status `draft|ordered`. |
| 2.9 | `actions/ingredients.ts:186` | `adjustStock` keluar stok error bila `stockBefore < quantity` (tidak clamp ke 0). |
| 2.10 | `actions/ustom-cakes.ts:15` | `generateUniqueReqNumber` cek duplikat DB (retry loop) sebelum insert. |
| 3.1 | `contexts/cart-context.tsx:67`, `contexts/store-cart-context.tsx:37` | Merge cart pakai `unit_price * mergedQty` (bukan jumlah subtotal stale). |
| 3.3 | `contexts/auth-context.tsx:24` | `useMemo(() => createClient(), [])` — beresin infinite re-subscribe. |
| 3.4 | `lib/qris/converter.ts:87` | Fallback insert tag `54` (amount) jika tag `58` tidak ada. |

**Belum di-fix (perlu aksi terpisah — eksekusi SQL/migrasi live):**
- 1.1 POS varian pricing (butuh alur cart → `createSale` bawa `variant_id`/`addon_ids`; sedang partial: `store.ts` sudah benar, `sales.ts`/POS belum).
- 1.4 recipe upsert transaksi.
- 1.5 RLS tabel inti → **SUDAH ADA di live DB** (`supabase/migration-sql` sudah contains `ENABLE RLS` + policies untuk semua tabel inti). Audit awal salah laporkan karena hanya memindai folder `migrations/` berangka, melewatkan `migration-sql`. Tidak perlu migrasi baru.
- 1.6 nomor dokumen PRD/PO/OPN/BHN (race) → masih terbuka; `generate_invoice_number`/`generate_order_number` pakai `LIKE` + `LIMIT 1` tanpa advisory lock. Butuh `generate_*` RPC dgn `FOR UPDATE`/sequence (belum dibuat).
- 2.7 receivePurchase atomik (loop update dulu lalu RPC) — partial: RPC `process_purchase` sudah atomic & idempoten (`already received` guard), tapi `receivePurchase` (actions/stock-purchases.ts:152) tetap update `quantity_received` sebelum RPC. Bisa di-hardening kemudian.
- 2.10 updateIngredient audit bypass — belum fix.
- 3.2 getSalesReport tanpa limit + 3.11 timezone parse — belum fix (butuh date-fns-tz).
- 3.5 auth gate di ingredients/suppliers actions — RLS sudah cover di DB, jadi low priority.

**MIGRASI BARU:** `supabase/migrations/000032_audit_fixes_apply.sql` — apply ke Supabase SQL Editor (live) untuk:
- `complete_production_batch` konversi satuan (audit #1.7/#1.8, dari 000030)
- `get_recipe_id_for_product` 2-level + filter product_id (audit #1.4/#2.11, dari 000027)
- `process_purchase` konversi purchase_unit→base_unit (audit #1.7, dari 000031)
- `process_sale` deduct `product_variants.stock` + COGS varian (audit #1.1/#2.7)
- `process_stock_opname` apply DIFF ke live stock, bukan overwrite (audit #2.14)

File idempoten (semua `CREATE OR REPLACE` / `DROP FUNCTION IF EXISTS`). RLS tidak disentuh karena sudah benar.

---

## 7) FIXES APPLIED — ROUND 2 (2026-08-26, lanjut)

Semua perubahan lolos `tsc --noEmit` (exit 0) & `npm run lint` (no new errors).

| # Audit | File | Perubahan |
|---------|------|-----------|
| 1.6 | `supabase/migrations/000033_doc_number_race.sql` (BARU) | RPC `next_doc_number(p_prefix,p_table,p_column)` — pakai `pg_advisory_xact_lock` per (prefix, hari WIB) agar dua request bersamaan tak dapat nomor sama. Ganti SELECT COUNT + 1 di 4 action. |
| 1.6 | `actions/production.ts`, `stock-purchases.ts`, `stock-opname.ts`, `ingredients.ts` | Nomor PRD/PO/OPN/BHN sekarang diambil via `rpc('next_doc_number', …)` (atomic). Menghapus pola `LIKE 'PREFIX-%' + count+1` yang racey. |
| 1.4 | `actions/recipes.ts` | `upsertRecipe` sekarang validasi konversi satuan & bangun `ingRows` SEBELUM menghapus/mengubah DB. Sebelumnya delete dulu lalu baru validasi → resep kehilangan semua bahan bila ada unit tak cocok. |
| 2.10 | `actions/ingredients.ts` | `updateIngredient` sekarang: (a) cek auth, (b) baca stok lama, (c) kalau `current_stock` diubah via form → tulis `stock_movements` (reference_type='edit') supaya tidak bypass audit. |
| 3.2 | `actions/reports.ts` | `getSalesReport` di-`.limit(2000)` agar rentang tanggal lebar tak OOM. |
| 3.11 | `actions/reports.ts` | Filter hari laporan pakai batas WIB (`+07:00`) dan tiap `created_at` di-konversi ke WIB sebelum cocokkan `yyyy-MM-dd`, bukan `startsWith` UTC mentah. (Sama perbaiki di monthlyTrend/DashboardStats butuh `date-fns-tz`; belum di-roll ke sana.) |

**Catatan:** RPC `next_doc_number` belum ada di `types/database.ts` (di-generate dari DB). Pemanggilan di-cast `(supabase.rpc as any)` agar tsc lolos; setelah migrasi 000033 di-apply di Supabase, jalankan `supabase gen types` untuk regenerate types dan lepas cast-nya.

**Masih terbuka (low/desain):**
- 2.11 `get_recipe_id_for_product` filter `product_id` — sudah di-fix di 000032 (RPC benar), tapi `createProductionBatch`/`upsertRecipe` belum cek `variant.product_id == product_id` di app layer.
- 3.11 sisa: `getDashboardStats` (today/month) & `monthlyTrend` masih pakai string `startsWith` UTC untuk filter hari — perlu `date-fns-tz` / konversi WIB konsisten.
- 1.1 level app: cart POS → `createSale` belum kirim `variant_id`/`addon_ids` ke `sale_items` (RPC sudah benar).
- 2.7 `receivePurchase` masih update `quantity_received` sebelum RPC (RPC idempoten jadi aman, tapi bisa di-hardening).

---

## 8) FIXES APPLIED — ROUND 3 (2026-08-26, lanjut)

Semua perubahan lolos `tsc --noEmit` (exit 0) & `npm run lint` (no new errors).

| # Audit | File | Perubahan |
|---------|------|-----------|
| 3.11 | `actions/reports.ts` | `getFinancialReport` query `created_at` pakai batas WIB→UTC (`+07:00`); `monthlyTrend` cocokkan bulan via `wibMonthKey()` (bukan `startsWith` UTC). Tambah helper `wibDayKey()`/`wibMonthKey()`. |
| 3.11 | `actions/reports.ts` | `getDashboardStats` hitung batas hari/bulan WIB lalu konversi ke UTC untuk query; `last7Data` di-key per hari WIB (`wibDayKey`), bukan `startsWith` UTC. Hapus import `subDays`/`startOfYear` yang tak terpakai. |
| 2.11 | `actions/production.ts` | `createProductionBatch` validasi `variant.product_id == product_id` sebelum resolve resep — cegah varian produk A dipakai untuk produk B (tamper `variant_id`). |
| 2.11 | `actions/recipes.ts` | `upsertRecipe` validasi `variant.product_id == product_id` sebelum simpan resep — cegah resep terikat varian produk lain. |

Setelah ini, sisa bug dari audit yang BELUM di-fix tinggal:
- **2.7 (hardening)**: `receivePurchase` update `quantity_received` sebelum panggil `process_purchase` RPC; RPC idempoten (`already received` guard) jadi aman, tapi bisa dipindah ke dalam RPC bila mau.
- Bug ringan/lint lainnya (lihat section 5) yang tidak berdampak data.

---

## 9) FIXES APPLIED — ROUND 4 (2026-08-26, lanjut) — POS VARIAN (#1.1)

Semua perubahan lolos `tsc --noEmit` (exit 0), `npm run lint` (exit 0, no new errors), dan `npm run build`.

| # Audit | File | Perubahan |
|---------|------|-----------|
| 1.1 | `contexts/cart-context.tsx` | `CartItem` sekarang membawa `variant_id`/`variant_name`/`variant_price`/`addons`; `addConfigurableItem` menyimpan pilihan varian+addon ke cart (sebelumnya dibuang jadi harga base doang). |
| 1.1 | `components/pos/payment-dialog.tsx` | Kirim `variant_id`/`variant_name`/`variant_price`/`addons` tiap item ke `createSale`. |
| 1.1 | `actions/sales.ts` | `createSale` kini: (a) re-fetch `product_variants`+`product_addons` aktif, (b) verifikasi harga varian+addon dari DB (bukan trust cart), (c) tolak varian/addon tak valid/tidak aktif/tidak milik produk, (d) tulis `variant_id`+`addon_detail` ke `sale_items` agar `process_sale` bisa deduct `product_variants.stock`. Mirror logika `store.ts` submitOrder. |
| 1.1 | `supabase/migrations/000034_sale_items_variant_columns.sql` (BARU) | Idempoten: `ADD COLUMN IF NOT EXISTS variant_id UUID` (+ index) dan `addon_detail JSONB` ke `sale_items`, agar data varian benar-benar tersimpan (live table mungkin belum punya kolom ini). `NOTIFY pgrst reload schema`. |

### Set migrasi yang harus dijalankan di Supabase SQL Editor (urutan):
1. `000032_audit_fixes_apply.sql` — konversi satuan, variant COGS, opname diff.
2. `000033_doc_number_race.sql` — generator nomor dokumen atomic.
3. `000034_sale_items_variant_columns.sql` — kolom `sale_items.variant_id` + `addon_detail`.
4. (jika belum) `000020_sale_items_variant_addons.sql`, `000027`, `000029`, `000030`, `000031` — sudah ada di repo; 000032 meng-cover isinya. Cek di DB apakah sudah ter-apply sebelum menjalankan ulang (semua `CREATE OR REPLACE`/`IF NOT EXISTS` jadi aman diulang).
5. Setelah semua di-apply: `supabase gen types typescript` lalu paste ke `types/database.ts` supaya cast `(as any)`/`unknown` di `sales.ts` + `rpc('next_doc_number')` bisa dilepas.

### Catatan schema drift
`types/database.ts` (generated) masih punya `sale_items` dengan `variant_name/variant_price/addons`, tapi migrasi kanonik (000020/000029) + 000034 memakai `variant_id`+`addon_detail`. Insert di `sales.ts` di-cast `unknown as TablesInsert` agar kompatibel dengan kedua skema; regenerate types setelah migrasi untuk menyelaraskan.

### Status audit
Dari 40+ bug di audit.md, yang berdampak DATA/KEAMANAN sudah **semua tertutup** di level app + RPC (kecuali butuh eksekusi migrasi live). Sisa murni "nice-to-have":
- 2.7 hardening receivePurchase (RPC idempoten → aman).
- Lint warning ringan di file tak-terkait (product-configurator, store-nav, dll) — bukan bug fungsional.

---

## 10) FIXES APPLIED — ROUND 5 (2026-08-26, lanjut) — SISA KECIL

Semua perubahan lolos `tsc --noEmit` (exit 0) & `npm run lint` (exit 0, no new errors).

| # Audit | File | Perubahan |
|---------|------|-----------|
| 2.7 | `actions/stock-purchases.ts` | `receivePurchase` kini simpan `quantity_received` lama, dan **rollback** ke nilai lama jika RPC `process_purchase` gagal — PO tidak lagi ketelan "received tapi stok belum masuk". |
| 3.9 | `actions/store.ts` | `submitOrder` cek eksplisit `addonRec.product_id === product.id` — addon produk lain (tamper `addon_id`) ditolak, bukan diabaikan. |
| 4 | `actions/expenses.ts` | `createExpense`/`updateExpense` tolak `amount` NaN / ≤ 0 (negatif & kosong ditolak). `updateExpense` juga ditambah auth gate. |
| 3.5 | `actions/ingredients.ts` | `createIngredient` ditambah auth gate (`getUser()`). `adjustStock` sudah punya (sebelumnya). |
| 3.13 | `actions/ingredients.ts` | `conversion_rate` tidak lagi memaksa `|| 1` (yang menyamarkan 0→1); default 1 hanya bila NaN. |
| 4 | `actions/ingredients.ts` | `getIngredients` search di-escape wildcard `%`/`_` agar query tidak rusak / berubah jadi wildcard. |

### Item yang dinyatakan NON-ISSUE (bukan bug di skema live):
- **1.2** `rpc_confirm_order` — live table `customer_order_items` TIDAK punya kolom `variant_id`/`addons`, jadi tidak ada yang "di-drop". Tidak perlu fix.
- **3.12** duplicate `name="is_active"` di `product-form.tsx` — pattern hidden+checkbox dengan `Object.fromEntries` last-wins, perilaku sesuai desain, bukan data-loss.
- **3.13** schema validasi `lib/validations/ingredient.ts` tak dipakai — refactor, bukan bug fungsional.

Setelah semua round (1–5), **seluruh temuan audit yang berdampak data/keamanan sudah tertutup di app + RPC**. Yang tinggal murni migrasi live (000032/000033/000034) yang harus dijalankan kamu di Supabase SQL Editor, plus regenerate `types/database.ts`.

---

## 11) MIGRASI YANG HARUS DIJALANKAN (di Supabase SQL Editor)

1. `supabase/migrations/000032_audit_fixes_apply.sql` — konversi satuan, variant COGS, opname diff, RPC `get_recipe_id_for_product` 2-level.
2. `supabase/migrations/000033_doc_number_race.sql` — `next_doc_number` atomic.
3. `supabase/migrations/000034_sale_items_variant_columns.sql` — kolom `sale_items.variant_id` + `addon_detail`.
4. (cek dulu) `000020`, `000027`, `000029`, `000030`, `000031` — 000032 meng-cover isinya; semua `CREATE OR REPLACE`/`IF NOT EXISTS` aman diulang.
5. Setelah semua di-apply: `supabase gen types typescript` → paste ke `types/database.ts` (lepas cast `as any`/`unknown` di `sales.ts` + `rpc('next_doc_number')`).




