# Eattie — Sellable-Ready Audit Report

> **Date:** 2026-09-03
> **Scope:** Full codebase audit for resale readiness
> **Goal:** Ensure codebase is clean, credential-free, fully brandable, and buyer-self-deployable

---

## KATEGORI A — Kredensial & Data Sensitif Bocor

### A1. Hardcoded Supabase Hostname — `next.config.js:15`

```js
hostname: 'zyolnitnvmzfttvwjyle.supabase.co',
```

**Risk:** Buyer's Supabase project will have a different hostname. This blocks image loading from their own Supabase Storage.

**Fix:** Replace with env variable `process.env.NEXT_PUBLIC_SUPABASE_URL` and parse hostname from it.

---

### A2. Hardcoded VAPID Subject — `lib/push/vapid.ts:14`

```ts
const subject = process.env.VAPID_SUBJECT ?? 'mailto:owner@eattie.local'
```

**Risk:** Default email points to non-existent `eattie.local` domain. Push notifications will work but VAPID identity is wrong.

**Fix:** Remove default. Require `VAPID_SUBJECT` to be set, or use a generic placeholder like `mailto:admin@yourdomain.com`.

---

### A3. Hardcoded Brand Name in Source Code

| File | Line | Hardcoded Value |
|------|------|-----------------|
| `config/branding.ts` | 7-8 | `'Eattie Bakery'`, `'Eattie'` |
| `config/branding.ts` | 9 | `'Roti & Kue Segar, Dipesan, Dibuat, Diantar'` |
| `supabase/schema.sql` | 823-824 | `DEFAULT 'Eattie Bakery'`, `DEFAULT 'Eattie'` |
| `supabase/migrations/000003_store_settings.sql` | 4-5 | `DEFAULT 'Eattie Bakery'`, `DEFAULT 'Eattie'` |
| `app/store/layout.tsx` | 7 | `'Eattie — Premium Artisanal Cakes & Pastries'` |
| `components/store/store-checkout.tsx` | 98 | `"Eattie Bakery"` in WhatsApp message |
| `components/store/custom-cake-dashboard.tsx` | 205 | `"Eattie"` in WA message |
| `components/forms/product-forms.tsx` | 209 | `"eattie.vercel.app/store"` |
| `components/forms/product-form.tsx` | 212 | `"eattie.vercel.app/store"` |
| `public/branding/logo-white.svg` | 18 | `<text>eattie</text>` baked into SVG |

**Risk:** Buyer cannot fully rebrand without touching code. SVG logos contain baked-in text.

**Fix:**
- `config/branding.ts` → use env variable or DB-driven config (already partially via `branding-context.tsx`)
- `schema.sql` / migrations → remove `DEFAULT 'Eattie...'`, use empty string or generic placeholder
- `store-checkout.tsx` / `custom-cake-dashboard.tsx` → use `useBranding().companyName`
- `product-forms.tsx` / `product-form.tsx` → remove hardcoded URL or use env
- SVG logos → replace text with generic icon or remove text layer

---

### A4. Git History Contains Committed Secrets

```
git log --all -p -- .env.local
-NEXT_PUBLIC_SUPABASE_URL=https://zyolnitnvmzfttvwjyle.supabase.co
-NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...PGrg
```

**Risk:** Even though `.env.local` was deleted in commit `7d02db68`, the anon key is still accessible in git history. Anyone with repo access can read it.

**Fix:** Rotate the anon key in Supabase dashboard immediately. Consider using `git filter-repo` to purge history (destructive — coordinate with user first).

---

### A5. No `.env.example` Template

**Risk:** Buyer doesn't know which environment variables are required.

