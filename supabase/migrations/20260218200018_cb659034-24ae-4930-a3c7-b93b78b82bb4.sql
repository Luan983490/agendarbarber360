
-- Fix get_bookings_report: count ALL bookings (not just completed), exclude soft-deleted
CREATE OR REPLACE FUNCTION public.get_bookings_report(p_start_date date, p_end_date date, p_barber_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(booking_date date, total_bookings integer)
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
    bk.booking_date,
    COUNT(bk.id)::INTEGER AS total_bookings
  FROM bookings bk
  WHERE bk.barbershop_id = v_user_barbershop_id
    AND bk.deleted_at IS NULL
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter)
  GROUP BY bk.booking_date
  ORDER BY bk.booking_date;
END;
$function$;

-- Fix get_revenue_report: add deleted_at filter, include booking_services + booking_products for real revenue
CREATE OR REPLACE FUNCTION public.get_revenue_report(p_start_date date, p_end_date date, p_barber_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_revenue numeric, total_bookings integer, average_ticket numeric)
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
    AND bk.status = 'completed'
    AND bk.deleted_at IS NULL
    AND bk.booking_date >= p_start_date
    AND bk.booking_date <= p_end_date
    AND (v_effective_barber_filter IS NULL OR bk.barber_id = v_effective_barber_filter);
END;
$function$;

-- Fix get_cancellation_noshow_report: add deleted_at filter
CREATE OR REPLACE FUNCTION public.get_cancellation_noshow_report(p_start_date date, p_end_date date, p_barber_filter uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_bookings integer, completed_bookings integer, cancelled_bookings integer, noshow_bookings integer, cancellation_rate numeric, noshow_rate numeric)
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
    AND deleted_at IS NULL
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
$function$;
