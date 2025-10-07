-- Criar tabela de favoritos
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir que cada cliente possa favoritar uma barbearia apenas uma vez
  UNIQUE(client_id, barbershop_id)
);

-- Habilitar RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Clientes podem ver seus próprios favoritos
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = client_id);

-- Policy: Clientes podem adicionar favoritos
CREATE POLICY "Users can add their own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Policy: Clientes podem remover seus favoritos
CREATE POLICY "Users can delete their own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = client_id);

-- Criar índice para melhor performance
CREATE INDEX idx_favorites_client_id ON public.favorites(client_id);
CREATE INDEX idx_favorites_barbershop_id ON public.favorites(barbershop_id);

-- Habilitar realtime para a tabela favorites
ALTER TABLE public.favorites REPLICA IDENTITY FULL;