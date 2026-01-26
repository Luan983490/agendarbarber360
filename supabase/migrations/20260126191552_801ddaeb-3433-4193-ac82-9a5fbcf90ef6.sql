-- Função para obter informações de políticas RLS
CREATE OR REPLACE FUNCTION public.get_rls_policies_info()
RETURNS TABLE (
  schemaname text,
  tablename text,
  policyname text,
  permissive text,
  roles text[],
  cmd text,
  qual text,
  with_check text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    schemaname::text,
    tablename::text,
    policyname::text,
    permissive::text,
    roles::text[],
    cmd::text,
    qual::text,
    with_check::text
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

-- Função para obter informações de índices
CREATE OR REPLACE FUNCTION public.get_indexes_info()
RETURNS TABLE (
  schemaname text,
  tablename text,
  indexname text,
  indexdef text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    schemaname::text,
    tablename::text,
    indexname::text,
    indexdef::text
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname;
$$;

-- Função para obter informações de triggers
CREATE OR REPLACE FUNCTION public.get_triggers_info()
RETURNS TABLE (
  trigger_name text,
  event_manipulation text,
  event_object_schema text,
  event_object_table text,
  action_statement text,
  action_timing text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    trigger_name::text,
    event_manipulation::text,
    event_object_schema::text,
    event_object_table::text,
    action_statement::text,
    action_timing::text
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
  ORDER BY event_object_table, trigger_name;
$$;

-- Função para obter tabelas sem RLS habilitado
CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE (
  table_name text,
  has_rls boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.relname::text as table_name,
    c.relrowsecurity as has_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'  -- only tables
    AND c.relrowsecurity = false
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE '_prisma_%'
  ORDER BY c.relname;
$$;

-- Conceder permissão para anon e authenticated chamarem as funções
GRANT EXECUTE ON FUNCTION public.get_rls_policies_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_indexes_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_triggers_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tables_without_rls() TO anon, authenticated;