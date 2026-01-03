-- =========================================================
-- BLINDAGEM DEFINITIVA: booking_end_time controlado 100% pelo backend
-- 1) IGNORA qualquer valor enviado pelo frontend (força NULL primeiro)
-- 2) Valida service_id e duration
-- 3) Calcula booking_end_time = booking_time + duration
-- 4) Bloqueia operação se service_id inválido ou duration <= 0
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
  -- BLINDAGEM: Ignorar QUALQUER valor do frontend
  -- O backend é a ÚNICA fonte de verdade para booking_end_time
  -- ========================================
  NEW.booking_end_time := NULL;

  -- ========================================
  -- Validações obrigatórias
  -- ========================================
  IF NEW.service_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_SERVICE_ID: service_id é obrigatório para criar agendamento'
      USING ERRCODE = 'P0006';
  END IF;

  IF NEW.booking_time IS NULL THEN
    RAISE EXCEPTION 'INVALID_START_TIME: booking_time é obrigatório para criar agendamento'
      USING ERRCODE = 'P0007';
  END IF;

  -- ========================================
  -- Buscar duração do serviço
  -- ========================================
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
    RAISE EXCEPTION 'INVALID_SERVICE_DURATION: Duração do serviço inválida (% min). Duração deve ser > 0.', v_duration
      USING ERRCODE = 'P0004';
  END IF;

  -- ========================================
  -- CÁLCULO: booking_end_time = booking_time + duration
  -- Backend é 100% responsável
  -- ========================================
  NEW.booking_end_time := calculate_booking_end_time(NEW.booking_time, v_duration);

  RETURN NEW;
END;
$$;

-- =========================================================
-- Garantir que o trigger executa em INSERT e UPDATE
-- (recriar para ter certeza que está atualizado)
-- =========================================================
DROP TRIGGER IF EXISTS trg_01_booking_set_end_time ON public.bookings;

CREATE TRIGGER trg_01_booking_set_end_time
  BEFORE INSERT OR UPDATE
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_end_time();

-- =========================================================
-- Comentário de documentação
-- =========================================================
COMMENT ON FUNCTION public.set_booking_end_time() IS 
'BLINDAGEM: Ignora booking_end_time do frontend, calcula sempre com base em service.duration. 
Executa ANTES de qualquer validação de conflito (trg_02_*).
NUNCA confie no frontend para este campo.';