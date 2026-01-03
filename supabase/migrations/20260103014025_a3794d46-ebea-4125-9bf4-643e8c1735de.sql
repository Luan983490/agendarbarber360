-- =========================================================
-- VALIDAÇÃO E TRAVAMENTO FINAL DO NÚCLEO DE AGENDAMENTOS
-- 1) Garantir trigger em INSERT OR UPDATE (estava só INSERT)
-- 2) Adicionar documentação na tabela bookings
-- 3) Reforçar comentário na coluna booking_end_time
-- =========================================================

-- Recriar trigger para INSERT OR UPDATE (estava faltando UPDATE)
DROP TRIGGER IF EXISTS trg_01_booking_set_end_time ON public.bookings;

CREATE TRIGGER trg_01_booking_set_end_time
  BEFORE INSERT OR UPDATE
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_end_time();

-- Documentação na TABELA bookings
COMMENT ON TABLE public.bookings IS 
'Tabela principal de agendamentos do sistema Barber360.
IMPORTANTE: O campo booking_end_time é DERIVADO e controlado 100% pelo backend.
- Nunca deve ser enviado pelo frontend
- Calculado exclusivamente pelo trigger trg_01_booking_set_end_time
- Baseado em: booking_time + services.duration
- Qualquer valor enviado pelo frontend é IGNORADO e recalculado';

-- Documentação reforçada na COLUNA booking_end_time
COMMENT ON COLUMN public.bookings.booking_end_time IS 
'CAMPO DERIVADO - NÃO ENVIAR DO FRONTEND!
Horário de término do agendamento, calculado automaticamente:
- Trigger: trg_01_booking_set_end_time
- Fórmula: booking_time + services.duration
- Qualquer valor manual é IGNORADO
- Usado para validação de conflitos de horário (trg_02_booking_conflict_check)';

-- Documentação na função de cálculo
COMMENT ON FUNCTION public.calculate_booking_end_time(time, integer) IS 
'Função auxiliar pura para calcular booking_end_time.
Fórmula: start_time + duration_minutes
Chamada pelo trigger set_booking_end_time.
IMUTÁVEL e PARALLELIZABLE para performance.';

-- Verificar que triggers estão na ordem correta
-- trg_01_* executa antes de trg_02_* por ordem alfabética