-- ================================================
-- MÁQUINA DE ESTADOS PARA BOOKINGS
-- Fase de Qualidade e Robustez
-- ================================================

-- ================================================
-- 1. FUNÇÃO DE VALIDAÇÃO DE TRANSIÇÃO DE STATUS
-- ================================================

CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_transition BOOLEAN := FALSE;
  v_allowed_statuses TEXT[] := ARRAY['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
BEGIN
  -- Se status não mudou, permite a operação
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Validar que o novo status é um valor permitido
  IF NOT (NEW.status = ANY(v_allowed_statuses)) THEN
    RAISE EXCEPTION 'INVALID_STATUS: Status "%" não é válido. Valores permitidos: pending, confirmed, completed, cancelled, no_show', NEW.status
      USING ERRCODE = 'P0010';
  END IF;
  
  -- Validar transições permitidas
  CASE OLD.status
    -- De PENDING pode ir para: confirmed, cancelled
    WHEN 'pending' THEN
      v_valid_transition := NEW.status IN ('confirmed', 'cancelled');
      
    -- De CONFIRMED pode ir para: completed, cancelled, no_show
    WHEN 'confirmed' THEN
      v_valid_transition := NEW.status IN ('completed', 'cancelled', 'no_show');
      
    -- COMPLETED é estado final - não permite transição
    WHEN 'completed' THEN
      v_valid_transition := FALSE;
      
    -- CANCELLED é estado final - não permite transição
    WHEN 'cancelled' THEN
      v_valid_transition := FALSE;
      
    -- NO_SHOW é estado final - não permite transição
    WHEN 'no_show' THEN
      v_valid_transition := FALSE;
      
    -- Status desconhecido (dados legados)
    ELSE
      -- Permite transição para qualquer status válido se o status atual é NULL ou desconhecido
      -- Isso garante compatibilidade com dados existentes
      v_valid_transition := TRUE;
  END CASE;
  
  -- Bloquear transição inválida
  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Transição de "%" para "%" não é permitida. Transições válidas: pending→confirmed/cancelled, confirmed→completed/cancelled/no_show', 
      OLD.status, NEW.status
      USING ERRCODE = 'P0011',
            HINT = 'Verifique o fluxo correto: pending → confirmed → completed/cancelled/no_show';
  END IF;
  
  RETURN NEW;
END;
$$;

-- ================================================
-- 2. TRIGGER BEFORE UPDATE
-- ================================================

-- Remove trigger se existir (idempotente)
DROP TRIGGER IF EXISTS trg_validate_booking_status ON bookings;

-- Criar trigger
CREATE TRIGGER trg_validate_booking_status
  BEFORE UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();

-- ================================================
-- 3. DOCUMENTAÇÃO COM COMMENTS
-- ================================================

COMMENT ON FUNCTION validate_booking_status_transition() IS
'Máquina de Estados para Bookings - Valida transições de status.

ESTADOS PERMITIDOS:
  - pending: Agendamento aguardando confirmação
  - confirmed: Agendamento confirmado
  - completed: Atendimento realizado com sucesso
  - cancelled: Agendamento cancelado
  - no_show: Cliente não compareceu

TRANSIÇÕES VÁLIDAS:
  pending   → confirmed, cancelled
  confirmed → completed, cancelled, no_show
  completed → (estado final)
  cancelled → (estado final)
  no_show   → (estado final)

CÓDIGOS DE ERRO:
  P0010 - Status inválido (valor não permitido)
  P0011 - Transição inválida (fluxo não permitido)

COMPATIBILIDADE:
  - Status NULL ou desconhecido permite transição para qualquer estado válido
  - Dados existentes não são afetados

Criado em: 2024-12-30
Fase: Qualidade e Robustez';

COMMENT ON TRIGGER trg_validate_booking_status ON bookings IS
'Trigger que valida transições de status antes de UPDATE.
Dispara apenas quando a coluna status é modificada.
Bloqueia transições inválidas com erro explícito.';