-- Create booking_services table (to support adding extra services to an existing booking)
CREATE TABLE IF NOT EXISTS public.booking_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON public.booking_services(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_services_service_id ON public.booking_services(service_id);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;

-- Helper expression (duplicated in policies): allow client/owner/barber/attendant related to the booking
-- booking is accessible if:
-- - user is booking.client_id
-- - user is barbershop owner
-- - user is the barber assigned to booking
-- - user is attendant for the barbershop

DROP POLICY IF EXISTS "Users can view booking services" ON public.booking_services;
DROP POLICY IF EXISTS "Users can manage booking services" ON public.booking_services;

CREATE POLICY "Users can view booking services"
ON public.booking_services
FOR SELECT
USING (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'attendant'::public.app_role
      )
    )
  )
);

CREATE POLICY "Users can manage booking services"
ON public.booking_services
FOR ALL
USING (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::public.app_role, 'barber'::public.app_role)
      )
    )
  )
)
WITH CHECK (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::public.app_role, 'barber'::public.app_role)
      )
    )
  )
);

-- Fix booking_products RLS to allow owners/barbers/attendants to insert/update/delete items (not only clients)
DROP POLICY IF EXISTS "Users can manage booking products for their bookings" ON public.booking_products;
DROP POLICY IF EXISTS "Users can view booking products for their bookings" ON public.booking_products;

CREATE POLICY "Users can view booking products"
ON public.booking_products
FOR SELECT
USING (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::public.app_role, 'barber'::public.app_role)
      )
    )
  )
);

CREATE POLICY "Users can insert booking products"
ON public.booking_products
FOR INSERT
WITH CHECK (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::public.app_role, 'barber'::public.app_role)
      )
    )
  )
);

CREATE POLICY "Users can update booking products"
ON public.booking_products
FOR UPDATE
USING (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::public.app_role, 'barber'::public.app_role)
      )
    )
  )
)
WITH CHECK (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::public.app_role, 'barber'::public.app_role)
      )
    )
  )
);

CREATE POLICY "Users can delete booking products"
ON public.booking_products
FOR DELETE
USING (
  booking_id IN (
    SELECT bk.id
    FROM public.bookings bk
    JOIN public.barbershops bs ON bs.id = bk.barbershop_id
    LEFT JOIN public.barbers br ON br.id = bk.barber_id
    WHERE (
      bk.client_id = auth.uid()
      OR bs.owner_id = auth.uid()
      OR br.user_id = auth.uid()
      OR bk.barbershop_id IN (
        SELECT ur.barbershop_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::public.app_role, 'barber'::public.app_role)
      )
    )
  )
);