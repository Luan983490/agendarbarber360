-- =========================================================
-- NOVAS FUNÇÕES RPC PARA RELATÓRIOS GERENCIAIS
-- =========================================================

-- 1) COMPARATIVO MENSAL (mês atual vs mês anterior)
-- Retorna métricas do período atual vs período anterior
CREATE OR REPLACE FUNCTION public.get_monthly_comparison_report(
  p_current_start_date DATE,
  p_current_end_date DATE,
  p_previous_start_date DATE,
  p_previous_end_date DATE,
  p_barber_filter UUID DEFAULT NULL
)
RETURNS TABLE(
  current_revenue NUMERIC,
  current_bookings INTEGER,
  current_avg_ticket NUMERIC,
  previous_revenue NUMERIC,
  previous_bookings INTEGER,
  previous_avg_ticket NUMERIC,
  revenue_variation NUMERIC,
  bookings_variation NUMERIC,
  avg_ticket_variation NUMERIC
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
  v_effective_barber_filter UUID;
  
  v_current_revenue NUMERIC;
  v_current_bookings INTEGER;
  v_current_avg NUMERIC;
  v_previous_revenue NUMERIC;
  v_previous_bookings INTEGER;
  v_previous_avg NUMERIC;
BEGIN
  -- Verificar autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar barber_id do usuário (se for barbeiro)
  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

  -- Se não for barbeiro, verificar se é owner/attendant
  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id
    FROM barbershops bs
    WHERE bs.owner_id = v_user_id
    LIMIT 1;
    
    IF v_user_barbershop_id IS NOT NULL THEN
      v_is_owner := TRUE;
    ELSE
      SELECT ur.barbershop_id INTO v_user_barbershop_id
      FROM user_roles ur
      WHERE ur.user_id = v_user_id AND ur.role = 'attendant'
      LIMIT 1;
      
      IF v_user_barbershop_id IS NULL THEN
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
      v_is_owner := TRUE;
    END IF;
  END IF;

  -- Definir filtro efetivo
  IF v_user_barber_id IS NOT NULL THEN
    v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner THEN
    v_effective_barber_filter := p_barber_filter;
  END IF;

  -- Período atual
  SELECT 
    COALESCE(SUM(total_price), 0),
    COUNT(*)::INTEGER,
    COALESCE(AVG(total_price), 0)
  INTO v_current_revenue, v_current_bookings, v_current_avg
  FROM bookings
  WHERE barbershop_id = v_user_barbershop_id
    AND status = 'completed'
    AND booking_date >= p_current_start_date
    AND booking_date <= p_current_end_date
    AND (v_effective_barber_filter IS NULL OR barber_id = v_effective_barber_filter);

  -- Período anterior
  SELECT 
    COALESCE(SUM(total_price), 0),
    COUNT(*)::INTEGER,
    COALESCE(AVG(total_price), 0)
  INTO v_previous_revenue, v_previous_bookings, v_previous_avg
  FROM bookings
  WHERE barbershop_id = v_user_barbershop_id
    AND status = 'completed'
    AND booking_date >= p_previous_start_date
    AND booking_date <= p_previous_end_date
    AND (v_effective_barber_filter IS NULL OR barber_id = v_effective_barber_filter);

  RETURN QUERY SELECT
    v_current_revenue,
    v_current_bookings,
    v_current_avg,
    v_previous_revenue,
    v_previous_bookings,
    v_previous_avg,
    CASE WHEN v_previous_revenue > 0 
      THEN ROUND(((v_current_revenue - v_previous_revenue) / v_previous_revenue) * 100, 2)
      ELSE 0 END,
    CASE WHEN v_previous_bookings > 0 
      THEN ROUND(((v_current_bookings - v_previous_bookings)::NUMERIC / v_previous_bookings) * 100, 2)
      ELSE 0 END,
    CASE WHEN v_previous_avg > 0 
      THEN ROUND(((v_current_avg - v_previous_avg) / v_previous_avg) * 100, 2)
      ELSE 0 END;
END;
$$;

-- 2) TAXA DE CANCELAMENTO E NO-SHOW
CREATE OR REPLACE FUNCTION public.get_cancellation_noshow_report(
  p_start_date DATE,
  p_end_date DATE,
  p_barber_filter UUID DEFAULT NULL
)
RETURNS TABLE(
  total_bookings INTEGER,
  completed_bookings INTEGER,
  cancelled_bookings INTEGER,
  noshow_bookings INTEGER,
  cancellation_rate NUMERIC,
  noshow_rate NUMERIC
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
  v_effective_barber_filter UUID;
  
  v_total INTEGER;
  v_completed INTEGER;
  v_cancelled INTEGER;
  v_noshow INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b WHERE b.user_id = v_user_id LIMIT 1;

  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id
    FROM barbershops bs WHERE bs.owner_id = v_user_id LIMIT 1;
    
    IF v_user_barbershop_id IS NOT NULL THEN
      v_is_owner := TRUE;
    ELSE
      SELECT ur.barbershop_id INTO v_user_barbershop_id
      FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'attendant' LIMIT 1;
      
      IF v_user_barbershop_id IS NULL THEN
        RAISE EXCEPTION 'Usuário sem permissão';
      END IF;
      v_is_owner := TRUE;
    END IF;
  END IF;

  IF v_user_barber_id IS NOT NULL THEN
    v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner THEN
    v_effective_barber_filter := p_barber_filter;
  END IF;

  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'no_show')
  INTO v_total, v_completed, v_cancelled, v_noshow
  FROM bookings
  WHERE barbershop_id = v_user_barbershop_id
    AND booking_date >= p_start_date
    AND booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR barber_id = v_effective_barber_filter);

  RETURN QUERY SELECT
    v_total,
    v_completed,
    v_cancelled,
    v_noshow,
    CASE WHEN v_total > 0 THEN ROUND((v_cancelled::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND((v_noshow::NUMERIC / v_total) * 100, 2) ELSE 0 END;
END;
$$;

-- 3) OCUPAÇÃO DA AGENDA
CREATE OR REPLACE FUNCTION public.get_schedule_occupancy_report(
  p_start_date DATE,
  p_end_date DATE,
  p_barber_filter UUID DEFAULT NULL
)
RETURNS TABLE(
  barber_id UUID,
  barber_name TEXT,
  available_hours NUMERIC,
  occupied_hours NUMERIC,
  occupancy_rate NUMERIC
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
  v_effective_barber_filter UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b WHERE b.user_id = v_user_id LIMIT 1;

  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id
    FROM barbershops bs WHERE bs.owner_id = v_user_id LIMIT 1;
    
    IF v_user_barbershop_id IS NOT NULL THEN
      v_is_owner := TRUE;
    ELSE
      SELECT ur.barbershop_id INTO v_user_barbershop_id
      FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'attendant' LIMIT 1;
      
      IF v_user_barbershop_id IS NULL THEN
        RAISE EXCEPTION 'Usuário sem permissão';
      END IF;
      v_is_owner := TRUE;
    END IF;
  END IF;

  IF v_user_barber_id IS NOT NULL THEN
    v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner THEN
    v_effective_barber_filter := p_barber_filter;
  END IF;

  RETURN QUERY
  WITH barber_hours AS (
    SELECT 
      b.id AS bid,
      b.name AS bname,
      -- Calcular horas disponíveis baseado em working_hours (simplificado: 8h por dia útil no período)
      COALESCE(
        (SELECT SUM(
          CASE WHEN NOT wh.is_day_off THEN
            EXTRACT(EPOCH FROM (COALESCE(wh.period1_end, '18:00'::time) - COALESCE(wh.period1_start, '08:00'::time))) / 3600 +
            CASE WHEN wh.period2_start IS NOT NULL AND wh.period2_end IS NOT NULL THEN
              EXTRACT(EPOCH FROM (wh.period2_end - wh.period2_start)) / 3600
            ELSE 0 END
          ELSE 0 END
        ) * ((p_end_date - p_start_date + 1) / 7.0)
        FROM barber_working_hours wh WHERE wh.barber_id = b.id),
        8.0 * (p_end_date - p_start_date + 1)
      ) AS avail_hours,
      -- Calcular horas ocupadas baseado em bookings
      COALESCE(
        (SELECT SUM(s.duration) / 60.0
         FROM bookings bk
         JOIN services s ON s.id = bk.service_id
         WHERE bk.barber_id = b.id
           AND bk.booking_date >= p_start_date
           AND bk.booking_date <= p_end_date
           AND bk.status IN ('completed', 'confirmed', 'pending')),
        0
      ) AS occ_hours
    FROM barbers b
    WHERE b.barbershop_id = v_user_barbershop_id
      AND b.is_active = TRUE
      AND (v_effective_barber_filter IS NULL OR b.id = v_effective_barber_filter)
  )
  SELECT 
    bh.bid,
    bh.bname,
    ROUND(bh.avail_hours::NUMERIC, 2),
    ROUND(bh.occ_hours::NUMERIC, 2),
    CASE WHEN bh.avail_hours > 0 
      THEN ROUND((bh.occ_hours / bh.avail_hours) * 100, 2) 
      ELSE 0 END
  FROM barber_hours bh
  ORDER BY bh.bname;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_comparison_report IS 'Comparativo de métricas entre período atual e anterior';
COMMENT ON FUNCTION public.get_cancellation_noshow_report IS 'Taxa de cancelamento e no-show de agendamentos';
COMMENT ON FUNCTION public.get_schedule_occupancy_report IS 'Ocupação da agenda por barbeiro';