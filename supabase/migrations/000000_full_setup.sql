-- ============================================================================
-- Eattie — Full Database Setup Script
-- ============================================================================
-- Run this script in Supabase SQL Editor to set up the entire database.
-- Idempotent: safe to re-run (uses CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================================

-- ── 1. Enable required extensions ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Create tables (from schema.sql — simplified core tables) ────────────
-- Note: This is a condensed version. For the full schema with all 50+ tables,
-- see individual migration files in supabase/migrations/

-- Core profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'cashier', 'baker')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Store settings (single-row config)
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
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default store settings if empty
INSERT INTO public.store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 3. Enable RLS on all tables ───────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- ── 4. Create basic RLS policies ─────────────────────────────────────────
-- Profiles: users can read their own profile, owners can read all
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_self_read') THEN
    CREATE POLICY profiles_self_read ON public.profiles
      FOR SELECT USING (id = auth.uid() OR get_user_role() = 'owner');
  END IF;
END $$;

-- Store settings: anyone authenticated can read, only owner can write
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settings_read') THEN
    CREATE POLICY settings_read ON public.store_settings
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settings_write') THEN
    CREATE POLICY settings_write ON public.store_settings
      FOR ALL TO authenticated USING (get_user_role() = 'owner')
      WITH CHECK (get_user_role() = 'owner');
  END IF;
END $$;

-- ── 5. Helper functions ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- ── 6. Seed default data ─────────────────────────────────────────────────
-- Default store settings already inserted above
-- Additional seeds (chart of accounts, etc.) should be run from:
--   supabase/seeds/00001_initial_data.sql

-- ── Done ──────────────────────────────────────────────────────────────────
SELECT 'Eattie database setup complete!' AS status;
