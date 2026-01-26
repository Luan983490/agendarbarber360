-- Recriar a função get_all_tables_info com permissões corretas para PostgREST
DROP FUNCTION IF EXISTS public.get_all_tables_info();

CREATE OR REPLACE FUNCTION public.get_all_tables_info()
RETURNS TABLE (
  table_name text,
  has_rls boolean,
  row_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text AS table_name,
    COALESCE(c.relrowsecurity, false) AS has_rls,
    COALESCE(s.n_live_tup, -1)::bigint AS row_count
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename AND s.schemaname = 'public'
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;

-- Garantir permissões explícitas para acessar via PostgREST
GRANT EXECUTE ON FUNCTION public.get_all_tables_info() TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_tables_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_tables_info() TO service_role;

-- Recriar get_tables_schema_info
DROP FUNCTION IF EXISTS public.get_tables_schema_info();

CREATE OR REPLACE FUNCTION public.get_tables_schema_info()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES')::boolean AS is_nullable,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION public.get_tables_schema_info() TO anon;
GRANT EXECUTE ON FUNCTION public.get_tables_schema_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tables_schema_info() TO service_role;

-- Recriar get_foreign_keys_info
DROP FUNCTION IF EXISTS public.get_foreign_keys_info();

CREATE OR REPLACE FUNCTION public.get_foreign_keys_info()
RETURNS TABLE (
  table_name text,
  column_name text,
  foreign_table text,
  foreign_column text,
  constraint_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tc.table_name::text,
    kcu.column_name::text,
    ccu.table_name::text AS foreign_table,
    ccu.column_name::text AS foreign_column,
    tc.constraint_name::text
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  ORDER BY tc.table_name, kcu.column_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_foreign_keys_info() TO anon;
GRANT EXECUTE ON FUNCTION public.get_foreign_keys_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_foreign_keys_info() TO service_role;

-- Recriar get_database_functions_info
DROP FUNCTION IF EXISTS public.get_database_functions_info();

CREATE OR REPLACE FUNCTION public.get_database_functions_info()
RETURNS TABLE (
  function_name text,
  return_type text,
  argument_types text,
  function_type text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.proname::text AS function_name,
    pg_get_function_result(p.oid)::text AS return_type,
    pg_get_function_arguments(p.oid)::text AS argument_types,
    CASE p.prokind
      WHEN 'f' THEN 'function'
      WHEN 'p' THEN 'procedure'
      WHEN 'a' THEN 'aggregate'
      WHEN 'w' THEN 'window'
    END::text AS function_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')
  ORDER BY p.proname;
$$;

GRANT EXECUTE ON FUNCTION public.get_database_functions_info() TO anon;
GRANT EXECUTE ON FUNCTION public.get_database_functions_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_database_functions_info() TO service_role;