
CREATE OR REPLACE FUNCTION public.restrict_client_status_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_is_client BOOLEAN;
  v_is_staff BOOLEAN;
BEGIN
  -- Se status não mudou, permite
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Verificar se é o cliente do booking
  v_is_client := (NEW.client_id = auth.uid());
  
  -- Verificar se é staff (owner, barber, attendant)
  v_is_staff := (
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE id = NEW.barbershop_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM barbers 
      WHERE id = NEW.barber_id AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
        AND barbershop_id = NEW.barbershop_id 
        AND role = 'attendant'
    )
  );

  -- Se for cliente (e não staff), restringir ações
  IF v_is_client AND NOT v_is_staff THEN
    -- Cliente pode: cancelar (pending → cancelled) OU confirmar presença (pending → confirmed)
    IF NOT (
      OLD.status = 'pending' AND NEW.status IN ('cancelled', 'confirmed')
    ) THEN
      RAISE EXCEPTION 'CLIENT_UNAUTHORIZED: Clients can only cancel or confirm pending bookings'
        USING ERRCODE = 'P0020',
              HINT = 'Only staff can complete or mark as no-show';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
