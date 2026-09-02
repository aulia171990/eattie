-- Expense approval workflow
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- PO receive approval
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS received_by UUID REFERENCES profiles(id);
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Stock opname approval already has approved_by
-- Add status column for workflow
ALTER TABLE public.stock_opnames ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id);
