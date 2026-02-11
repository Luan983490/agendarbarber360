CREATE OR REPLACE FUNCTION public.validate_booking_advanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_duration integer;
  v_is_valid boolean := false;
BEGIN
  -- Buscar duração do serviço
  SELECT s.duration INTO service_duration 
  FROM services s
  WHERE s.id = NEW.service_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inválido';
  END IF;
  
  -- Calcular horário de fim
  NEW.booking_end_time := NEW.booking_time + (service_duration || ' minutes')::interval;
  
  -- Verificar conflitos (qualificar colunas com alias para evitar ambiguidade)
  IF NEW.barber_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.barber_id = NEW.barber_id 
      AND b.booking_date = NEW.booking_date
      AND b.status IN ('pending', 'confirmed')
      AND b.deleted_at IS NULL
      AND b.id != COALESCE(NEW.id, gen_random_uuid())
      AND (NEW.booking_time < b.booking_end_time AND NEW.booking_end_time > b.booking_time)
  ) THEN
    RAISE EXCEPTION 'Conflito de horário detectado';
  END IF;
  
  -- Se não tem barbeiro, pular validação de horário de funcionamento
  IF NEW.barber_id IS NULL THEN
    -- Validações básicas
    IF NEW.booking_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Data deve ser futura';
    END IF;
    IF NEW.total_price < 0 THEN
      RAISE EXCEPTION 'Preço inválido';
    END IF;
    RETURN NEW;
  END IF;
  
  -- 1) Primeiro verificar se existe um override para esta data/dia
  SELECT EXISTS (
    SELECT 1 FROM barber_schedule_overrides bso
    WHERE bso.barber_id = NEW.barber_id
    AND NEW.booking_date >= bso.start_date
    AND NEW.booking_date <= bso.end_date
    AND EXTRACT(DOW FROM NEW.booking_date) = bso.day_of_week
    AND NOT bso.is_day_off
    AND (
      (NEW.booking_time >= bso.period1_start AND NEW.booking_end_time <= bso.period1_end) OR
      (bso.period2_start IS NOT NULL AND NEW.booking_time >= bso.period2_start AND NEW.booking_end_time <= bso.period2_end)
    )
  ) INTO v_is_valid;
  
  -- Se não encontrou override válido, verificar se existe override de folga
  IF NOT v_is_valid THEN
    IF EXISTS (
      SELECT 1 FROM barber_schedule_overrides bso
      WHERE bso.barber_id = NEW.barber_id
      AND NEW.booking_date >= bso.start_date
      AND NEW.booking_date <= bso.end_date
      AND EXTRACT(DOW FROM NEW.booking_date) = bso.day_of_week
      AND bso.is_day_off
    ) THEN
      RAISE EXCEPTION 'Fora do horário de funcionamento';
    END IF;
    
    -- Se não há override algum, verificar horário regular
    IF NOT EXISTS (
      SELECT 1 FROM barber_schedule_overrides bso
      WHERE bso.barber_id = NEW.barber_id
      AND NEW.booking_date >= bso.start_date
      AND NEW.booking_date <= bso.end_date
      AND EXTRACT(DOW FROM NEW.booking_date) = bso.day_of_week
    ) THEN
      -- Usar barber_working_hours como fallback
      SELECT EXISTS (
        SELECT 1 FROM barber_working_hours bwh
        WHERE bwh.barber_id = NEW.barber_id
        AND EXTRACT(DOW FROM NEW.booking_date) = bwh.day_of_week
        AND NOT bwh.is_day_off
        AND (
          (NEW.booking_time >= bwh.period1_start AND NEW.booking_end_time <= bwh.period1_end) OR
          (bwh.period2_start IS NOT NULL AND NEW.booking_time >= bwh.period2_start AND NEW.booking_end_time <= bwh.period2_end)
        )
      ) INTO v_is_valid;
    END IF;
  END IF;
  
  IF NOT v_is_valid THEN
    RAISE EXCEPTION 'Fora do horário de funcionamento';
  END IF;
  
  -- Validações básicas
  IF NEW.booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Data deve ser futura';
  END IF;
  
  IF NEW.total_price < 0 THEN
    RAISE EXCEPTION 'Preço inválido';
  END IF;
  
  RETURN NEW;
END;
$$;