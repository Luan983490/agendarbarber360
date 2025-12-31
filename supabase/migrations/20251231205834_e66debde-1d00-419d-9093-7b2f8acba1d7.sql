-- =============================================
-- MÓDULO DE RELATÓRIOS AVANÇADOS
-- =============================================

-- =============================================
-- TABELA: report_alerts
-- Armazena alertas automáticos do sistema
-- =============================================
CREATE TABLE IF NOT EXISTS public.report_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('high_cancellation', 'low_revenue', 'no_show_spike', 'revenue_drop')),
  threshold NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  last_triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for report_alerts
CREATE POLICY "Owners can view their barbershop alerts"
  ON public.report_alerts FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Barbers can view their own alerts"
  ON public.report_alerts FOR SELECT
  USING (barber_id IN (
    SELECT id FROM barbers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Owners can update alerts"
  ON public.report_alerts FOR UPDATE
  USING (barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "System can insert alerts"
  ON public.report_alerts FOR INSERT
  WITH CHECK (true);

-- =============================================
-- RPC 1: get_top_clients_and_profitable_hours
-- Top clientes e horários mais lucrativos
-- =============================================
CREATE OR REPLACE FUNCTION public.get_top_clients_and_profitable_hours(
  p_start_date DATE,
  p_end_date DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  client_id UUID,
  client_name TEXT,
  total_bookings INTEGER,
  total_revenue NUMERIC,
  profitable_weekday INTEGER,
  profitable_weekday_revenue NUMERIC,
  profitable_time_slot TIME,
  profitable_time_slot_revenue NUMERIC
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
      
      IF v_user_barbershop_id IS NOT NULL THEN
        v_is_owner := TRUE;
      ELSE
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
    END IF;
  END IF;

  -- Retornar top clientes com horários lucrativos
  RETURN QUERY
  WITH client_stats AS (
    SELECT 
      COALESCE(bk.client_id, '00000000-0000-0000-0000-000000000000'::UUID) AS cid,
      COALESCE(p.display_name, bk.client_name, 'Cliente Externo') AS cname,
      COUNT(*)::INTEGER AS bookings,
      COALESCE(SUM(bk.total_price), 0) AS revenue
    FROM bookings bk
    LEFT JOIN profiles p ON p.user_id = bk.client_id
    WHERE bk.barbershop_id = v_user_barbershop_id
      AND bk.status = 'completed'
      AND bk.booking_date >= p_start_date
      AND bk.booking_date <= p_end_date
      AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
    GROUP BY COALESCE(bk.client_id, '00000000-0000-0000-0000-000000000000'::UUID), 
             COALESCE(p.display_name, bk.client_name, 'Cliente Externo')
    ORDER BY revenue DESC
    LIMIT p_limit
  ),
  weekday_revenue AS (
    SELECT 
      EXTRACT(DOW FROM bk.booking_date)::INTEGER AS weekday,
      SUM(bk.total_price) AS revenue
    FROM bookings bk
    WHERE bk.barbershop_id = v_user_barbershop_id
      AND bk.status = 'completed'
      AND bk.booking_date >= p_start_date
      AND bk.booking_date <= p_end_date
      AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
    GROUP BY EXTRACT(DOW FROM bk.booking_date)
    ORDER BY revenue DESC
    LIMIT 1
  ),
  time_revenue AS (
    SELECT 
      bk.booking_time AS time_slot,
      SUM(bk.total_price) AS revenue
    FROM bookings bk
    WHERE bk.barbershop_id = v_user_barbershop_id
      AND bk.status = 'completed'
      AND bk.booking_date >= p_start_date
      AND bk.booking_date <= p_end_date
      AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
    GROUP BY bk.booking_time
    ORDER BY revenue DESC
    LIMIT 1
  )
  SELECT 
    cs.cid,
    cs.cname,
    cs.bookings,
    cs.revenue,
    COALESCE(wr.weekday, 0),
    COALESCE(wr.revenue, 0),
    COALESCE(tr.time_slot, '00:00'::TIME),
    COALESCE(tr.revenue, 0)
  FROM client_stats cs
  CROSS JOIN (SELECT * FROM weekday_revenue LIMIT 1) wr
  CROSS JOIN (SELECT * FROM time_revenue LIMIT 1) tr;
END;
$$;

-- =============================================
-- RPC 2: get_exportable_report_data
-- Dados estruturados para exportação
-- =============================================
CREATE OR REPLACE FUNCTION public.get_exportable_report_data(
  p_report_type TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
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
  v_result JSONB;
BEGIN
  -- Verificar autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar contexto do usuário
  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

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
      
      IF v_user_barbershop_id IS NOT NULL THEN
        v_is_owner := TRUE;
      ELSE
        RAISE EXCEPTION 'Usuário sem permissão';
      END IF;
    END IF;
  END IF;

  -- Gerar relatório baseado no tipo
  CASE p_report_type
    WHEN 'bookings' THEN
      SELECT jsonb_build_object(
        'report_type', 'bookings',
        'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'generated_at', now(),
        'data', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      ) INTO v_result
      FROM (
        SELECT 
          bk.id,
          bk.booking_date,
          bk.booking_time,
          bk.status,
          bk.total_price,
          COALESCE(p.display_name, bk.client_name, 'Cliente Externo') AS client_name,
          br.name AS barber_name,
          s.name AS service_name
        FROM bookings bk
        LEFT JOIN profiles p ON p.user_id = bk.client_id
        LEFT JOIN barbers br ON br.id = bk.barber_id
        LEFT JOIN services s ON s.id = bk.service_id
        WHERE bk.barbershop_id = v_user_barbershop_id
          AND bk.booking_date >= p_start_date
          AND bk.booking_date <= p_end_date
          AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
        ORDER BY bk.booking_date DESC, bk.booking_time DESC
      ) t;

    WHEN 'revenue' THEN
      SELECT jsonb_build_object(
        'report_type', 'revenue',
        'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'generated_at', now(),
        'summary', jsonb_build_object(
          'total_revenue', COALESCE(SUM(total_price), 0),
          'total_bookings', COUNT(*),
          'average_ticket', COALESCE(AVG(total_price), 0)
        ),
        'by_date', COALESCE((
          SELECT jsonb_agg(row_to_json(d))
          FROM (
            SELECT booking_date, SUM(total_price) AS revenue, COUNT(*) AS bookings
            FROM bookings
            WHERE barbershop_id = v_user_barbershop_id
              AND status = 'completed'
              AND booking_date >= p_start_date
              AND booking_date <= p_end_date
              AND (v_user_barber_id IS NULL OR barber_id = v_user_barber_id)
            GROUP BY booking_date
            ORDER BY booking_date
          ) d
        ), '[]'::jsonb)
      ) INTO v_result
      FROM bookings
      WHERE barbershop_id = v_user_barbershop_id
        AND status = 'completed'
        AND booking_date >= p_start_date
        AND booking_date <= p_end_date
        AND (v_user_barber_id IS NULL OR barber_id = v_user_barber_id);

    WHEN 'services' THEN
      SELECT jsonb_build_object(
        'report_type', 'services',
        'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'generated_at', now(),
        'data', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      ) INTO v_result
      FROM (
        SELECT 
          s.id,
          s.name,
          COUNT(bk.id)::INTEGER AS total_bookings,
          COALESCE(SUM(bk.total_price), 0) AS total_revenue
        FROM bookings bk
        JOIN services s ON s.id = bk.service_id
        WHERE bk.barbershop_id = v_user_barbershop_id
          AND bk.status = 'completed'
          AND bk.booking_date >= p_start_date
          AND bk.booking_date <= p_end_date
          AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
        GROUP BY s.id, s.name
        ORDER BY total_revenue DESC
      ) t;

    WHEN 'barbers' THEN
      -- Apenas owner/admin podem exportar relatório de barbeiros
      IF v_user_barber_id IS NOT NULL THEN
        RAISE EXCEPTION 'Barbeiros não podem exportar relatório de outros profissionais';
      END IF;
      
      SELECT jsonb_build_object(
        'report_type', 'barbers',
        'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'generated_at', now(),
        'data', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      ) INTO v_result
      FROM (
        SELECT 
          br.id,
          br.name,
          COUNT(bk.id)::INTEGER AS total_bookings,
          COALESCE(SUM(bk.total_price), 0) AS total_revenue,
          COALESCE(AVG(bk.total_price), 0) AS average_ticket
        FROM barbers br
        LEFT JOIN bookings bk ON bk.barber_id = br.id
          AND bk.status = 'completed'
          AND bk.booking_date >= p_start_date
          AND bk.booking_date <= p_end_date
        WHERE br.barbershop_id = v_user_barbershop_id
          AND br.is_active = TRUE
        GROUP BY br.id, br.name
        ORDER BY total_revenue DESC
      ) t;

    ELSE
      RAISE EXCEPTION 'Tipo de relatório inválido: %', p_report_type;
  END CASE;

  RETURN v_result;
END;
$$;

-- =============================================
-- RPC 3: check_and_trigger_alerts
-- Verifica e registra alertas automáticos
-- =============================================
CREATE OR REPLACE FUNCTION public.check_and_trigger_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop RECORD;
  v_cancellation_rate NUMERIC;
  v_noshow_rate NUMERIC;
  v_current_revenue NUMERIC;
  v_previous_revenue NUMERIC;
  v_revenue_drop NUMERIC;
  v_alerts_created INTEGER := 0;
  v_threshold_cancellation NUMERIC := 20.0; -- 20%
  v_threshold_noshow NUMERIC := 15.0; -- 15%
  v_threshold_revenue_drop NUMERIC := 30.0; -- 30%
BEGIN
  -- Iterar por todas as barbearias
  FOR v_barbershop IN SELECT id FROM barbershops LOOP
    -- Verificar taxa de cancelamento (últimos 7 dias)
    SELECT 
      CASE WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE status = 'cancelled')::NUMERIC / COUNT(*)) * 100
        ELSE 0 
      END
    INTO v_cancellation_rate
    FROM bookings
    WHERE barbershop_id = v_barbershop.id
      AND booking_date >= CURRENT_DATE - INTERVAL '7 days';
    
    IF v_cancellation_rate > v_threshold_cancellation THEN
      INSERT INTO report_alerts (barbershop_id, alert_type, threshold, current_value, message)
      VALUES (
        v_barbershop.id, 
        'high_cancellation', 
        v_threshold_cancellation, 
        v_cancellation_rate,
        'Taxa de cancelamento alta: ' || ROUND(v_cancellation_rate, 1) || '% nos últimos 7 dias'
      )
      ON CONFLICT DO NOTHING;
      v_alerts_created := v_alerts_created + 1;
    END IF;

    -- Verificar taxa de no-show (últimos 7 dias)
    SELECT 
      CASE WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE status = 'no_show')::NUMERIC / COUNT(*)) * 100
        ELSE 0 
      END
    INTO v_noshow_rate
    FROM bookings
    WHERE barbershop_id = v_barbershop.id
      AND booking_date >= CURRENT_DATE - INTERVAL '7 days';
    
    IF v_noshow_rate > v_threshold_noshow THEN
      INSERT INTO report_alerts (barbershop_id, alert_type, threshold, current_value, message)
      VALUES (
        v_barbershop.id, 
        'no_show_spike', 
        v_threshold_noshow, 
        v_noshow_rate,
        'Alta taxa de não comparecimento: ' || ROUND(v_noshow_rate, 1) || '% nos últimos 7 dias'
      )
      ON CONFLICT DO NOTHING;
      v_alerts_created := v_alerts_created + 1;
    END IF;

    -- Verificar queda de faturamento (semana atual vs semana anterior)
    SELECT COALESCE(SUM(total_price), 0)
    INTO v_current_revenue
    FROM bookings
    WHERE barbershop_id = v_barbershop.id
      AND status = 'completed'
      AND booking_date >= CURRENT_DATE - INTERVAL '7 days';
    
    SELECT COALESCE(SUM(total_price), 0)
    INTO v_previous_revenue
    FROM bookings
    WHERE barbershop_id = v_barbershop.id
      AND status = 'completed'
      AND booking_date >= CURRENT_DATE - INTERVAL '14 days'
      AND booking_date < CURRENT_DATE - INTERVAL '7 days';
    
    IF v_previous_revenue > 0 THEN
      v_revenue_drop := ((v_previous_revenue - v_current_revenue) / v_previous_revenue) * 100;
      
      IF v_revenue_drop > v_threshold_revenue_drop THEN
        INSERT INTO report_alerts (barbershop_id, alert_type, threshold, current_value, message)
        VALUES (
          v_barbershop.id, 
          'revenue_drop', 
          v_threshold_revenue_drop, 
          v_revenue_drop,
          'Queda de faturamento: ' || ROUND(v_revenue_drop, 1) || '% em relação à semana anterior'
        )
        ON CONFLICT DO NOTHING;
        v_alerts_created := v_alerts_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_alerts_created;
END;
$$;

-- =============================================
-- RPC 4: get_audit_timeline
-- Timeline de auditoria de bookings
-- =============================================
CREATE OR REPLACE FUNCTION public.get_audit_timeline(
  p_start_date DATE,
  p_end_date DATE,
  p_booking_id UUID DEFAULT NULL
)
RETURNS TABLE(
  booking_id UUID,
  action TEXT,
  old_status TEXT,
  new_status TEXT,
  actor_role TEXT,
  origin TEXT,
  created_at TIMESTAMPTZ,
  client_name TEXT,
  barber_name TEXT
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
BEGIN
  -- Verificar autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar contexto do usuário
  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

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
      
      IF v_user_barbershop_id IS NOT NULL THEN
        v_is_owner := TRUE;
      END IF;
    END IF;
  END IF;

  -- Retornar timeline de auditoria
  RETURN QUERY
  SELECT 
    bal.booking_id,
    bal.action,
    bal.old_status,
    bal.new_status,
    bal.actor_role,
    bal.origin,
    bal.created_at,
    COALESCE(p.display_name, bk.client_name, 'Cliente Externo') AS client_name,
    COALESCE(br.name, 'N/A') AS barber_name
  FROM booking_audit_logs bal
  JOIN bookings bk ON bk.id = bal.booking_id
  LEFT JOIN profiles p ON p.user_id = bk.client_id
  LEFT JOIN barbers br ON br.id = bk.barber_id
  WHERE bal.created_at::DATE >= p_start_date
    AND bal.created_at::DATE <= p_end_date
    AND (p_booking_id IS NULL OR bal.booking_id = p_booking_id)
    AND (
      -- Owner/Admin veem tudo da barbearia
      (v_is_owner AND bal.barbershop_id = v_user_barbershop_id)
      -- Barbeiro vê apenas seus bookings
      OR (v_user_barber_id IS NOT NULL AND bk.barber_id = v_user_barber_id)
      -- Cliente vê apenas seus bookings
      OR (bk.client_id = v_user_id)
    )
  ORDER BY bal.created_at DESC;
END;
$$;

-- =============================================
-- RPC 5: get_barber_advanced_metrics
-- Métricas avançadas EXCLUSIVAS do barbeiro logado
-- =============================================
CREATE OR REPLACE FUNCTION public.get_barber_advanced_metrics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_bookings_completed INTEGER,
  total_revenue NUMERIC,
  average_ticket NUMERIC,
  total_cancelled INTEGER,
  total_no_show INTEGER,
  cancellation_rate_percent NUMERIC,
  no_show_rate_percent NUMERIC,
  most_used_service_id UUID,
  most_used_service_name TEXT,
  most_used_service_count INTEGER,
  busiest_weekday INTEGER,
  busiest_weekday_count INTEGER,
  busiest_time_slot TIME,
  busiest_time_slot_count INTEGER,
  average_service_duration_minutes NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_barber_id UUID;
  v_barbershop_id UUID;
  
  v_completed INTEGER;
  v_cancelled INTEGER;
  v_no_show INTEGER;
  v_total INTEGER;
  v_revenue NUMERIC;
  v_avg_ticket NUMERIC;
  
  v_service_id UUID;
  v_service_name TEXT;
  v_service_count INTEGER;
  
  v_weekday INTEGER;
  v_weekday_count INTEGER;
  
  v_time_slot TIME;
  v_time_slot_count INTEGER;
  
  v_avg_duration NUMERIC;
BEGIN
  -- Verificar autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar barber_id do usuário - OBRIGATÓRIO ser barbeiro
  SELECT b.id, b.barbershop_id INTO v_barber_id, v_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

  -- Se não for barbeiro, negar acesso
  IF v_barber_id IS NULL THEN
    RAISE EXCEPTION 'Esta função é exclusiva para barbeiros. Use get_revenue_report para dados gerais.';
  END IF;

  -- Contagens básicas
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'no_show'),
    COUNT(*)
  INTO v_completed, v_cancelled, v_no_show, v_total
  FROM bookings
  WHERE barber_id = v_barber_id
    AND booking_date >= p_start_date
    AND booking_date <= p_end_date;

  -- Faturamento e ticket médio
  SELECT 
    COALESCE(SUM(total_price), 0),
    COALESCE(AVG(total_price), 0)
  INTO v_revenue, v_avg_ticket
  FROM bookings
  WHERE barber_id = v_barber_id
    AND status = 'completed'
    AND booking_date >= p_start_date
    AND booking_date <= p_end_date;

  -- Serviço mais utilizado
  SELECT s.id, s.name, COUNT(bk.id)::INTEGER
  INTO v_service_id, v_service_name, v_service_count
  FROM bookings bk
  JOIN services s ON s.id = bk.service_id
  WHERE bk.barber_id = v_barber_id
    AND bk.status = 'completed'
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
  GROUP BY s.id, s.name
  ORDER BY COUNT(bk.id) DESC
  LIMIT 1;

  -- Dia da semana mais movimentado
  SELECT EXTRACT(DOW FROM booking_date)::INTEGER, COUNT(*)::INTEGER
  INTO v_weekday, v_weekday_count
  FROM bookings
  WHERE barber_id = v_barber_id
    AND status = 'completed'
    AND booking_date >= p_start_date
    AND booking_date <= p_end_date
  GROUP BY EXTRACT(DOW FROM booking_date)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Horário mais movimentado
  SELECT booking_time, COUNT(*)::INTEGER
  INTO v_time_slot, v_time_slot_count
  FROM bookings
  WHERE barber_id = v_barber_id
    AND status = 'completed'
    AND booking_date >= p_start_date
    AND booking_date <= p_end_date
  GROUP BY booking_time
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Duração média dos serviços
  SELECT COALESCE(AVG(s.duration), 0)
  INTO v_avg_duration
  FROM bookings bk
  JOIN services s ON s.id = bk.service_id
  WHERE bk.barber_id = v_barber_id
    AND bk.status = 'completed'
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date;

  -- Retornar resultado
  RETURN QUERY SELECT
    COALESCE(v_completed, 0)::INTEGER,
    COALESCE(v_revenue, 0)::NUMERIC,
    ROUND(COALESCE(v_avg_ticket, 0), 2)::NUMERIC,
    COALESCE(v_cancelled, 0)::INTEGER,
    COALESCE(v_no_show, 0)::INTEGER,
    CASE WHEN COALESCE(v_total, 0) > 0 
      THEN ROUND((COALESCE(v_cancelled, 0)::NUMERIC / v_total) * 100, 2) 
      ELSE 0 END::NUMERIC,
    CASE WHEN COALESCE(v_total, 0) > 0 
      THEN ROUND((COALESCE(v_no_show, 0)::NUMERIC / v_total) * 100, 2) 
      ELSE 0 END::NUMERIC,
    v_service_id,
    COALESCE(v_service_name, 'N/A'),
    COALESCE(v_service_count, 0)::INTEGER,
    COALESCE(v_weekday, 0)::INTEGER,
    COALESCE(v_weekday_count, 0)::INTEGER,
    COALESCE(v_time_slot, '00:00'::TIME),
    COALESCE(v_time_slot_count, 0)::INTEGER,
    ROUND(COALESCE(v_avg_duration, 0), 1)::NUMERIC;
END;
$$;

-- =============================================
-- RPC auxiliar: get_active_alerts
-- Busca alertas ativos para o usuário
-- =============================================
CREATE OR REPLACE FUNCTION public.get_active_alerts()
RETURNS TABLE(
  id UUID,
  alert_type TEXT,
  threshold NUMERIC,
  current_value NUMERIC,
  message TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
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
BEGIN
  -- Verificar autenticação
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Buscar contexto
  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b
  WHERE b.user_id = v_user_id
  LIMIT 1;

  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id
    FROM barbershops bs
    WHERE bs.owner_id = v_user_id
    LIMIT 1;
    
    IF v_user_barbershop_id IS NULL THEN
      SELECT ur.barbershop_id INTO v_user_barbershop_id
      FROM user_roles ur
      WHERE ur.user_id = v_user_id AND ur.role = 'attendant'
      LIMIT 1;
    END IF;
  END IF;

  IF v_user_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem permissão';
  END IF;

  -- Retornar alertas
  RETURN QUERY
  SELECT 
    ra.id,
    ra.alert_type,
    ra.threshold,
    ra.current_value,
    ra.message,
    ra.is_read,
    ra.created_at
  FROM report_alerts ra
  WHERE ra.barbershop_id = v_user_barbershop_id
    AND (v_user_barber_id IS NULL OR ra.barber_id IS NULL OR ra.barber_id = v_user_barber_id)
    AND ra.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY ra.created_at DESC;
END;
$$;