-- Create subscriptions table for trial management
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'teste_gratis',
  status text NOT NULL DEFAULT 'ativo',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
CREATE POLICY "Barbershop owners can view their subscriptions"
ON public.subscriptions
FOR SELECT
USING (
  barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "System can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (true);

-- Function to create trial subscription automatically
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    barbershop_id,
    plan_type,
    status,
    start_date,
    end_date
  ) VALUES (
    NEW.id,
    'teste_gratis',
    'ativo',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create subscription when barbershop is created
CREATE TRIGGER on_barbershop_created
  AFTER INSERT ON public.barbershops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

-- Function to check subscription status
CREATE OR REPLACE FUNCTION public.check_subscription_status(barbershop_uuid uuid)
RETURNS TABLE (
  is_active boolean,
  plan_type text,
  days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (s.status = 'ativo' AND s.end_date >= CURRENT_DATE) as is_active,
    s.plan_type,
    (s.end_date - CURRENT_DATE)::integer as days_remaining
  FROM subscriptions s
  WHERE s.barbershop_id = barbershop_uuid
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();