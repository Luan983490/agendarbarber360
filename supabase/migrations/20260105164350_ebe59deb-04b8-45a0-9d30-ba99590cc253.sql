-- =====================================================
-- Tabela para Rate Limiting
-- Rastreia tentativas por IP/usuário para proteção contra abusos
-- =====================================================

-- Tipos de ação para rate limiting
CREATE TYPE public.rate_limit_action AS ENUM (
  'login',
  'signup',
  'booking_create',
  'slots_query',
  'password_reset',
  'api_call'
);

-- Tabela principal de rate limits
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  action_type rate_limit_action NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_rate_limits_ip_action ON public.rate_limits(ip_address, action_type);
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits(user_id, action_type) WHERE user_id IS NOT NULL;
CREATE INDEX idx_rate_limits_blocked ON public.rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits(last_attempt_at);

-- Habilitar RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas o sistema pode gerenciar rate limits
CREATE POLICY "Only system can manage rate limits"
ON public.rate_limits
FOR ALL
USING (false)
WITH CHECK (false);

-- Tabela de IPs bloqueados (lista negra)
CREATE TABLE public.blocked_ips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address text NOT NULL UNIQUE,
  reason text,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  is_permanent boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX idx_blocked_ips_address ON public.blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_until ON public.blocked_ips(blocked_until) WHERE blocked_until IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Apenas owners de barbearia podem ver IPs bloqueados (para auditoria)
CREATE POLICY "Owners can view blocked IPs"
ON public.blocked_ips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbershops WHERE owner_id = auth.uid()
  )
);

-- Apenas sistema pode gerenciar bloqueios
CREATE POLICY "Only system can manage blocked IPs"
ON public.blocked_ips
FOR ALL
USING (false)
WITH CHECK (false);

-- =====================================================
-- Funções de Rate Limiting
-- =====================================================

-- Função para verificar e incrementar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip_address text,
  p_action_type rate_limit_action,
  p_user_id uuid DEFAULT NULL,
  p_max_attempts integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15
)
RETURNS TABLE (
  allowed boolean,
  current_count integer,
  remaining_attempts integer,
  reset_at timestamp with time zone,
  blocked_until timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record rate_limits%ROWTYPE;
  v_window_start timestamp with time zone;
  v_blocked_until timestamp with time zone;
  v_is_blocked boolean := false;
BEGIN
  -- Verificar se IP está na lista negra
  SELECT bi.blocked_until INTO v_blocked_until
  FROM blocked_ips bi
  WHERE bi.ip_address = p_ip_address
    AND (bi.is_permanent = true OR bi.blocked_until > now());
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      false::boolean,
      0::integer,
      0::integer,
      now()::timestamp with time zone,
      COALESCE(v_blocked_until, now() + interval '24 hours')::timestamp with time zone;
    RETURN;
  END IF;

  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Buscar registro existente dentro da janela
  SELECT * INTO v_record
  FROM rate_limits rl
  WHERE rl.ip_address = p_ip_address
    AND rl.action_type = p_action_type
    AND rl.first_attempt_at > v_window_start
  ORDER BY rl.first_attempt_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Criar novo registro
    INSERT INTO rate_limits (ip_address, action_type, user_id, attempt_count, first_attempt_at, last_attempt_at)
    VALUES (p_ip_address, p_action_type, p_user_id, 1, now(), now())
    RETURNING * INTO v_record;
    
    RETURN QUERY SELECT 
      true::boolean,
      1::integer,
      (p_max_attempts - 1)::integer,
      (v_record.first_attempt_at + (p_window_minutes || ' minutes')::interval)::timestamp with time zone,
      NULL::timestamp with time zone;
    RETURN;
  END IF;
  
  -- Verificar se está bloqueado
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > now() THEN
    RETURN QUERY SELECT 
      false::boolean,
      v_record.attempt_count::integer,
      0::integer,
      v_record.blocked_until::timestamp with time zone,
      v_record.blocked_until::timestamp with time zone;
    RETURN;
  END IF;
  
  -- Incrementar contador
  UPDATE rate_limits
  SET 
    attempt_count = attempt_count + 1,
    last_attempt_at = now(),
    user_id = COALESCE(p_user_id, rate_limits.user_id),
    blocked_until = CASE 
      WHEN attempt_count + 1 >= p_max_attempts 
      THEN now() + (p_window_minutes * 2 || ' minutes')::interval
      ELSE NULL
    END
  WHERE id = v_record.id
  RETURNING * INTO v_record;
  
  -- Verificar se limite foi atingido
  IF v_record.attempt_count >= p_max_attempts THEN
    RETURN QUERY SELECT 
      false::boolean,
      v_record.attempt_count::integer,
      0::integer,
      v_record.blocked_until::timestamp with time zone,
      v_record.blocked_until::timestamp with time zone;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true::boolean,
    v_record.attempt_count::integer,
    (p_max_attempts - v_record.attempt_count)::integer,
    (v_record.first_attempt_at + (p_window_minutes || ' minutes')::interval)::timestamp with time zone,
    NULL::timestamp with time zone;
END;
$$;

-- Função para resetar rate limit (após login bem-sucedido, por exemplo)
CREATE OR REPLACE FUNCTION public.reset_rate_limit(
  p_ip_address text,
  p_action_type rate_limit_action
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE ip_address = p_ip_address
    AND action_type = p_action_type;
END;
$$;

-- Função para bloquear IP temporariamente
CREATE OR REPLACE FUNCTION public.block_ip(
  p_ip_address text,
  p_reason text DEFAULT NULL,
  p_duration_hours integer DEFAULT 24,
  p_permanent boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO blocked_ips (ip_address, reason, blocked_until, is_permanent)
  VALUES (
    p_ip_address, 
    p_reason, 
    CASE WHEN p_permanent THEN NULL ELSE now() + (p_duration_hours || ' hours')::interval END,
    p_permanent
  )
  ON CONFLICT (ip_address) DO UPDATE SET
    reason = COALESCE(EXCLUDED.reason, blocked_ips.reason),
    blocked_until = CASE WHEN EXCLUDED.is_permanent THEN NULL ELSE now() + (p_duration_hours || ' hours')::interval END,
    is_permanent = EXCLUDED.is_permanent
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Função para limpar registros antigos (executar periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- Remover registros com mais de 24 horas
  DELETE FROM rate_limits
  WHERE last_attempt_at < now() - interval '24 hours';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Remover bloqueios expirados
  DELETE FROM blocked_ips
  WHERE is_permanent = false
    AND blocked_until < now();
  
  RETURN v_deleted;
END;
$$;

-- =====================================================
-- Configurações de Rate Limit por tipo de ação
-- =====================================================
COMMENT ON TYPE rate_limit_action IS 'Tipos de ação com rate limiting:
- login: max 5 em 15 min
- signup: max 3 em 60 min  
- booking_create: max 10 em 60 min
- slots_query: max 60 em 1 min
- password_reset: max 3 em 60 min
- api_call: max 100 em 1 min';