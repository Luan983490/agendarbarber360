
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Public can view working hours of active barbers" ON public.barber_working_hours;

-- Recreate as PERMISSIVE so it works as an OR with other policies
CREATE POLICY "Public can view working hours of active barbers"
ON public.barber_working_hours
FOR SELECT
USING (
  barber_id IN (
    SELECT b.id FROM barbers b
    JOIN barbershops bs ON bs.id = b.barbershop_id
    WHERE b.is_active = true AND bs.is_public = true
  )
);
