
-- =============================================================================
-- MIGRATION: Comprehensive Security Hardening
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENABLE RLS ON UNPROTECTED TABLES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.barbershops_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites_audit ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS POLICIES FOR barbershops_audit
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Owners can view their barbershop audit logs"
ON public.barbershops_audit FOR SELECT
USING (barbershop_id IN (SELECT id FROM public.barbershops WHERE owner_id = auth.uid()));

CREATE POLICY "No direct insert on barbershops_audit"
ON public.barbershops_audit FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update on barbershops_audit"
ON public.barbershops_audit FOR UPDATE USING (false);

CREATE POLICY "No direct delete on barbershops_audit"
ON public.barbershops_audit FOR DELETE USING (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS POLICIES FOR favorites_audit
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Owners can view favorites audit for their barbershop"
ON public.favorites_audit FOR SELECT
USING (barbershop_id IN (SELECT id FROM public.barbershops WHERE owner_id = auth.uid()) OR client_id = auth.uid());

CREATE POLICY "No direct insert on favorites_audit"
ON public.favorites_audit FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update on favorites_audit"
ON public.favorites_audit FOR UPDATE USING (false);

CREATE POLICY "No direct delete on favorites_audit"
ON public.favorites_audit FOR DELETE USING (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. profiles_backup explicit deny
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "No access to profiles_backup"
ON public.profiles_backup FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FIX mfa_attempts INSERT
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Sistema pode inserir tentativas" ON public.mfa_attempts;
CREATE POLICY "Authenticated users can log own MFA attempts"
ON public.mfa_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ADD WITH CHECK TO ALL POLICIES MISSING THEM
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Owners, barbers and attendants can manage blocks" ON public.barber_blocks;
CREATE POLICY "Owners, barbers and attendants can manage blocks"
ON public.barber_blocks FOR ALL
USING (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)))
WITH CHECK (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)));

DROP POLICY IF EXISTS "Owners and barbers can manage schedule overrides" ON public.barber_schedule_overrides;
CREATE POLICY "Owners and barbers can manage schedule overrides"
ON public.barber_schedule_overrides FOR ALL
USING (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)))
WITH CHECK (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)));

DROP POLICY IF EXISTS "Owners and attendants can manage barber services" ON public.barber_services;
CREATE POLICY "Owners and attendants can manage barber services"
ON public.barber_services FOR ALL
USING (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)))
WITH CHECK (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)));

DROP POLICY IF EXISTS "Owners and barbers can manage working hours" ON public.barber_working_hours;
CREATE POLICY "Owners and barbers can manage working hours"
ON public.barber_working_hours FOR ALL
USING (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)))
WITH CHECK (barber_id IN (SELECT b.id FROM barbers b JOIN barbershops bs ON b.barbershop_id = bs.id WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid() OR bs.id IN (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() AND role = 'attendant'::app_role)));

DROP POLICY IF EXISTS "Barbershop owners can manage their rewards" ON public.loyalty_rewards;
CREATE POLICY "Barbershop owners can manage their rewards"
ON public.loyalty_rewards FOR ALL
USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Barbershop owners can manage their loyalty settings" ON public.loyalty_settings;
CREATE POLICY "Barbershop owners can manage their loyalty settings"
ON public.loyalty_settings FOR ALL
USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Barbershop owners can manage their packages" ON public.packages;
CREATE POLICY "Barbershop owners can manage their packages"
ON public.packages FOR ALL
USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Barbershop owners can manage their products" ON public.products;
CREATE POLICY "Barbershop owners can manage their products"
ON public.products FOR ALL
USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Barbershop owners can manage their services" ON public.services;
CREATE POLICY "Barbershop owners can manage their services"
ON public.services FOR ALL
USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Barbershop owners can manage their subscription plans" ON public.subscription_plans;
CREATE POLICY "Barbershop owners can manage their subscription plans"
ON public.subscription_plans FOR ALL
USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Clients can manage their own cards" ON public.payment_cards;
CREATE POLICY "Clients can manage their own cards"
ON public.payment_cards FOR ALL
USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Barbershop owners can update their clients points" ON public.client_loyalty_points;

