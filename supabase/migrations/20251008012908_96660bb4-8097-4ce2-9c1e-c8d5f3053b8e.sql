-- Tabela de bloqueios de agenda dos barbeiros
CREATE TABLE public.barber_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhorar performance
CREATE INDEX idx_barber_blocks_barber_id ON public.barber_blocks(barber_id);
CREATE INDEX idx_barber_blocks_date ON public.barber_blocks(block_date);

-- RLS para barber_blocks
ALTER TABLE public.barber_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbershop owners can manage blocks for their barbers"
ON public.barber_blocks
FOR ALL
USING (
  barber_id IN (
    SELECT b.id FROM public.barbers b
    JOIN public.barbershops bs ON b.barbershop_id = bs.id
    WHERE bs.owner_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view barber blocks"
ON public.barber_blocks
FOR SELECT
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_barber_blocks_updated_at
BEFORE UPDATE ON public.barber_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de avaliações
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, barbershop_id)
);

-- Índices para melhorar performance
CREATE INDEX idx_reviews_barbershop_id ON public.reviews(barbershop_id);
CREATE INDEX idx_reviews_client_id ON public.reviews(client_id);

-- RLS para reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

CREATE POLICY "Clients can create their own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = client_id);

-- Trigger para atualizar updated_at em reviews
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar média de avaliações da barbearia
CREATE OR REPLACE FUNCTION public.update_barbershop_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.barbershops
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.reviews
      WHERE barbershop_id = COALESCE(NEW.barbershop_id, OLD.barbershop_id)
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE barbershop_id = COALESCE(NEW.barbershop_id, OLD.barbershop_id)
    )
  WHERE id = COALESCE(NEW.barbershop_id, OLD.barbershop_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para atualizar rating automaticamente
CREATE TRIGGER update_barbershop_rating_on_insert
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_barbershop_rating();

CREATE TRIGGER update_barbershop_rating_on_update
AFTER UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_barbershop_rating();

CREATE TRIGGER update_barbershop_rating_on_delete
AFTER DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_barbershop_rating();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;