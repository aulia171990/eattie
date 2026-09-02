-- ============================================================
-- Custom Add-ons per Product (additive)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_product_addons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_addons_product_active
  ON public.custom_product_addons (product_id, sort_order)
  WHERE is_active = true;

ALTER TABLE public.custom_product_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_addons_admin_all" ON public.custom_product_addons;
CREATE POLICY "custom_addons_admin_all"
  ON public.custom_product_addons FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "custom_addons_public_read" ON public.custom_product_addons;
CREATE POLICY "custom_addons_public_read"
  ON public.custom_product_addons FOR SELECT TO public
  USING (is_active = true);