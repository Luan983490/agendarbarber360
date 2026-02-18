
-- Create waitlist table
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text,
  service_name text,
  desired_date date NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'scheduled', 'cancelled')),
  contacted_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- Enable RLS immediately
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can manage waitlist"
  ON public.waitlist FOR ALL
  USING (is_barbershop_owner(auth.uid(), barbershop_id))
  WITH CHECK (is_barbershop_owner(auth.uid(), barbershop_id));

CREATE POLICY "Attendants can manage waitlist"
  ON public.waitlist FOR ALL
  USING (has_role(auth.uid(), barbershop_id, 'attendant'::app_role))
  WITH CHECK (has_role(auth.uid(), barbershop_id, 'attendant'::app_role));

CREATE POLICY "Barbers can view waitlist"
  ON public.waitlist FOR SELECT
  USING (has_role(auth.uid(), barbershop_id, 'barber'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE TRIGGER waitlist_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.generic_audit_trigger();

-- Index for performance
CREATE INDEX idx_waitlist_barbershop_date ON public.waitlist(barbershop_id, desired_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_waitlist_status ON public.waitlist(status) WHERE deleted_at IS NULL;
