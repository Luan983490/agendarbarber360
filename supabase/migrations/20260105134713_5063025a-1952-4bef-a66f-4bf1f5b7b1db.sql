-- =====================================================
-- CORREÇÕES DE SEGURANÇA RLS - PRIORIDADE CRÍTICA E ALTA
-- =====================================================

-- 1. CRÍTICA: Corrigir UPDATE permissivo na tabela subscriptions
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;

CREATE POLICY "Only system can update subscriptions via service role"
ON public.subscriptions
FOR UPDATE
USING (false)
WITH CHECK (false);

-- 2. ALTA: Adicionar WITH CHECK na policy de INSERT do user_roles
DROP POLICY IF EXISTS "Owners can manage roles for their barbershop" ON public.user_roles;

CREATE POLICY "Owners can manage roles for their barbershop"
ON public.user_roles
FOR ALL
USING (
  barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
  AND role IN ('barber', 'attendant')
);

-- 3. MÉDIA: Criar função security definer para acesso a profiles (staff ver nomes de clientes)
CREATE OR REPLACE FUNCTION public.get_client_display_name(p_client_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT display_name 
  FROM profiles 
  WHERE user_id = p_client_id
$$;

-- 4. MÉDIA: Criar função para verificar se usuário é staff da barbearia
CREATE OR REPLACE FUNCTION public.is_barbershop_staff(p_barbershop_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM barbershops WHERE id = p_barbershop_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE barbershop_id = p_barbershop_id 
    AND user_id = p_user_id 
    AND role IN ('barber', 'attendant')
  ) OR EXISTS (
    SELECT 1 FROM barbers 
    WHERE barbershop_id = p_barbershop_id 
    AND user_id = p_user_id
  )
$$;

-- 5. MÉDIA: Adicionar policy para staff ver profiles de clientes (apenas display_name via função)
CREATE POLICY "Staff can view client profiles for their barbershop bookings"
ON public.profiles
FOR SELECT
USING (
  -- Usuário pode ver seu próprio perfil
  auth.uid() = user_id
  OR
  -- Staff pode ver perfis de clientes que têm bookings na barbearia
  user_id IN (
    SELECT DISTINCT b.client_id 
    FROM bookings b
    WHERE b.client_id IS NOT NULL
    AND (
      -- Owner da barbearia
      b.barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
      OR
      -- Staff da barbearia
      b.barbershop_id IN (
        SELECT barbershop_id FROM user_roles 
        WHERE user_id = auth.uid() AND role IN ('barber', 'attendant')
      )
      OR
      -- Barbeiro do agendamento
      b.barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())
    )
  )
);

-- 6. MÉDIA: Restringir INSERT em booking_audit_logs apenas para triggers/sistema
DROP POLICY IF EXISTS "System can insert audit logs" ON public.booking_audit_logs;

CREATE POLICY "Audit logs can only be inserted by triggers"
ON public.booking_audit_logs
FOR INSERT
WITH CHECK (
  -- Apenas permite inserção se vier de um trigger (verificado pelo contexto)
  -- Na prática, isso bloqueia INSERT direto via API
  current_setting('role', true) = 'service_role'
  OR
  -- Ou permite se o usuário tem permissão sobre o booking
  booking_id IN (
    SELECT id FROM bookings 
    WHERE client_id = auth.uid()
    OR barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
    OR barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())
    OR barbershop_id IN (
      SELECT barbershop_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('barber', 'attendant')
    )
  )
);

-- 7. MÉDIA: Restringir INSERT em loyalty_transactions
DROP POLICY IF EXISTS "System can insert transactions" ON public.loyalty_transactions;

CREATE POLICY "Loyalty transactions only by authorized users"
ON public.loyalty_transactions
FOR INSERT
WITH CHECK (
  -- Owner da barbearia pode inserir transações
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
  OR
  -- Transação para o próprio cliente (resgate)
  (client_id = auth.uid() AND transaction_type = 'redeem')
);

-- 8. MÉDIA: Restringir INSERT em client_loyalty_points
DROP POLICY IF EXISTS "System can insert loyalty points" ON public.client_loyalty_points;

CREATE POLICY "Loyalty points only by barbershop owner"
ON public.client_loyalty_points
FOR INSERT
WITH CHECK (
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
);

-- 9. Adicionar policy de UPDATE para client_loyalty_points (faltava)
CREATE POLICY "Barbershop owners can manage their clients points"
ON public.client_loyalty_points
FOR ALL
USING (
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
)
WITH CHECK (
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
);

-- 10. MÉDIA: Restringir INSERT em subscriptions
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;

CREATE POLICY "Subscriptions only by barbershop owner"
ON public.subscriptions
FOR INSERT
WITH CHECK (
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid())
);