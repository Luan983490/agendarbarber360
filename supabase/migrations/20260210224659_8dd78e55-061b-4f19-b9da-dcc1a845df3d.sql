-- Fix is_admin_with_mfa() function: 'admin' doesn't exist in app_role enum, use 'owner' instead
CREATE OR REPLACE FUNCTION public.is_admin_with_mfa()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o usuário tem a role 'owner' E se o nível de autenticação é MFA (aal2)
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'::app_role
  ) THEN
    RETURN (auth.jwt() ->> 'aal' = 'aal2');
  ELSE
    -- Se não for owner, a regra de MFA não bloqueia por aqui (outras RLS tratam o acesso)
    RETURN TRUE;
  END IF;
END;
$$;