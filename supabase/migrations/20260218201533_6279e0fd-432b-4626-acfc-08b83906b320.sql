
-- Update get_revenue_report to include confirmed bookings
CREATE OR REPLACE FUNCTION public.get_revenue_report(p_start_date DATE, p_end_date DATE, p_barber_filter UUID DEFAULT NULL)
RETURNS TABLE(total_revenue NUMERIC, total_bookings INTEGER, average_ticket NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_admin_or_attendant BOOLEAN := FALSE;
  v_effective_barber_filter UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;

  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b WHERE b.user_id = v_user_id LIMIT 1;

  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id FROM barbershops bs WHERE bs.owner_id = v_user_id LIMIT 1;
    IF v_user_barbershop_id IS NOT NULL THEN v_is_owner := TRUE;
    ELSE
      SELECT ur.barbershop_id INTO v_user_barbershop_id FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'attendant' LIMIT 1;
      IF v_user_barbershop_id IS NOT NULL THEN v_is_admin_or_attendant := TRUE;
      ELSE RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios'; END IF;
    END IF;
  END IF;

  IF v_user_barber_id IS NOT NULL THEN v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner OR v_is_admin_or_attendant THEN v_effective_barber_filter := p_barber_filter; END IF;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(
      bk.total_price 
      + COALESCE((SELECT SUM(bs2.unit_price * bs2.quantity) FROM booking_services bs2 WHERE bs2.booking_id = bk.id), 0)
      + COALESCE((SELECT SUM(bp.unit_price * bp.quantity) FROM booking_products bp WHERE bp.booking_id = bk.id), 0)
    ), 0)::NUMERIC AS total_revenue,
    COUNT(bk.id)::INTEGER AS total_bookings,
    COALESCE(AVG(
      bk.total_price 
      + COALESCE((SELECT SUM(bs2.unit_price * bs2.quantity) FROM booking_services bs2 WHERE bs2.booking_id = bk.id), 0)
      + COALESCE((SELECT SUM(bp.unit_price * bp.quantity) FROM booking_products bp WHERE bp.booking_id = bk.id), 0)
    ), 0)::NUMERIC AS average_ticket
  FROM bookings bk
  WHERE bk.barbershop_id = v_user_barbershop_id
    AND bk.status IN ('completed', 'confirmed')
    AND bk.deleted_at IS NULL
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter);
END;
$$;

