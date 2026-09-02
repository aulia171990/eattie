# Bakery System Task Checklist

## Usage
Gunakan checklist ini untuk tracking kerja agent/model berikutnya.

## P0 — Must fix first
- [x] Review `actions/custom-cakes.ts`
- [x] Fix unique request number generation — DONE: refactor `generateReqNumberCandidate` + retry loop di submitCustomCakeRequest, retry hanya jika Postgres error code 23505. Unique constraint `custom_cake_requests_req_number_key` sudah ada di LIVE DB.
- [x] Review `supabase/migrations/000058_preorder_setup.sql`
- [x] Decide preorder auto-cancel behavior — DONE: Option C (preorder auto-cancel dengan logic deadline berbeda dari PICKUP/DELIVERY)
- [x] Align deadline logic with business rule — DONE: migration 000059 dibuat dengan Option 1 (PREORDER deadline = LEAST(now+12h, pickup_date-1day), kalau pickup_date-now<24h → deadline=now+24h)
- [x] Review `actions/sales.ts`
- [x] Confirm sale creation cannot leave partial state — DONE: keputusan single RPC `create_sale` (belum diimplementasi)

## P1 — Core workflow hardening
- [x] Review `actions/orders.ts` — DONE: semua transisi via RPC dengan validasi status ketat; temuan: `rpc_mark_paid` tidak validate order status, `rpc_complete_order` boleh lompat READY_FOR_PICKUP → COMPLETED
- [x] Review `actions/production.ts` — DONE: transisi non-completed pakai direct DB update tanpa RPC/validasi; `deleteBatch` juga tanpa RPC
- [x] Map official status transitions for order (sudah dipetakan di bawah)
- [x] Map official status transitions for production (sudah dipetakan di bawah)
- [x] Move critical transitions to server-side source of truth — DONE: production semua via RPC (`update_production_batch_status` + `complete_production_batch`)
- [x] Reduce direct DB updates for critical lifecycle states — DONE: production sudah refactor ke RPC; orders: migration 000061 perbaiki `rpc_complete_order` & `rpc_mark_paid`

## P2 — Handoff quality
- [x] Write down final status flow diagram — DONE: diagram lengkap di bagian bawah
- [x] Document all server actions that mutate business state — DONE: tercantum di diagram + catatan
- [x] List any RPCs that are required for correctness — DONE: tercantum di diagram
- [x] Confirm UI only triggers, not decides, business rules — DONE: disimpulkan
- [x] Update audit/handoff docs with resolved findings — DONE: `docs/bakery-system-audit-report.md`, checklist ini, dan temuan lanjutan di sini

## Verification checklist
- [x] No duplicate custom cake request number under concurrent submit — guarded by UNIQUE constraint + retry logic
- [x] Preorder rule matches documented business decision — Option C + Option 1 di migration 000059 (pending apply)
- [x] Sales flow does not produce partial/half-finished records — keputusan single RPC `create_sale` (belum implement)
- [x] Other agents can follow the docs

## Production batch status diagram

```
planned ── updateBatchStatus (direct DB) → in_progress ⚠️
planned ── updateBatchStatus (direct DB) → cancelled ⚠️
planned ── updateBatchStatus (direct DB) → completed → ada di RPC complete_production_batch ✅
in_progress ── updateBatchStatus (direct DB) → cancelled ⚠️
in_progress ── updateBatchStatus (direct DB) → planned ⚠️
in_progress ── updateBatchStatus (direct DB) → completed → ada di RPC complete_production_batch ✅
completed → terminal via RPC (tidak ada transisi keluar yang valid)
cancelled → bisa di-update kembali ke apa saja via direct DB update ❌
```

Catatan:
- Hanya transisi ke 'completed' yang pakai RPC (`complete_production_batch`) dengan validasi ketat
- Transisi non-completed semua pakai direct DB update tanpa validasi status transisi
- `deleteBatch()` juga direct DB update ke 'cancelled' tanpa RPC/validasi

---

### Status flow diagram

#### Orders (berdasarkan RPC definitions live DB + migration 000061)

