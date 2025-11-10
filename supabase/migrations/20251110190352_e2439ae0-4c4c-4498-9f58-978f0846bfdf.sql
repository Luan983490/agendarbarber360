-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'barber', 'attendant');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, barbershop_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _barbershop_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
    AND barbershop_id = _barbershop_id
  LIMIT 1
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _barbershop_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND barbershop_id = _barbershop_id
      AND role = _role
  )
$$;

-- Create function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_barbershop_owner(_user_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.barbershops
    WHERE id = _barbershop_id
      AND owner_id = _user_id
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Owners can manage roles for their barbershop"
  ON public.user_roles
  FOR ALL
  USING (
    barbershop_id IN (
      SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update barbers RLS policies to include role-based access
DROP POLICY IF EXISTS "Barbershop owners can manage their barbers" ON public.barbers;

CREATE POLICY "Owners and attendants can manage barbers"
  ON public.barbers
  FOR ALL
  USING (
    barbershop_id IN (
      SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
    )
    OR
    barbershop_id IN (
      SELECT barbershop_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'attendant'
    )
  );

-- Update bookings RLS policies for role-based access
DROP POLICY IF EXISTS "Owners and barbers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners and barbers can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

CREATE POLICY "Owners, barbers and attendants can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    -- Client creating their own booking
    auth.uid() = client_id
    OR
    -- Owner
    barbershop_id IN (SELECT id FROM public.barbershops WHERE owner_id = auth.uid())
    OR
    -- Barber creating for themselves
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
    OR
    -- Attendant
    barbershop_id IN (
      SELECT barbershop_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'attendant'
    )
  );

CREATE POLICY "Owners, barbers and attendants can update bookings"
  ON public.bookings
  FOR UPDATE
  USING (
    -- Owner
    barbershop_id IN (SELECT id FROM public.barbershops WHERE owner_id = auth.uid())
    OR
    -- Barber updating their own bookings
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
    OR
    -- Attendant
    barbershop_id IN (
      SELECT barbershop_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'attendant'
    )
  );

CREATE POLICY "Users can view relevant bookings"
  ON public.bookings
  FOR SELECT
  USING (
    -- Client viewing their own
    auth.uid() = client_id
    OR
    -- Owner viewing all
    barbershop_id IN (SELECT id FROM public.barbershops WHERE owner_id = auth.uid())
    OR
    -- Barber viewing their own
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
    OR
    -- Attendant viewing all from barbershop
    barbershop_id IN (
      SELECT barbershop_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('attendant', 'barber')
    )
  );

-- Update barber_blocks policies
DROP POLICY IF EXISTS "Owners and barbers can manage their blocks" ON public.barber_blocks;
DROP POLICY IF EXISTS "Users can view relevant barber blocks" ON public.barber_blocks;

CREATE POLICY "Owners, barbers and attendants can manage blocks"
  ON public.barber_blocks
  FOR ALL
  USING (
    barber_id IN (
      SELECT b.id
      FROM barbers b
      JOIN barbershops bs ON b.barbershop_id = bs.id
      WHERE bs.owner_id = auth.uid() -- Owner
        OR b.user_id = auth.uid() -- Barber managing their own
        OR bs.id IN ( -- Attendant
          SELECT barbershop_id FROM public.user_roles 
          WHERE user_id = auth.uid() AND role = 'attendant'
        )
    )
  );

CREATE POLICY "Users can view relevant blocks"
  ON public.barber_blocks
  FOR SELECT
  USING (
    barber_id IN (
      SELECT b.id
      FROM barbers b
      JOIN barbershops bs ON b.barbershop_id = bs.id
      WHERE bs.owner_id = auth.uid()
        OR b.user_id = auth.uid()
        OR bs.id IN (
          SELECT barbershop_id FROM public.user_roles 
          WHERE user_id = auth.uid() AND role IN ('attendant', 'barber')
        )
    )
  );