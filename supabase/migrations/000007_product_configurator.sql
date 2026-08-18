-- ============================================================
-- Product Configurator — production migration
-- Adds: categories, option_groups, option_values, gallery,
--       tags, variant-option junction, price_history
-- ADDITIVE ONLY — drops nothing, renames nothing
-- ============================================================

-- 1. PRODUCT CATEGORIES (normalized)
CREATE TABLE IF NOT EXISTS public.product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  name_en     TEXT,
  emoji       TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_sort ON public.product_categories(sort_order);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- anon can see active
DROP POLICY IF EXISTS "product_categories_public_read" ON public.product_categories;
CREATE POLICY "product_categories_public_read"
  ON public.product_categories FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "product_categories_authenticated_all" ON public.product_categories;
CREATE POLICY "product_categories_authenticated_all"
  ON public.product_categories FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. PRODUCT TAGS (for filtering)
CREATE TABLE IF NOT EXISTS public.product_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  emoji       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_tags_public_read" ON public.product_tags;
CREATE POLICY "product_tags_public_read"
  ON public.product_tags FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "product_tags_authenticated_all" ON public.product_tags;
CREATE POLICY "product_tags_authenticated_all"
  ON public.product_tags FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- product-tag junction
CREATE TABLE IF NOT EXISTS public.product_tags_junction (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES public.product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

ALTER TABLE public.product_tags_junction ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_tags_junction_public_read" ON public.product_tags_junction;
CREATE POLICY "product_tags_junction_public_read"
  ON public.product_tags_junction FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "product_tags_junction_authenticated_all" ON public.product_tags_junction;
CREATE POLICY "product_tags_junction_authenticated_all"
  ON public.product_tags_junction FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. PRODUCT GALLERY
CREATE TABLE IF NOT EXISTS public.product_gallery (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_gallery_product ON public.product_gallery(product_id, sort_order);

ALTER TABLE public.product_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_gallery_public_read" ON public.product_gallery;
CREATE POLICY "product_gallery_public_read"
  ON public.product_gallery FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "product_gallery_authenticated_all" ON public.product_gallery;
CREATE POLICY "product_gallery_authenticated_all"
  ON public.product_gallery FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. PRODUCT OPTION GROUPS (e.g. "Size", "Topping", "Type")
CREATE TABLE IF NOT EXISTS public.product_option_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- "Size", "Topping", "Type"
  display_type TEXT NOT NULL DEFAULT 'radio',  -- radio | select | image
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_option_groups_product ON public.product_option_groups(product_id, sort_order);

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "option_groups_public_read" ON public.product_option_groups;
CREATE POLICY "option_groups_public_read"
  ON public.product_option_groups FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "option_groups_authenticated_all" ON public.product_option_groups;
CREATE POLICY "option_groups_authenticated_all"
  ON public.product_option_groups FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. PRODUCT OPTION VALUES (individual choices within a group)
CREATE TABLE IF NOT EXISTS public.product_option_values (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  value       TEXT NOT NULL,              -- "16 cm", "Original", "Cake"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,                       -- optional image for visual pickers
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_option_values_group ON public.product_option_values(group_id, sort_order);

ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "option_values_public_read" ON public.product_option_values;
CREATE POLICY "option_values_public_read"
  ON public.product_option_values FOR SELECT TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "option_values_authenticated_all" ON public.product_option_values;
CREATE POLICY "option_values_authenticated_all"
  ON public.product_option_values FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. VARIANTS — existing table, we add option_value mapping
-- variant_option_values: which combination of option values this variant represents
CREATE TABLE IF NOT EXISTS public.variant_option_values (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id       UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  option_value_id  UUID NOT NULL REFERENCES public.product_option_values(id) ON DELETE CASCADE,
  UNIQUE (variant_id, option_value_id)
);

CREATE INDEX IF NOT EXISTS idx_variant_optval_variant ON public.variant_option_values(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_optval_optval ON public.variant_option_values(option_value_id);

ALTER TABLE public.variant_option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variant_optval_public_read" ON public.variant_option_values;
CREATE POLICY "variant_optval_public_read"
  ON public.variant_option_values FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "variant_optval_authenticated_all" ON public.variant_option_values;
CREATE POLICY "variant_optval_authenticated_all"
  ON public.variant_option_values FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add option_text column to existing product_variants for display label
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS option_text TEXT;  -- computed: "16 cm, Original"

-- 7. PRICE HISTORY (audit trail)
CREATE TABLE IF NOT EXISTS public.price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  old_price   INTEGER NOT NULL,
  new_price   INTEGER NOT NULL,
  changed_by  UUID REFERENCES public.profiles(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_variant ON public.price_history(variant_id);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_history_authenticated_all" ON public.price_history;
CREATE POLICY "price_history_authenticated_all"
  ON public.price_history FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. ADD category_id TO products (nullable — existing products keep NULL)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id);

-- 9. ADD is_featured for homepage display
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- 9. ADD variant_id, addon_detail TO sale_items (like already done for order_items)
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS addon_detail JSONB DEFAULT '[]'::jsonb;
