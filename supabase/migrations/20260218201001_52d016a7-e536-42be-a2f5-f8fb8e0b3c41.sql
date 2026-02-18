
-- Fix get_monthly_comparison_report: add deleted_at filter
CREATE OR REPLACE FUNCTION public.get_monthly_comparison_report(p_current_start_date date, p_current_end_date date, p_previous_start_date date, p_previous_end_date date, p_barber_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(current_revenue numeric, current_bookings integer, current_avg_ticket numeric, previous_revenue numeric, previous_bookings integer, previous_avg_ticket numeric, revenue_variation numeric, bookings_variation numeric, avg_ticket_variation numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
      v_is_owner := TRUE;
    END IF;
  END IF;

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
    AND deleted_at IS NULL
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
    AND deleted_at IS NULL
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
$function$;

-- Fix get_top_services_report: add deleted_at filter
CREATE OR REPLACE FUNCTION public.get_top_services_report(p_start_date date, p_end_date date, p_barber_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(service_id uuid, service_name text, total_bookings integer, total_revenue numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_barber_id UUID;
  v_user_barbershop_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_admin_or_attendant BOOLEAN := FALSE;
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
      
      IF v_user_barbershop_id IS NOT NULL THEN
        v_is_admin_or_attendant := TRUE;
      ELSE
        RAISE EXCEPTION 'Usuário sem permissão para acessar relatórios';
      END IF;
    END IF;
  END IF;

  IF v_user_barber_id IS NOT NULL THEN
    v_effective_barber_filter := v_user_barber_id;
  ELSIF v_is_owner OR v_is_admin_or_attendant THEN
    v_effective_barber_filter := p_barber_filter;
  END IF;

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
    AND bk.deleted_at IS NULL
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter)
  GROUP BY s.id, s.name
  ORDER BY total_bookings DESC;
END;
$function$;
