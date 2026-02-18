
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_display_name TEXT;
  v_phone TEXT;
  v_barbershop_id UUID;
BEGIN
  -- Extrai user_type dos metadados
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  
  -- Extrai display_name dos metadados
  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  -- Extrai phone dos metadados
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone', '');

  -- Cria o perfil
  INSERT INTO public.profiles (user_id, user_type, display_name, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    v_user_type,
    v_display_name,
    v_phone,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    user_type = EXCLUDED.user_type,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    phone = COALESCE(profiles.phone, EXCLUDED.phone),
    updated_at = NOW();

  -- Para barbershop_owner: cria barbearia e role
  IF v_user_type = 'barbershop_owner' THEN
    -- Cria a barbearia
    INSERT INTO public.barbershops (owner_id, name, address, phone, created_at, updated_at)
    VALUES (
      NEW.id,
      v_display_name || '''s Barbershop',
      'Endereço a definir',
      v_phone,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_barbershop_id;

    -- Cria o role de owner
    INSERT INTO public.user_roles (user_id, barbershop_id, role, created_at, updated_at)
    VALUES (NEW.id, v_barbershop_id, 'owner', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
