# Eattie — Dokumen Handoff (Terverifikasi)

> **Catatan penting:** Dokumen ini hanya mencakup modul yang sudah saya cek langsung ke kodenya. Modul lain (Customer/CRM, Push Notification) belum masuk — akan ditambahkan bertahap setelah masing-masing dicek, bukan ditebak dari nama file.

---

## 1. File Map

### Store & Order (customer beli online)

| File | Fungsi singkat |
|---|---|
| `components/store/store-landing.tsx` | Halaman utama toko — daftar produk, klik produk buka modal |
| `components/store/product-modal.tsx` | Popup detail produk saat diklik, tempat tambah ke keranjang |
| `contexts/store-cart-context.tsx` | Keranjang belanja — disimpan di browser (belum masuk database) |
| `components/store/store-checkout.tsx` | Halaman isi data pemesan + submit pesanan |
| `actions/store.ts` | Otak dari toko — `submitOrder()` yang benar-benar simpan ke database |
| `actions/orders.ts` | Semua yang berhubungan dengan pesanan di sisi dashboard (owner) |
| `components/forms/order-action-buttons.tsx` | Tombol konfirmasi/batal/kirim WA di halaman detail pesanan |
| `app/dashboard/orders/page.tsx` | Daftar semua pesanan (kanban/list) |
| `app/dashboard/orders/[id]/page.tsx` | Detail satu pesanan |

### POS / Kasir (transaksi tunai di toko fisik)

| File | Fungsi singkat |
|---|---|
| `contexts/cart-context.tsx` | Keranjang kasir — beda dari keranjang toko online, khusus POS |
| `components/pos/payment-dialog.tsx` | Popup pembayaran — pilih metode bayar, hitung kembalian |
| `actions/sales.ts` | Simpan transaksi ke database, panggil RPC `process_sale` untuk kurangi stok |
| `components/pos/receipt-template.tsx` | Format struk untuk diprint |

### Inventory & Pembelian (bahan baku, stok, supplier)

| File | Fungsi singkat |
|---|---|
| `actions/products.ts` | CRUD produk jadi (nama, harga jual, kategori) |
| `actions/stock-purchases.ts` | Proses pembelian bahan baku dari supplier — `createPurchase()` buat order beli, `receivePurchase()` saat barang diterima (stok bertambah otomatis lewat RPC) |
| `actions/stock-opname.ts` | Koreksi stok manual (misal: hitung fisik vs sistem beda) |
| `app/dashboard/inventory/page.tsx` | Daftar semua bahan baku + stok saat ini |
| `app/dashboard/inventory/purchases/**` | Alur pembelian: buat order → terima barang → stok update |
| `app/dashboard/inventory/opname/**` | Alur stock opname: buat sesi → input hasil hitung → submit koreksi |
| `app/dashboard/inventory/suppliers/**` | Data supplier (nama, kontak) |

### Produksi & Resep

| File | Fungsi singkat |
|---|---|
| `actions/production.ts` | Buat batch produksi, update status (planned → in_progress → completed) |
| `actions/recipes.ts` | CRUD resep — bahan apa saja dan berapa banyak untuk buat 1 produk |
| `components/forms/recipe-form.tsx` | Form input/edit resep |
| `app/dashboard/production/**` | Halaman daftar & detail batch produksi |
| `app/dashboard/recipes/**` | Halaman daftar & detail resep |

### Laporan

| File | Fungsi singkat |
|---|---|
| `actions/reports.ts` | Query semua data laporan — penjualan, produksi, keuangan, dashboard stats |
| `app/dashboard/reports/sales/page.tsx` | Laporan penjualan — trend, top produk |
| `app/dashboard/reports/production/page.tsx` | Laporan produksi — batch, output, defect rate |
| `app/dashboard/reports/financial/page.tsx` | Laporan keuangan — revenue, pengeluaran, gross profit |
| `app/dashboard/reports/page.tsx` | Halaman ringkasan semua laporan |

### Customer / CRM