**Fix:** Create `.env.example` with all required variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain.com
NEXT_PUBLIC_STORE_WHATSAPP=
```

---

### A6. `sessionStorage` Key — `eattie-branding`

```ts
sessionStorage.getItem('eattie-branding')
sessionStorage.setItem('eattie-branding', ...)
```

**Risk:** Cosmetic — key name should be generic for rebranding.

**Fix:** Rename to `app-branding` or `store-branding`.

---

## KATEGORI B — Branding & Customisasi

### B1. Branding Architecture — GOOD

The project has a solid branding system:
- `config/branding.ts` — single source of truth for defaults
- `contexts/branding-context.tsx` — runtime branding via DB + CSS variables
- `styles/theme.css` — all colors as CSS variables
- Store Settings UI — owner can change colors, logo, company name without code changes

### B2. Remaining Hardcoded Brand Strings

See A3 above. The infrastructure exists but old hardcoded strings remain in:
- Database defaults (schema.sql, migration 000003)
- Checkout/WA message templates
- Product form helper text
- SVG logo files

### B3. Logo Files

`/public/branding/` contains:
- `logo.svg`, `logo-white.svg`, `logo-icon.svg`, `logo-icon-white.svg`, `logo-icon-dark.svg`

The `logo-white.svg` has `<text>eattie</text>` baked in. This cannot be changed via config.

**Fix:** Replace with generic bakery icon or remove text from SVG.

---

## KATEGORI C — Setup & Onboarding Pembeli Baru

### C1. `README.md` — Outdated

- References old file structure (`auth-pages/`, `tables/`, `components/ui/toaster.tsx` mentioned but stub)
- Missing new modules: Accounting, AR/AP, Audit Log, Custom Cakes, Push Notifications
- Setup steps are incomplete (no mention of VAPID generation, no migration runner)

### C2. No `.env.example`

See A5 above.

### C3. No Automated Setup Script

**Risk:** Buyer must manually run 24+ migration files in correct order.

**Fix:** Create `supabase/migrations/000000_full_setup.sql` that combines all migrations into one idempotent script, or create a `scripts/setup.sh` that runs them in order.

### C4. No Seed Data

**Risk:** Fresh install has empty database — no default chart of accounts, no admin user, no settings.

**Fix:** Create `supabase/seeds/00001_initial_data.sql` with:
- Default Chart of Accounts (already in `000037_accounting.sql`)
- Default store settings
- Instructions for creating first owner user

### C5. `supabase-schema.sql` May Be Outdated

The file header says "regenerate via pg_dump for full body". If it's not regenerated, buyer gets old schema.

**Fix:** Regenerate from live DB or replace with migration-based setup.

---

## KATEGORI D — Dependency & Legal

### D1. License — MISSING

**Risk:** No license file. Default copyright law applies — buyer doesn't know what they can/cannot do.

**Fix:** Add `LICENSE` file. For commercial resale, recommend a proprietary license or MIT with attribution.

### D2. `package.json` — `"private": true`

This is correct for a sellable product. ✅

### D3. Dependency Licenses — ALL COMPATIBLE

| Package | License |
|---------|---------|
| next | MIT |
| react | MIT |
| @supabase/ssr | MIT |
| @supabase/supabase-js | MIT |
| date-fns | MIT |
| lucide-react | MIT |
| recharts | MIT |
| tailwind-merge | MIT |
| web-push | MIT |
| xlsx | Apache-2.0 |
| zod | MIT |
| qrcode | MIT |
| clsx | MIT |

No GPL/AGPL dependencies. Safe for commercial use. ✅

---

## KATEGORI E — Data Leak via API/RLS

### E1. `GRANT EXECUTE ... TO anon` on Critical RPCs

```sql
-- 000061_fix_order_rpc_validation.sql
GRANT EXECUTE ON FUNCTION rpc_complete_order(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rpc_mark_paid(UUID, UUID) TO anon, authenticated, service_role;

-- 000060_add_update_production_batch_status_rpc.sql
GRANT EXECUTE ON FUNCTION update_production_batch_status(UUID, TEXT) TO anon, authenticated, service_role;
```

**Risk:** `anon` role can call these functions without authentication. While the functions now have `assert_role()` checks, the `GRANT` is unnecessarily permissive.

**Fix:** Change to `GRANT EXECUTE ... TO authenticated, service_role` only.

---

### E2. `sale_items` and `order_items` — Readable by Any Authenticated User

```sql
-- sale_items policy: SELECT, authenticated, qual=true
-- order_items policy: SELECT, authenticated, qual=true
```

**Risk:** Any logged-in user (including cashier/baker) can read ALL sale/order items. In multi-tenant setup, this is fine. But if buyer has sensitive data, consider role-based read restrictions.

**Status:** Acceptable for single-tenant bakery. Document this for buyer.

---

### E3. `product_reviews` — Multiple Overlapping Policies

```sql
product_reviews_anon_insert
product_reviews_public_read_featured
product_reviews_staff_insert
product_reviews_staff_read
product_reviews_staff_update
reviews_anon_insert
reviews_owner_select
```

**Risk:** Policy names are inconsistent (`product_reviews_*` vs `reviews_*`). Some may be orphaned.

**Fix:** Audit and clean up duplicate policies.

---

## Summary — Priority Fixes

### P0 — Must Fix Before Sale
1. Remove hardcoded Supabase hostname from `next.config.js`
2. Create `.env.example`
3. Rotate Supabase anon key (git history leak)
4. Remove `DEFAULT 'Eattie...'` from schema.sql + migration 000003
5. Fix `GRANT ... TO anon` on critical RPCs

### P1 — Should Fix
6. Replace hardcoded "Eattie" strings in checkout/WA messages with `useBranding()`
7. Remove hardcoded `eattie.vercel.app` from product forms
8. Update `README.md` with current setup steps
9. Create full-setup SQL script (combine all migrations)
10. Add `LICENSE` file
11. Regenerate `supabase-schema.sql` or replace with migration-based setup
12. Replace SVG logo text with generic icon

### P2 — Nice to Have
13. Rename `eattie-branding` sessionStorage key
14. Create seed data script
15. Clean up duplicate RLS policies on `product_reviews`
16. Add role-based read restrictions on `sale_items`/`order_items`

---

*Audit completed. Awaiting user approval before executing fixes.*
