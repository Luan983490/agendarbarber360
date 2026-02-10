-- Habilitar extensão unaccent primeiro
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- Função para gerar slug a partir do nome
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
  base_slug := lower(public.unaccent(input_name));
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

-- Adicionar coluna slug
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS slug text;

-- Gerar slugs para barbearias existentes
UPDATE public.barbershops SET slug = public.generate_slug(name) WHERE slug IS NULL;

-- Tornar NOT NULL e UNIQUE
ALTER TABLE public.barbershops ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_barbershops_slug ON public.barbershops (slug);

-- Trigger para gerar slug automaticamente
CREATE OR REPLACE FUNCTION public.barbershops_generate_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND OLD.name != NEW.name) THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_barbershops_slug
BEFORE INSERT OR UPDATE ON public.barbershops
FOR EACH ROW
EXECUTE FUNCTION public.barbershops_generate_slug();