| File | Fungsi singkat |
|---|---|
| `actions/customers.ts` | CRUD data pelanggan — daftar, detail, tambah manual, ubah, hapus, statistik tier |
| `app/dashboard/customers/page.tsx` | Daftar pelanggan dengan tier (Bronze/Silver/Gold/Platinum) |
| `app/dashboard/customers/[id]/page.tsx` | Detail satu pelanggan + riwayat order |
| `components/customers/add-customer-button.tsx` | Tombol + form tambah pelanggan manual |

### Push Notification

| File | Fungsi singkat |
|---|---|
| `lib/push/vapid.ts` | Konfigurasi VAPID key (identitas pengirim push notification) |
| `lib/push/send-new-order-push.ts` | Kirim notifikasi ke semua device owner saat ada order baru |
| `app/api/push/subscribe/route.ts` | Endpoint saat owner "Allow" notifikasi di browser — simpan device ke database |
| `app/api/push/unsubscribe/route.ts` | Endpoint berhenti terima notifikasi |
| `app/api/push/vapid-public-key/route.ts` | Kasih public key ke browser (untuk proses subscribe) |

### Customer / CRM

| File | Fungsi singkat |
|---|---|
| `actions/customers.ts` | CRUD pelanggan — daftar, detail, tambah manual, ubah, hapus. Semua fungsi dilindungi `requireOwner()` |
| `app/dashboard/customers/page.tsx` | Daftar pelanggan — bisa cari, filter tier, sort |
| `app/dashboard/customers/[id]/page.tsx` | Detail satu pelanggan — riwayat order, statistik belanja |

### Auth (login & keamanan akses)

| File | Fungsi singkat |
|---|---|
| `actions/auth.ts` | Fungsi login. **Pendaftaran akun baru sengaja dimatikan** — kalau ada yang coba daftar, sistem tolak dengan pesan "Hubungi administrator" |
| `middleware.ts` | Penjaga pintu — cek tiap halaman yang dibuka, apakah user sudah login, dan apakah akunnya masih aktif |
| `lib/supabase/server.ts` | Cara aplikasi "bicara" ke database dari sisi server |
| `lib/supabase/client.ts` | Cara aplikasi "bicara" ke database dari sisi browser |

---

## 2. Data Flow

### 2a. Pesanan Online (Store)

```
Customer buka /store
        ↓
Klik produk → modal muncul (product-modal.tsx)
        ↓
Klik "Tambah" → masuk ke keranjang (store-cart-context.tsx)
        │  ⚠️ Keranjang ini HANYA di memori browser,
        │     belum tersimpan di database sama sekali.
        │     Kalau customer refresh halaman, keranjang hilang.
        ↓
Lanjut ke /store/checkout → isi nama, HP, alamat
        ↓
Klik "Pesan Sekarang" → submitOrder() dipanggil (actions/store.ts)
        │
        │  DI SINI SISTEM MENGAMBIL HARGA ASLI DARI DATABASE
        │  (bukan dari yang dikirim browser) — ini FIX KEAMANAN
        │  yang sudah ditambahkan. Sebelumnya harga bisa dimanipulasi.
        ↓
Data masuk ke tabel `orders` + `order_items`
        ↓
Owner buka dashboard → lihat pesanan baru di /dashboard/orders
        ↓
Owner klik "Konfirmasi" → status berubah, generate invoice
        ↓
Owner proses → klik "Selesai" atau kirim WA manual ke customer
```

### 2b. POS / Kasir

```
Kasir buka /pos → pilih produk → masuk ke keranjang (cart-context.tsx)
        ↓
Klik "Bayar" → payment-dialog.tsx muncul
        ↓
Pilih metode bayar (tunai/QRIS/transfer/kartu) → input jumlah bayar
        ↓
Klik konfirmasi → createSale() dipanggil (actions/sales.ts)
        │
        │  ⚠️ BEDA DARI STORE ONLINE: di sini harga TIDAK
        │     diverifikasi ulang ke database. Sistem percaya
        │     apapun yang dikirim dari cart-context.
        ↓
Data masuk ke tabel `sales` + `sale_items`
        ↓
RPC `process_sale` jalan → kurangi stok produk otomatis
        ↓
Struk bisa diprint (receipt-template.tsx)
```

