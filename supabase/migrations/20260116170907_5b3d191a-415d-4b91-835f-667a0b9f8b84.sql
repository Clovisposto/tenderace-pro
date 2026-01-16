-- Fix 1: Enable RLS on captura_jobs_log and add admin-only policies

-- Enable RLS
ALTER TABLE public.captura_jobs_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all job logs
CREATE POLICY "Admins can view job logs" ON public.captura_jobs_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can insert job logs (for cron jobs)
CREATE POLICY "Admins can insert job logs" ON public.captura_jobs_log
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can update job logs
CREATE POLICY "Admins can update job logs" ON public.captura_jobs_log
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to manage logs (for cron/edge functions)
CREATE POLICY "Service role can manage job logs" ON public.captura_jobs_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');