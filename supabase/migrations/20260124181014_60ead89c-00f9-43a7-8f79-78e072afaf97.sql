-- Inserir horários padrão para o barbeiro Luan2 (Seg-Sex: 09:00-12:00, 13:00-18:00)
INSERT INTO public.barber_working_hours (barber_id, day_of_week, period1_start, period1_end, period2_start, period2_end, is_day_off)
VALUES 
  ('ce529efc-7ca9-49cc-bad0-702003b52e27', 0, '09:00', '12:00', '13:00', '18:00', true),  -- Domingo - folga
  ('ce529efc-7ca9-49cc-bad0-702003b52e27', 1, '09:00', '12:00', '13:00', '18:00', false), -- Segunda
  ('ce529efc-7ca9-49cc-bad0-702003b52e27', 2, '09:00', '12:00', '13:00', '18:00', false), -- Terça
  ('ce529efc-7ca9-49cc-bad0-702003b52e27', 3, '09:00', '12:00', '13:00', '18:00', false), -- Quarta
  ('ce529efc-7ca9-49cc-bad0-702003b52e27', 4, '09:00', '12:00', '13:00', '18:00', false), -- Quinta
  ('ce529efc-7ca9-49cc-bad0-702003b52e27', 5, '09:00', '12:00', '13:00', '18:00', false), -- Sexta
  ('ce529efc-7ca9-49cc-bad0-702003b52e27', 6, '09:00', '12:00', '13:00', '18:00', true)   -- Sábado - folga
ON CONFLICT DO NOTHING;