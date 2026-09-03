-- Audit Log: extend trigger coverage to important tables that currently lack it.
-- Adds AFTER INSERT/UPDATE/DELETE triggers calling the existing handle_audit_log().
-- Tables already covered (not touched here): products, ingredients, sales, orders.

CREATE TRIGGER IF NOT EXISTS trg_audit_production_batches
  AFTER INSERT OR UPDATE OR DELETE ON public.production_batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_stock_movements
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_stock_purchases
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_accounts_payable
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts_payable
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_accounts_receivable
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts_receivable
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_customer_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_journal_lines
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_payment_records
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_recipes
  AFTER INSERT OR UPDATE OR DELETE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_store_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER IF NOT EXISTS trg_audit_product_variants
  AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
