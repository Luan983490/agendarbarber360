-- Adicionar campo para nome de cliente walk-in na tabela bookings
ALTER TABLE bookings ADD COLUMN client_name TEXT;

-- Adicionar comentário explicando o uso
COMMENT ON COLUMN bookings.client_name IS 'Nome do cliente para agendamentos walk-in (quando client_id é null)';