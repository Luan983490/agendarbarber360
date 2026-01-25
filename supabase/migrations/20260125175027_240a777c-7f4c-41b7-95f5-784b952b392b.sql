-- Add new fields for complete address, social media, payment methods and whatsapp
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS street_number text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS payment_methods text[] DEFAULT '{}'::text[];

-- Add comments for documentation
COMMENT ON COLUMN public.barbershops.postal_code IS 'CEP do estabelecimento';
COMMENT ON COLUMN public.barbershops.neighborhood IS 'Bairro do estabelecimento';
COMMENT ON COLUMN public.barbershops.street_number IS 'Número do endereço';
COMMENT ON COLUMN public.barbershops.whatsapp IS 'Número do WhatsApp com código do país';
COMMENT ON COLUMN public.barbershops.instagram_url IS 'URL do perfil no Instagram';
COMMENT ON COLUMN public.barbershops.facebook_url IS 'URL da página no Facebook';
COMMENT ON COLUMN public.barbershops.payment_methods IS 'Formas de pagamento aceitas: pix, credit_card, debit_card, cash';