### 2c. Inventory & Pembelian

```
Owner buat order beli → createPurchase() (actions/stock-purchases.ts)
        ↓
Barang datang dari supplier → owner buka halaman "Terima Barang"
        ↓
Input jumlah yang benar-benar diterima → receivePurchase()
        ↓
Sistem simpan quantity_received per item
        ↓
Panggil RPC `process_purchase` → INI YANG UBAH STOK
        │  RPC ini hitung rata-rata harga beli baru (average cost)
        │  dan tambah stok bahan baku otomatis + tercatat di
        │  riwayat pergerakan stok (movements)
        ↓
Stok bahan baku bertambah, siap dipakai produksi
```

**Beda dengan toko online/POS:** di sini prosesnya **aman** — perubahan stok tidak langsung dari client, tapi lewat RPC `process_purchase` yang sudah tersimpan di `supabase/migration-sql` (tidak seperti RPC pesanan yang hilang — lihat Bug 4 di Risk Map).

### 2d. Produksi & Resep

```
Baker/owner buat batch produksi → pilih produk + jumlah rencana
        ↓
Sistem cari resep produk itu lewat RPC `get_recipe_id_for_product`
        │  ⚠️ Baker SENGAJA tidak diberi akses langsung ke tabel
        │     `recipes` (harga bahan/HPP dirahasiakan dari baker).
        │     RPC ini jalan sebagai "perwakilan" yang boleh baca
        │     resep tanpa baker perlu izin akses tabel recipes.
        ↓
Kalau produk belum punya resep → ditolak, harus dibuatkan owner dulu
        ↓
Batch tersimpan dengan status "planned"
        ↓
Baker mulai produksi → status jadi "in_progress"
        ↓
Produksi selesai → input jumlah jadi + jumlah gagal (defect)
        ↓
Panggil RPC `complete_production_batch` → INI YANG:
        │  - Kurangi stok bahan baku sesuai resep
        │  - Tambah stok produk jadi
        │  - Hitung biaya produksi
        │  - Catat semua ke riwayat pergerakan stok
        │  Semua dalam SATU transaksi atomik (aman dari race condition)
```

**Resep** (`actions/recipes.ts`) hanya bisa dibuat/diubah/dilihat oleh **owner** — dijaga lewat RLS di database (`recipes_select`, `recipes_write`), bukan cuma dari tampilan halaman. Baker tidak akan bisa buka data resep meski coba akses langsung lewat API.

### 2e. Stock Opname (koreksi stok fisik vs sistem)

```
Owner buat sesi opname baru → createOpname()
        ↓
Sistem catat "system_stock" = stok yang tercatat di database saat ini
        ↓
Owner hitung fisik di gudang, input hasil hitung ke form
        ↓
Klik submit → submitOpname()
        ↓
Step 1: simpan angka hasil hitung ke stock_opname_items
        │  (baru simpan data, belum ubah stok apapun)
        ↓
Step 2: panggil RPC `process_stock_opname`
        │  RPC ini HITUNG ULANG selisih sendiri (actual - system),
        │  tidak percaya angka selisih yang dikirim dari TypeScript.
        │  Kalau selisih ada, stok bahan disesuaikan otomatis +
        │  tercatat sebagai "adjustment_in"/"adjustment_out" di
        │  riwayat pergerakan stok.
        ↓
Selesai — opname jadi status "completed"
```

**Modul ini aman** — RPC selalu hitung ulang sendiri di server, tidak percaya kiriman dari client. RLS juga bersih (hanya owner, tidak ada policy yang saling tumpang tindih seperti Bug 7).

### 2f. Laporan

```
Owner buka halaman laporan (/dashboard/reports/*)
        ↓
Server action dipanggil (actions/reports.ts)
        ↓
Query langsung ke tabel sales, production_batches, expenses
        │  Tidak ada RPC di sini — murni SELECT query
        │  Data hanya dibaca, tidak ada yang diubah
        ↓
Hasil dikirim ke komponen chart untuk ditampilkan
```

