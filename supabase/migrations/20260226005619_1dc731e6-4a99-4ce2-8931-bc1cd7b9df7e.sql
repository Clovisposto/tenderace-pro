
-- Add submission method and target email to licitacoes
ALTER TABLE public.licitacoes
  ADD COLUMN IF NOT EXISTS metodo_envio text DEFAULT 'portal',
  ADD COLUMN IF NOT EXISTS email_destino text;

COMMENT ON COLUMN public.licitacoes.metodo_envio IS 'portal, email, presencial';
COMMENT ON COLUMN public.licitacoes.email_destino IS 'Email address for proposal submission when metodo_envio=email';
