-- Enforce that raw-ingredient stock can only be set by the system (purchases /
-- stock opname), never written directly from the edit-ingredient form.
--
-- The app layer already stops reading `current_stock` from the form
-- (actions/ingredients.ts: updateIngredient no longer writes it; the form
-- shows it as read-only). This migration hardens the DB so a NULL can never
-- slip in on insert and the column always has a sane baseline.
--
-- Idempotent: safe to re-run.

-- Backfill any NULLs to 0 before adding NOT NULL.
update public.ingredients
  set current_stock = 0
  where current_stock is null;

-- Make the column NOT NULL with a 0 default.
alter table public.ingredients
  alter column current_stock set default 0,
  alter column current_stock set not null;
