
-- ============================================================================
-- TRIGGER updated_at AUTOMÁTICO
-- ============================================================================
CREATE TRIGGER update_disposable_email_domains_updated_at
BEFORE UPDATE ON public.disposable_email_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TRIGGER DE AUDITORIA (usa generic_audit_trigger existente)
-- Registra INSERT/UPDATE/DELETE na app_logs via context JSONB
-- ============================================================================
CREATE TRIGGER audit_disposable_email_domains
AFTER INSERT OR UPDATE OR DELETE ON public.disposable_email_domains
FOR EACH ROW
EXECUTE FUNCTION public.generic_audit_trigger();
