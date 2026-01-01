-- =========================================================
-- FIX: Garantir ordem correta de execução dos triggers
-- O trigger que calcula booking_end_time DEVE executar ANTES 
-- do trigger que valida conflitos
-- PostgreSQL executa triggers BEFORE em ordem alfabética
-- =========================================================

-- 1. Remover triggers existentes
DROP TRIGGER IF EXISTS trg_booking_set_end_time ON public.bookings;
DROP TRIGGER IF EXISTS trg_booking_conflict_check ON public.bookings;

-- 2. Recriar triggers com nomes que garantam ordem correta
-- "01_" garante que set_end_time execute primeiro (alfabeticamente)
-- "02_" garante que conflict_check execute depois

-- Trigger 01: Calcular booking_end_time (DEVE executar PRIMEIRO)
CREATE TRIGGER trg_01_booking_set_end_time
  BEFORE INSERT OR UPDATE OF service_id, booking_time
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_end_time();

-- Trigger 02: Validar conflitos (DEVE executar DEPOIS que end_time foi calculado)
CREATE TRIGGER trg_02_booking_conflict_check
  BEFORE INSERT OR UPDATE OF barber_id, booking_date, booking_time, service_id, status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_no_conflict();

-- =========================================================
-- COMENTÁRIO: 
-- Agora a ordem de execução é garantida:
-- 1) trg_01_booking_set_end_time - calcula booking_end_time
-- 2) trg_02_booking_conflict_check - valida conflitos usando booking_end_time
-- =========================================================