**Catatan penting:** Laporan ini **READ-ONLY** — tidak ada aksi tulis di modul ini. Kalau laporan tampilkan angka salah, cari bug di data sumber (tabel `sales`, `expenses`, `production_batches`), bukan di kode laporan itu sendiri. Satu pengecualian: **Bug 9** di bawah.

### 2g. Push Notification

```
Owner buka dashboard pertama kali → browser minta izin notifikasi
        ↓
Owner klik "Allow" → browser generate subscription (endpoint + keys)
        ↓
Data subscription dikirim ke /api/push/subscribe
        │  Endpoint ini cek: harus login DAN harus role owner
        ↓
Subscription disimpan ke tabel push_subscriptions
        ↓
─────────────── nanti, saat ada order baru ───────────────
        ↓
submitOrder() berhasil (actions/store.ts)
        ↓
sendNewOrderPushNotification() dipanggil (fire-and-forget,
        │  tidak menunggu/blocking proses checkout customer)
        ↓
Sistem pakai SERVICE ROLE (admin client) untuk baca SEMUA
        │  subscription owner yang aktif — ini sengaja bypass RLS,
        │  karena RLS normal cuma izinkan lihat subscription sendiri
        ↓
Kirim push notification ke semua device owner yang subscribe
        ↓
Kalau ada device yang subscription-nya sudah tidak valid
        (404/410 dari browser push service) → otomatis dihapus
        dari database, tidak perlu manual cleanup
```

**Modul ini paling bersih dari semua yang sudah diverifikasi** — tidak ada bug ditemukan. Auth check konsisten, RLS aktif dan benar (satu policy, tidak ada konflik), private key (`VAPID_PRIVATE_KEY`) tidak pakai prefix `NEXT_PUBLIC_` jadi tidak pernah ter-expose ke browser, dan kegagalan kirim push tidak akan mengganggu proses checkout utama.

### 2h. Customer / CRM
        │  ⚠️ Proteksi di sini HANYA di kode TypeScript (cek role
        │     lewat tabel profiles). TIDAK ADA RLS policy khusus
        │     untuk tabel customers (lihat Bug 10).
        ↓
Kalau bukan owner → return kosong (tapi query sebenarnya
tidak pernah jalan karena dicegat lebih dulu)
        ↓
Owner bisa: cari nama/HP, filter tier, urutkan
        ↓
Klik satu pelanggan → getCustomer() + getCustomerOrderHistory()
        ↓
Owner bisa: tambah pelanggan manual, edit data, atau hapus
        │  Semua lewat createCustomer()/updateCustomer()/deleteCustomer()
        │  — semuanya cek requireOwner() dulu sebelum eksekusi
```

**Bagaimana data pelanggan masuk:** SUDAH DIVERIFIKASI — **tidak otomatis**. `actions/store.ts` (checkout toko online) tidak pernah insert ke tabel `customers`, hanya simpan `customer_name`/`customer_phone` di tabel `orders`. Artinya CRM ini murni database terpisah yang **harus diisi manual** oleh owner satu-satu, tidak sinkron otomatis dengan pelanggan yang sudah checkout di toko.

---

## 3. Auth Flow

```
User buka halaman apapun di dashboard (misal /dashboard/inventory)
        ↓
middleware.ts jalan DULUAN sebelum halaman ditampilkan
        ↓
Cek: apakah user sudah login?
   TIDAK → lempar ke /login
   YA    → lanjut
        ↓
Cek: apakah akun user masih aktif (is_active = true)?
   TIDAK AKTIF → otomatis logout, lempar ke /login
   AKTIF       → boleh masuk
        ↓
