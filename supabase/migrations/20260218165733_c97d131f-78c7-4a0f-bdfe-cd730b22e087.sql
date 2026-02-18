
CREATE OR REPLACE FUNCTION public.validate_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
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
    IF NEW.status IS NULL THEN
      NEW.status := 'pending';
      RETURN NEW;
    END IF;
    
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
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;
    
    IF NOT (NEW.status = ANY(v_allowed_statuses)) THEN
      RAISE EXCEPTION 'INVALID_STATUS: Status "%" is not valid. Allowed values: pending, confirmed, completed, cancelled, no_show', NEW.status
        USING ERRCODE = 'P0010';
    END IF;
    
    CASE OLD.status
      WHEN 'pending' THEN
        v_valid_transition := NEW.status IN ('confirmed', 'cancelled', 'no_show');
        
      WHEN 'confirmed' THEN
        v_valid_transition := NEW.status IN ('completed', 'cancelled', 'no_show');
        
      WHEN 'completed' THEN
        v_valid_transition := FALSE;
        
      WHEN 'cancelled' THEN
        v_valid_transition := FALSE;
        
      WHEN 'no_show' THEN
        v_valid_transition := FALSE;
        
      ELSE
        v_valid_transition := FALSE;
    END CASE;
    
    IF NOT v_valid_transition THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Transition from "%" to "%" is not allowed. Valid transitions: NULL→pending, pending→confirmed/cancelled/no_show, confirmed→completed/cancelled/no_show', 
        COALESCE(OLD.status, 'NULL'), NEW.status
        USING ERRCODE = 'P0011',
              HINT = 'Check the correct flow: pending → confirmed/no_show → completed/cancelled/no_show';
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;
