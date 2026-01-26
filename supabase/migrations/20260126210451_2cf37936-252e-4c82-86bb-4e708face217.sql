-- Função para obter TODAS as tabelas do banco de dados (não apenas as sem RLS)
CREATE OR REPLACE FUNCTION public.get_all_tables_info()
RETURNS TABLE (
  table_name text,
  has_rls boolean,
  row_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text as table_name,
    c.relrowsecurity as has_rls,
    c.reltuples::bigint as row_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'  -- only tables (not views)
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE '_prisma_%'
  ORDER BY c.relname;
END;
$$;

-- Função para obter schema completo das tabelas (colunas, tipos, etc)
CREATE OR REPLACE FUNCTION public.get_tables_schema_info()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    table_name::text,
    column_name::text,
    data_type::text,
    (is_nullable = 'YES') as is_nullable,
    column_default::text
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position;
$$;

-- Função para obter foreign keys
CREATE OR REPLACE FUNCTION public.get_foreign_keys_info()
RETURNS TABLE (
  table_name text,
  column_name text,
  foreign_table text,
  foreign_column text,
  constraint_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tc.table_name::text,
    kcu.column_name::text,
    ccu.table_name::text as foreign_table,
    ccu.column_name::text as foreign_column,
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

-- Função para obter funções do banco
CREATE OR REPLACE FUNCTION public.get_database_functions_info()
RETURNS TABLE (
  function_name text,
  return_type text,
  argument_types text,
  function_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.proname::text as function_name,
    pg_catalog.pg_get_function_result(p.oid)::text as return_type,
    pg_catalog.pg_get_function_arguments(p.oid)::text as argument_types,
    CASE p.prokind
      WHEN 'f' THEN 'function'
      WHEN 'p' THEN 'procedure'
      WHEN 'a' THEN 'aggregate'
      WHEN 'w' THEN 'window'
    END::text as function_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  ORDER BY p.proname;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_all_tables_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tables_schema_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_foreign_keys_info() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_database_functions_info() TO anon, authenticated;