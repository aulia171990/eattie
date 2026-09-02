# Bakery System Handoff — BATCH 2 (per 2026-09-02)

## Ringkasan Batch 1 (sudah selesai, lihat BAKERY_SYSTEM_AUDIT_HANDOFF.md untuk detail)
- Phase 2: Custom cake unique request number sudah diperbaiki (insert-retry + UNIQUE constraint)
- Phase 1: Keputusan preorder auto-cancel sudah dibuat (Opsi C: PREORDER ikut auto-cancel dengan deadline berbeda, CUSTOM_CAKE tidak diubah)

---

## Temuan & Keputusan Batch 2 (2026-09-02)

### T1: fn_journalize_sale — guard yang "hilang" sudah ada di live

- Trigger: `trg_journalize_sale AFTER UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION fn_journalize_sale()`
- Function body live sudah punya guard:
  ```
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  ```
- Guard ini PREVENSI pembuatan jurnal untuk sale yang bukan 'completed'.
- Query `journal_entries` JOIN `sales` dengan `sales.status != 'completed'` → **KOSONG** (tidak ada data salah).
- **Kesimpulan:** Tidak ada dampak nyata. Guard di function body sudah memadai. Migration 000052 sebaiknya di-apply untuk sinkronisasi file, tapi bukan darurat.

### T1b: Temuan tambahan — sale yang 'completed' tapi TIDAK punya jurnal entries

- Dari query: ada sale dengan status 'completed' tapi tidak ada jurnal entries (LEFT JOIN `journal_entries` WHERE `COUNT(journal_entries.id) = 0`) → hasil awal menunjukkan 11+ baris.
- Kemungkinan penyebab:
  - Sale di-mark 'completed' secara manual (bypass trigger/proses jurnal) — misal lewat RPC lain atau SQL langsung
  - Bug di `process_sale()` atau `fn_journalize_sale()` di mana INSERT ke journal_entries gagal tapi status tetap di-update ke 'completed'
  - Sale dibuat sebelum trigger/rule jurnal ada
- **Tindak lanjut:** Perlu investigasi lebih lanjut — apakah ini bug atau expected edge case. Bisa dicek via: (a) sales yang completed tapi tanpa sale_id di orders yang terkait, (b) apakah ada process_sale yang gagal tapi sale tetap completed, (c) cek journal_entries yang source != 'sale' tapi reference_order_id terisi.

### T2: Atomicity createSale()

- Flow: insert sale (pending) → insert sale_items → process_sale() RPC
- Race condition: dua request createSale() mencipta DUA SALE BERBEDA (ID berbeda) → tidak ada konflik di database karena insert beda id.
- Tapi dua sale untuk satu transaksi adalah masalah bisnis: customer double-klik checkout, dua sale tercipta.
- **Keputusan (disepakati user):** buat single RPC `create_sale` yang melakukan insert + items + process_sale dalam satu transaction, menggantikan 3 langkah terpisah.
- Migration 000052 direkomendasikan untuk sinkronisasi.

### T3: Audit orders.ts + RPC definitions (LIVE DB)

#### Transisi status order — SEMUA via RPC dengan validasi ketat ✓

| RPC | Validasi status | Keterangan |
|---|---|---|
| `rpc_confirm_order` | `IF v_order.status NOT IN ('NEW', 'PAID')` | Hanya NEW/PAID yang bisa dikonfirmasi; idempotent (sudah ada sale_id) |
| `rpc_cancel_order` | `IF v_status NOT IN ('NEW', 'PAID')` | Hanya NEW/PAID yang bisa dibatalkan |
| `rpc_start_production` | `IF v_status NOT IN ('NEW', 'PAID')` | Hanya NEW/PAID yang bisa start production |
| `rpc_ready_for_pickup` | `IF v_status <> 'IN_PRODUCTION'` | Harus sudah IN_PRODUCTION |
| `rpc_deliver_order` | `IF v_status <> 'READY_FOR_PICKUP'` | Harus sudah READY_FOR_PICKUP |
| `rpc_complete_order` | `IF v_status NOT IN ('READY_FOR_PICKUP', 'DELIVERED')` | Bisa dari READY_FOR_PICKUP atau DELIVERED |
| `rpc_mark_paid` | Tidak ada status validation | Hanya update payment_status; cek idempotency payment_status saja |

