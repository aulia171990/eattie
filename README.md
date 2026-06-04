# 🍞 Bakery Management System

Sistem manajemen toko roti lengkap dengan Next.js 15 + Supabase.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: React Context + Server Actions
- **Print**: react-to-print
- **Language**: Bilingual ID/EN

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd bakery-management
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Copy URL dan anon key dari Settings → API
3. Buat file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxx
```

### 3. Setup Database

1. Buka Supabase Dashboard → SQL Editor
2. Copy isi file `supabase-schema.sql`
3. Jalankan SQL tersebut
4. Schema, RLS policies, dan trigger akan ter-setup otomatis

### 4. Buat User Pertama (Owner)

```sql
-- Di Supabase SQL Editor, setelah mendaftar via app:
UPDATE profiles SET role = 'owner' WHERE id = 'your-user-id';
```

Atau daftar melalui aplikasi dan pilih role "Owner".

### 5. Generate TypeScript Types

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Generate types (setelah database dibuat)
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

### 6. Jalankan Aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Struktur Project

```
├── app/
│   ├── auth-pages/          # Login, sign-up pages
│   ├── auth/callback/       # Supabase OAuth callback
│   ├── dashboard/           # Dashboard + semua modul
│   └── pos/                 # POS full-screen
├── components/
│   ├── layout/              # Sidebar, Header
│   ├── forms/               # Form components
│   ├── tables/              # Data tables
│   └── shared/              # Shared components
├── lib/
│   ├── supabase/            # Client & server clients
│   ├── utils.ts             # Helper functions
│   └── constants.ts         # App constants
├── actions/                 # Server Actions
├── types/                   # TypeScript types
├── contexts/                # React Context
└── supabase-schema.sql      # Database schema
```

## Role Access

| Fitur | Owner | Kasir | Baker |
|-------|-------|-------|-------|
| Dashboard | ✅ Full | ✅ Sales | ✅ Produksi |
| Inventory | ✅ | ❌ | ❌ |
| Produk | ✅ | 👁 Read | ❌ |
| Resep | ✅ | ❌ | ❌ |
| Produksi | ✅ | ❌ | ✅ Update |
| POS/Sales | ✅ | ✅ | ❌ |
| Laporan | ✅ | ❌ | ❌ |

## Development Phases

- **Phase 1** ✅ Foundation (Auth, Layout, Navigation)
- **Phase 2** 🔜 Core (Inventory, Products, Recipes, Production)
- **Phase 3** 🔜 Sales & POS
- **Phase 4** 🔜 Reports & Financial
- **Phase 5** 🔜 Polish & Optimization

## Phase 2 — Selesai ✅

### Modul yang sudah dibangun:

**📦 Inventory Management**
- Daftar bahan baku dengan filter, search, kategori
- CRUD bahan baku lengkap (form + validasi)
- Manajemen supplier
- Purchase Order (PO) — buat, detail, terima stok → auto update stok
- Pergerakan stok — riwayat lengkap semua tipe
- Stock Opname — buat sesi, input aktual, auto-adjust stok

**🥐 Products**
- Katalog produk per kategori dengan kartu visual
- CRUD produk (nama, harga jual, HPP, kategori)

**📖 Recipes**
- Database resep dengan dynamic ingredient builder
- Kalkulasi otomatis total biaya bahan
- Kalkulasi margin keuntungan
- Update/edit resep

**🏭 Production**
- Jadwal batch produksi dengan filter status
- Buat batch baru
- Update status: planned → in_progress → completed
- Input hasil produksi dan defect
- Timeline batch

### Server Actions (tanpa API routes):
- `actions/ingredients.ts` — CRUD + stock adjustment
- `actions/suppliers.ts` — CRUD supplier
- `actions/products.ts` — CRUD produk
- `actions/recipes.ts` — upsert resep + ingredients
- `actions/production.ts` — batch management
- `actions/stock-purchases.ts` — PO + receive stock
- `actions/stock-opname.ts` — create + submit opname

**Phase 3 berikutnya:** POS & Sales (kasir, cart, payment, struk)
