-- Fix security definer views by adding security_invoker
DROP VIEW IF EXISTS public.recent_errors;
DROP VIEW IF EXISTS public.slow_operations;

-- Recreate views with SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.recent_errors
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  level,
  service,
  method,
  message,
  context,
  user_id,
  barbershop_id,
  error_stack,
  url
FROM app_logs
WHERE level IN ('error', 'warn')
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

CREATE VIEW public.slow_operations
WITH (security_invoker = true)
AS
SELECT 
  id,
  created_at,
  service,
  method,
  message,
  duration_ms,
  context
FROM app_logs
WHERE level = 'performance'
  OR duration_ms > 1000
ORDER BY duration_ms DESC NULLS LAST, created_at DESC
LIMIT 100;