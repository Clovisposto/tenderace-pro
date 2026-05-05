-- Audit log table for explicit AUTORIZAR_PARTICIPAÇÃO events
CREATE TABLE IF NOT EXISTS public.autorizacao_participacao_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  empresa_id uuid,
  licitacao_id uuid,
  proposta_id uuid,
  acao text NOT NULL,
  resultado text NOT NULL CHECK (resultado IN ('liberada','bloqueada')),
  motivo text,
  frase_recebida text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autorizacao_log_user ON public.autorizacao_participacao_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autorizacao_log_licitacao ON public.autorizacao_participacao_log(licitacao_id, created_at DESC);

ALTER TABLE public.autorizacao_participacao_log ENABLE ROW LEVEL SECURITY;

-- Append-only: no updates, no deletes
CREATE POLICY "autorizacao_log_no_update" ON public.autorizacao_participacao_log FOR UPDATE USING (false);
CREATE POLICY "autorizacao_log_no_delete" ON public.autorizacao_participacao_log FOR DELETE USING (false);

-- Users can view their own authorization events
CREATE POLICY "Users view own autorizacao log" ON public.autorizacao_participacao_log
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view everything
CREATE POLICY "Admins view all autorizacao log" ON public.autorizacao_participacao_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserts only via service role (edge functions)
CREATE POLICY "autorizacao_log_insert_service_only" ON public.autorizacao_participacao_log
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');