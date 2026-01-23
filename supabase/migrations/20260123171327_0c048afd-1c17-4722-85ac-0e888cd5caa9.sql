-- ───────────────────────────────────────────────────────────
-- 1️⃣ CORRIGIR POLICIES DE INSERT (app_logs e report_alerts)
-- ───────────────────────────────────────────────────────────

-- Remover policy permissiva de app_logs
DROP POLICY IF EXISTS "Anyone can insert logs" ON app_logs;

-- Criar policy que exige autenticação
CREATE POLICY "Authenticated users can insert logs" 
ON app_logs FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Remover policy permissiva de report_alerts
DROP POLICY IF EXISTS "System can insert alerts" ON report_alerts;

-- Criar policy restritiva para report_alerts (só via triggers/service role)
CREATE POLICY "Only system triggers can insert alerts" 
ON report_alerts FOR INSERT 
WITH CHECK (false);

-- ───────────────────────────────────────────────────────────
-- 2️⃣ ADICIONAR VALIDAÇÕES (CHECK CONSTRAINTS)
-- ───────────────────────────────────────────────────────────

-- SERVICES: Validar preço e duração positivos
ALTER TABLE services 
  DROP CONSTRAINT IF EXISTS check_price_positive,
  DROP CONSTRAINT IF EXISTS check_duration_positive;

ALTER TABLE services 
  ADD CONSTRAINT check_price_positive CHECK (price >= 0),
  ADD CONSTRAINT check_duration_positive CHECK (duration > 0);

-- PRODUCTS: Validar preço e estoque
ALTER TABLE products 
  DROP CONSTRAINT IF EXISTS check_product_price_positive,
  DROP CONSTRAINT IF EXISTS check_stock_non_negative;

ALTER TABLE products 
  ADD CONSTRAINT check_product_price_positive CHECK (price >= 0),
  ADD CONSTRAINT check_stock_non_negative CHECK (stock_quantity >= 0);

-- BOOKINGS: Validar preço total não negativo
ALTER TABLE bookings 
  DROP CONSTRAINT IF EXISTS check_booking_price_positive;

ALTER TABLE bookings 
  ADD CONSTRAINT check_booking_price_positive CHECK (total_price >= 0);

-- PACKAGES: Validar preço e sessões (usando nomes corretos das colunas)
ALTER TABLE packages 
  DROP CONSTRAINT IF EXISTS check_package_price_positive,
  DROP CONSTRAINT IF EXISTS check_package_sessions_positive,
  DROP CONSTRAINT IF EXISTS check_package_validity_positive;

ALTER TABLE packages 
  ADD CONSTRAINT check_package_price_positive CHECK (price >= 0),
  ADD CONSTRAINT check_package_sessions_positive CHECK (sessions_included > 0),
  ADD CONSTRAINT check_package_validity_positive CHECK (validity_days > 0);

-- LOYALTY_SETTINGS: Validar pontos positivos
ALTER TABLE loyalty_settings 
  DROP CONSTRAINT IF EXISTS check_points_per_real_positive;

ALTER TABLE loyalty_settings 
  ADD CONSTRAINT check_points_per_real_positive CHECK (points_per_real >= 0);

-- SUBSCRIPTION_PLANS: Validar preço mensal positivo
ALTER TABLE subscription_plans 
  DROP CONSTRAINT IF EXISTS check_plan_price_positive;

ALTER TABLE subscription_plans 
  ADD CONSTRAINT check_plan_price_positive CHECK (price_monthly >= 0);

-- ───────────────────────────────────────────────────────────
-- 3️⃣ VALIDAÇÕES ADICIONAIS
-- ───────────────────────────────────────────────────────────

-- REVIEWS: Validar rating entre 1 e 5
ALTER TABLE reviews 
  DROP CONSTRAINT IF EXISTS check_rating_range;

ALTER TABLE reviews 
  ADD CONSTRAINT check_rating_range CHECK (rating >= 1 AND rating <= 5);

-- CLIENT_LOYALTY_POINTS: Não permitir pontos negativos
ALTER TABLE client_loyalty_points 
  DROP CONSTRAINT IF EXISTS check_points_balance_non_negative,
  DROP CONSTRAINT IF EXISTS check_total_points_non_negative;

ALTER TABLE client_loyalty_points 
  ADD CONSTRAINT check_points_balance_non_negative CHECK (points_balance >= 0),
  ADD CONSTRAINT check_total_points_non_negative CHECK (total_points_earned >= 0);

-- LOYALTY_REWARDS: Validar pontos necessários positivos
ALTER TABLE loyalty_rewards 
  DROP CONSTRAINT IF EXISTS check_points_required_positive;

ALTER TABLE loyalty_rewards 
  ADD CONSTRAINT check_points_required_positive CHECK (points_required > 0);

-- BOOKING_PRODUCTS: Validar quantidade e preço
ALTER TABLE booking_products 
  DROP CONSTRAINT IF EXISTS check_bp_quantity_positive,
  DROP CONSTRAINT IF EXISTS check_bp_price_positive;

ALTER TABLE booking_products 
  ADD CONSTRAINT check_bp_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT check_bp_price_positive CHECK (unit_price >= 0);

-- BOOKING_SERVICES: Validar quantidade e preço
ALTER TABLE booking_services 
  DROP CONSTRAINT IF EXISTS check_bs_quantity_positive,
  DROP CONSTRAINT IF EXISTS check_bs_price_positive;

ALTER TABLE booking_services 
  ADD CONSTRAINT check_bs_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT check_bs_price_positive CHECK (unit_price >= 0);

-- CLIENT_PACKAGES: Validar sessões
ALTER TABLE client_packages 
  DROP CONSTRAINT IF EXISTS check_cp_sessions_positive,
  DROP CONSTRAINT IF EXISTS check_cp_remaining_non_negative;

ALTER TABLE client_packages 
  ADD CONSTRAINT check_cp_sessions_positive CHECK (sessions_total > 0),
  ADD CONSTRAINT check_cp_remaining_non_negative CHECK (sessions_remaining >= 0);

-- CLIENT_SUBSCRIPTIONS: Validar preço mensal
ALTER TABLE client_subscriptions 
  DROP CONSTRAINT IF EXISTS check_cs_price_positive;

ALTER TABLE client_subscriptions 
  ADD CONSTRAINT check_cs_price_positive CHECK (price_monthly >= 0);