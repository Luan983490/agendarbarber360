-- Create app_logs table for application logging
CREATE TABLE public.app_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'performance')),
  service TEXT NOT NULL,
  method TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  barbershop_id UUID,
  error_stack TEXT,
  url TEXT,
  user_agent TEXT,
  duration_ms INTEGER
);

-- Create index for faster queries
CREATE INDEX idx_app_logs_created_at ON public.app_logs(created_at DESC);
CREATE INDEX idx_app_logs_level ON public.app_logs(level);
CREATE INDEX idx_app_logs_user_id ON public.app_logs(user_id);
CREATE INDEX idx_app_logs_barbershop_id ON public.app_logs(barbershop_id);

-- Enable RLS
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert logs (for error tracking)
CREATE POLICY "Anyone can insert logs" 
ON public.app_logs 
FOR INSERT 
WITH CHECK (true);

-- Policy: Only authenticated users can view their own logs or staff can view barbershop logs
CREATE POLICY "Users can view relevant logs" 
ON public.app_logs 
FOR SELECT 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM barbershops WHERE id = barbershop_id AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND barbershop_id = app_logs.barbershop_id
  )
);

-- Function to insert logs safely
CREATE OR REPLACE FUNCTION public.insert_app_log(
  p_level TEXT,
  p_service TEXT,
  p_method TEXT,
  p_message TEXT,
  p_context JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT NULL,
  p_barbershop_id UUID DEFAULT NULL,
  p_error_stack TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO app_logs (
    level, service, method, message, context,
    user_id, barbershop_id, error_stack, url, user_agent, duration_ms
  ) VALUES (
    p_level, p_service, p_method, p_message, p_context,
    COALESCE(p_user_id, auth.uid()), p_barbershop_id, p_error_stack, p_url, p_user_agent, p_duration_ms
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- View for recent errors (last 24h)
CREATE OR REPLACE VIEW public.recent_errors AS
SELECT 
  id,
  created_at,
  level,
  service,
  method,
  message,
  context,
  user_id,
  barbershop_id,
  error_stack,
  url
FROM app_logs
WHERE level IN ('error', 'warn')
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- View for performance issues
CREATE OR REPLACE VIEW public.slow_operations AS
SELECT 
  id,
  created_at,
  service,
  method,
  message,
  duration_ms,
  context
FROM app_logs
WHERE level = 'performance'
  OR duration_ms > 1000
ORDER BY duration_ms DESC NULLS LAST, created_at DESC
LIMIT 100;