-- Adicionar campo para indicar reservas externas
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_external_booking BOOLEAN DEFAULT false;

-- Tornar client_id opcional para permitir reservas externas
ALTER TABLE bookings ALTER COLUMN client_id DROP NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN bookings.is_external_booking IS 'Indica se o agendamento foi feito fora da plataforma (telefone, presencial, etc)';