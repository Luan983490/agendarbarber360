-- =========================================================
-- RESTRIÇÃO DE DURAÇÃO DE SERVIÇOS EM INTERVALOS DE 15 MIN
-- Valores permitidos: 15, 30, 45, ..., 360
-- =========================================================

-- Adicionar CHECK CONSTRAINT na tabela services
ALTER TABLE public.services
ADD CONSTRAINT chk_services_duration_intervals
CHECK (
  duration >= 15 
  AND duration <= 360 
  AND duration % 15 = 0
);

-- Documentação da constraint
COMMENT ON CONSTRAINT chk_services_duration_intervals ON public.services IS 
'Garante que a duração do serviço seja um múltiplo de 15 minutos (15, 30, 45, ..., 360).
INVALID_SERVICE_DURATION: A duração deve ser um múltiplo de 15 minutos (15 a 360).
Esta validação é obrigatória e não pode ser contornada pelo frontend.';