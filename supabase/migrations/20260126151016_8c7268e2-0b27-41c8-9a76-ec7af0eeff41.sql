-- ==============================================
-- CORREÇÃO DE WARNINGS DE SEGURANÇA
-- Definir search_path em funções existentes
-- ==============================================

-- Corrigir função create_trial_subscription
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (barbershop_id, plan_type, status, start_date, end_date)
  VALUES (
    NEW.id,
    'teste_gratis',
    'ativo',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar trial subscription: %', SQLERRM;
    RETURN NEW;
END;
$$;