Halaman dashboard ditampilkan
```

**Penting untuk diketahui:**
- **Pendaftaran akun baru MATI secara sengaja.** Fungsi `signUp()` di `actions/auth.ts` langsung return pesan error tanpa proses apapun. Kode lama untuk signup masih ada tapi dikomentari — kalau suatu saat mau diaktifkan lagi, tinggal dibuka komentarnya.
- Cara **tambah user baru sekarang**: harus manual lewat Supabase Dashboard (Authentication → Add User), bukan lewat halaman aplikasi.
- Middleware jalan di **setiap request** ke halaman non-publik. Halaman publik (tidak perlu login): `/login`, `/sign-up`, `/store`, dan halaman utama `/`.

---

## 4. Risk Map

| # | Risiko | Tingkat | File terkait | Kenapa berisiko |
|---|---|---|---|---|
| 1 | Harga pesanan online sempat bisa dimanipulasi customer | 🔴 Tinggi — **SUDAH DIPERBAIKI** | `actions/store.ts` — `submitOrder()` | Sebelumnya harga yang tersimpan berasal dari data yang dikirim browser, bukan dari database. Customer bisa ubah harga jadi Rp1 lewat devtools. Sekarang sistem selalu ambil harga asli dari tabel `products` |
| 2 | Tabel `order_items` sempat bisa diubah/dihapus sembarangan | 🔴 Tinggi — **SUDAH DIPERBAIKI** | Database RLS policy `order_items_all` | Policy lama izinkan siapa saja (termasuk tidak login) UPDATE/DELETE pesanan siapapun. Sekarang hanya boleh INSERT + SELECT |
| 3 | Ada 2 tabel pesanan: `orders` dan `customer_orders` | 🟡 Sedang — **BELUM DICEK** | Database, belum jelas file mana pakai yang mana | Kemungkinan salah satu adalah sisa lama tidak terpakai. **Jangan hapus salah satu sebelum dicek tuntas** |
| 4 | RPC khusus status pesanan tidak tersimpan di repo | 🟡 Sedang — **BELUM DICEK** | `rpc_confirm_order`, `rpc_cancel_order`, `rpc_start_production`, dll — dipanggil dari `actions/orders.ts`, definisinya cuma ada di Supabase | Kalau project Supabase rusak/dibuat ulang, fungsi ini **hilang tanpa jejak**. Catatan: RPC lain (`process_purchase`, `process_sale`, `generate_invoice_number`) **AMAN**, sudah tersimpan di `supabase/migration-sql` — hanya RPC order status yang hilang |
| 5 | Pendaftaran akun baru dimatikan tapi kode masih ada (dikomentari) | 🟢 Rendah | `actions/auth.ts` | Bukan bug, sengaja. Tapi jangan hapus kode dikomentari itu tanpa alasan jelas |
| 6 | Harga transaksi POS tidak diverifikasi ulang ke database | 🟡 Sedang — **BELUM DIPERBAIKI** | `actions/sales.ts` — `createSale()` | Sama seperti masalah #1 tapi risiko lebih rendah karena hanya staff login yang bisa akses POS. Kasir nakal tetap bisa manipulasi devtools untuk ubah subtotal/diskon |
| 7 | Policy RLS produk saling bertentangan — niat "hanya owner" gagal | 🟠 Sedang-Tinggi — **BELUM DIPERBAIKI** | Database RLS `products_write` vs `products_update` | `products_write` bermaksud batasi UPDATE produk hanya untuk owner, tapi ada policy lain (`products_update`) yang izinkan baker/cashier juga. Di Postgres, multiple policy untuk operasi sama itu **digabung dengan OR** — jadi baker/cashier tetap bisa ubah harga jual produk meski niatnya dibatasi ke owner saja |
| 8 | `updateBatchStatus()` tidak cek login sendiri, full andalkan RLS | 🟢 Rendah — informasional | `actions/production.ts` | Beda dari kebanyakan fungsi lain yang cek `getUser()` dulu, fungsi ini langsung serah ke RLS database. **Bukan bug aktif** karena RLS `production_update` di database sudah benar (hanya owner/baker) — tapi kalau nanti ada yang "memperbaiki" RLS production tanpa tahu ini, bisa jadi lubang baru |
| 9 | Gross profit di laporan keuangan salah — tampil sama dengan revenue | 🟠 Sedang — **BELUM DIPERBAIKI** | `actions/reports.ts` — `getFinancialReport()` | Fungsi ini tidak pernah SELECT kolom `cogs` dari tabel `sales`, padahal `process_sale()` sudah mengisi kolom itu dengan benar. Akibatnya `grossProfit = revenue` (salah) bukannya `revenue - COGS` (benar). Owner tidak bisa lihat margin sesungguhnya lewat laporan ini |
| 10 | Tabel `customers` sama sekali tidak punya RLS — terbuka penuh di level database | 🔴 Tinggi — **PATCH SUDAH DIBUAT, PERLU DIJALANKAN** | Database, tidak ada `ENABLE ROW LEVEL SECURITY` untuk `customers` di manapun | Kode aplikasi (`requireOwner()`) sudah benar, tapi itu cuma proteksi level kode. Tanpa RLS aktif, siapa saja dengan anon key Supabase (key ini publik, ada di frontend) bisa baca/ubah/hapus data pelanggan (nama, HP, alamat) langsung lewat API, di luar aplikasi Eattie sama sekali. File fix sudah dibuat: `supabase/migrations/000002_customers_rls.sql` — **wajib dijalankan manual di Supabase SQL Editor**, membuat file saja tidak otomatis menjalankannya |
| 11 | CRM (`customers`) tidak terhubung dengan toko online (`orders`) | 🟡 Sedang — gap fungsional, bukan bug keamanan | `actions/store.ts` vs `actions/customers.ts` | Checkout toko online simpan `customer_name`/`customer_phone` ke tabel `orders`, TAPI tidak pernah otomatis buat/update row di tabel `customers`. Owner harus input data pelanggan dua kali kalau mau pakai fitur CRM (tier, riwayat gabungan, dll) — fitur CRM saat ini praktis kosong kecuali diisi manual satu-satu |

---

## 5. Change Guide

### Ubah tampilan halaman toko (`/store`)
- Edit `components/store/store-landing.tsx` (tampilan utama) atau `components/store/product-modal.tsx` (popup produk)
- **Aman diubah** — murni tampilan, tidak menyentuh logika harga/database

### Ubah cara harga dihitung (toko online)
- **HATI-HATI.** Edit di `actions/store.ts`, fungsi `submitOrder()`
- **JANGAN PERNAH** ambil `unit_price`/`subtotal` langsung dari `input.items[]` (data dari browser)
- **SELALU** ambil harga dari tabel `products` dulu, hitung total di server
- Cari komentar `// SECURITY:` di file — itu penanda bagian sensitif

