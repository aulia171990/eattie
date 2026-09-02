-- ============================================================
-- Default Variant & Add-On for Existing Products (additive)
-- ============================================================

-- 1. INSERT a default variant for every product that has none
INSERT INTO public.product_variants
    (product_id, name, price, sort_order, is_active, created_at, updated_at)
SELECT
    p.id                     AS product_id,
    'Standard'               AS name,
    COALESCE(p.selling_price, 0)               AS price,
    0                        AS sort_order,
    true                     AS is_active,
    now()                    AS created_at,
    now()                    AS updated_at
FROM public.products p
WHERE NOT EXISTS (
    SELECT 1 FROM public.product_variants v
    WHERE v.product_id = p.id
);

-- 2. INSERT a basic add-on (e.g., "Gula") for every product that has none
INSERT INTO public.product_addons
    (product_id, name, price, sort_order, is_active, created_at, updated_at)
SELECT
    p.id                     AS product_id,
    'Gula'                   AS name,
    500                      AS price,
    0                        AS sort_order,
    true                     AS is_active,
    now()                    AS created_at,
    now()                    AS updated_at
FROM public.products p
WHERE NOT EXISTS (
    SELECT 1 FROM public.product_addons a
    WHERE a.product_id = p.id
);