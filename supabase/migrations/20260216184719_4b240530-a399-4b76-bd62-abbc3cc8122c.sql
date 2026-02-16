
-- Blindagem: aplicar is_user_in_grace_period() em tabelas cliente-facing

CREATE POLICY "grace_period_favorites"
ON public.favorites
AS RESTRICTIVE
FOR ALL
USING (is_user_in_grace_period());

CREATE POLICY "grace_period_client_loyalty_points"
ON public.client_loyalty_points
AS RESTRICTIVE
FOR ALL
USING (is_user_in_grace_period());

CREATE POLICY "grace_period_client_packages"
ON public.client_packages
AS RESTRICTIVE
FOR ALL
USING (is_user_in_grace_period());

CREATE POLICY "grace_period_client_subscriptions"
ON public.client_subscriptions
AS RESTRICTIVE
FOR ALL
USING (is_user_in_grace_period());

CREATE POLICY "grace_period_booking_products"
ON public.booking_products
AS RESTRICTIVE
FOR ALL
USING (is_user_in_grace_period());

CREATE POLICY "grace_period_booking_services"
ON public.booking_services
AS RESTRICTIVE
FOR ALL
USING (is_user_in_grace_period());