### Perbaiki masalah harga di POS (Bug 6)
- Sebelum `createSale()` simpan ke database, ambil ulang `selling_price` dari `products` untuk tiap item — jangan pakai `unit_price` dari `cart-context.tsx`
- File: `actions/sales.ts`
- **Belum dikerjakan**

### Perbaiki policy produk yang bertentangan (Bug 7)
- Putuskan dulu: siapa yang **seharusnya** boleh ubah harga jual produk — owner saja, atau owner+baker+cashier?
- Kalau maunya owner saja: hapus/ubah policy `products_update` supaya tidak include baker/cashier
- Kalau maunya semua role itu boleh: hapus policy `products_write` yang membingungkan, cukup pakai `products_update`
- **Jangan biarkan keduanya aktif sekaligus** — itu sumber bug ini

### Tambah langkah baru di alur pemesanan (misal: pilih metode pengiriman)
1. Tambah field baru di form `store-checkout.tsx`
2. Tambah field yang sama di tipe `CheckoutInput` (`actions/store.ts`)
3. Tambah kolom baru di tabel `orders` lewat Supabase SQL Editor
4. Update `submitOrder()` untuk simpan field baru itu

### Tambah role baru (misal: "supervisor")
- **JANGAN aktifkan lewat halaman signup** — sengaja dimatikan
- Tambah user manual di Supabase Dashboard → Authentication
- Set role di tabel `profiles` lewat SQL Editor
- Cek `middleware.ts` kalau role baru perlu akses halaman khusus

### Ubah siapa yang boleh login ke halaman tertentu
- Edit `middleware.ts`, bagian `isPublic` — daftar halaman yang tidak perlu login
- **Jangan hapus baris `pathname.startsWith('/store')`** — itu yang bikin customer bisa belanja tanpa akun

