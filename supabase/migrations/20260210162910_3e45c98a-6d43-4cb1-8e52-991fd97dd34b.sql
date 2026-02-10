CREATE OR REPLACE FUNCTION public.validate_booking_advanced()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  service_duration integer;
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
  IF EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.barber_id = NEW.barber_id 
      AND b.booking_date = NEW.booking_date
      AND b.status IN ('pending', 'confirmed')
      AND b.id != COALESCE(NEW.id, gen_random_uuid())
      AND (NEW.booking_time < b.booking_end_time AND NEW.booking_end_time > b.booking_time)
  ) THEN
    RAISE EXCEPTION 'Conflito de horário detectado';
  END IF;
  
  -- Validar horário de funcionamento
  IF NOT EXISTS (
    SELECT 1 FROM barber_working_hours bwh
    WHERE bwh.barber_id = NEW.barber_id
    AND EXTRACT(DOW FROM NEW.booking_date) = bwh.day_of_week
    AND NOT bwh.is_day_off
    AND (
      (NEW.booking_time >= bwh.period1_start AND NEW.booking_end_time <= bwh.period1_end) OR
      (NEW.booking_time >= bwh.period2_start AND NEW.booking_end_time <= bwh.period2_end)
    )
  ) THEN
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