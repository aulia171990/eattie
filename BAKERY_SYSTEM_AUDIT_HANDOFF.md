# Bakery System Audit Handoff

## Tujuan
Dokumen ini dibuat agar agent/model lain bisa lanjut menganalisis, memperbaiki, dan menuntaskan kelemahan sistem bakery ini tanpa perlu mengulang discovery dari awal.

## Ringkasan masalah utama
Sistem ini sudah berjalan, tetapi alur bisnisnya masih terfragmentasi per modul. Yang paling perlu dibereskan adalah:

1. **Workflow status belum terpusat**
   - Status order, produksi, dan custom cake tersebar di banyak file.
   - Risiko: aturan transisi tidak konsisten antar modul.

2. **Beberapa proses bisnis belum atomic**
   - Beberapa alur masih memakai serangkaian insert/update terpisah, lalu baru memanggil RPC.
   - Risiko: data setengah jadi kalau satu langkah gagal.

3. **Pre-order logic belum konsisten**
   - Deadline payment sudah ada, tapi auto-cancel justru mengecualikan PREORDER.
   - Risiko: pre-order tidak mengikuti aturan deadline yang diharapkan.

4. **Validasi unik custom cake request bermasalah**
   - Generate nomor request memakai query `head: true`, tetapi dicek dengan `data` yang tidak akan berisi row.
   - Risiko: check uniqueness tidak benar-benar bekerja.

5. **Sebagian transisi status masih terlalu bebas**
   - Hanya beberapa status penting yang dipaksa lewat RPC.
   - Risiko: manipulasi client masih bisa membuka jalur status tidak valid.

## File yang perlu dibaca dulu
- `actions/orders.ts`
- `actions/production.ts`
- `actions/sales.ts`
- `actions/custom-cakes.ts`
- `supabase/migrations/000058_preorder_setup.sql`
- `app/dashboard/page.tsx`

## Temuan per area

### 1) Orders
File: `actions/orders.ts`

- Status order didefinisikan manual di file ini.
- Transisi status dipetakan ke RPC tertentu.
- Ada kemungkinan alur validasi tersebar jika file UI juga ikut menentukan status.

Fokus lanjutan:
- Audit seluruh transisi order dari NEW → PAID → IN_PRODUCTION → READY_FOR_PICKUP → DELIVERED → COMPLETED → CANCELLED.
- Pastikan semua transisi divalidasi server-side, bukan hanya di form/UI.

### 2) Production
File: `actions/production.ts`

- Pembuatan batch produksi sudah cek relasi variant → product.
- Penyelesaian produksi sudah dipindah ke RPC untuk atomicity.
- Transisi non-completed masih update langsung ke tabel.

Fokus lanjutan:
- Pastikan semua status perubahan produksi mengikuti satu aturan yang sama.
- Cek apakah ada status yang bisa di-set dari client tanpa validasi bisnis yang cukup.

### 3) Sales
File: `actions/sales.ts`

- Create sale melakukan verifikasi harga produk, variant, dan addon di server.
- Setelah insert sale dan sale_items, baru memanggil RPC `process_sale()`.
- Kalau insert item gagal, sale ditandai cancelled.

Fokus lanjutan:
- Evaluasi apakah seluruh langkah create sale bisa dipindah ke satu transaction/RPC.
- Pastikan rollback dan idempotency benar-benar aman saat retry atau double submit.

### 4) Custom cake
File: `actions/custom-cakes.ts`

- Status validasi sudah dibatasi.
- Nomor request unik masih lemah.

Fokus lanjutan:
- Perbaiki generator nomor request agar benar-benar memeriksa uniqueness.
- Audit apakah update status custom cake perlu logika role/permission yang lebih ketat.

### 5) Pre-order
File: `supabase/migrations/000058_preorder_setup.sql`

- Ada kolom `payment_deadline` di `orders`.
- Ada fungsi `compute_payment_deadline()`.
- Ada fungsi `cancel_auto_order()`.
- Namun fungsi auto-cancel saat ini mengecualikan `PREORDER`.

Fokus lanjutan:
- Klarifikasi dulu definisi bisnis preorder:
  - Apakah preorder harus auto-cancel kalau lewat deadline?
  - Atau preorder memang diperlakukan berbeda dari order biasa?
- Setelah itu, samakan logic deadline, status, dan cron job.

## Prioritas pengerjaan

### P0
- Benahi validasi unique request custom cake.
- Audit dan rapikan logic preorder agar konsisten.
- Pastikan proses penjualan tidak menghasilkan state setengah jadi.

### P1
- Pusatkan workflow status order dan produksi.
- Kurangi update langsung ke tabel untuk transisi penting.
- Audit otorisasi server-side untuk aksi administratif.

### P2
- Rapikan dashboard agar hanya menampilkan data, bukan sumber aturan bisnis.
- Tambahkan dokumentasi status flow resmi.

## Definition of done
Agent/model berikutnya dianggap selesai kalau:
- Workflow utama bakery sudah punya aturan status yang jelas dan konsisten.
- Semua transition penting tervalidasi server-side.
- Proses sales/production tidak meninggalkan data setengah jadi.
- Pre-order logic dan auto-cancel sesuai definisi bisnis.
- Nomor request custom cake benar-benar unik.

## Catatan penting
- Jangan hanya memperbaiki UI.
- Fokus utama ada di server actions, RPC, dan migration logic.
- Jika menemukan aturan bisnis yang belum jelas, minta konfirmasi dulu sebelum mengubah alur.
