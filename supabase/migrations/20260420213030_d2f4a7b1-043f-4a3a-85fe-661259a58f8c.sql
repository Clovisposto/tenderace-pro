CREATE TABLE public.sicaf_refresh_log (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processadas INTEGER NOT NULL DEFAULT 0,
  sucesso INTEGER NOT NULL DEFAULT 0,
  erros INTEGER NOT NULL DEFAULT 0,
  resultados JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'concluido'
);

ALTER TABLE public.sicaf_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sicaf logs" ON public.sicaf_refresh_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages sicaf logs" ON public.sicaf_refresh_log
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE INDEX idx_sicaf_refresh_log_ran_at ON public.sicaf_refresh_log(ran_at DESC);