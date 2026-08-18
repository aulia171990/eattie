-- Perluasan store_settings: 3 kolom warna baru yang sebelumnya
-- hardcoded di styles/theme.css (tidak bisa diatur owner):
--   text_secondary_color  -> --text-secondary (teks deskripsi/label sekunder)
--   accent_foreground_color -> --accent-foreground (teks di atas warna aksen)
--   surface_raised_color   -> --surface-raised (latar placeholder gambar produk)
--
-- Format "H S% L%" (tanpa hsl()) konsisten dengan kolom warna lain.

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS text_secondary_color   TEXT DEFAULT '20 12% 35%',
  ADD COLUMN IF NOT EXISTS accent_foreground_color TEXT DEFAULT '0 0% 100%',
  ADD COLUMN IF NOT EXISTS surface_raised_color    TEXT DEFAULT '35 30% 99%';

UPDATE public.store_settings
SET
  text_secondary_color   = COALESCE(text_secondary_color, '20 12% 35%'),
  accent_foreground_color = COALESCE(accent_foreground_color, '0 0% 100%'),
  surface_raised_color    = COALESCE(surface_raised_color, '35 30% 99%')
WHERE id = 1;
