# Type Mismatch Debugging (UUID vs BIGINT)

## Problem Pattern

Error: `column X is of type Y but expression is of type Z`

**Common cause in eattie:**
- `store_settings.id = BIGINT` but `audit_logs.record_id = UUID`
- Triggers like `handle_audit_log()` use `NEW.id`/`OLD.id` as `record_id`
- PostgreSQL rejects type coercion from BIGINT to UUID

## Diagnosis Queries

```sql
-- 1. Check actual column types
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'store_settings'
  AND column_name = 'id';

-- 2. Find triggers that might cause the mismatch
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgfoid::regproc AS function_name
FROM pg_trigger 
WHERE tgrelid = 'store_settings'::regclass
  AND NOT tginternal;

-- 3. Check audit_logs table structure
\d+ public.audit_logs
```

## Solution: Convert store_settings.id to UUID

For single-row tables, the cleanest fix is converting ID type:

```sql
-- Migration steps
BEGIN;

-- 1. Add UUID column with fixed value
ALTER TABLE public.store_settings ADD COLUMN id_uuid UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Set consistent UUID for the single row
UPDATE public.store_settings SET id_uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 3. Update trigger function if needed (for existing triggers)
-- For handle_audit_log, ensure it uses uuid_generate_v4() or accepts uuid

-- 4. Drop constraint and old column
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;
ALTER TABLE public.store_settings DROP COLUMN id;

-- 5. Rename new column
ALTER TABLE public.store_settings RENAME COLUMN id_uuid TO id;

-- 6. Add primary key and CHECK constraint for single-row
ALTER TABLE public.store_settings ADD PRIMARY KEY (id);
ALTER TABLE public.store_settings ADD CONSTRAINT single_row_uuid CHECK (id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- 7. Update references in code
COMMIT;
```

## Application Code Updates

Find all hardcoded numeric IDs:
```bash
grep -r "\.eq('id', 1)" app/ actions/
grep -r "\.eq('id', 1)" src/
```

Replace with UUID constant:
```typescript
// Define constant
const STORE_SETTINGS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' as const;

// Usage
const { data } = await supabase
  .from('store_settings')
  .select('*')
  .eq('id', STORE_SETTINGS_ID)
  .single();
```

## Post-Migration Verification

```bash
# 1. Type check
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Check database types are in sync
# The types/database.ts store_settings.id should now be string (UUID)
```

## References

- `supabase-nextjs-schema-changes/SKILL.md` - Main migration workflow
- `supabase-nextjs-schema-changes/references/eattie-supabase-layout.md` - Eattie-specific conventions