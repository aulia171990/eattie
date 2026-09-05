---
name: supabase-nextjs-schema-changes
description: Verified Supabase+Next.js schema changes; keep types synced.
---

# Supabase + Next.js schema changes

When a task requires a DB change (new column, foreign key, unique index, RPC/SQL function, or RLS policy) in a Supabase-backed Next.js app, follow this order. The repo keeps THREE sources of truth for the schema; all three must stay consistent or the build/typecheck will lie to you.

## Workflow
1. **Write an idempotent migration file** in `supabase/migrations/` with a zero-padded incrementing prefix, e.g. `000027_recipes_variant_support.sql`.
   - Guard `ADD COLUMN` with `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=... AND column_name=...) THEN ALTER TABLE ... ADD COLUMN ...; END IF; END $$;` so re-runs are safe.
   - Use `CREATE INDEX IF NOT EXISTS` and `CREATE UNIQUE INDEX IF NOT EXISTS ... WHERE ...` for partial/conditional unique constraints.
   - `CREATE OR REPLACE FUNCTION ... SECURITY DEFINER` for RPCs that read tables the calling role can't see (e.g. a `baker` role blocked from `recipes`); the RPC is the sanctioned way to bypass RLS without leaking logic to the client.
2. **Update the canonical schema** `supabase-schema.sql` (`CREATE TABLE IF NOT EXISTS` block) so the repo's source-of-truth SQL stays accurate — this is what a fresh `supabase db push` / new environment reads.
3. **Sync generated types** in `types/database.ts`:
   - Row / Insert / Update for the changed table.
   - The `Functions:` section for any new/changed RPC signature, e.g.
     `get_recipe_id_for_product: { Args: { p_product_id: string; p_variant_id?: string | null }; Returns: string }`.
   - IMPORTANT: `types/database.ts` is generated/derived. It can contain columns that do NOT exist in the DB or in any migration SQL (drift). Never treat it as proof a column exists — verify against the migration files and, if reachable, the live DB. The app will typecheck cleanly while the runtime INSERT still fails because the column isn't actually in the table.
4. **Update the app code** that reads/writes the new column: server-action `select(...)` strings, form state, and type usage.
5. **Verify** with the project's own gates (all must exit 0 before claiming done):
   - `npm run lint` (next lint) — clean in the files you touched.
   - `npx tsc --noEmit -p tsconfig.json` — catches type drift.
   - `npm run build` — the real gate; catches RSC/route errors.

## Pitfalls

- **types/database.ts drift**: a column present in the types file but absent from migration SQL means it isn't in the real DB. Add it via migration; do not assume the type file is the schema. This is the single most common silent trap.

### Type Mismatch Debugging (UUID vs BIGINT)

When error shows: `column X is of type Y but expression is of type Z`

**Common patterns:**
- `store_settings.id = BIGINT` but `audit_logs.record_id = UUID`
- Triggers using `NEW.id` or `OLD.id` for audit logging
- RPC functions with typed parameters

**Diagnosis:**
```sql
-- Check column types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'your_table' AND column_name = 'problem_column';

-- Find triggers that use the column
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger 
WHERE tgrelid = 'your_table'::regclass;
```

**Solution patterns:**

1. **Single-row table** (like `store_settings`): Convert ID to UUID for consistency
   - Use `gen_random_uuid()` for fixed UUID value
   - Keep CHECK constraint: `CHECK (id = '<uuid>')`

2. **Migration template:**
   ```sql
   -- Add UUID column
   ALTER TABLE public.store_settings ADD COLUMN id_uuid UUID;
   
   -- Set fixed value
   UPDATE public.store_settings SET id_uuid = 'fixed-uuid-here';
   
   -- Drop old column and rename
   ALTER TABLE public.store_settings DROP COLUMN id;
   ALTER TABLE public.store_settings RENAME COLUMN id_uuid TO id;
   ```

**Post-migration sync:**
```bash
npx tsc --noEmit
npm run lint
npm run build
```

**GOTCHA:** Search for hardcoded IDs that break after type changes:
```bash
grep -r "\.eq('id', 1)" app/ actions/
```

## Verification (session-proof)
Run the three commands above. A green build with clean lint + tsc is the bar — but it does NOT prove the column exists in the live DB (that requires the migration applied). Always state when the migration still needs applying.

## Self-verifying RPC test harness (when you changed an RPC and the CLI can't run)
When the Supabase CLI can't apply/migrate locally (Android/Termux), you can still PROVE an
RPC behaves correctly by shipping a `verify_NNNN_*.sql` that the user pastes into the SQL
Editor. Pattern that leaves zero residue:
```sql
BEGIN;
DO $$\nDECLARE v_ing uuid; v_prod uuid; v_rec uuid; v_batch uuid; v_res jsonb;
        v_after numeric; v_cost numeric;
BEGIN\n  INSERT INTO ingredients (name, base_unit, price_per_unit, current_stock)
    VALUES ('__TEST_X','kg',10000,10) RETURNING id INTO v_ing;\n  -- ...build a minimal scenario (product, recipe, recipe_ingredients, batch)...\n  SELECT public.my_rpc(v_batch, /*args*/) INTO v_res;\n  SELECT current_stock INTO v_after FROM ingredients WHERE id = v_ing;\n  v_cost := (v_res->>'cost_per_unit')::numeric;\n  IF v_after <> 9.5 THEN RAISE EXCEPTION 'FAIL stock %', v_after; END IF;\n  IF v_cost <> 5000 THEN RAISE EXCEPTION 'FAIL cost %', v_cost; END IF;\n  RAISE NOTICE 'VERIFIED: ...';\nEND $$;\nROLLBACK;   -- __TEST_* rows vanish; nothing persists
```
Key points: wrap the whole thing in `BEGIN; … ROLLBACK;` so no test data survives; use
`__TEST_`-prefixed names; assert with `RAISE EXCEPTION` (aborts the DO block, but the\nsurrounding ROLLBACK still runs so it's clean); tell the user the ROLLBACK means the run
is read-only. This turns "trust me, the logic is right" into "paste this, read the NOTICE".

## Regenerating types without the CLI
Step 3 (sync `types/database.ts`) normally needs `supabase gen types`, which won't run on
Android/Termux. Use `software-development/supabase-migration-patterns/scripts/regen_types_from_live.py`,
which pulls live schema via the Management API SQL endpoint and emits the full Supabase-style
`Database` type. This is the authoritative regen when the committed types have drifted.
IMPORTANT: after regen, `tsc` will surface `string | null` / `number | null` errors in app
code that the stale types were hiding. Before null-guarding those, COUNT actual NULL rows
per critical column (see `software-development/supabase-migration-patterns/references/audit-live-db-protocol.md`,
"Langkah 0") — `null_count = 0` is safe to guard; `> 0` means possible data corruption, STOP
and investigate. Never decide the `> 0` case alone.

## References
- `references/eattie-supabase-layout.md` — project-specific paths, migration numbering, and the recipe/variant 2-level resolution RPC pattern actually shipped in this repo.
- `references/jsonb-collection-crud.md` — storing per-row collections (e.g. saved color presets) in a `jsonb` column: migration + CHECK-shape constraint, read-modify-write server actions, the local-type drift workaround, and race-condition caveat.
- `references/type-mismatch-debugging.md` — debugging UUID vs BIGINT type mismatch errors in triggers and audit logs.