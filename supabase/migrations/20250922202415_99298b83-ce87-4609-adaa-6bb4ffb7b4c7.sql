-- Create barbers table
CREATE TABLE public.barbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- Create policies for barbers
CREATE POLICY "Anyone can view active barbers" 
ON public.barbers 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Barbershop owners can manage their barbers" 
ON public.barbers 
FOR ALL 
USING (barbershop_id IN (
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
));

-- Add barber_id to bookings table
ALTER TABLE public.bookings ADD COLUMN barber_id UUID REFERENCES public.barbers(id);

-- Create trigger for barbers updated_at
CREATE TRIGGER update_barbers_updated_at
BEFORE UPDATE ON public.barbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();