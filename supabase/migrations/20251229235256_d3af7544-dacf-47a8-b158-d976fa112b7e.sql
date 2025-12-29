-- ================================================
-- MIGRATION A: Validação de Conflitos de Agendamento
-- Resolve: Items 1 e 2 (conflitos de horário + duração)
-- ================================================

-- 1. Adicionar coluna para armazenar fim do agendamento
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_end_time TIME;

-- 2. Índice para performance em lookups de conflito
-- Cobre: barber_id + booking_date + status (filtros principais)
CREATE INDEX IF NOT EXISTS idx_bookings_conflict_lookup 
ON bookings (barber_id, booking_date, status)
WHERE status NOT IN ('cancelled');

CREATE INDEX IF NOT EXISTS idx_barber_blocks_conflict_lookup
ON barber_blocks (barber_id, block_date);

-- 3. Função helper para calcular fim do agendamento (imutável, cacheable)
CREATE OR REPLACE FUNCTION calculate_booking_end_time(
  p_start_time TIME, 
  p_duration_minutes INT
)
RETURNS TIME
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
$$;

-- 4. Função helper para advisory lock padronizado
-- Gera um lock único por barbeiro+data, liberado automaticamente no fim da transação
CREATE OR REPLACE FUNCTION acquire_booking_slot_lock(
  p_barber_id UUID,
  p_booking_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lock transacional: liberado automaticamente no COMMIT/ROLLBACK
  -- Hash único por combinação barbeiro+data
  PERFORM pg_advisory_xact_lock(
    hashtext('booking_slot:' || p_barber_id::text || ':' || p_booking_date::text)
  );
END;
$$;

COMMENT ON FUNCTION acquire_booking_slot_lock(UUID, DATE) IS
'Adquire lock exclusivo para slots de um barbeiro em uma data específica.
Previne race conditions em inserções/atualizações concorrentes.
Lock é liberado automaticamente no fim da transação.';

-- 5. Trigger para preencher booking_end_time automaticamente
CREATE OR REPLACE FUNCTION set_booking_end_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration INT;
BEGIN
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
  
  -- Calcular e definir horário de término
  NEW.booking_end_time := calculate_booking_end_time(NEW.booking_time, v_duration);
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_booking_end_time() IS
'Trigger que calcula e preenche booking_end_time baseado na duração do serviço.
Executado ANTES de INSERT/UPDATE para garantir que a coluna nunca seja NULL.';

-- Criar trigger (executar ANTES da validação de conflitos)
DROP TRIGGER IF EXISTS trg_booking_set_end_time ON bookings;
CREATE TRIGGER trg_booking_set_end_time
BEFORE INSERT OR UPDATE OF service_id, booking_time ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_booking_end_time();

-- 6. Função principal de validação de conflitos
CREATE OR REPLACE FUNCTION validate_booking_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '5s'
AS $$
DECLARE
  v_conflict_id UUID;
BEGIN
  -- Ignorar agendamentos cancelados (não ocupam slot)
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  
  -- Validação: booking_end_time deve estar preenchido
  -- (deve ter sido calculado pelo trigger trg_booking_set_end_time)
  IF NEW.booking_end_time IS NULL THEN
    RAISE EXCEPTION 'INVALID_STATE: booking_end_time não calculado. Verifique se o serviço existe.'
      USING ERRCODE = 'P0005';
  END IF;
  
  -- Adquirir lock exclusivo para este barbeiro+data
  -- Previne race conditions em inserções concorrentes
  PERFORM acquire_booking_slot_lock(NEW.barber_id, NEW.booking_date);
  
  -- Verificar conflito com outros bookings ativos
  SELECT id INTO v_conflict_id
  FROM bookings
  WHERE barber_id = NEW.barber_id
    AND booking_date = NEW.booking_date
    AND status NOT IN ('cancelled')
    AND id IS DISTINCT FROM NEW.id
    AND (
      -- Verificar sobreposição de intervalos
      -- (start1, end1) OVERLAPS (start2, end2)
      (NEW.booking_time, NEW.booking_end_time) OVERLAPS (booking_time, booking_end_time)
    )
  LIMIT 1;
  
  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'BOOKING_CONFLICT: Horário indisponível - já existe agendamento neste período'
      USING ERRCODE = 'P0001',
            HINT = 'Tente outro horário ou verifique a agenda do profissional';
  END IF;
  
  -- Verificar conflito com bloqueios do barbeiro
  SELECT id INTO v_conflict_id
  FROM barber_blocks
  WHERE barber_id = NEW.barber_id
    AND block_date = NEW.booking_date
    AND (
      (NEW.booking_time, NEW.booking_end_time) OVERLAPS (start_time, end_time)
    )
  LIMIT 1;
  
  IF v_conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'BLOCK_CONFLICT: Horário bloqueado pelo profissional'
      USING ERRCODE = 'P0002',
            HINT = 'O profissional não está disponível neste horário';
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_booking_no_conflict() IS
'Valida que não há sobreposição de horários entre agendamentos e bloqueios.
Usa advisory lock via acquire_booking_slot_lock() para prevenir race conditions.
Códigos de erro:
  P0001 = Conflito com outro agendamento
  P0002 = Conflito com bloqueio do barbeiro
  P0005 = Estado inválido (booking_end_time NULL)';

-- Criar trigger de validação (executar DEPOIS do cálculo de end_time)
DROP TRIGGER IF EXISTS trg_booking_conflict_check ON bookings;
CREATE TRIGGER trg_booking_conflict_check
BEFORE INSERT OR UPDATE OF barber_id, booking_date, booking_time, service_id, status ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_booking_no_conflict();

-- 7. Preencher booking_end_time para dados existentes
-- Usa subquery para buscar duração de cada serviço
UPDATE bookings b
SET booking_end_time = calculate_booking_end_time(
  b.booking_time, 
  s.duration
)
FROM services s
WHERE b.service_id = s.id
  AND b.booking_end_time IS NULL;

-- 8. Adicionar constraint NOT NULL após preencher dados existentes
-- NOTA: Comentado por segurança - habilitar após confirmar que todos os dados foram migrados
-- ALTER TABLE bookings ALTER COLUMN booking_end_time SET NOT NULL;

-- 9. Documentação da coluna
COMMENT ON COLUMN bookings.booking_end_time IS
'Horário de término do agendamento. Calculado automaticamente pelo trigger trg_booking_set_end_time
baseado em booking_time + services.duration. Usado para validação de conflitos.';