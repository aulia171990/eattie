-- ============================================================================
-- Eattie — Initial Seed Data
-- ============================================================================
-- Run this after the full setup script to populate default data.
-- Idempotent: safe to re-run.
-- ============================================================================

-- ── 1. Default Chart of Accounts ─────────────────────────────────────────
INSERT INTO public.chart_of_accounts (code, name, type) VALUES
  ('1000', 'Kas', 'asset'),
  ('1100', 'Bank', 'asset'),
  ('1200', 'Piutang Usaha', 'asset'),
  ('1300', 'Persediaan Bahan Baku', 'asset'),
  ('1400', 'Persediaan Produk Jadi', 'asset'),
  ('1500', 'Perlengkapan', 'asset'),
  ('1600', 'Peralatan', 'asset'),
  ('2000', 'Hutang Usaha', 'liability'),
  ('2100', 'Hutang Bank', 'liability'),
  ('2200', 'PPN Keluaran', 'liability'),
  ('2300', 'Gaji Belum Dibayar', 'liability'),
  ('3000', 'Modal', 'equity'),
  ('3100', 'Laba Ditahan', 'equity'),
  ('3200', 'Laba Bulan Berjalan', 'equity'),
  ('4000', 'Penjualan', 'revenue'),
  ('4100', 'Penjualan Online', 'revenue'),
  ('4200', 'Pendapatan Lain', 'revenue'),
  ('5000', 'Harga Pokok Penjualan', 'expense'),
  ('5100', 'Bahan Baku', 'expense'),
  ('5200', 'Gaji & Upah', 'expense'),
  ('5300', 'Sewa', 'expense'),
  ('5400', 'Listrik & Air', 'expense'),
  ('5500', 'Perlengkapan Kantor', 'expense'),
  ('5600', 'Peralatan', 'expense'),
  ('5700', 'Pengeluaran Lain', 'expense'),
  ('5800', 'Selisih Stok', 'expense')
ON CONFLICT (code) DO NOTHING;

-- ── 2. Default Store Settings (if not already set) ───────────────────────
INSERT INTO public.store_settings (id, company_name, short_name, tagline)
VALUES (1, 'My Bakery', 'Bakery', 'Fresh Bread & Cakes, Made to Order')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Default Admin User ────────────────────────────────────────────────
-- NOTE: You must first sign up via the app, then run:
-- UPDATE public.profiles SET role = 'owner' WHERE id = 'your-user-id';

-- ── Done ──────────────────────────────────────────────────────────────────
SELECT 'Seed data inserted successfully!' AS status;
