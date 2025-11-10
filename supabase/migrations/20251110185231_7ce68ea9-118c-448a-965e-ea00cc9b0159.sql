-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL,
  benefits JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Barbershop owners can manage their plans"
  ON public.subscription_plans
  FOR ALL
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add plan_id to client_subscriptions
ALTER TABLE public.client_subscriptions
ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL;