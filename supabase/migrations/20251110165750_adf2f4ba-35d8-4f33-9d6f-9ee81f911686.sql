-- Criar tabela de pacotes
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  sessions_included INTEGER NOT NULL DEFAULT 1,
  validity_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de compras de pacotes pelos clientes
CREATE TABLE IF NOT EXISTS public.client_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  sessions_remaining INTEGER NOT NULL,
  sessions_total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de assinaturas de clientes
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  plan_description TEXT,
  price_monthly NUMERIC NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  benefits JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de cartões de pagamento dos clientes
CREATE TABLE IF NOT EXISTS public.payment_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_brand TEXT NOT NULL,
  last_four_digits TEXT NOT NULL,
  cardholder_name TEXT NOT NULL,
  expiry_month INTEGER NOT NULL,
  expiry_year INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies para packages
CREATE POLICY "Anyone can view active packages"
  ON public.packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Barbershop owners can manage their packages"
  ON public.packages FOR ALL
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

-- RLS Policies para client_packages
CREATE POLICY "Clients can view their own packages"
  ON public.client_packages FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own packages"
  ON public.client_packages FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Owners can view client packages for their barbershops"
  ON public.client_packages FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

-- RLS Policies para client_subscriptions
CREATE POLICY "Clients can view their own subscriptions"
  ON public.client_subscriptions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can insert their own subscriptions"
  ON public.client_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Owners can view subscriptions for their barbershops"
  ON public.client_subscriptions FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

-- RLS Policies para payment_cards
CREATE POLICY "Clients can view their own cards"
  ON public.payment_cards FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can manage their own cards"
  ON public.payment_cards FOR ALL
  USING (auth.uid() = client_id);

-- Triggers para updated_at
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_packages_updated_at
  BEFORE UPDATE ON public.client_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_cards_updated_at
  BEFORE UPDATE ON public.payment_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();