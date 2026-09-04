-- Store settings (single-row table for app configuration)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  company_name TEXT NOT NULL DEFAULT 'My Bakery',
  short_name TEXT NOT NULL DEFAULT 'Bakery',
  tagline TEXT NOT NULL DEFAULT 'Fresh Bread & Cakes, Made to Order',
  logo_url TEXT,
  logo_icon_url TEXT,
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '32 95% 44%',
  primary_color_hex TEXT NOT NULL DEFAULT '#c87e1a',
  accent_color TEXT NOT NULL DEFAULT '38 55% 48%',
  sidebar_color TEXT NOT NULL DEFAULT '345 32% 18%',
  whatsapp TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  facebook TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default row
INSERT INTO public.store_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read
CREATE POLICY "authenticated_can_read_store_settings"
  ON public.store_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only owner can update
CREATE POLICY "owner_can_update_store_settings"
  ON public.store_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Allow anonymous/public read for store front
CREATE POLICY "public_can_read_store_settings"
  ON public.store_settings
  FOR SELECT
  TO anon
  USING (true);
