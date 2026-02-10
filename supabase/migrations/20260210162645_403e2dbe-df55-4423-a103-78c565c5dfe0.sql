CREATE OR REPLACE FUNCTION public.validate_booking_advanced()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  service_duration integer;
  booking_end_time time;
  conflict_count integer;
BEGIN
  -- Buscar duração do serviço
  SELECT duration INTO service_duration 
  FROM services 
  WHERE id = NEW.service_id;
  
  IF service_duration IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inválido';
  END IF;
  
  -- Calcular horário de fim
  NEW.booking_end_time := NEW.booking_time + (service_duration || ' minutes')::interval;
  
  -- Verificar conflitos (usar gen_random_uuid em vez de uuid_generate_v4)
  SELECT COUNT(*) INTO conflict_count
  FROM bookings 
  WHERE barber_id = NEW.barber_id 
    AND booking_date = NEW.booking_date
    AND status IN ('pending', 'confirmed')
    AND id != COALESCE(NEW.id, gen_random_uuid())
    AND (
      (NEW.booking_time < booking_end_time AND NEW.booking_end_time > booking_time)
    );
  
  IF conflict_count > 0 THEN
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