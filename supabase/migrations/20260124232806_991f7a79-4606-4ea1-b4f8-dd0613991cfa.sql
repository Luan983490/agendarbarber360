
-- Recriar a função get_available_slots com lógica corrigida
-- O problema identificado: a CTE interna "bookings" tinha o mesmo nome da tabela
-- Isso pode causar ambiguidade em algumas versões do PostgreSQL

DROP FUNCTION IF EXISTS public.get_available_slots(uuid, date, integer);

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_barber_id uuid, 
  p_date date, 
  p_duration integer DEFAULT 30
)
RETURNS TABLE(slot_time time without time zone, is_available boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day INTEGER;
  v_off BOOLEAN;
  v_p1s TIME;
  v_p1e TIME;
  v_p2s TIME;
  v_p2e TIME;
  v_dur INTERVAL;
  v_now TIME;
  v_is_today BOOLEAN;
BEGIN
  v_dur := (p_duration || ' minutes')::INTERVAL;
  v_day := EXTRACT(DOW FROM p_date)::INTEGER;
  v_now := CURRENT_TIME;
  v_is_today := (p_date = CURRENT_DATE);
  
  -- Primeiro, verificar se existe um schedule override para esta data
  SELECT 
    so.is_day_off, 
    so.period1_start, 
    so.period1_end, 
    so.period2_start, 
    so.period2_end
  INTO v_off, v_p1s, v_p1e, v_p2s, v_p2e
  FROM barber_schedule_overrides so
  WHERE so.barber_id = p_barber_id 
    AND so.day_of_week = v_day
    AND p_date BETWEEN so.start_date AND so.end_date
  ORDER BY so.start_date DESC
  LIMIT 1;
  
  -- Se não encontrou override, buscar horários normais
  IF NOT FOUND THEN
    SELECT wh.is_day_off, wh.period1_start, wh.period1_end, wh.period2_start, wh.period2_end
    INTO v_off, v_p1s, v_p1e, v_p2s, v_p2e
    FROM barber_working_hours wh
    WHERE wh.barber_id = p_barber_id AND wh.day_of_week = v_day;
  END IF;
  
  -- Se não encontrou horários ou é folga, retornar vazio
  IF NOT FOUND OR v_off OR (v_p1s IS NULL AND v_p2s IS NULL) THEN
    RETURN;
  END IF;
  
  -- Gerar e retornar slots
  RETURN QUERY
  WITH generated_slots AS (
    -- Período 1
    SELECT 
      s::TIME AS slot_start,
      (s + v_dur)::TIME AS slot_end
    FROM generate_series(
      (p_date + v_p1s)::TIMESTAMP,
      (p_date + v_p1e - v_dur)::TIMESTAMP,
      '15 minutes'::INTERVAL
    ) s
    WHERE v_p1s IS NOT NULL AND v_p1e IS NOT NULL
    
    UNION ALL
    
    -- Período 2
    SELECT 
      s::TIME AS slot_start,
      (s + v_dur)::TIME AS slot_end
    FROM generate_series(
      (p_date + v_p2s)::TIMESTAMP,
      (p_date + v_p2e - v_dur)::TIMESTAMP,
      '15 minutes'::INTERVAL
    ) s
    WHERE v_p2s IS NOT NULL AND v_p2e IS NOT NULL
  ),
  existing_bookings AS (
    -- Buscar bookings existentes (nome diferente da tabela para evitar ambiguidade)
    SELECT 
      b.booking_time AS bk_start, 
      COALESCE(b.booking_end_time, b.booking_time + INTERVAL '30 minutes') AS bk_end
    FROM bookings b
    WHERE b.barber_id = p_barber_id 
      AND b.booking_date = p_date 
      AND b.status NOT IN ('cancelled')
  ),
  existing_blocks AS (
    -- Buscar bloqueios do barbeiro
    SELECT bb.start_time AS bl_start, bb.end_time AS bl_end
    FROM barber_blocks bb
    WHERE bb.barber_id = p_barber_id AND bb.block_date = p_date
  )
  SELECT 
    gs.slot_start AS slot_time,
    -- Slot é disponível SE:
    -- 1. Não conflita com nenhum booking existente
    -- 2. Não conflita com nenhum bloqueio
    -- 3. Se for hoje, o horário ainda não passou
    CASE 
      WHEN v_is_today AND gs.slot_start <= v_now THEN false
      WHEN EXISTS (
        SELECT 1 FROM existing_bookings eb 
        WHERE gs.slot_start < eb.bk_end AND gs.slot_end > eb.bk_start
      ) THEN false
      WHEN EXISTS (
        SELECT 1 FROM existing_blocks ebl 
        WHERE gs.slot_start < ebl.bl_end AND gs.slot_end > ebl.bl_start
      ) THEN false
      ELSE true
    END AS is_available
  FROM generated_slots gs
  ORDER BY gs.slot_start;
END;
$function$;

-- Comentário explicativo
COMMENT ON FUNCTION public.get_available_slots IS 
'Retorna slots disponíveis para um barbeiro em uma data específica.
Considera: working_hours, schedule_overrides, bookings existentes e bloqueios.
Slots passados (se for hoje) são marcados como indisponíveis.';
