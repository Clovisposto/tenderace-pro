
CREATE TYPE public.doc_habilitacao_categoria AS ENUM (
  'proposta',
  'juridica',
  'tecnica',
  'economica',
  'fiscal_trabalhista',
  'catalogo'
);

CREATE TYPE public.doc_habilitacao_origem AS ENUM ('manual', 'drive', 'sicaf');
CREATE TYPE public.doc_habilitacao_status AS ENUM ('pendente', 'valido', 'vencido', 'rejeitado');

CREATE TABLE public.documentos_habilitacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID,
  licitacao_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  categoria public.doc_habilitacao_categoria NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  origem public.doc_habilitacao_origem NOT NULL DEFAULT 'manual',
  drive_file_id TEXT,
  drive_url TEXT,
  storage_path TEXT,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  validade DATE,
  status public.doc_habilitacao_status NOT NULL DEFAULT 'pendente',
  validado_por_ia BOOLEAN NOT NULL DEFAULT false,
  observacoes_ia TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_hab_licitacao ON public.documentos_habilitacao(licitacao_id);
CREATE INDEX idx_doc_hab_empresa ON public.documentos_habilitacao(empresa_id);
CREATE INDEX idx_doc_hab_proposta ON public.documentos_habilitacao(proposta_id);
CREATE INDEX idx_doc_hab_categoria ON public.documentos_habilitacao(categoria);

ALTER TABLE public.documentos_habilitacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habilitacao docs"
ON public.documentos_habilitacao
FOR ALL
USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = documentos_habilitacao.empresa_id AND e.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = documentos_habilitacao.empresa_id AND e.user_id = auth.uid()));

CREATE POLICY "Admins view habilitacao docs"
ON public.documentos_habilitacao
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_doc_hab_updated_at
BEFORE UPDATE ON public.documentos_habilitacao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
