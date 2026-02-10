-- Set default for slug so it's optional in inserts (trigger overrides it)
ALTER TABLE public.barbershops ALTER COLUMN slug SET DEFAULT '';