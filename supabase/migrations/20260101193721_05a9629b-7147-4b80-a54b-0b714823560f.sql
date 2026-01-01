-- =========================================================
-- FIX DEFINITIVO: booking_end_time sempre calculado no BACKEND
-- 1) Reforça validações no trigger function set_booking_end_time
-- 2) Garante execução do cálculo em TODO UPDATE (não só quando booking_time/service_id mudam)
--    => evita qualquer cenário de UPDATE disparar validações com booking_end_time NULL
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_booking_end_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_duration INT;
BEGIN
  -- ========================================
  -- Validações obrigatórias
  -- ========================================
  IF NEW.service_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SERVICE_ID: service_id é obrigatório'
      USING ERRCODE = 'P0006';
  END IF;

  IF NEW.booking_time IS NULL THEN
    RAISE EXCEPTION 'INVALID_START_TIME: booking_time é obrigatório'
      USING ERRCODE = 'P0007';
  END IF;

  -- Buscar duração do serviço
  SELECT duration INTO v_duration
  FROM services
  WHERE id = NEW.service_id;

  -- Validação: serviço deve existir
  IF v_duration IS NULL THEN
    RAISE EXCEPTION 'INVALID_SERVICE: Serviço não encontrado (id: %)', NEW.service_id
      USING ERRCODE = 'P0003';
  END IF;

  -- Validação: duração deve ser positiva
  IF v_duration <= 0 THEN
    RAISE EXCEPTION 'INVALID_DURATION: Duração do serviço inválida (% min)', v_duration
      USING ERRCODE = 'P0004';
  END IF;

  -- Calcular e definir horário de término (backend é a fonte da verdade)
  NEW.booking_end_time := calculate_booking_end_time(NEW.booking_time, v_duration);

  RETURN NEW;
END;
$$;

-- =========================================================
-- Recriar trigger de cálculo para rodar em TODO UPDATE
-- (mantém o nome com prefixo 01 para garantir ordem alfabética)
-- =========================================================

DROP TRIGGER IF EXISTS trg_01_booking_set_end_time ON public.bookings;

CREATE TRIGGER trg_01_booking_set_end_time
  BEFORE INSERT OR UPDATE
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_end_time();

-- Obs: trg_02_booking_conflict_check permanece o mesmo e continuará executando depois
-- por ordem alfabética, usando booking_end_time já calculado.
