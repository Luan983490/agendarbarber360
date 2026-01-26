-- ==============================================
-- CORREÇÃO DO FLUXO DE CRIAÇÃO DE CONTAS
-- Remove triggers problemáticos e cria novo fluxo seguro
-- ==============================================

-- 1. Remover trigger problemático que causa erro "is_barbershop"
DROP TRIGGER IF EXISTS trg_set_user_role ON auth.users;
DROP FUNCTION IF EXISTS public.set_user_role_on_signup();

-- 2. Remover trigger e função antigos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Criar nova função segura para criação de perfis
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_display_name TEXT;
  v_barbershop_id UUID;
BEGIN
  -- Extrai user_type dos metadados (padrão: 'client')
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  
  -- Extrai display_name dos metadados (padrão: parte antes do @ do email)
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  -- Cria o registro na tabela profiles
  INSERT INTO public.profiles (user_id, user_type, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    v_user_type,
    v_display_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    user_type = EXCLUDED.user_type,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    updated_at = NOW();

  -- Para contas de barbearia (owner): cria automaticamente a barbearia e o role
  IF v_user_type = 'barbershop_owner' THEN
    -- Cria a barbearia com o owner_id
    INSERT INTO public.barbershops (owner_id, name, address, created_at, updated_at)
    VALUES (
      NEW.id,
      v_display_name || '''s Barbershop',
      'Endereço a definir',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_barbershop_id;

    -- Cria o role de owner na tabela user_roles
    INSERT INTO public.user_roles (user_id, barbershop_id, role, created_at, updated_at)
    VALUES (NEW.id, v_barbershop_id, 'owner', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Cria uma trial subscription de 7 dias
    INSERT INTO public.subscriptions (barbershop_id, plan_type, status, start_date, end_date, created_at, updated_at)
    VALUES (
      v_barbershop_id,
      'teste_gratis',
      'ativo',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '7 days',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha a criação do usuário
    RAISE WARNING 'Erro ao criar profile para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Criar novo trigger seguro
CREATE TRIGGER on_auth_user_created_safe
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_safe();

-- 5. Garantir que a função tenha as permissões corretas
GRANT EXECUTE ON FUNCTION public.handle_new_user_safe() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_safe() TO postgres;