-- Atualizar políticas RLS da tabela bookings para permitir agendamentos walk-in

-- Remover política antiga de INSERT que só permite clientes
DROP POLICY IF EXISTS "Clients can create bookings" ON bookings;

-- Nova política: Clientes podem criar seus próprios agendamentos
CREATE POLICY "Clients can create their own bookings"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);

-- Nova política: Donos e barbeiros podem criar agendamentos (incluindo walk-in)
CREATE POLICY "Owners and barbers can create bookings"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (
  barbershop_id IN (
    SELECT id FROM barbershops WHERE owner_id = auth.uid()
  ) 
  OR 
  barber_id IN (
    SELECT id FROM barbers WHERE user_id = auth.uid()
  )
);