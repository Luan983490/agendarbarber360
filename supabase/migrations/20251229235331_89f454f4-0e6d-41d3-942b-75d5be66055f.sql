-- ================================================
-- FIX: Adicionar search_path às funções helper
-- ================================================

-- Corrigir calculate_booking_end_time
CREATE OR REPLACE FUNCTION calculate_booking_end_time(
  p_start_time TIME, 
  p_duration_minutes INT
)
RETURNS TIME
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
$$;

-- Corrigir acquire_booking_slot_lock
CREATE OR REPLACE FUNCTION acquire_booking_slot_lock(
  p_barber_id UUID,
  p_booking_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('booking_slot:' || p_barber_id::text || ':' || p_booking_date::text)
  );
END;
$$;

COMMENT ON FUNCTION acquire_booking_slot_lock(UUID, DATE) IS
'Adquire lock exclusivo para slots de um barbeiro em uma data específica.
Previne race conditions em inserções/atualizações concorrentes.
Lock é liberado automaticamente no fim da transação.';