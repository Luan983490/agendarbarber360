-- ============================================================================
-- FUNÇÃO: get_available_slots
-- Retorna horários disponíveis para um barbeiro em uma data específica,
-- considerando horários de trabalho, bloqueios e agendamentos existentes.
-- Usa OVERLAPS do PostgreSQL para detecção precisa de conflitos.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_barber_id UUID,
  p_date DATE,
  p_duration INTEGER DEFAULT 30
)
RETURNS TABLE (
  slot_time TIME,
  slot_end_time TIME,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_day_off BOOLEAN;
  v_period1_start TIME;
  v_period1_end TIME;
  v_period2_start TIME;
  v_period2_end TIME;
  v_using_override BOOLEAN := FALSE;
  v_slot_interval INTERVAL := '15 minutes'::INTERVAL;
  v_duration_interval INTERVAL;
  v_current_slot TIME;
  v_slot_end TIME;
  v_barbershop_id UUID;
BEGIN
  -- Converter duração para interval
  v_duration_interval := (p_duration || ' minutes')::INTERVAL;
  
  -- Obter dia da semana (0=Domingo, 6=Sábado)
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  
  -- Obter barbershop_id do barbeiro
  SELECT barbershop_id INTO v_barbershop_id
  FROM barbers
  WHERE id = p_barber_id;
  
  IF v_barbershop_id IS NULL THEN
    RETURN; -- Barbeiro não encontrado
  END IF;
  
  -- ========== PASSO 1: VERIFICAR SCHEDULE OVERRIDE (PRIORIDADE) ==========
  SELECT 
    is_day_off,
    period1_start,
    period1_end,
    period2_start,
    period2_end,
    TRUE
  INTO 
    v_is_day_off,
    v_period1_start,
    v_period1_end,
    v_period2_start,
    v_period2_end,
    v_using_override
  FROM barber_schedule_overrides
  WHERE barber_id = p_barber_id
    AND day_of_week = v_day_of_week
    AND p_date BETWEEN start_date AND end_date
  LIMIT 1;
  
  -- ========== PASSO 2: SE NÃO HÁ OVERRIDE, USAR WORKING_HOURS ==========
  IF NOT v_using_override THEN
    SELECT 
      is_day_off,
      period1_start,
      period1_end,
      period2_start,
      period2_end
    INTO 
      v_is_day_off,
      v_period1_start,
      v_period1_end,
      v_period2_start,
      v_period2_end
    FROM barber_working_hours
    WHERE barber_id = p_barber_id
      AND day_of_week = v_day_of_week
    LIMIT 1;
  END IF;
  
  -- Se não encontrou horários ou é dia de folga, retorna vazio
  IF v_is_day_off IS NULL OR v_is_day_off = TRUE THEN
    RETURN;
  END IF;
  
  -- Se não há períodos definidos, retorna vazio
  IF v_period1_start IS NULL AND v_period2_start IS NULL THEN
    RETURN;
  END IF;
  
  -- ========== PASSO 3: GERAR SLOTS E VERIFICAR DISPONIBILIDADE ==========
  -- Usar CTE para gerar slots e verificar conflitos de uma vez
  
  RETURN QUERY
  WITH 
  -- Gerar todos os slots possíveis dos períodos de trabalho
  all_slots AS (
    -- Período 1
    SELECT generate_series(
      v_period1_start,
      v_period1_end - v_duration_interval,
      v_slot_interval
    ) AS slot_start
    WHERE v_period1_start IS NOT NULL AND v_period1_end IS NOT NULL
    
    UNION
    
    -- Período 2
    SELECT generate_series(
      v_period2_start,
      v_period2_end - v_duration_interval,
      v_slot_interval
    ) AS slot_start
    WHERE v_period2_start IS NOT NULL AND v_period2_end IS NOT NULL
  ),
  
  -- Calcular fim de cada slot baseado na duração do serviço
  slots_with_end AS (
    SELECT 
      slot_start,
      (slot_start + v_duration_interval)::TIME AS slot_end
    FROM all_slots
  ),
  
  -- Buscar agendamentos existentes (exceto cancelados)
  existing_bookings AS (
    SELECT 
      booking_time,
      COALESCE(booking_end_time, booking_time + '30 minutes'::INTERVAL) AS booking_end
    FROM bookings
    WHERE barbershop_id = v_barbershop_id
      AND barber_id = p_barber_id
      AND booking_date = p_date
      AND status != 'cancelled'
  ),
  
  -- Buscar bloqueios do dia
  existing_blocks AS (
    SELECT 
      start_time,
      end_time
    FROM barber_blocks
    WHERE barber_id = p_barber_id
      AND block_date = p_date
  ),
  
  -- Verificar conflitos para cada slot
  slots_with_conflicts AS (
    SELECT 
      s.slot_start,
      s.slot_end,
      -- Verificar conflito com bookings usando OVERLAPS
      EXISTS (
        SELECT 1 FROM existing_bookings b
        WHERE (s.slot_start, s.slot_end) OVERLAPS (b.booking_time, b.booking_end)
      ) AS has_booking_conflict,
      -- Verificar conflito com bloqueios usando OVERLAPS
      EXISTS (
        SELECT 1 FROM existing_blocks bl
        WHERE (s.slot_start, s.slot_end) OVERLAPS (bl.start_time, bl.end_time)
      ) AS has_block_conflict,
      -- Verificar se slot está dentro do período de trabalho
      (
        (v_period1_start IS NOT NULL AND s.slot_start >= v_period1_start AND s.slot_end <= v_period1_end)
        OR
        (v_period2_start IS NOT NULL AND s.slot_start >= v_period2_start AND s.slot_end <= v_period2_end)
      ) AS is_in_working_period
    FROM slots_with_end s
  ),
  
  -- Filtrar apenas horários que ainda não passaram (se for hoje)
  final_slots AS (
    SELECT 
      sc.slot_start,
      sc.slot_end,
      CASE 
        -- Se for hoje, verificar se o horário já passou (com margem de 5 minutos)
        WHEN p_date = CURRENT_DATE AND sc.slot_start <= (CURRENT_TIME + '5 minutes'::INTERVAL) THEN FALSE
        -- Se tem conflito com booking ou block, não está disponível
        WHEN sc.has_booking_conflict OR sc.has_block_conflict THEN FALSE
        -- Se não está no período de trabalho, não está disponível
        WHEN NOT sc.is_in_working_period THEN FALSE
        ELSE TRUE
      END AS available
    FROM slots_with_conflicts sc
  )
  
  -- Retornar slots ordenados
  SELECT 
    f.slot_start,
    f.slot_end,
    f.available
  FROM final_slots f
  ORDER BY f.slot_start;
  
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_available_slots IS 
'Retorna horários disponíveis para agendamento.
Parâmetros:
  - p_barber_id: UUID do barbeiro
  - p_date: Data para verificar disponibilidade
  - p_duration: Duração do serviço em minutos (default: 30)
  
A função considera:
  - Horários de trabalho (period1 e period2)
  - Schedule overrides (têm prioridade sobre working_hours)
  - Agendamentos existentes (exceto cancelados)
  - Bloqueios manuais (barber_blocks)
  - Usa OVERLAPS do PostgreSQL para detecção precisa de conflitos';