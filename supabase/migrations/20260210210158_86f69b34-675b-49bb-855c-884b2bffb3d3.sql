-- Mover extensão unaccent para schema extensions (mais seguro)
DROP EXTENSION IF EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- Atualizar função para usar extensions.unaccent
CREATE OR REPLACE FUNCTION public.generate_slug(input_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  base_slug := lower(extensions.unaccent(input_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
  
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM barbershops WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;