
-- ============================================================
-- FASE 3: AUDITORIA, LOG E RASTREABILIDADE
-- Tabela e triggers para rastrear todas as mudanças em bookings
-- ============================================================

-- 1. Criar tabela de auditoria
CREATE TABLE public.booking_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  action text NOT NULL, -- 'insert', 'status_change', 'update', 'cancel'
  old_status text,
  new_status text,
  old_data jsonb, -- snapshot dos campos alterados (antes)
  new_data jsonb, -- snapshot dos campos alterados (depois)
  actor_user_id uuid, -- quem fez a ação
  actor_role text, -- 'client', 'barber', 'attendant', 'owner', 'system'
  origin text NOT NULL DEFAULT 'system', -- 'client', 'barber', 'admin', 'system'
  barbershop_id uuid NOT NULL, -- para RLS
  ip_address text, -- opcional, se disponível
  user_agent text, -- opcional, se disponível
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Índices para performance
CREATE INDEX idx_audit_booking_id ON public.booking_audit_logs(booking_id);
CREATE INDEX idx_audit_barbershop_id ON public.booking_audit_logs(barbershop_id);
CREATE INDEX idx_audit_actor_user_id ON public.booking_audit_logs(actor_user_id);
CREATE INDEX idx_audit_created_at ON public.booking_audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON public.booking_audit_logs(action);

-- 3. Habilitar RLS
ALTER TABLE public.booking_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS - SOMENTE LEITURA

-- 4.1 Owners podem ver logs da sua barbearia
CREATE POLICY "Owners can view their barbershop audit logs"
ON public.booking_audit_logs
FOR SELECT
USING (
  barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

-- 4.2 Barbeiros podem ver logs dos seus bookings
CREATE POLICY "Barbers can view their booking audit logs"
ON public.booking_audit_logs
FOR SELECT
USING (
  booking_id IN (
    SELECT b.id FROM bookings b
    JOIN barbers br ON b.barber_id = br.id
    WHERE br.user_id = auth.uid()
  )
);

-- 4.3 Attendants podem ver logs da barbearia
CREATE POLICY "Attendants can view barbershop audit logs"
ON public.booking_audit_logs
FOR SELECT
USING (
  barbershop_id IN (
    SELECT ur.barbershop_id 
    FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'attendant'
  )
);

-- 4.4 Clientes podem ver logs dos seus próprios bookings
CREATE POLICY "Clients can view their own booking audit logs"
ON public.booking_audit_logs
FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings WHERE client_id = auth.uid()
  )
);

-- 5. Política de INSERT apenas via trigger (SECURITY DEFINER)
CREATE POLICY "System can insert audit logs"
ON public.booking_audit_logs
FOR INSERT
WITH CHECK (true);

-- NÃO criar políticas de UPDATE ou DELETE = logs são imutáveis

-- ============================================================
-- FUNÇÃO DE AUDITORIA
-- ============================================================

-- 6. Função que registra mudanças automaticamente
CREATE OR REPLACE FUNCTION public.audit_booking_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_actor_role text;
  v_origin text;
  v_old_data jsonb;
  v_new_data jsonb;
  v_actor_id uuid;
BEGIN
  -- Determinar o actor (quem está fazendo a ação)
  v_actor_id := auth.uid();
  
  -- Determinar o papel do actor
  IF v_actor_id IS NULL THEN
    v_actor_role := 'system';
    v_origin := 'system';
  ELSIF TG_OP = 'INSERT' AND NEW.client_id = v_actor_id THEN
    v_actor_role := 'client';
    v_origin := 'client';
  ELSIF EXISTS (SELECT 1 FROM barbershops WHERE id = NEW.barbershop_id AND owner_id = v_actor_id) THEN
    v_actor_role := 'owner';
    v_origin := 'admin';
  ELSIF EXISTS (SELECT 1 FROM barbers WHERE id = NEW.barber_id AND user_id = v_actor_id) THEN
    v_actor_role := 'barber';
    v_origin := 'barber';
  ELSIF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_actor_id AND barbershop_id = NEW.barbershop_id AND role = 'attendant') THEN
    v_actor_role := 'attendant';
    v_origin := 'admin';
  ELSIF NEW.client_id = v_actor_id THEN
    v_actor_role := 'client';
    v_origin := 'client';
  ELSE
    v_actor_role := 'unknown';
    v_origin := 'system';
  END IF;

  -- ========================================
  -- INSERT
  -- ========================================
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_new_data := jsonb_build_object(
      'service_id', NEW.service_id,
      'barber_id', NEW.barber_id,
      'booking_date', NEW.booking_date,
      'booking_time', NEW.booking_time,
      'total_price', NEW.total_price,
      'client_name', NEW.client_name,
      'is_external_booking', NEW.is_external_booking
    );
    
    INSERT INTO booking_audit_logs (
      booking_id, action, old_status, new_status,
      old_data, new_data, actor_user_id, actor_role,
      origin, barbershop_id
    ) VALUES (
      NEW.id, v_action, NULL, NEW.status,
      NULL, v_new_data, v_actor_id, v_actor_role,
      v_origin, NEW.barbershop_id
    );
    
    RETURN NEW;
  END IF;

  -- ========================================
  -- UPDATE
  -- ========================================
  IF TG_OP = 'UPDATE' THEN
    -- Ignorar se só updated_at mudou
    IF OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.notes IS NOT DISTINCT FROM NEW.notes
       AND OLD.barber_id IS NOT DISTINCT FROM NEW.barber_id
       AND OLD.service_id IS NOT DISTINCT FROM NEW.service_id
       AND OLD.booking_date IS NOT DISTINCT FROM NEW.booking_date
       AND OLD.booking_time IS NOT DISTINCT FROM NEW.booking_time
       AND OLD.total_price IS NOT DISTINCT FROM NEW.total_price
    THEN
      RETURN NEW;
    END IF;
    
    -- Determinar tipo de ação
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'cancelled' THEN
        v_action := 'cancel';
      ELSE
        v_action := 'status_change';
      END IF;
    ELSE
      v_action := 'update';
    END IF;
    
    -- Capturar dados antigos (apenas campos relevantes que mudaram)
    v_old_data := jsonb_build_object(
      'service_id', OLD.service_id,
      'barber_id', OLD.barber_id,
      'booking_date', OLD.booking_date,
      'booking_time', OLD.booking_time,
      'total_price', OLD.total_price,
      'notes', OLD.notes
    );
    
    v_new_data := jsonb_build_object(
      'service_id', NEW.service_id,
      'barber_id', NEW.barber_id,
      'booking_date', NEW.booking_date,
      'booking_time', NEW.booking_time,
      'total_price', NEW.total_price,
      'notes', NEW.notes
    );
    
    INSERT INTO booking_audit_logs (
      booking_id, action, old_status, new_status,
      old_data, new_data, actor_user_id, actor_role,
      origin, barbershop_id
    ) VALUES (
      NEW.id, v_action, OLD.status, NEW.status,
      v_old_data, v_new_data, v_actor_id, v_actor_role,
      v_origin, NEW.barbershop_id
    );
    
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Criar trigger AFTER para auditoria
DROP TRIGGER IF EXISTS trg_audit_booking_changes ON public.bookings;
CREATE TRIGGER trg_audit_booking_changes
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_booking_changes();

-- ============================================================
-- COMENTÁRIOS
-- ============================================================
COMMENT ON TABLE public.booking_audit_logs IS 'Log imutável de todas as mudanças em bookings';
COMMENT ON FUNCTION public.audit_booking_changes IS 'Trigger que registra automaticamente mudanças em bookings';
