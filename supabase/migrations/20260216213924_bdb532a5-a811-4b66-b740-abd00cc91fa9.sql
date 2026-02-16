
-- Remove grace period RLS policies from all tables

-- bookings
DROP POLICY IF EXISTS "Acesso apenas para confirmados ou periodo de carencia" ON public.bookings;

-- booking_products
DROP POLICY IF EXISTS "grace_period_booking_products" ON public.booking_products;

-- booking_services
DROP POLICY IF EXISTS "grace_period_booking_services" ON public.booking_services;

-- client_loyalty_points
DROP POLICY IF EXISTS "grace_period_client_loyalty_points" ON public.client_loyalty_points;

-- client_packages
DROP POLICY IF EXISTS "grace_period_client_packages" ON public.client_packages;

-- client_subscriptions
DROP POLICY IF EXISTS "grace_period_client_subscriptions" ON public.client_subscriptions;

-- favorites
DROP POLICY IF EXISTS "grace_period_favorites" ON public.favorites;

-- Drop the grace period function
DROP FUNCTION IF EXISTS public.is_user_in_grace_period();

-- Drop the email verified function if it was only for grace period
DROP FUNCTION IF EXISTS public.is_email_verified();
