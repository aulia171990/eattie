-- product_variants: each variant = one priceable SKU
CREATE TABLE IF NOT EXISTS public.product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,             -- e.g. "16 cm Original", "Isi 6"
  price       INTEGER NOT NULL CHECK (price >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id, sort_order);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- anon/public can read active variants
DROP POLICY IF EXISTS "variants_public_read" ON public.product_variants;
CREATE POLICY "variants_public_read"
  ON public.product_variants FOR SELECT TO public
  USING (is_active = true);

-- authenticated users (admin) full access
DROP POLICY IF EXISTS "variants_authenticated_all" ON public.product_variants;
CREATE POLICY "variants_authenticated_all"
  ON public.product_variants FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- product_addons: optional extras that cost extra
CREATE TABLE IF NOT EXISTS public.product_addons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_addons_product ON public.product_addons(product_id, sort_order);

ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addons_public_read" ON public.product_addons;
CREATE POLICY "addons_public_read"
  ON public.product_addons FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "addons_authenticated_all" ON public.product_addons;
CREATE POLICY "addons_authenticated_all"
  ON public.product_addons FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- add variant_id + addon_ids columns to order_items for reference
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS addon_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS addon_detail JSONB DEFAULT '[]'::jsonb;
-- addon_detail: [{name, price}] snapshot so price changes don't affect past orders
