-- Remover a MFA_Enforcement_Policy da tabela barbers
-- Clientes sem MFA precisam visualizar barbeiros para agendar
DROP POLICY IF EXISTS "MFA_Enforcement_Policy" ON public.barbers;