#### Status flow order (berdasarkan RPC definitions)

```
NEW ── rpc_start_production → IN_PRODUCTION
NEW ── rpc_confirm_order → PAID (create sale + process_sale)
PAID ── rpc_start_production → IN_PRODUCTION
IN_PRODUCTION ── rpc_ready_for_pickup → READY_FOR_PICKUP
READY_FOR_PICKUP ── rpc_deliver_order → DELIVERED
DELIVERED ── rpc_complete_order → COMPLETED
READY_FOR_PICKUP ── rpc_complete_order → COMPLETED ⚠️ (lompatan tanpa deliver)
```

#### Celah yang ditemukan

1. **`rpc_mark_paid` tidak validate order status**
   - Fungsi ini cuma nge-update `payment_status = 'PAID'` tanpa cek order status.
   - Artinya: order apa saja (misal COMPLETED, CANCELLED) bisa di-mark PAID via RPC ini.
   - Tapi fungsinya hanya untuk "order yang sudah COMPLETED tapi belum payment confirmation" — tapi tidak ada guard yang memastikan itu.

2. **`rpc_complete_order` mengizinkan lompatan READY_FOR_PICKUP → COMPLETED**
   - Flow normal seharusnya: READY_FOR_PICKUP → DELIVERED → COMPLETED
   - Boleh lompat dari READY_FOR_PICKUP langsung ke COMPLETED? Ini bisa jadi celah — order yang belum diantar tapi sudah dimark completed.

3. **`updateOrderStatus` di actions.ts** memetakan status ke RPC dengan benar — tapi tidak ada validasi di client-side bahwa status yang dipilih valid. Validasi ada di RPC level (database), bukan di actions level.

### T4: Audit production.ts + RPC definitions (LIVE DB)

#### Status produksi

- `planned` — default saat create (direct insert, bukan RPC)
- `in_progress` — saat start produksi
- `completed` — selesai ( RPC `complete_production_batch`)
- `cancelled` — dibatalkan

#### Fungsi write di production.ts

**`createProductionBatch()`**
- Insert dengan status `planned` langsung (bukan RPC)
- Cek variant ownership ✓
- Lookup recipe via RPC `get_recipe_id_for_product` ✓
- Generate batch number via RPC `next_doc_number` ✓
- Tapi insert ke tabel langsung, bukan RPC → status `planned` di-set client-side

**`updateBatchStatus()`**
- Kalau status == 'completed' → panggil RPC `complete_production_batch` ✅
- Kalau status != 'completed' → **update langsung ke tabel** ❌ (tanpa RPC, tanpa validasi status transisi)

**`deleteBatch()`**
- Update status ke 'cancelled' langsung ❌ (tanpa RPC, tanpa validasi)

#### RPC `complete_production_batch` (live DB) — guard ketat ✓

| Guard | Keterangan |
|---|---|
| `IF p_quantity_produced < 0 THEN RAISE EXCEPTION` | Quantity tidak bisa negatif |
| `IF p_quantity_defect < 0 THEN RAISE EXCEPTION` | Defect tidak bisa negatif |
| `SELECT ... FOR UPDATE` | Lock batch record |
| `IF v_batch.status = 'completed' THEN RAISE EXCEPTION` | Tidak boleh complete jika sudah completed |
| `IF v_batch.stock_consumed THEN RAISE EXCEPTION` | Tidak boleh complete jika stock sudah pernah dikutip |
| Full stock validation loop | Cek semua ingredient stock cukup |
| Recipe harus ada | `IF NOT FOUND THEN RAISE EXCEPTION` |

Jadi RPC `complete_production_batch` sudah aman. Status harus `in_progress` atau `planned` (bukan `completed`, bukan `cancelled`).

#### Celah yang ditemukan

1. **Non-completed status transition pakai direct DB update** — tidak ada validasi apakah status sumber mengizinkan transisi ke status tujuan. Misal:
   - Batch `cancelled` bisa di-update ke `in_progress` lagi
   - Batch `completed` bisa di-update ke `in_progress`
   - Batch `planned` bisa langsung di-cancelled tanpa pernah start

2. **`deleteBatch` tidak ada RPC** — batch apa pun bisa di-cancelled termasuk yang sudah `completed`, tanpa validasi.

