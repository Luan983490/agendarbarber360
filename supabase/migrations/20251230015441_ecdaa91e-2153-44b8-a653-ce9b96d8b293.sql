-- ================================================
-- MÁQUINA DE ESTADOS PARA BOOKINGS - VERSÃO CORRIGIDA
-- Fase de Qualidade e Robustez
-- ================================================

-- ================================================
-- 1. REMOVER TRIGGER ANTERIOR (se existir)
-- ================================================
DROP TRIGGER IF EXISTS trg_validate_booking_status ON bookings;
DROP FUNCTION IF EXISTS validate_booking_status_transition();

-- ================================================
-- 2. FUNÇÃO DE VALIDAÇÃO DE STATUS (INSERT + UPDATE)
-- ================================================

CREATE OR REPLACE FUNCTION validate_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_transition BOOLEAN := FALSE;
  v_allowed_statuses TEXT[] := ARRAY['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
BEGIN
  
  -- ========================================
  -- REGRAS PARA INSERT
  -- ========================================
  IF TG_OP = 'INSERT' THEN
    -- Se status for NULL, definir como 'pending'
    IF NEW.status IS NULL THEN
      NEW.status := 'pending';
      RETURN NEW;
    END IF;
    
    -- Validar que o status é um valor permitido
    IF NOT (NEW.status = ANY(v_allowed_statuses)) THEN
      RAISE EXCEPTION 'INVALID_STATUS: Status "%" is not valid. Allowed values: pending, confirmed, completed, cancelled, no_show', NEW.status
        USING ERRCODE = 'P0010';
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- ========================================
  -- REGRAS PARA UPDATE
  -- ========================================
  IF TG_OP = 'UPDATE' THEN
    -- Se status não mudou, permite a operação
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;
    
    -- Validar que o novo status é um valor permitido
    IF NOT (NEW.status = ANY(v_allowed_statuses)) THEN
      RAISE EXCEPTION 'INVALID_STATUS: Status "%" is not valid. Allowed values: pending, confirmed, completed, cancelled, no_show', NEW.status
        USING ERRCODE = 'P0010';
    END IF;
    
    -- ========================================
    -- VALIDAR TRANSIÇÕES PERMITIDAS
    -- ========================================
    CASE OLD.status
      -- NULL só pode ir para pending
      WHEN NULL THEN
        v_valid_transition := NEW.status = 'pending';
        
      -- pending → confirmed, cancelled
      WHEN 'pending' THEN
        v_valid_transition := NEW.status IN ('confirmed', 'cancelled');
        
      -- confirmed → completed, cancelled, no_show
      WHEN 'confirmed' THEN
        v_valid_transition := NEW.status IN ('completed', 'cancelled', 'no_show');
        
      -- completed = FINAL STATE (no transitions allowed)
      WHEN 'completed' THEN
        v_valid_transition := FALSE;
        
      -- cancelled = FINAL STATE (no transitions allowed)
      WHEN 'cancelled' THEN
        v_valid_transition := FALSE;
        
      -- no_show = FINAL STATE (no transitions allowed)
      WHEN 'no_show' THEN
        v_valid_transition := FALSE;
        
      -- Unknown status (legacy data) - BLOCK all transitions
      ELSE
        v_valid_transition := FALSE;
    END CASE;
    
    -- Bloquear transição inválida
    IF NOT v_valid_transition THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Transition from "%" to "%" is not allowed. Valid transitions: NULL→pending, pending→confirmed/cancelled, confirmed→completed/cancelled/no_show', 
        COALESCE(OLD.status, 'NULL'), NEW.status
        USING ERRCODE = 'P0011',
              HINT = 'Check the correct flow: pending → confirmed → completed/cancelled/no_show';
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ================================================
-- 3. TRIGGER BEFORE INSERT OR UPDATE
-- ================================================

CREATE TRIGGER trg_validate_booking_status
  BEFORE INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status();

-- ================================================
-- 4. DOCUMENTAÇÃO COMPLETA
-- ================================================

-- Documentação da coluna status
COMMENT ON COLUMN bookings.status IS
'Booking status - State machine controlled by trigger.

ALLOWED VALUES (English only - frontend handles translation):
  - pending: Booking awaiting confirmation
  - confirmed: Booking confirmed by barbershop
  - completed: Service successfully delivered
  - cancelled: Booking was cancelled
  - no_show: Client did not show up

VALID TRANSITIONS:
  NULL      → pending (auto-set on INSERT if NULL)
  pending   → confirmed, cancelled
  confirmed → completed, cancelled, no_show
  completed → (final state - no transitions)
  cancelled → (final state - no transitions)
  no_show   → (final state - no transitions)

DEFAULT: pending (enforced by trigger if NULL on INSERT)';

-- Documentação da função
COMMENT ON FUNCTION validate_booking_status() IS
'State Machine for Bookings - Validates status on INSERT and UPDATE.

PURPOSE:
  Ensures data integrity by enforcing valid status values and transitions.

BEHAVIOR ON INSERT:
  - NULL status → automatically set to "pending"
  - Invalid status → blocked with error P0010

BEHAVIOR ON UPDATE:
  - Same status → allowed (no-op)
  - Invalid status value → blocked with error P0010
  - Invalid transition → blocked with error P0011

ALLOWED STATUSES:
  pending, confirmed, completed, cancelled, no_show

VALID TRANSITIONS:
  NULL      → pending
  pending   → confirmed, cancelled
  confirmed → completed, cancelled, no_show
  completed → (blocked)
  cancelled → (blocked)
  no_show   → (blocked)
  unknown   → (blocked)

ERROR CODES:
  P0010 - Invalid status value
  P0011 - Invalid status transition

SECURITY:
  SECURITY DEFINER with search_path = public

Created: 2024-12-30
Phase: Quality and Robustness';

-- Documentação do trigger
COMMENT ON TRIGGER trg_validate_booking_status ON bookings IS
'Validates booking status on INSERT and UPDATE.
Enforces state machine rules defined in validate_booking_status().
Fires before INSERT or UPDATE OF status column only.';