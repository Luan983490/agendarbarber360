
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS NULL AND NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'confirmed' AND NEW.status IN ('completed', 'cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Transition from "%" to "%" is not allowed. Valid transitions: NULL→pending, pending→confirmed/cancelled/no_show, confirmed→completed/cancelled/no_show',
    OLD.status, NEW.status
    USING ERRCODE = 'P0001';
END;
$$;
