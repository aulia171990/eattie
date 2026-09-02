-- Add owner-overridable accent subtle color to store_settings.
-- This drives the "Dietary Friendly" section background and the feature-icon
-- halo on the store landing page (bg-accent-subtle), so owners can retheme it
-- instead of relying on a hardcoded token in theme.css.
--
-- Idempotent: safe to re-run.

alter table public.store_settings
  add column if not exists accent_subtle_color text not null default '38 60% 95%';

-- Backfill any pre-existing rows that still hold the old default placeholder.
update public.store_settings
  set accent_subtle_color = '38 60% 95%'
  where accent_subtle_color is null or accent_subtle_color = '';