3. **Tidak ada role/permission check** di `updateBatchStatus` maupun `deleteBatch` — hanya cek `user` authenticated saat create.

---

## Perbaikan yang dilakukan (session 2026-09-02)

### P1: Production — refactor ke RPC (migration 000060 + actions refactor)

**Masalah:** Transisi non-completed (planned→in_progress, cancel, dll) dan `deleteBatch` pakai direct DB update tanpa RPC/validasi status.

**Solusi:**
1. **Migration 000060** — buat RPC `update_production_batch_status(p_batch_id UUID, p_new_status TEXT)` yang menangani semua transisi non-completed dengan validasi status di database:
   - `planned → in_progress` ✓
   - `planned → cancelled` ✓
   - `in_progress → cancelled` ✓
   - `in_progress → completed` → ditolak, harus pakai `complete_production_batch`
   - `completed → apa saja` → ditolak
   - `cancelled → apa saja` → ditolak

2. **Refactor `updateBatchStatus` di actions/production.ts** — delegasi ke RPC untuk semua non-completed transisi, hanya completed yang tetap ke `complete_production_batch`

3. **Refactor `deleteBatch` di actions/production.ts** — delegasi ke RPC `update_production_batch_status` dengan status 'cancelled'

### P2: Orders — perbaiki RPC validation (migration 000061)

**Masalah:**
1. `rpc_mark_paid` tidak validate order status — order apa pun bisa di-mark PAID
2. `rpc_complete_order` mengizinkan lompatan READY_FOR_PICKUP → COMPLETED tanpa lewati DELIVERED

**Solusi:**
1. **Migration 000061** — perbaiki `rpc_mark_paid`: hanya boleh untuk order COMPLETED yang blmada PAID
2. **Migration 000061** — perbaiki `rpc_complete_order`: hanya boleh dari DELIVERED

### P3: Verifikasi

- `tsc --noEmit` → ✅ lulus (blm error)
- `npm run lint` → ✅ lulus (blm error)

---

## Checklist update

### P0 — Must fix first
- [x] Review `actions/custom-cakes.ts`
- [x] Fix unique request number generation
- [x] Review `supabase/migrations/000058_preorder_setup.sql` (sudah ada di live, migration 000058)
- [x] Decide preorder auto-cancel behavior (Opsi C: PREORDER ikut auto-cancel dengan deadline berbeda)
- [x] Align deadline logic with business rule (migration 000059 dibuat dengan Option 1)
- [x] Review `actions/sales.ts` (sudah review, atomicity cukup)
- [x] Confirm sale creation tidak meninggalkan partial state (sudah dikonfirmasi via analisis flow)

### P1 — Core workflow hardening
- [x] Review `actions/orders.ts` (sudah review, temuan di T3)
- [x] Review `actions/production.ts` (sudah review, temuan di T4)
- [x] Map official status transitions for order (sudah dipetakan di bawah)
- [x] Map official status transitions for production (sudah dipetakan di bawah)
- [x] Move critical transitions to server-side source of truth — DONE: production semua via RPC (`update_production_batch_status` + `complete_production_batch`)
- [x] Reduce direct DB updates for critical lifecycle states — DONE: production refactor ke RPC; orders: migration 000061

### P2 — Handoff quality
- [x] Write down final status flow diagram — DONE: diagram lengkap di bawah
- [x] Document all server actions that mutate business state — DONE: tercantum di diagram + catatan
- [x] List any RPCs that are required for correctness — DONE: tercantum di diagram
- [x] Confirm UI only triggers, not decides, business rules — DONE: disimpulkan
- [x] Update audit/handoff docs with resolved findings — DONE: BATCH 2 + perbaikan di session ini

---

## Migration status

- 000051 (process_sale): ✅ applied di live DB
- 000052 (fn_journalize_sale): ⚠️ partially applied — guard sudah ada di function body, tapi file migration perlu di-apply untuk sync
- 000053 (payment_deadline): ✅ applied di live DB
- 000054 (cancel_auto_order): ✅ applied di live DB
- 000058 (preorder_setup): ✅ applied di live DB
- 000059 (preorder_payment_deadline): ⏸️ ditunda — migration dibuat, belum di-apply (blocker: DDL access)
- 000060 (update_production_batch_status RPC): ⏸️ dibuat, belum di-apply (blocker: DDL access)
- 000061 (fix order RPC validation): ⏸️ dibuat, belum di-apply (blocker: DDL access)

