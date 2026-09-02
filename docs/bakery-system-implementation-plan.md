# Bakery System Implementation Plan

## Goal
Merapikan proses inti bakery supaya flow bisnisnya konsisten, aman, dan mudah di-maintain oleh agent/model berikutnya.

## Prinsip kerja
- Source of truth harus di server-side.
- State transition penting harus divalidasi sebelum update DB.
- Proses yang menyentuh order, stok, atau pembayaran harus atomic bila memungkinkan.
- Jangan ubah UI sebelum aturan bisnisnya jelas.

## Urutan implementasi

### Phase 1 — Klarifikasi business rules
**Target:** pastikan definisi preorder, auto-cancel, dan transisi status.

Langkah:
1. Baca ulang `supabase/migrations/000058_preorder_setup.sql`.
2. Tentukan apakah `PREORDER` harus ikut auto-cancel atau punya jalur berbeda.
3. Petakan status resmi untuk:
   - order
   - production
   - custom cake

Output yang diharapkan:
- dokumen status flow yang eksplisit
- definisi transisi valid/invalid

### Phase 2 — Perbaiki identity/uniqueness
**Target:** nomor request custom cake tidak collision.

Langkah:
1. Audit `actions/custom-cakes.ts`.
2. Perbaiki generator nomor request agar benar-benar cek uniqueness.
3. Pastikan retry logic aman saat concurrency.

Acceptance criteria:
- dua request bersamaan tidak menghasilkan nomor sama
- insert gagal kalau collision, bukan lolos diam-diam

### Phase 3 — Pusatkan workflow status
**Target:** kurangi status logic yang tersebar.

Langkah:
1. Audit `actions/orders.ts`.
2. Audit `actions/production.ts`.
3. Audit `actions/custom-cakes.ts`.
4. Identifikasi status yang hanya boleh berubah lewat RPC/server action.

Acceptance criteria:
- status transition penting punya satu jalur resmi
- UI hanya memicu action, bukan menentukan aturan

### Phase 4 — Atomicity dan consistency
**Target:** minimalkan data setengah jadi.

Langkah:
1. Audit `actions/sales.ts` untuk proses create sale.
2. Audit flow produksi yang masih bertahap.
3. Identifikasi langkah yang seharusnya dipindah ke RPC/transaction.

Acceptance criteria:
- kalau satu langkah gagal, state bisnis tetap konsisten
- retry tidak menggandakan state

### Phase 5 — Dokumentasi final dan handoff
**Target:** hasil mudah dipakai agent lain.

Langkah:
1. Update handoff/report bila ada temuan baru.
2. Catat file yang berubah dan alasan perubahan.
3. Tambahkan checklist verifikasi.

## File prioritas untuk dibaca dulu
- `actions/custom-cakes.ts`
- `actions/orders.ts`
- `actions/production.ts`
- `actions/sales.ts`
- `supabase/migrations/000058_preorder_setup.sql`
- `app/dashboard/page.tsx`

## Recommended agent split
- **Agent 1:** audit preorder + order status
- **Agent 2:** audit production flow + atomicity
- **Agent 3:** audit custom cake uniqueness + permissions

## Validation checklist
- [ ] Semua status flow tertulis jelas
- [ ] Preorder rule konsisten dengan cron/job
- [ ] Custom cake request number unik
- [ ] Sales/production flow tidak meninggalkan state setengah jadi
- [ ] UI tidak lagi menjadi sumber utama business rule
