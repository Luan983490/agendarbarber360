-- =====================================================
-- MÓDULO DE RELATÓRIOS - BARBEARIA
-- =====================================================
-- Todas as verificações de segurança ocorrem no banco
-- Barbeiros só veem seus próprios dados
-- Owners/Admins podem ver tudo ou filtrar por barbeiro
-- =====================================================

-- =====================================================
-- 1️⃣ RELATÓRIO FINANCEIRO (FATURAMENTO)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_revenue_report(
  p_start_date DATE,
  p_end_date DATE,
  p_barber_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_bookings INTEGER,
  average_ticket NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_admin_or_attendant BOOLEAN := FALSE;
  v_effective_barber_filter UUID;
BEGIN
  -- Verificar se o usuário está logado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar barber_id do usuário (se for barbeiro)
  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

  -- Se não for barbeiro, verificar se é owner
  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id
    FROM barbershops bs
    WHERE bs.owner_id = v_user_id
    LIMIT 1;
    
    IF v_user_barbershop_id IS NOT NULL THEN
      v_is_owner := TRUE;
    ELSE
      -- Verificar se é attendant
      SELECT ur.barbershop_id INTO v_user_barbershop_id
      FROM user_roles ur
      WHERE ur.user_id = v_user_id
        AND ur.role = 'attendant'
      LIMIT 1;
      
      IF v_user_barbershop_id IS NOT NULL THEN
        v_is_admin_or_attendant := TRUE;
      ELSE
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
    END IF;
  END IF;

  -- Definir filtro efetivo de barbeiro
  IF v_user_barber_id IS NOT NULL THEN
    -- É barbeiro: ignorar parâmetro e usar seu próprio ID
    v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner OR v_is_admin_or_attendant THEN
    -- É owner/admin: usar filtro passado (ou NULL para todos)
    v_effective_barber_filter := p_barber_filter;
  END IF;

  -- Retornar relatório
  RETURN QUERY
  SELECT 
    COALESCE(SUM(bk.total_price), 0)::NUMERIC AS total_revenue,
    COUNT(bk.id)::INTEGER AS total_bookings,
    COALESCE(AVG(bk.total_price), 0)::NUMERIC AS average_ticket
  FROM bookings bk
  WHERE bk.barbershop_id = v_user_barbershop_id
    AND bk.status = 'completed'
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter);
END;
$$;

COMMENT ON FUNCTION public.get_revenue_report IS 
'Relatório financeiro com faturamento total, quantidade de atendimentos e ticket médio.
Barbeiros veem apenas seus dados. Owners/Admins podem ver tudo ou filtrar por barbeiro.';

-- =====================================================
-- 2️⃣ RELATÓRIO DE AGENDAMENTOS POR DATA
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_bookings_report(
  p_start_date DATE,
  p_end_date DATE,
  p_barber_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  booking_date DATE,
  total_bookings INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_admin_or_attendant BOOLEAN := FALSE;
  v_effective_barber_filter UUID;
BEGIN
  -- Verificar se o usuário está logado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar barber_id do usuário (se for barbeiro)
  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

  -- Se não for barbeiro, verificar se é owner
  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id
    FROM barbershops bs
    WHERE bs.owner_id = v_user_id
    LIMIT 1;
    
    IF v_user_barbershop_id IS NOT NULL THEN
      v_is_owner := TRUE;
    ELSE
      -- Verificar se é attendant
      SELECT ur.barbershop_id INTO v_user_barbershop_id
      FROM user_roles ur
      WHERE ur.user_id = v_user_id
        AND ur.role = 'attendant'
      LIMIT 1;
      
      IF v_user_barbershop_id IS NOT NULL THEN
        v_is_admin_or_attendant := TRUE;
      ELSE
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
    END IF;
  END IF;

  -- Definir filtro efetivo de barbeiro
  IF v_user_barber_id IS NOT NULL THEN
    v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner OR v_is_admin_or_attendant THEN
    v_effective_barber_filter := p_barber_filter;
  END IF;

  -- Retornar relatório agrupado por data
  RETURN QUERY
  SELECT 
    bk.booking_date,
    COUNT(bk.id)::INTEGER AS total_bookings
  FROM bookings bk
  WHERE bk.barbershop_id = v_user_barbershop_id
    AND bk.status = 'completed'
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter)
  GROUP BY bk.booking_date
  ORDER BY bk.booking_date;
END;
$$;

