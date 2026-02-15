
-- Fix check_blocked_ip: remove ip_address column reference, use context JSONB instead
CREATE OR REPLACE FUNCTION public.check_blocked_ip()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_ip TEXT := COALESCE(inet_client_addr()::TEXT, 'unknown');
  is_blocked BOOLEAN := false;
BEGIN
  -- Verificar se IP está bloqueado
  SELECT EXISTS(
    SELECT 1 FROM blocked_ips
    WHERE ip_address = client_ip
    AND (is_permanent = true OR blocked_until > NOW())
  ) INTO is_blocked;
  
  IF is_blocked THEN
    -- Log da tentativa de acesso de IP bloqueado (ip no context, não como coluna)
    INSERT INTO app_logs (
      level, service, method, message, context
    ) VALUES (
      'error', 'SECURITY', 'BLOCKED_IP_ACCESS',
      'Blocked IP attempted database access',
      jsonb_build_object('ip', client_ip, 'table', TG_TABLE_NAME, 'ip_address', client_ip)
    );
    
    RAISE EXCEPTION 'ACCESS DENIED: IP address is blocked';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix comprehensive_audit: remove ip_address column reference, use context JSONB instead
CREATE OR REPLACE FUNCTION public.comprehensive_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  barbershop_context UUID;
  client_ip TEXT := COALESCE(inet_client_addr()::TEXT, 'unknown');
BEGIN
  -- Obter role do usuário
  SELECT r.role INTO user_role
  FROM user_roles r 
  WHERE r.user_id = auth.uid() 
  LIMIT 1;
  
  -- Obter contexto da barbearia
  barbershop_context := COALESCE(
    NEW.barbershop_id, 
    OLD.barbershop_id,
    (SELECT barbershop_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1)
  );
  
  -- Log detalhado de TODAS as operações (ip no context, não como coluna)
  INSERT INTO app_logs (
    level, service, method, message, context, 
    user_id, barbershop_id
  ) VALUES (
    'info', 
    'AUDIT', 
    TG_OP || '_' || TG_TABLE_NAME,
    format('Table %s operation by user role %s', TG_TABLE_NAME, COALESCE(user_role, 'unknown')),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'user_role', user_role,
      'old_data', to_jsonb(OLD),
      'new_data', to_jsonb(NEW),
      'timestamp', NOW(),
      'ip_address', client_ip
    ),
    auth.uid(),
    barbershop_context
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não bloquear operação por erro no audit
  RAISE WARNING 'Audit log failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
