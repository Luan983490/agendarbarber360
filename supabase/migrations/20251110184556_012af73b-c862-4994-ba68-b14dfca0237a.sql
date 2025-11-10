-- Create loyalty settings table
CREATE TABLE public.loyalty_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  points_per_real NUMERIC NOT NULL DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barbershop_id)
);

-- Create loyalty rewards table
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client loyalty points table
CREATE TABLE public.client_loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, barbershop_id)
);

-- Create loyalty transactions table
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired')),
  description TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_settings
CREATE POLICY "Barbershop owners can manage their loyalty settings"
  ON public.loyalty_settings
  FOR ALL
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active loyalty settings"
  ON public.loyalty_settings
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for loyalty_rewards
CREATE POLICY "Barbershop owners can manage their rewards"
  ON public.loyalty_rewards
  FOR ALL
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can view active rewards"
  ON public.loyalty_rewards
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for client_loyalty_points
CREATE POLICY "Clients can view their own points"
  ON public.client_loyalty_points
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Barbershop owners can view their clients points"
  ON public.client_loyalty_points
  FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Barbershop owners can update their clients points"
  ON public.client_loyalty_points
  FOR UPDATE
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "System can insert loyalty points"
  ON public.client_loyalty_points
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for loyalty_transactions
CREATE POLICY "Clients can view their own transactions"
  ON public.loyalty_transactions
  FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Barbershop owners can view their transactions"
  ON public.loyalty_transactions
  FOR SELECT
  USING (barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "System can insert transactions"
  ON public.loyalty_transactions
  FOR INSERT
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_loyalty_settings_updated_at
  BEFORE UPDATE ON public.loyalty_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_loyalty_points_updated_at
  BEFORE UPDATE ON public.client_loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();