COMMENT ON FUNCTION public.get_bookings_report IS 
'Relatório de agendamentos agrupados por data.
Barbeiros veem apenas seus dados. Owners/Admins podem ver tudo ou filtrar por barbeiro.';

-- =====================================================
-- 3️⃣ SERVIÇOS MAIS VENDIDOS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_top_services_report(
  p_start_date DATE,
  p_end_date DATE,
  p_barber_filter UUID DEFAULT NULL
)
RETURNS TABLE (
  service_id UUID,
  service_name TEXT,
  total_bookings INTEGER,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_admin_or_attendant BOOLEAN := FALSE;
  v_effective_barber_filter UUID;
BEGIN
  -- Verificar se o usuário está logado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar barber_id do usuário (se for barbeiro)
  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

  -- Se não for barbeiro, verificar se é owner
  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id
    FROM barbershops bs
    WHERE bs.owner_id = v_user_id
    LIMIT 1;
    
    IF v_user_barbershop_id IS NOT NULL THEN
      v_is_owner := TRUE;
    ELSE
      -- Verificar se é attendant
      SELECT ur.barbershop_id INTO v_user_barbershop_id
      FROM user_roles ur
      WHERE ur.user_id = v_user_id
        AND ur.role = 'attendant'
      LIMIT 1;
      
      IF v_user_barbershop_id IS NOT NULL THEN
        v_is_admin_or_attendant := TRUE;
      ELSE
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
    END IF;
  END IF;

  -- Definir filtro efetivo de barbeiro
  IF v_user_barber_id IS NOT NULL THEN
    v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner OR v_is_admin_or_attendant THEN
    v_effective_barber_filter := p_barber_filter;
  END IF;

  -- Retornar serviços mais vendidos
  RETURN QUERY
  SELECT 
    s.id AS service_id,
    s.name AS service_name,
    COUNT(bk.id)::INTEGER AS total_bookings,
    COALESCE(SUM(bk.total_price), 0)::NUMERIC AS total_revenue
  FROM bookings bk
  JOIN services s ON s.id = bk.service_id
  WHERE bk.barbershop_id = v_user_barbershop_id
    AND bk.status = 'completed'
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter)
  GROUP BY s.id, s.name
  ORDER BY total_bookings DESC;
END;
$$;

COMMENT ON FUNCTION public.get_top_services_report IS 
'Relatório de serviços mais vendidos com quantidade e faturamento.
Barbeiros veem apenas seus dados. Owners/Admins podem ver tudo ou filtrar por barbeiro.';

-- =====================================================
-- 4️⃣ PERFORMANCE POR BARBEIRO (SOMENTE OWNER/ADMIN)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_barber_performance_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  barber_id UUID,
  barber_name TEXT,
  total_bookings INTEGER,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_admin_or_attendant BOOLEAN := FALSE;
BEGIN
  -- Verificar se o usuário está logado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se é owner
  SELECT bs.id INTO v_user_barbershop_id
  FROM barbershops bs
  WHERE bs.owner_id = v_user_id
  LIMIT 1;
  
  IF v_user_barbershop_id IS NOT NULL THEN
    v_is_owner := TRUE;
  ELSE
    -- Verificar se é attendant
    SELECT ur.barbershop_id INTO v_user_barbershop_id
    FROM user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role = 'attendant'
    LIMIT 1;
    
    IF v_user_barbershop_id IS NOT NULL THEN
      v_is_admin_or_attendant := TRUE;
    ELSE
      -- Verificar se é barbeiro (não tem permissão)
      IF EXISTS (SELECT 1 FROM barbers WHERE user_id = v_user_id) THEN
        RAISE EXCEPTION 'Barbeiros não podem acessar relatório de performance geral';
      ELSE
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
    END IF;
  END IF;

  -- Retornar performance de todos os barbeiros
  RETURN QUERY
  SELECT 
    b.id AS barber_id,
    b.name AS barber_name,
    COUNT(bk.id)::INTEGER AS total_bookings,
    COALESCE(SUM(bk.total_price), 0)::NUMERIC AS total_revenue
  FROM barbers b
  LEFT JOIN bookings bk ON bk.barber_id = b.id
    AND bk.status = 'completed'
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
  WHERE b.barbershop_id = v_user_barbershop_id
    AND b.is_active = TRUE
  GROUP BY b.id, b.name
  ORDER BY total_revenue DESC;
END;
$$;

COMMENT ON FUNCTION public.get_barber_performance_report IS 
'Relatório de performance de todos os barbeiros da barbearia.
APENAS owners e admins podem acessar. Barbeiros NÃO têm permissão.';