
-- ============================================================
-- FASE 2: CONTROLE DE ACESSO E AUTORIDADE (RLS + PERMISSÕES)
-- Bookings: Políticas granulares por papel
-- ============================================================

-- 1. Função auxiliar para verificar se usuário é o barbeiro do booking
CREATE OR REPLACE FUNCTION public.is_booking_barber(_user_id uuid, _booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bookings b
    JOIN barbers br ON b.barber_id = br.id
    WHERE b.id = _booking_id
      AND br.user_id = _user_id
  )
$$;

-- 2. Função auxiliar para verificar se usuário é owner/attendant da barbearia do booking
CREATE OR REPLACE FUNCTION public.can_manage_booking(_user_id uuid, _booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bookings b
    JOIN barbershops bs ON b.barbershop_id = bs.id
    WHERE b.id = _booking_id
      AND (
        bs.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.barbershop_id = b.barbershop_id
            AND ur.role = 'attendant'
        )
      )
  )
$$;

-- 3. Função para verificar se cliente pode cancelar (antes do horário)
CREATE OR REPLACE FUNCTION public.client_can_cancel_booking(_user_id uuid, _booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bookings b
    WHERE b.id = _booking_id
      AND b.client_id = _user_id
      AND b.status = 'pending'
      AND (
        b.booking_date > CURRENT_DATE
        OR (b.booking_date = CURRENT_DATE AND b.booking_time > CURRENT_TIME)
      )
  )
$$;

-- ============================================================
-- REMOVER POLÍTICAS ANTIGAS DE UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Owners, barbers and attendants can update bookings" ON public.bookings;

-- ============================================================
-- NOVAS POLÍTICAS GRANULARES DE UPDATE
-- ============================================================

-- 4.1 Owner pode atualizar qualquer booking da sua barbearia
CREATE POLICY "Owners can update their barbershop bookings"
ON public.bookings
FOR UPDATE
USING (
  barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

-- 4.2 Attendant pode atualizar bookings da barbearia
CREATE POLICY "Attendants can update barbershop bookings"
ON public.bookings
FOR UPDATE
USING (
  barbershop_id IN (
    SELECT ur.barbershop_id 
    FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'attendant'
  )
);

-- 4.3 Barbeiro pode atualizar APENAS seus próprios bookings
CREATE POLICY "Barbers can update their own bookings"
ON public.bookings
FOR UPDATE
USING (
  barber_id IN (
    SELECT id FROM barbers WHERE user_id = auth.uid()
  )
);

-- 4.4 Cliente pode atualizar (cancelar) APENAS seus bookings pendentes e antes do horário
CREATE POLICY "Clients can cancel their pending bookings before time"
ON public.bookings
FOR UPDATE
USING (
  client_id = auth.uid()
  AND status = 'pending'
  AND (
    booking_date > CURRENT_DATE
    OR (booking_date = CURRENT_DATE AND booking_time > CURRENT_TIME)
  )
);

-- ============================================================
-- TRIGGER PARA RESTRINGIR AÇÕES DO CLIENTE
-- ============================================================

-- 5. Função que impede cliente de marcar completed/no_show
CREATE OR REPLACE FUNCTION public.restrict_client_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- É owner da barbearia
    EXISTS (
      SELECT 1 FROM barbershops 
      WHERE id = NEW.barbershop_id AND owner_id = auth.uid()
    )
    -- Ou é o barbeiro do booking
    OR EXISTS (
      SELECT 1 FROM barbers 
      WHERE id = NEW.barber_id AND user_id = auth.uid()
    )
    -- Ou é attendant da barbearia
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
        AND barbershop_id = NEW.barbershop_id 
        AND role = 'attendant'
    )
  );

  -- Se for cliente (e não staff), restringir ações
  IF v_is_client AND NOT v_is_staff THEN
    -- Cliente só pode cancelar (pending → cancelled)
    IF NOT (OLD.status = 'pending' AND NEW.status = 'cancelled') THEN
      RAISE EXCEPTION 'CLIENT_UNAUTHORIZED: Clients can only cancel pending bookings'
        USING ERRCODE = 'P0020',
              HINT = 'Only staff can confirm, complete, or mark as no-show';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Criar trigger para restringir cliente
DROP TRIGGER IF EXISTS trg_restrict_client_status ON public.bookings;
CREATE TRIGGER trg_restrict_client_status
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_client_status_changes();

-- ============================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================
COMMENT ON FUNCTION public.is_booking_barber IS 'Verifica se usuário é o barbeiro do booking';
COMMENT ON FUNCTION public.can_manage_booking IS 'Verifica se usuário é owner/attendant da barbearia';
COMMENT ON FUNCTION public.client_can_cancel_booking IS 'Verifica se cliente pode cancelar (antes do horário)';
COMMENT ON FUNCTION public.restrict_client_status_changes IS 'Impede cliente de marcar completed/no_show';
