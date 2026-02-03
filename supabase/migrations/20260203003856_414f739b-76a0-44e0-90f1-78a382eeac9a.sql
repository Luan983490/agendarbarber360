-- Fix infinite recursion in barbershops RLS policies

-- First, create a helper function to check if user is a barber at a barbershop
CREATE OR REPLACE FUNCTION public.is_barber_at_barbershop(p_user_id uuid, p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM barbers b
    WHERE b.barbershop_id = p_barbershop_id
      AND b.user_id = p_user_id
      AND b.is_active = true
  )
$$;

-- Create function to check if user owns any barbershop (returns the barbershop_id)
CREATE OR REPLACE FUNCTION public.user_owns_barbershop(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM barbershops WHERE owner_id = p_user_id LIMIT 1
$$;

-- Create function to check if user owns a specific barbershop (boolean version)
CREATE OR REPLACE FUNCTION public.user_is_owner_of(p_user_id uuid, p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM barbershops bs
    WHERE bs.id = p_barbershop_id
      AND bs.owner_id = p_user_id
  )
$$;

-- Create function to check if user has a role at barbershop (using user_roles only)
CREATE OR REPLACE FUNCTION public.user_has_role_at(p_user_id uuid, p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.barbershop_id = p_barbershop_id
      AND ur.user_id = p_user_id
  )
$$;

-- Drop problematic policies on barbershops that cause recursion
DROP POLICY IF EXISTS "barbershops_staff_select" ON barbershops;
DROP POLICY IF EXISTS "barbershops_barber_select" ON barbershops;

-- Recreate policies using SECURITY DEFINER functions (no subqueries = no recursion)
-- Staff can view their barbershop
CREATE POLICY "barbershops_staff_select" ON barbershops
FOR SELECT
USING (user_has_role_at(auth.uid(), id));

-- Active barbers can view their barbershop  
CREATE POLICY "barbershops_barber_select" ON barbershops
FOR SELECT
USING (is_barber_at_barbershop(auth.uid(), id));