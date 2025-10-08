-- Adicionar campo user_id na tabela barbers para vincular com auth.users
ALTER TABLE public.barbers 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_barbers_user_id ON public.barbers(user_id);

-- Atualizar RLS policy para barbeiros verem apenas seus próprios agendamentos
DROP POLICY IF EXISTS "Barbershop owners can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

CREATE POLICY "Clients can create bookings" 
ON public.bookings 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = client_id OR 
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()) OR
  barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())
);

CREATE POLICY "Owners and barbers can update bookings" 
ON public.bookings 
FOR UPDATE 
TO authenticated
USING (
  barbershop_id IN (SELECT id FROM barbershops WHERE owner_id = auth.uid()) OR
  barber_id IN (SELECT id FROM barbers WHERE user_id = auth.uid())
);

-- Atualizar RLS policy para bloqueios de barbeiros
DROP POLICY IF EXISTS "Anyone can view barber blocks" ON public.barber_blocks;
DROP POLICY IF EXISTS "Barbershop owners can manage blocks for their barbers" ON public.barber_blocks;

CREATE POLICY "Users can view relevant barber blocks" 
ON public.barber_blocks 
FOR SELECT 
TO authenticated
USING (
  barber_id IN (
    SELECT b.id FROM barbers b
    JOIN barbershops bs ON b.barbershop_id = bs.id
    WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid()
  )
);

CREATE POLICY "Owners and barbers can manage their blocks" 
ON public.barber_blocks 
FOR ALL
TO authenticated
USING (
  barber_id IN (
    SELECT b.id FROM barbers b
    JOIN barbershops bs ON b.barbershop_id = bs.id
    WHERE bs.owner_id = auth.uid() OR b.user_id = auth.uid()
  )
);

-- Adicionar tipo 'barber' ao user_type se ainda não existir
DO $$ 
BEGIN
  -- Verificar se precisamos atualizar a constraint
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_user_type_check 
    CHECK (user_type IN ('client', 'barbershop_owner', 'barber'));
EXCEPTION
  WHEN others THEN
    NULL;
END $$;