-- Update get_monthly_comparison_report to include confirmed
CREATE OR REPLACE FUNCTION public.get_monthly_comparison_report(
  p_current_start_date DATE, p_current_end_date DATE,
  p_previous_start_date DATE, p_previous_end_date DATE,
  p_barber_filter UUID DEFAULT NULL
)
RETURNS TABLE(current_revenue NUMERIC, current_bookings INTEGER, current_avg_ticket NUMERIC,
              previous_revenue NUMERIC, previous_bookings INTEGER, previous_avg_ticket NUMERIC,
              revenue_variation NUMERIC, bookings_variation NUMERIC, avg_ticket_variation NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_effective_barber_filter UUID;
  v_current_revenue NUMERIC; v_current_bookings INTEGER; v_current_avg NUMERIC;
  v_previous_revenue NUMERIC; v_previous_bookings INTEGER; v_previous_avg NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;

  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b WHERE b.user_id = v_user_id LIMIT 1;

  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id FROM barbershops bs WHERE bs.owner_id = v_user_id LIMIT 1;
    IF v_user_barbershop_id IS NOT NULL THEN v_is_owner := TRUE;
    ELSE
      SELECT ur.barbershop_id INTO v_user_barbershop_id FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'attendant' LIMIT 1;
      IF v_user_barbershop_id IS NULL THEN RAISE EXCEPTION 'Usuário sem permissão'; END IF;
      v_is_owner := TRUE;
    END IF;
  END IF;

  IF v_user_barber_id IS NOT NULL THEN v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner THEN v_effective_barber_filter := p_barber_filter; END IF;

  SELECT COALESCE(SUM(total_price), 0), COUNT(*)::INTEGER, COALESCE(AVG(total_price), 0)
  INTO v_current_revenue, v_current_bookings, v_current_avg
  FROM bookings WHERE barbershop_id = v_user_barbershop_id
    AND status IN ('completed', 'confirmed') AND deleted_at IS NULL
    AND booking_date >= p_current_start_date AND booking_date <= p_current_end_date
    AND (v_effective_barber_filter IS NULL OR barber_id = v_effective_barber_filter);

  SELECT COALESCE(SUM(total_price), 0), COUNT(*)::INTEGER, COALESCE(AVG(total_price), 0)
  INTO v_previous_revenue, v_previous_bookings, v_previous_avg
  FROM bookings WHERE barbershop_id = v_user_barbershop_id
    AND status IN ('completed', 'confirmed') AND deleted_at IS NULL
    AND booking_date >= p_previous_start_date AND booking_date <= p_previous_end_date
    AND (v_effective_barber_filter IS NULL OR barber_id = v_effective_barber_filter);

  RETURN QUERY SELECT
    v_current_revenue, v_current_bookings, v_current_avg,
    v_previous_revenue, v_previous_bookings, v_previous_avg,
    CASE WHEN v_previous_revenue > 0 THEN ROUND(((v_current_revenue - v_previous_revenue) / v_previous_revenue) * 100, 2) ELSE 0 END,
    CASE WHEN v_previous_bookings > 0 THEN ROUND(((v_current_bookings - v_previous_bookings)::NUMERIC / v_previous_bookings) * 100, 2) ELSE 0 END,
    CASE WHEN v_previous_avg > 0 THEN ROUND(((v_current_avg - v_previous_avg) / v_previous_avg) * 100, 2) ELSE 0 END;
END;
$$;

-- Update get_top_services_report to include confirmed
CREATE OR REPLACE FUNCTION public.get_top_services_report(p_start_date DATE, p_end_date DATE, p_barber_filter UUID DEFAULT NULL)
RETURNS TABLE(service_id UUID, service_name TEXT, total_bookings INTEGER, total_revenue NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_admin_or_attendant BOOLEAN := FALSE;
  v_effective_barber_filter UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;

  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b WHERE b.user_id = v_user_id LIMIT 1;

  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id FROM barbershops bs WHERE bs.owner_id = v_user_id LIMIT 1;
    IF v_user_barbershop_id IS NOT NULL THEN v_is_owner := TRUE;
    ELSE
      SELECT ur.barbershop_id INTO v_user_barbershop_id FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'attendant' LIMIT 1;
      IF v_user_barbershop_id IS NOT NULL THEN v_is_admin_or_attendant := TRUE;
      ELSE RAISE EXCEPTION 'Usuário sem permissão'; END IF;
    END IF;
  END IF;

  IF v_user_barber_id IS NOT NULL THEN v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner OR v_is_admin_or_attendant THEN v_effective_barber_filter := p_barber_filter; END IF;

  RETURN QUERY
  SELECT s.id, s.name, COUNT(bk.id)::INTEGER, COALESCE(SUM(bk.total_price), 0)::NUMERIC
  FROM bookings bk JOIN services s ON s.id = bk.service_id
  WHERE bk.barbershop_id = v_user_barbershop_id
    AND bk.status IN ('completed', 'confirmed')
    AND bk.deleted_at IS NULL
    AND bk.booking_date >= p_start_date AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter)
  GROUP BY s.id, s.name ORDER BY total_bookings DESC;
END;
$$;

-- Update get_barber_performance_report to include confirmed
CREATE OR REPLACE FUNCTION public.get_barber_performance_report(p_start_date DATE, p_end_date DATE)
RETURNS TABLE(barber_id UUID, barber_name TEXT, total_bookings INTEGER, total_revenue NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barbershop_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;

  SELECT bs.id INTO v_user_barbershop_id FROM barbershops bs WHERE bs.owner_id = v_user_id LIMIT 1;
  IF v_user_barbershop_id IS NULL THEN
    SELECT ur.barbershop_id INTO v_user_barbershop_id FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'attendant' LIMIT 1;
    IF v_user_barbershop_id IS NULL THEN
      IF EXISTS (SELECT 1 FROM barbers WHERE user_id = v_user_id) THEN
        RAISE EXCEPTION 'Barbeiros não podem acessar relatório de performance geral';
      ELSE RAISE EXCEPTION 'Usuário sem permissão'; END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT b.id, b.name, COUNT(bk.id)::INTEGER, COALESCE(SUM(bk.total_price), 0)::NUMERIC
  FROM barbers b
  LEFT JOIN bookings bk ON bk.barber_id = b.id
    AND bk.status IN ('completed', 'confirmed')
    AND bk.deleted_at IS NULL
    AND bk.booking_date >= p_start_date AND bk.booking_date <= p_end_date
  WHERE b.barbershop_id = v_user_barbershop_id AND b.is_active = TRUE
  GROUP BY b.id, b.name ORDER BY total_revenue DESC;
END;
$$;

-- Update get_top_clients_and_profitable_hours to include confirmed
CREATE OR REPLACE FUNCTION public.get_top_clients_and_profitable_hours(p_start_date DATE, p_end_date DATE, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(client_id UUID, client_name TEXT, total_bookings INTEGER, total_revenue NUMERIC,
              profitable_weekday INTEGER, profitable_weekday_revenue NUMERIC,
              profitable_time_slot TIME, profitable_time_slot_revenue NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;

  SELECT b.id, b.barbershop_id INTO v_user_barber_id, v_user_barbershop_id
  FROM barbers b WHERE b.user_id = v_user_id LIMIT 1;

  IF v_user_barber_id IS NULL THEN
    SELECT bs.id INTO v_user_barbershop_id FROM barbershops bs WHERE bs.owner_id = v_user_id LIMIT 1;
    IF v_user_barbershop_id IS NOT NULL THEN v_is_owner := TRUE;
    ELSE
      SELECT ur.barbershop_id INTO v_user_barbershop_id FROM user_roles ur WHERE ur.user_id = v_user_id AND ur.role = 'attendant' LIMIT 1;
      IF v_user_barbershop_id IS NOT NULL THEN v_is_owner := TRUE;
      ELSE RAISE EXCEPTION 'Usuário sem permissão'; END IF;
    END IF;
  END IF;

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
      AND bk.status IN ('completed', 'confirmed')
      AND bk.deleted_at IS NULL
      AND bk.booking_date >= p_start_date AND bk.booking_date <= p_end_date
      AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
    GROUP BY COALESCE(bk.client_id, '00000000-0000-0000-0000-000000000000'::UUID), 
             COALESCE(p.display_name, bk.client_name, 'Cliente Externo')
    ORDER BY revenue DESC LIMIT p_limit
  ),
  weekday_revenue AS (
    SELECT EXTRACT(DOW FROM bk.booking_date)::INTEGER AS weekday, SUM(bk.total_price) AS revenue
    FROM bookings bk WHERE bk.barbershop_id = v_user_barbershop_id
      AND bk.status IN ('completed', 'confirmed') AND bk.deleted_at IS NULL
      AND bk.booking_date >= p_start_date AND bk.booking_date <= p_end_date
      AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
    GROUP BY EXTRACT(DOW FROM bk.booking_date) ORDER BY revenue DESC LIMIT 1
  ),
  time_revenue AS (
    SELECT bk.booking_time AS time_slot, SUM(bk.total_price) AS revenue
    FROM bookings bk WHERE bk.barbershop_id = v_user_barbershop_id
      AND bk.status IN ('completed', 'confirmed') AND bk.deleted_at IS NULL
      AND bk.booking_date >= p_start_date AND bk.booking_date <= p_end_date
      AND (v_user_barber_id IS NULL OR bk.barber_id = v_user_barber_id)
    GROUP BY bk.booking_time ORDER BY revenue DESC LIMIT 1
  )
  SELECT cs.cid, cs.cname, cs.bookings, cs.revenue,
    COALESCE(wr.weekday, 0), COALESCE(wr.revenue, 0),
    COALESCE(tr.time_slot, '00:00'::TIME), COALESCE(tr.revenue, 0)
  FROM client_stats cs
  CROSS JOIN (SELECT * FROM weekday_revenue LIMIT 1) wr
  CROSS JOIN (SELECT * FROM time_revenue LIMIT 1) tr;
END;
$$;