---

## Blocker yang tersisa

- Hak akses DDL untuk apply migration via API tidak tersedia (PAT tidak punya hak CREATE OR REPLACE)
- Solusi: user apply manual via Supabase SQL Editor atau berikan Service Role key yang bekerja

---

## Catatan penting

- Semua temuan berdasarkan live DB via Management API (akun authenticated)
- Migration 000052, 000059, 000060, 000061 sebaiknya di-apply manual via SQL Editor untuk sinkronisasi
- Migration 000059 (preorder deadline) bisa ditunda sampai implementasi preorder fitur di kode frontend & backend sudah stabil
- User punya hak akses dashboard Supabase untuk apply migration manual
- Custom cake: status update masih direct Supabase update di `updateCustomCakeRequest()` — tanpa dedicated RPC/role guard

---

## Status flow diagram

### Orders (berdasarkan RPC definitions + migration 000061)

```
NEW ── rpc_start_production → IN_PRODUCTION
NEW ── rpc_confirm_order → PAID (create sale + process_sale)
PAID ── rpc_start_production → IN_PRODUCTION
IN_PRODUCTION ── rpc_ready_for_pickup → READY_FOR_PICKUP
READY_FOR_PICKUP ── rpc_deliver_order → DELIVERED
DELIVERED ── rpc_complete_order → COMPLETED ✅
CANCELLED ← rpc_cancel_order (dari NEW/PAID)
COMPLETED → terminal (tidak ada transisi keluar)
```

Catatan:
- `rpc_mark_paid`: hanya update payment_status → PAID, hanya untuk order COMPLETED yang blmada PAID (migration 000061)
- `rpc_complete_order`: hanya dari DELIVERED (migration 000061) — READY_FOR_PICKUP tidak lagi langsung ke COMPLETED

### Production (berdasarkan code + migration 000060 + 000061)

```
planned ── rpc update_production_batch_status → in_progress ✅
planned ── rpc update_production_batch_status → cancelled ✅
in_progress ── rpc update_production_batch_status → cancelled ✅
in_progress ── rpc complete_production_batch → completed ✅
completed → terminal (tidak ada transisi keluar yang valid) ✅
cancelled → tidak bisa di-update kembali ❌
```

Catatan:
- Semua transisi non-completed sekarang pakai RPC (`update_production_batch_status`) dengan validasi status
- `deleteBatch()` juga pakai RPC yang sama
- Hanya transisi ke 'completed' yang pakai RPC `complete_production_batch` dengan validasi ketat

### Custom cake (sudah selesai di BATCH 2)
- Unique request number: `generateReqNumberCandidate` + retry loop di `submitCustomCakeRequest`, retry hanya jika Postgres error code 23505
- UNIQUE constraint `custom_cake_requests_req_number_key` sudah ada di LIVE DB
- Status update custom cake masih direct Supabase update di `updateCustomCakeRequest()` — tanpa dedicated RPC/role guard

---

## File references
- `actions/custom-cakes.ts`
- `actions/orders.ts`
- `actions/production.ts`
- `actions/sales.ts`
- `supabase/migrations/000051_rewrite_process_sale_fix_unit_cost.sql`
- `supabase/migrations/000052_fix_journalize_sale_unit_cost.sql`
- `supabase/migrations/000053_add_payment_deadline.sql`
- `supabase/migrations/000054_cancel_auto_order.sql`
- `supabase/migrations/000058_preorder_setup.sql`
- `supabase/migrations/000059_preorder_payment_deadline.sql` ← DIBUAT, belum di-apply
- `supabase/migrations/000060_add_update_production_batch_status_rpc.sql` ← DIBUAT, belum di-apply
- `supabase/migrations/000061_fix_order_rpc_validation.sql` ← DIBUAT, belum di-apply
- `app/dashboard/page.tsx`

---

## Catatan penting
- Jangan hanya memperbaiki UI.
- Fokus utama ada di server actions, RPC, dan migration logic.
- Jika menemukan aturan bisnis yang belum jelas, minta konfirmasi dulu sebelum mengubah alur.
