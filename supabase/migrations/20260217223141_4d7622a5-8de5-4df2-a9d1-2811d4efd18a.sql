-- Allow public read access to working hours of active barbers (needed for booking flow)
CREATE POLICY "Public can view working hours of active barbers"
ON public.barber_working_hours
FOR SELECT
USING (
  barber_id IN (
    SELECT b.id FROM barbers b
    JOIN barbershops bs ON bs.id = b.barbershop_id
    WHERE b.is_active = true
    AND bs.has_active_barbers = true
    AND bs.is_public = true
  )
);