DROP POLICY IF EXISTS "Users can manage their own reviews" ON public.reviews;
CREATE POLICY "Users can manage their own reviews"
ON public.reviews FOR ALL
USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Owners can update alerts" ON public.report_alerts;
CREATE POLICY "Owners can update alerts"
ON public.report_alerts FOR UPDATE
USING (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()))
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own recovery codes" ON public.mfa_recovery_codes;
CREATE POLICY "Users can update own recovery codes"
ON public.mfa_recovery_codes FOR UPDATE
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SOFT DELETE COLUMNS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.payment_cards ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.client_packages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.client_subscriptions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.loyalty_rewards ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. GENERIC AUDIT TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generic_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _barbershop_id uuid;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN _barbershop_id := OLD.barbershop_id;
    ELSE _barbershop_id := NEW.barbershop_id; END IF;
  EXCEPTION WHEN undefined_column THEN _barbershop_id := NULL;
  END;

  INSERT INTO public.app_logs (level, service, method, message, user_id, barbershop_id, context)
  VALUES ('info', 'audit', TG_OP, TG_TABLE_NAME || ' ' || lower(TG_OP), auth.uid(), _barbershop_id,
    jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP,
      'old_data', CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      'new_data', CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END));

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. AUDIT TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER audit_barber_blocks AFTER INSERT OR UPDATE OR DELETE ON public.barber_blocks FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_barber_schedule_overrides AFTER INSERT OR UPDATE OR DELETE ON public.barber_schedule_overrides FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_barber_working_hours AFTER INSERT OR UPDATE OR DELETE ON public.barber_working_hours FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_packages AFTER INSERT OR UPDATE OR DELETE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_payment_cards AFTER INSERT OR UPDATE OR DELETE ON public.payment_cards FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_reviews AFTER INSERT OR UPDATE OR DELETE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_loyalty_rewards AFTER INSERT OR UPDATE OR DELETE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_loyalty_settings AFTER INSERT OR UPDATE OR DELETE ON public.loyalty_settings FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_loyalty_transactions AFTER INSERT OR UPDATE OR DELETE ON public.loyalty_transactions FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_client_loyalty_points AFTER INSERT OR UPDATE OR DELETE ON public.client_loyalty_points FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_client_packages AFTER INSERT OR UPDATE OR DELETE ON public.client_packages FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_client_subscriptions AFTER INSERT OR UPDATE OR DELETE ON public.client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_subscription_plans AFTER INSERT OR UPDATE OR DELETE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_subscriptions AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_report_alerts AFTER INSERT OR UPDATE OR DELETE ON public.report_alerts FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_mfa_recovery_codes AFTER INSERT OR UPDATE OR DELETE ON public.mfa_recovery_codes FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();
CREATE OR REPLACE TRIGGER audit_blocked_ips AFTER INSERT OR UPDATE OR DELETE ON public.blocked_ips FOR EACH ROW EXECUTE FUNCTION public.generic_audit_trigger();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. NEW CHECK CONSTRAINTS (only ones that don't exist yet)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.barbers ADD CONSTRAINT check_barber_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE public.services ADD CONSTRAINT check_service_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE public.report_alerts ADD CONSTRAINT check_alert_type_not_empty CHECK (length(trim(alert_type)) > 0);
ALTER TABLE public.report_alerts ADD CONSTRAINT check_threshold_non_negative CHECK (threshold >= 0);
ALTER TABLE public.loyalty_transactions ADD CONSTRAINT check_loyalty_points_nonzero CHECK (points != 0);
ALTER TABLE public.barber_blocks ADD CONSTRAINT check_block_time_order CHECK (start_time < end_time);
ALTER TABLE public.products ADD CONSTRAINT check_product_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE public.packages ADD CONSTRAINT check_package_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE public.payment_cards ADD CONSTRAINT check_card_last_four CHECK (length(last_four_digits) = 4);
ALTER TABLE public.payment_cards ADD CONSTRAINT check_expiry_month_valid CHECK (expiry_month BETWEEN 1 AND 12);
ALTER TABLE public.payment_cards ADD CONSTRAINT check_expiry_year_valid CHECK (expiry_year >= 2024);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. SOFT DELETE FUNCTION & TRIGGER FOR BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.soft_delete_instead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE format('UPDATE %I.%I SET deleted_at = now() WHERE id = $1', TG_TABLE_SCHEMA, TG_TABLE_NAME) USING OLD.id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_soft_delete_bookings
BEFORE DELETE ON public.bookings
FOR EACH ROW WHEN (OLD.deleted_at IS NULL)
EXECUTE FUNCTION public.soft_delete_instead();

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. MISSING INSERT POLICY FOR booking_products
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Staff can insert booking products"
ON public.booking_products FOR INSERT
WITH CHECK (booking_id IN (
  SELECT bk.id FROM bookings bk
  JOIN barbershops bs ON bs.id = bk.barbershop_id
  LEFT JOIN barbers br ON br.id = bk.barber_id
  WHERE bk.client_id = auth.uid() OR bs.owner_id = auth.uid() OR br.user_id = auth.uid()
  OR bk.barbershop_id IN (SELECT ur.barbershop_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('attendant'::app_role, 'barber'::app_role))
));

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. INSERT POLICY FOR app_logs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated users can insert own logs"
ON public.app_logs FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
