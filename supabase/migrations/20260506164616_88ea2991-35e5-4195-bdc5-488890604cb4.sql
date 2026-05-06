
-- 1. Add flag to licitacoes
ALTER TABLE public.licitacoes
ADD COLUMN IF NOT EXISTS enviado_para_cotacao BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS itens_extraidos BOOLEAN NOT NULL DEFAULT false;

-- 2. Items table
CREATE TABLE IF NOT EXISTS public.licitacao_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  numero_item INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT DEFAULT 'UN',
  quantidade NUMERIC NOT NULL DEFAULT 1,
  preco_referencia NUMERIC,            -- do edital
  preco_robo NUMERIC,                  -- cotado pela IA web
  preco_manual NUMERIC,                -- inserido pelo operador
  preco_final NUMERIC,                 -- valor que vai pra disputa
  modo_cotacao TEXT NOT NULL DEFAULT 'pendente', -- pendente|robo|manual|cancelado
  robo_fontes JSONB DEFAULT '[]'::jsonb,         -- [{site, url, preco, endereco}]
  margem_lucro NUMERIC,                -- %
  custo_estimado NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (licitacao_id, numero_item)
);

CREATE INDEX IF NOT EXISTS idx_licitacao_itens_licitacao ON public.licitacao_itens(licitacao_id);

ALTER TABLE public.licitacao_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view itens"
  ON public.licitacao_itens FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage itens"
  ON public.licitacao_itens FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages itens"
  ON public.licitacao_itens FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER update_licitacao_itens_updated_at
BEFORE UPDATE ON public.licitacao_itens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