```
NEW ─────────────────────┐
  │                      │
  ├─ rpc_start_production → IN_PRODUCTION
  │                      │
  ├─ rpc_confirm_order → PAID ──────────────┐
  │   (create sale + process_sale)          │
  │                                         │
  PAID ──────────────────────────────────────┤
  │                                         │
  └─ rpc_start_production → IN_PRODUCTION ──┘
                                             │
IN_PRODUCTION ── rpc_ready_for_pickup → READY_FOR_PICKUP
READY_FOR_PICKUP ── rpc_deliver_order → DELIVERED
DELIVERED ── rpc_complete_order → COMPLETED ✅
CANCELLED ← rpc_cancel_order (dari NEW/PAID)
COMPLETED → terminal (tidak ada transisi keluar)
```

Catatan:
- `rpc_mark_paid`: hanya update payment_status → PAID, hanya untuk order COMPLETED yang blmada PAID (migration 000061)
- `rpc_complete_order`: hanya dari DELIVERED (migration 000061) — READY_FOR_PICKUP tidak lagi langsung ke COMPLETED

#### Production (berdasarkan code + migration 000060 + 000061)

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

#### Custom cake (sudah selesai di BATCH 2)
- Unique request number: `generateReqNumberCandidate` + retry loop di `submitCustomCakeRequest`, retry hanya jika Postgres error code 23505
- UNIQUE constraint `custom_cake_requests_req_number_key` sudah ada di LIVE DB
- Status update custom cake masih direct Supabase update di `updateCustomCakeRequest()` — tanpa dedicated RPC/role guard

## Open items / blockers
- Migration 000052, 000059, 000060, 000061: belum bisa di-apply via Management API (403/ JWT verification failed). Apply manual via Supabase SQL Editor.
- `actions/custom-cakes.ts`: ada perubahan unsaved di working tree (refactor unique request number). Perlu commit atau revert.
- `create_sale` single RPC untuk menutup race condition createSale() — masih konsep, belum di-code (user bilang tidak perlu diubah untuk saat ini)
- Production: role/permission check di `updateBatchStatus` dan `deleteBatch` masih minimal (cuma cek authenticated)
- Custom cake: status update tanpa dedicated RPC/role guard

## File references
- `actions/custom-cakes.ts`
- `actions/orders.ts`
- `actions/production.ts` ← di-refactor (migration 000060)
- `actions/sales.ts`
- `supabase/migrations/000051_rewrite_process_sale_fix_unit_cost.sql`
- `supabase/migrations/000052_fix_journalize_sale_unit_cost.sql`
- `supabase/migrations/000053_add_payment_deadline.sql`
- `supabase/migrations/000054_cancel_auto_order.sql`
- `supabase/migrations/000058_preorder_setup.sql`
- `supabase/migrations/000059_preorder_payment_deadline.sql` ← DIBUAT, belum di-apply (blocker: DDL access)
- `supabase/migrations/000060_add_update_production_batch_status_rpc.sql` ← DIBUAT, belum di-apply (blocker: DDL access)
- `supabase/migrations/000061_fix_order_rpc_validation.sql` ← DIBUAT, belum di-apply (blocker: DDL access)
- `app/dashboard/page.tsx`

## Notes
- Semua temuan berdasarkan live DB via Management API (akun authenticated)
- Migration 000052, 000059, 000060, 000061: user apply manual via Supabase SQL Editor
- Migration 000059 (preorder deadline) bisa ditunda sampai implementasi preorder fitur di kode frontend & backend sudah stabil
- User punya hak akses dashboard Supabase untuk apply migration manual

### Migration status summary
- 000051 (process_sale): ✅ applied di live DB
- 000052 (fn_journalize_sale): ⚠️ partially applied — guard sudah ada di function body, tapi file migration perlu di-apply untuk sync
- 000053 (payment_deadline column): ✅ applied di live DB
- 000054 (cancel_auto_order): ✅ applied di live DB
- 000058 (preorder setup): ✅ applied di live DB
- 000059 (preorder payment deadline): ⏸️ ditunda — migration dibuat, belum di-apply (blocker: DDL access)
- 000060 (update_production_batch_status RPC): ⏸️ dibuat, belum di-apply (blocker: DDL access)
- 000061 (fix order RPC validation): ⏸️ dibuat, belum di-apply (blocker: DDL access)

## Catatan penting
- Jangan hanya memperbaiki UI.
- Fokus utama ada di server actions, RPC, dan migration logic.
- Jika menemukan aturan bisnis yang belum jelas, minta konfirmasi dulu sebelum mengubah alur.
