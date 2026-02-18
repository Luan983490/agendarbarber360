
-- 1) Drop e recriar CHECK constraint para incluir no_show
ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show'));

-- 2) Atualizar validate_booking_advanced para pular validações quando é apenas mudança de status
CREATE OR REPLACE FUNCTION public.validate_booking_advanced()
RETURNS TRIGGER AS $$
DECLARE
  service_duration integer;
  v_is_valid boolean := false;
BEGIN
  -- Se é UPDATE e só mudou o status, pular todas as validações
  IF TG_OP = 'UPDATE' AND 
     OLD.booking_date = NEW.booking_date AND 
     OLD.booking_time = NEW.booking_time AND 
     OLD.service_id = NEW.service_id AND 
     OLD.barber_id IS NOT DISTINCT FROM NEW.barber_id AND
     OLD.status IS DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Buscar duração do serviço
  SELECT s.duration INTO service_duration 
  FROM services s
  WHERE s.id = NEW.service_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inválido';
  END IF;
  
  -- Calcular horário de fim
  NEW.booking_end_time := NEW.booking_time + (service_duration || ' minutes')::interval;
  
  -- Verificar conflitos
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
    IF TG_OP = 'INSERT' AND NEW.booking_date < CURRENT_DATE THEN
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
    
    IF NOT EXISTS (
      SELECT 1 FROM barber_schedule_overrides bso
      WHERE bso.barber_id = NEW.barber_id
      AND NEW.booking_date >= bso.start_date
      AND NEW.booking_date <= bso.end_date
      AND EXTRACT(DOW FROM NEW.booking_date) = bso.day_of_week
    ) THEN
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
  
  -- Validações básicas apenas para INSERT
  IF TG_OP = 'INSERT' AND NEW.booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Data deve ser futura';
  END IF;
  
  IF NEW.total_price < 0 THEN
    RAISE EXCEPTION 'Preço inválido';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3) Atualizar validate_booking_status para impedir no_show antes do horário do agendamento
CREATE OR REPLACE FUNCTION public.validate_booking_status()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_transition boolean := false;
BEGIN
  -- Permitir INSERT sem validação de transição
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Se status não mudou, permitir
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validar transições
  CASE OLD.status
    WHEN 'pending' THEN
      v_valid_transition := NEW.status IN ('confirmed', 'cancelled', 'no_show');
    WHEN 'confirmed' THEN
      v_valid_transition := NEW.status IN ('completed', 'cancelled', 'no_show');
    WHEN 'completed' THEN
      v_valid_transition := false;
    WHEN 'cancelled' THEN
      v_valid_transition := false;
    WHEN 'no_show' THEN
      v_valid_transition := false;
    ELSE
      v_valid_transition := (NEW.status = 'pending');
  END CASE;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Transition from "%" to "%" is not allowed.', OLD.status, NEW.status;
  END IF;

  -- no_show só pode ser marcado após o horário do agendamento
  IF NEW.status = 'no_show' THEN
    IF (NEW.booking_date > CURRENT_DATE) OR 
       (NEW.booking_date = CURRENT_DATE AND NEW.booking_time > CURRENT_TIME) THEN
      RAISE EXCEPTION 'Ausência só pode ser registrada após o horário do agendamento';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
