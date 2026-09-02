-- Sync store_settings: add every column the app code expects but the
-- live database may be missing (originally introduced by migrations
-- 000005, 000016, 000018). Idempotent: safe to re-run.
--
-- HOW TO APPLY:
--   1. Open the Supabase dashboard -> SQL Editor.
--   2. Paste this entire script and click "Run".
--   3. The final NOTIFY reloads PostgREST's schema cache so the
--      "Could not find the '...' column in the schema cache" error
--      goes away immediately.
--
-- If your self-hosted/PGRST setup does not support the NOTIFY, instead
-- use the dashboard: Database -> Schema cache -> "Reload" (or call your
-- platform's reload endpoint) after running the ALTERs.

ALTER TABLE public.store_settings
  -- 000005 granular colors
  ADD COLUMN IF NOT EXISTS background_color    TEXT DEFAULT '35 35% 97%',
  ADD COLUMN IF NOT EXISTS surface_color       TEXT DEFAULT '0 0% 100%',
  ADD COLUMN IF NOT EXISTS text_color          TEXT DEFAULT '20 18% 14%',
  ADD COLUMN IF NOT EXISTS text_muted_color    TEXT DEFAULT '20 10% 50%',
  ADD COLUMN IF NOT EXISTS border_color        TEXT DEFAULT '30 15% 88%',
  ADD COLUMN IF NOT EXISTS button_text_color   TEXT DEFAULT '0 0% 100%',
  ADD COLUMN IF NOT EXISTS success_color       TEXT DEFAULT '145 45% 34%',
  ADD COLUMN IF NOT EXISTS danger_color        TEXT DEFAULT '355 68% 46%',
  ADD COLUMN IF NOT EXISTS warning_color       TEXT DEFAULT '38 82% 42%',
  ADD COLUMN IF NOT EXISTS sidebar_text_color  TEXT DEFAULT '35 20% 90%',
  ADD COLUMN IF NOT EXISTS footer_bg_color     TEXT DEFAULT '345 32% 18%',
  ADD COLUMN IF NOT EXISTS footer_text_color   TEXT DEFAULT '35 20% 90%',
  -- 000016 text / surface / accent-foreground
  ADD COLUMN IF NOT EXISTS text_secondary_color TEXT DEFAULT '20 12% 35%',
  ADD COLUMN IF NOT EXISTS accent_foreground_color TEXT DEFAULT '0 0% 100%',
  ADD COLUMN IF NOT EXISTS surface_raised_color  TEXT DEFAULT '35 30% 99%',
  -- 000018 extended profile
  ADD COLUMN IF NOT EXISTS email               TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone               TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address             TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS currency_code       TEXT NOT NULL DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS locale              TEXT NOT NULL DEFAULT 'id-ID',
  ADD COLUMN IF NOT EXISTS receipt_footer      TEXT NOT NULL DEFAULT 'Terima kasih telah berbelanja 🍞',
  ADD COLUMN IF NOT EXISTS business_hours      TEXT NOT NULL DEFAULT '08:00 - 20:00',
  ADD COLUMN IF NOT EXISTS favicon_url          TEXT,
  ADD COLUMN IF NOT EXISTS features            JSONB NOT NULL DEFAULT '{"online_order": true, "custom_cake": true, "loyalty": false, "qris": true}'::jsonb;

-- Backfill NULLs for the existing settings row (id = 1).
UPDATE public.store_settings
SET
  background_color     = COALESCE(background_color, '35 35% 97%'),
  surface_color        = COALESCE(surface_color, '0 0% 100%'),
  text_color           = COALESCE(text_color, '20 18% 14%'),
  text_muted_color     = COALESCE(text_muted_color, '20 10% 50%'),
  border_color         = COALESCE(border_color, '30 15% 88%'),
  button_text_color    = COALESCE(button_text_color, '0 0% 100%'),
  success_color        = COALESCE(success_color, '145 45% 34%'),
  danger_color         = COALESCE(danger_color, '355 68% 46%'),
  warning_color        = COALESCE(warning_color, '38 82% 42%'),
  sidebar_text_color   = COALESCE(sidebar_text_color, '35 20% 90%'),
  footer_bg_color      = COALESCE(footer_bg_color, '345 32% 18%'),
  footer_text_color    = COALESCE(footer_text_color, '35 20% 90%'),
  text_secondary_color = COALESCE(text_secondary_color, '20 12% 35%'),
  accent_foreground_color = COALESCE(accent_foreground_color, '0 0% 100%'),
  surface_raised_color = COALESCE(surface_raised_color, '35 30% 99%'),
  email                = COALESCE(email, ''),
  phone                = COALESCE(phone, ''),
  address              = COALESCE(address, ''),
  currency_code        = COALESCE(currency_code, 'IDR'),
  locale               = COALESCE(locale, 'id-ID'),
  receipt_footer       = COALESCE(receipt_footer, 'Terima kasih telah berbelanja 🍞'),
  business_hours       = COALESCE(business_hours, '08:00 - 20:00')
WHERE id = 1;

-- Refresh PostgREST schema cache so the new columns are recognized
-- immediately (fixes the "schema cache" error on save).
NOTIFY pgrst, 'reload schema';
