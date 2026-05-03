
-- ============ ENUMS ============
CREATE TYPE public.conta_tipo AS ENUM ('ativo','passivo','receita','despesa','patrimonio');
CREATE TYPE public.movimento_tipo AS ENUM ('entrada','saida','ajuste');
CREATE TYPE public.nf_modelo AS ENUM ('55','65');
CREATE TYPE public.nf_tipo AS ENUM ('entrada','saida');
CREATE TYPE public.nf_status AS ENUM ('rascunho','enviando','autorizada','rejeitada','cancelada','denegada','erro');
CREATE TYPE public.caixa_natureza AS ENUM ('debito','credito');

-- ============ PLANO DE CONTAS ============
CREATE TABLE public.plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo public.conta_tipo NOT NULL,
  conta_pai_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, codigo)
);
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own plano_contas" ON public.plano_contas FOR ALL
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = plano_contas.empresa_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = plano_contas.empresa_id AND e.user_id = auth.uid()));

-- ============ PRODUTOS ============
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cest TEXT,
  cfop_padrao TEXT,
  unidade TEXT NOT NULL DEFAULT 'UN',
  preco_venda NUMERIC(14,4) NOT NULL DEFAULT 0,
  custo_medio NUMERIC(14,4) NOT NULL DEFAULT 0,
  estoque_atual NUMERIC(14,4) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(14,4) NOT NULL DEFAULT 0,
  origem TEXT DEFAULT '0',
  icms_cst TEXT,
  icms_aliquota NUMERIC(6,2) DEFAULT 0,
  pis_cst TEXT,
  cofins_cst TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, sku)
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own produtos" ON public.produtos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = produtos.empresa_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = produtos.empresa_id AND e.user_id = auth.uid()));

-- ============ NOTAS FISCAIS ============
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo public.nf_tipo NOT NULL,
  modelo public.nf_modelo NOT NULL DEFAULT '55',
  serie INTEGER NOT NULL DEFAULT 1,
  numero BIGINT,
  chave TEXT UNIQUE,
  status public.nf_status NOT NULL DEFAULT 'rascunho',
  natureza_operacao TEXT NOT NULL DEFAULT 'Venda',
  data_emissao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_autorizacao TIMESTAMPTZ,
  destinatario_nome TEXT,
  destinatario_cnpj_cpf TEXT,
  destinatario_ie TEXT,
  destinatario_endereco JSONB DEFAULT '{}'::jsonb,
  emitente_cnpj TEXT,
  valor_produtos NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_icms NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_ipi NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_pis NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_cofins NUMERIC(14,2) NOT NULL DEFAULT 0,
  protocolo TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  plugnotas_id TEXT,
  motivo_rejeicao TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own nfs" ON public.notas_fiscais FOR ALL
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = notas_fiscais.empresa_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = notas_fiscais.empresa_id AND e.user_id = auth.uid()));

CREATE INDEX idx_nf_empresa_status ON public.notas_fiscais(empresa_id, status);
CREATE INDEX idx_nf_data ON public.notas_fiscais(data_emissao DESC);

-- ============ ITENS DA NF ============
CREATE TABLE public.nf_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 1,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'UN',
  quantidade NUMERIC(14,4) NOT NULL,
  valor_unitario NUMERIC(14,4) NOT NULL,
  valor_total NUMERIC(14,2) NOT NULL,
  icms_base NUMERIC(14,2) DEFAULT 0,
  icms_aliquota NUMERIC(6,2) DEFAULT 0,
  icms_valor NUMERIC(14,2) DEFAULT 0,
  ipi_valor NUMERIC(14,2) DEFAULT 0,
  pis_valor NUMERIC(14,2) DEFAULT 0,
  cofins_valor NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.nf_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage nf_itens via nf" ON public.nf_itens FOR ALL
  USING (EXISTS (SELECT 1 FROM public.notas_fiscais n JOIN public.empresas e ON e.id = n.empresa_id WHERE n.id = nf_itens.nf_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.notas_fiscais n JOIN public.empresas e ON e.id = n.empresa_id WHERE n.id = nf_itens.nf_id AND e.user_id = auth.uid()));

-- ============ MOVIMENTAÇÕES DE ESTOQUE ============
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  tipo public.movimento_tipo NOT NULL,
  quantidade NUMERIC(14,4) NOT NULL,
  custo_unitario NUMERIC(14,4) NOT NULL DEFAULT 0,
  nf_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  observacao TEXT,
  data_movimento TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own movimentos" ON public.movimentacoes_estoque FOR ALL
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = movimentacoes_estoque.empresa_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = movimentacoes_estoque.empresa_id AND e.user_id = auth.uid()));

CREATE INDEX idx_mov_produto_data ON public.movimentacoes_estoque(produto_id, data_movimento DESC);

-- ============ LIVRO CAIXA ============
CREATE TABLE public.livro_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  conta_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  natureza public.caixa_natureza NOT NULL,
  valor NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  historico TEXT NOT NULL,
  documento TEXT,
  nf_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.livro_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own caixa" ON public.livro_caixa FOR ALL
  USING (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = livro_caixa.empresa_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.empresas e WHERE e.id = livro_caixa.empresa_id AND e.user_id = auth.uid()));

CREATE INDEX idx_caixa_empresa_data ON public.livro_caixa(empresa_id, data_lancamento DESC);

-- ============ TRIGGER: atualiza estoque automaticamente ============
CREATE OR REPLACE FUNCTION public.fn_atualiza_estoque()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'entrada' THEN
    UPDATE public.produtos SET estoque_atual = estoque_atual + NEW.quantidade, updated_at = now() WHERE id = NEW.produto_id;
  ELSIF NEW.tipo = 'saida' THEN
    UPDATE public.produtos SET estoque_atual = estoque_atual - NEW.quantidade, updated_at = now() WHERE id = NEW.produto_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.produtos SET estoque_atual = NEW.quantidade, updated_at = now() WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_atualiza_estoque AFTER INSERT ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.fn_atualiza_estoque();

-- ============ TRIGGERS de updated_at ============
CREATE TRIGGER trg_plano_contas_updated BEFORE UPDATE ON public.plano_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_nf_updated BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