### Ubah metode pembayaran POS
- Edit array `PAYMENT_METHODS` di `components/pos/payment-dialog.tsx`
- Aman diubah, murni tampilan pilihan

### Ubah alur pembelian/penerimaan barang
- Alur "terima barang" (`receivePurchase()`) memanggil RPC `process_purchase` — **jangan ubah logic stok langsung di kode TypeScript**, ubah di RPC-nya lewat Supabase SQL Editor kalau perlu ubah cara hitung average cost
- Kalau hanya mau ubah tampilan form terima barang, aman edit `app/dashboard/inventory/purchases/[id]/receive/page.tsx`

### Ubah cara produksi mengurangi stok bahan/menambah stok produk
- **JANGAN edit logic ini di `actions/production.ts`** — semua perhitungan ada di RPC `complete_production_batch`
- Kalau perlu ubah cara hitung biaya produksi atau proporsi bahan, edit RPC-nya lewat Supabase SQL Editor
- Aman diubah di TypeScript: validasi input (jumlah minimal, dsb), tampilan form

### Tambah/ubah resep produk
- Edit `components/forms/recipe-form.tsx` untuk tampilan form
- Logic simpan resep di `actions/recipes.ts` — `upsertRecipe()`
- **Ingat:** hanya owner yang bisa akses ini, dijaga RLS. Kalau baker melapor "tidak bisa buka menu resep", itu **kerja sesuai desain**, bukan bug

### Perbaiki tidak adanya RLS di tabel customers (Bug 10)
- Tambah policy di Supabase SQL Editor, contoh: hanya owner boleh SELECT/INSERT/UPDATE/DELETE
- Simpan sebagai file migration baru di `supabase/migrations/`, jangan cuma dijalankan manual — supaya tercatat (lihat prinsip di Bug 4)

### Ubah isi/tampilan notifikasi push
- Edit `lib/push/send-new-order-push.ts` — bagian `pushPayload` (title, body, url)
- **Jangan ubah cara `createAdminClient()` dipakai** — itu sengaja pakai service role supaya bisa kirim ke semua owner sekaligus
- Aman tambah notifikasi baru (misal: "stok menipis") — bikin fungsi baru dengan pola yang sama, jangan taruh logic berbeda di fungsi yang sudah ada

### Tambah jenis event baru yang perlu push notification
1. Buat fungsi baru di `lib/push/` (contoh: `sendLowStockPush()`), copy pola dari `send-new-order-push.ts`
2. Panggil fungsi itu dari action yang relevan, pakai `void functionName(...)` biar fire-and-forget (tidak blocking)
3. **Jangan lupa** bungkus dengan try-catch di dalam fungsi push-nya sendiri — jangan biarkan error push notification bikin proses utama (misal submit order) gagal

### Hubungkan CRM dengan toko online (Bug 11 — kalau mau perbaiki gap fungsional ini)
- Tambah logic di `submitOrder()` (`actions/store.ts`): setelah order berhasil dibuat, cek apakah `customer_phone` sudah ada di tabel `customers` — kalau belum, auto-insert; kalau sudah, bisa update statistik (total belanja, dll)
- **Hati-hati:** ini nambah kompleksitas ke fungsi `submitOrder()` yang sudah punya validasi harga (Bug 1 fix) — jangan sampai logic baru ini mengganggu validasi yang sudah ada

---

## Yang BELUM masuk dokumen ini (menyusul)

- QRIS Dinamis (`lib/qris/**`, `app/api/qris/route.ts`) — fitur baru, sudah divalidasi CRC checksum-nya secara matematis tapi belum diverifikasi end-to-end dengan scan aplikasi bank sungguhan
- Katalog Produk sort/tampilan (`app/dashboard/products/page.tsx`, `components/products/product-list-controls.tsx`) — fitur baru, kemungkinan risiko rendah karena read-only/tampilan saja, belum dicek mendalam

Setiap modul ditambahkan setelah kodenya benar-benar dicek — bukan ditulis dari nama file.
