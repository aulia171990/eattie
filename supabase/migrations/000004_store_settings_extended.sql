-- Extended store settings: richer store profile, localization, receipt, features.
-- Safe additive migration (no breaking changes to existing columns).

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'id-ID',
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT NOT NULL DEFAULT 'Terima kasih telah berbelanja 🍞',
  ADD COLUMN IF NOT EXISTS business_hours TEXT NOT NULL DEFAULT '08:00 - 20:00',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{"online_order": true, "custom_cake": true, "loyalty": false, "qris": true}'::jsonb;

-- Keep RLS intact (policies are table-level, unaffected by column adds).
-- No new policies required: existing read/update policies cover the row.
