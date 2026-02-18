
DROP POLICY IF EXISTS "bookings_update_comprehensive" ON public.bookings;

CREATE POLICY "bookings_update_comprehensive" ON public.bookings
FOR UPDATE USING (
  is_barbershop_owner(auth.uid(), barbershop_id)
  OR has_role(auth.uid(), barbershop_id, 'attendant'::app_role)
  OR (has_role(auth.uid(), barbershop_id, 'barber'::app_role) AND barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid()))
  OR (auth.uid() = client_id AND booking_date >= CURRENT_DATE)
)
WITH CHECK (
  CASE
    WHEN (auth.uid() = client_id) THEN (status = ANY (ARRAY['cancelled'::text, 'confirmed'::text]))
    ELSE (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text, 'no_show'::text]))
  END
);
