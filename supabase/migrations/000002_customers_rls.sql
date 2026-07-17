-- Bug 10 fix: tabel `customers` tidak punya RLS sama sekali.
-- Tanpa RLS aktif, siapa saja dengan anon key Supabase bisa
-- baca/ubah/hapus data pelanggan langsung, di luar aplikasi.
--
-- Aplikasi sudah benar (requireOwner() check di actions/customers.ts),
-- tapi itu hanya proteksi level kode — RLS ini proteksi level database,
-- lapisan pertahanan kedua yang wajib ada untuk data pelanggan.

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON public.customers
FOR SELECT TO authenticated
USING (get_user_role() = 'owner');

CREATE POLICY "customers_insert" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "customers_update" ON public.customers
FOR UPDATE TO authenticated
USING (get_user_role() = 'owner')
WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "customers_delete" ON public.customers
FOR DELETE TO authenticated
USING (get_user_role() = 'owner');
