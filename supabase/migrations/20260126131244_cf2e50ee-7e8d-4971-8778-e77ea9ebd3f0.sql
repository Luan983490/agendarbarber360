
-- ==============================================
-- BLINDAGEM DE SEGURANÇA - REMOÇÃO DE POLICIES PERMISSIVAS
-- Data: 2026-01-26
-- Objetivo: Remover TODAS as policies com USING (true)
-- ==============================================

-- 1. Remover policy permissiva de barber_schedule_overrides
DROP POLICY IF EXISTS "Anyone can view schedule overrides" ON public.barber_schedule_overrides;

-- 2. Remover policy permissiva de barber_services
DROP POLICY IF EXISTS "Anyone can view barber services" ON public.barber_services;

-- 3. Remover policy permissiva de barber_working_hours
DROP POLICY IF EXISTS "Anyone can view barber working hours" ON public.barber_working_hours;

-- 4. Remover policy permissiva de barbershops
DROP POLICY IF EXISTS "Anyone can view barbershops" ON public.barbershops;

-- 5. Remover policy permissiva de reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

-- ==============================================
-- VERIFICAÇÃO FINAL
-- ==============================================
-- Após esta migration, nenhuma policy no schema public terá USING (true) ou WITH CHECK (true)
