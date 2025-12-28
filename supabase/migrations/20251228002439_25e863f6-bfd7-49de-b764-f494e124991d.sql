-- Tabela para horários de trabalho fixos (por dia da semana)
CREATE TABLE public.barber_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- Período 1 (manhã)
  period1_start TIME,
  period1_end TIME,
  -- Período 2 (tarde/noite)
  period2_start TIME,
  period2_end TIME,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, day_of_week)
);

-- Tabela para horários por período específico (datas)
CREATE TABLE public.barber_schedule_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- Período 1 (manhã)
  period1_start TIME,
  period1_end TIME,
  -- Período 2 (tarde/noite)
  period2_start TIME,
  period2_end TIME,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para vincular serviços aos barbeiros
CREATE TABLE public.barber_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, service_id)
);

-- Enable RLS
ALTER TABLE public.barber_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for barber_working_hours
CREATE POLICY "Anyone can view barber working hours"
ON public.barber_working_hours
FOR SELECT
USING (true);

CREATE POLICY "Owners and barbers can manage working hours"
ON public.barber_working_hours
FOR ALL
USING (
  barber_id IN (
    SELECT b.id FROM barbers b
    JOIN barbershops bs ON b.barbershop_id = bs.id
    WHERE bs.owner_id = auth.uid() 
    OR b.user_id = auth.uid()
    OR bs.id IN (
      SELECT barbershop_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'attendant'
    )
  )
);

-- RLS policies for barber_schedule_overrides
CREATE POLICY "Anyone can view schedule overrides"
ON public.barber_schedule_overrides
FOR SELECT
USING (true);

CREATE POLICY "Owners and barbers can manage schedule overrides"
ON public.barber_schedule_overrides
FOR ALL
USING (
  barber_id IN (
    SELECT b.id FROM barbers b
    JOIN barbershops bs ON b.barbershop_id = bs.id
    WHERE bs.owner_id = auth.uid() 
    OR b.user_id = auth.uid()
    OR bs.id IN (
      SELECT barbershop_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'attendant'
    )
  )
);

-- RLS policies for barber_services
CREATE POLICY "Anyone can view barber services"
ON public.barber_services
FOR SELECT
USING (true);

CREATE POLICY "Owners and attendants can manage barber services"
ON public.barber_services
FOR ALL
USING (
  barber_id IN (
    SELECT b.id FROM barbers b
    JOIN barbershops bs ON b.barbershop_id = bs.id
    WHERE bs.owner_id = auth.uid()
    OR bs.id IN (
      SELECT barbershop_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'attendant'
    )
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_barber_working_hours_updated_at
  BEFORE UPDATE ON public.barber_working_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barber_schedule_overrides_updated_at
  BEFORE UPDATE ON public.barber_schedule_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();