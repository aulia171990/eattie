-- Bug 12 fix: customer yang isi review dari /store/track TIDAK LOGIN
-- (role = anon), tapi policy INSERT product_reviews sebelumnya hanya
-- untuk `authenticated`. Akibatnya review yang dikirim customer selalu
-- ditolak diam-diam oleh RLS — data terlihat "terkirim" di frontend
-- (tidak ada error UI) tapi tidak pernah benar-benar tersimpan.
--
-- Validasi kepemilikan (order status COMPLETED, product ada di order,
-- phone cocok) SUDAH dilakukan di app/api/reviews/route.ts sebelum
-- insert dipanggil — jadi policy ini cukup permisif di level RLS,
-- karena pengecekan sebenarnya sudah terjadi di application layer.

DROP POLICY IF EXISTS "product_reviews_anon_insert" ON public.product_reviews;
CREATE POLICY "product_reviews_anon_insert"
  ON public.product_reviews FOR INSERT TO anon
  WITH CHECK (true);
