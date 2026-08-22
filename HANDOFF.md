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
| `actions/production.ts` | Batch produksi |
| `actions/recipes.ts` | CRUD resep (owner-only) |

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
Opname → submitOpname() → RPC process_stock_opname (LIVE) → koreksi stok
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
| 13 | **Variant stock tidak otomatis berkurang saat jual** | 🔴 BARU — SCHEMA/UI OK, DEDUCT LIVE BELUM | `000023`+`000024` ada; `process_sale` live belum panggil |
| 14 | Migration duplikat nomor | ✅ SUDAH DIBENARKAN (dokumen lama salah: ada 3 pasang, bukan 2) | 000004/000010/000011 → 000017/018/019/020/021/022 |

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
000023 product_variant_stock        ← BARU: product_variants.stock
000024 variant_stock_decrement      ← BARU: helper decrement_variant_stock()
fix_product_reviews_anon_insert.sql
20250625_push_subscriptions.sql
```
> `000004`/`000010`/`000011` pernah dobel; direname ke 017-022.
> Semua `IF NOT EXISTS` / `CREATE OR REPLACE` → idempoten, aman di-rerun.

---

## 6. Langkah Hidup (Live DB) — TIDAK bisa diverifikasi dari repo

Butuh Supabase MCP / akses SQL Editor + `pg_policies`. Checklist:

- [ ] Jalankan `000023_product_variant_stock.sql` (add column).
- [ ] Jalankan `000024_variant_stock_decrement.sql` (buat fungsi helper).
- [ ] Buka live `process_sale()`, tempel snippet dari `000024` (ganti
      referensi `variant_stock` yang rusak dengan `decrement_variant_stock`),
      DIFF dulu vs definisi live sebelum apply.
- [ ] (Opsional) Tambah enforce stok di storefront/POS supaya customer
      tidak bisa order varian habis.
- [ ] Cek RLS `products_write` vs `products_update` (Bug 7) — live.
- [ ] Cek apakah tabel `customer_orders` masih ada/terpakai (Bug 3) — live.
- [ ] Cek RLS `customers` sudah ada 5 policy (Bug 10) — live.
- [ ] Jalankan `fix_product_reviews_anon_insert.sql` (Bug 12) jika belum.

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
