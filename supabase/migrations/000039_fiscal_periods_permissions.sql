-- ============================================
-- Phase 6D: Fiscal Period Management
-- ============================================

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- e.g. 'Januari 2026', 'Q1 2026', 'Tahun 2026'
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name),
  CHECK (start_date <= end_date)
);

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fp_owner_all') THEN
    CREATE POLICY fp_owner_all ON fiscal_periods FOR ALL USING (get_user_role() = 'owner');
  END IF;
END $$;

-- ============================================
-- Phase 6E: Module Permissions
-- ============================================

-- Granular per-module access for non-owner roles
CREATE TABLE IF NOT EXISTS module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN (
    'pos', 'products', 'recipes', 'production', 'inventory',
    'ingredients', 'suppliers', 'customers', 'orders', 'sales',
    'expenses', 'reports', 'accounting', 'settings', 'users'
  )),
  can_view BOOLEAN DEFAULT true,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, module)
);

ALTER TABLE module_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mp_owner_all') THEN
    CREATE POLICY mp_owner_all ON module_permissions FOR ALL USING (get_user_role() = 'owner');
  END IF;
END $$;

-- Helper: check if current user has access to a module
CREATE OR REPLACE FUNCTION has_module_access(p_module TEXT, p_action TEXT DEFAULT 'view')
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_perm RECORD;
BEGIN
  v_role := get_user_role();

  -- Owner has full access to everything
  IF v_role = 'owner' THEN RETURN TRUE; END IF;

  -- No permission record = no access (deny by default)
  SELECT * INTO v_perm FROM module_permissions
  WHERE user_id = auth.uid() AND module = p_module;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  CASE p_action
    WHEN 'view' THEN RETURN v_perm.can_view;
    WHEN 'create' THEN RETURN v_perm.can_create;
    WHEN 'edit' THEN RETURN v_perm.can_edit;
    WHEN 'delete' THEN RETURN v_perm.can_delete;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
