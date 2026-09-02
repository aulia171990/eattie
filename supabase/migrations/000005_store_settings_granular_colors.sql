-- Perluasan store_settings untuk kontrol warna granular per elemen.
-- Sebelumnya hanya ada 3 slot (primary, accent, sidebar). Sekarang
-- setiap elemen utama UI punya kolom sendiri, sesuai permintaan
-- kontrol manual satu-satu.
--
-- PENTING: kolom ini menyimpan format "H S% L%" (tanpa hsl() wrapper)
-- supaya bisa langsung dipakai sebagai CSS variable value, konsisten
-- dengan format yang sudah dipakai di styles/theme.css.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS background_color   TEXT DEFAULT '35 35% 97%',
  ADD COLUMN IF NOT EXISTS surface_color      TEXT DEFAULT '0 0% 100%',
  ADD COLUMN IF NOT EXISTS text_color         TEXT DEFAULT '20 18% 14%',
  ADD COLUMN IF NOT EXISTS text_muted_color   TEXT DEFAULT '20 10% 50%',
  ADD COLUMN IF NOT EXISTS border_color       TEXT DEFAULT '30 15% 88%',
  ADD COLUMN IF NOT EXISTS button_text_color  TEXT DEFAULT '0 0% 100%',
  ADD COLUMN IF NOT EXISTS success_color      TEXT DEFAULT '145 45% 34%',
  ADD COLUMN IF NOT EXISTS danger_color       TEXT DEFAULT '355 68% 46%',
  ADD COLUMN IF NOT EXISTS warning_color      TEXT DEFAULT '38 82% 42%',
  ADD COLUMN IF NOT EXISTS sidebar_text_color TEXT DEFAULT '35 20% 90%',
  ADD COLUMN IF NOT EXISTS footer_bg_color    TEXT DEFAULT '345 32% 18%',
  ADD COLUMN IF NOT EXISTS footer_text_color  TEXT DEFAULT '35 20% 90%';

-- Isi baris settings yang sudah ada (id=1) dengan default di atas,
-- kalau kolom baru ini masih NULL setelah ditambahkan.
UPDATE public.store_settings
SET
  background_color   = COALESCE(background_color, '35 35% 97%'),
  surface_color      = COALESCE(surface_color, '0 0% 100%'),
  text_color         = COALESCE(text_color, '20 18% 14%'),
  text_muted_color   = COALESCE(text_muted_color, '20 10% 50%'),
  border_color       = COALESCE(border_color, '30 15% 88%'),
  button_text_color  = COALESCE(button_text_color, '0 0% 100%'),
  success_color      = COALESCE(success_color, '145 45% 34%'),
  danger_color       = COALESCE(danger_color, '355 68% 46%'),
  warning_color      = COALESCE(warning_color, '38 82% 42%'),
  sidebar_text_color = COALESCE(sidebar_text_color, '35 20% 90%'),
  footer_bg_color    = COALESCE(footer_bg_color, '345 32% 18%'),
  footer_text_color  = COALESCE(footer_text_color, '35 20% 90%')
WHERE id = 1;
