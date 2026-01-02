-- Create enum types
CREATE TYPE public.portal_type AS ENUM (
  'PNCP', 
  'ComprasNet', 
  'ComprasPublicas', 
  'BLL', 
  'Caixa', 
  'BB', 
  'Portal Estadual', 
  'Portal Municipal'
);

CREATE TYPE public.modalidade_type AS ENUM (
  'Dispensa com Disputa', 
  'Dispensa sem Disputa', 
  'Compra Direta'
);

CREATE TYPE public.compliance_status AS ENUM (
  'Apta', 
  'Apta c/ Ressalva', 
  'Inapta'
);

CREATE TYPE public.licitacao_status AS ENUM (
  'Nova', 
  'Em Análise', 
  'Aguardando Autorização', 
  'Autorizada', 
  'Em Disputa', 
  'Vencida', 
  'Perdida', 
  'Cancelada'
);

CREATE TYPE public.segmento_type AS ENUM (
  'Medicamentos', 
  'Empreendimentos'
);

CREATE TYPE public.proposta_status AS ENUM (
  'Rascunho',
  'Enviada',
  'Em Disputa',
  'Vencedora',
  'Perdedora',
  'Cancelada'
);

CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'viewer');

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- USER ROLES TABLE
-- =====================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- =====================
-- EMPRESAS TABLE
-- =====================
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT,
  segmento segmento_type NOT NULL DEFAULT 'Empreendimentos',
  sicaf_status TEXT DEFAULT 'Pendente',
  certidoes_validas BOOLEAN DEFAULT false,
  licenca_farmaceutica BOOLEAN DEFAULT false,
  uf TEXT NOT NULL,
  municipio TEXT NOT NULL,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own empresas" ON public.empresas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own empresas" ON public.empresas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own empresas" ON public.empresas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own empresas" ON public.empresas
  FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- LICITACOES TABLE
-- =====================
CREATE TABLE public.licitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal portal_type NOT NULL,
  numero TEXT NOT NULL,
  orgao TEXT NOT NULL,
  uasg TEXT,
  municipio TEXT NOT NULL,
  uf TEXT NOT NULL,
  objeto TEXT NOT NULL,
  objeto_resumido TEXT,
  valor DECIMAL(15,2) NOT NULL,
  modalidade modalidade_type NOT NULL,
  data_abertura TIMESTAMPTZ NOT NULL,
  data_limite TIMESTAMPTZ NOT NULL,
  status licitacao_status NOT NULL DEFAULT 'Nova',
  segmento segmento_type NOT NULL,
  edital_url TEXT,
  edital_analisado BOOLEAN DEFAULT false,
  roi_score INTEGER DEFAULT 0,
  risco_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(portal, numero)
);

ALTER TABLE public.licitacoes ENABLE ROW LEVEL SECURITY;

-- Licitações são públicas para leitura por usuários autenticados
CREATE POLICY "Authenticated users can view licitacoes" ON public.licitacoes
  FOR SELECT TO authenticated USING (true);

-- Somente admins podem criar/atualizar licitações
CREATE POLICY "Admins can manage licitacoes" ON public.licitacoes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- ANALISE EDITAL TABLE
-- =====================
CREATE TABLE public.analise_editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  exigencias JSONB DEFAULT '[]',
  criterios JSONB DEFAULT '[]',
  riscos JSONB DEFAULT '[]',
  penalidades JSONB DEFAULT '[]',
  prazo_entrega TEXT,
  local_entrega TEXT,
  condicoes_pagamento TEXT,
  observacoes TEXT,
  analisado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(licitacao_id)
);

ALTER TABLE public.analise_editais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view analises" ON public.analise_editais
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage analises" ON public.analise_editais
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- COMPLIANCE TABLE
-- =====================
CREATE TABLE public.compliance_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  status compliance_status NOT NULL DEFAULT 'Apta',
  checklist JSONB DEFAULT '{}',
  observacoes TEXT,
  verificado_em TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, licitacao_id)
);

ALTER TABLE public.compliance_empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own compliance" ON public.compliance_empresas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = compliance_empresas.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own compliance" ON public.compliance_empresas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = compliance_empresas.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

-- =====================
-- COTACOES TABLE
-- =====================
CREATE TABLE public.cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  preco_referencia DECIMAL(15,2) NOT NULL,
  icms_uf DECIMAL(5,2) DEFAULT 0,
  custo_logistica DECIMAL(15,2) DEFAULT 0,
  margem_minima DECIMAL(5,2) DEFAULT 8,
  preco_sugerido DECIMAL(15,2),
  preco_final DECIMAL(15,2),
  margem_final DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, licitacao_id)
);

ALTER TABLE public.cotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cotacoes" ON public.cotacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = cotacoes.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own cotacoes" ON public.cotacoes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = cotacoes.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

-- =====================
-- PROPOSTAS TABLE
-- =====================
CREATE TABLE public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  cotacao_id UUID REFERENCES public.cotacoes(id),
  status proposta_status NOT NULL DEFAULT 'Rascunho',
  valor_proposta DECIMAL(15,2) NOT NULL,
  autorizado_por UUID REFERENCES auth.users(id),
  autorizado_em TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  documentos JSONB DEFAULT '[]',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, licitacao_id)
);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own propostas" ON public.propostas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = propostas.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own propostas" ON public.propostas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = propostas.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

-- =====================
-- HISTORICO DISPUTAS TABLE
-- =====================
CREATE TABLE public.historico_disputas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  valor_lance DECIMAL(15,2),
  posicao INTEGER,
  competidores INTEGER,
  menor_lance DECIMAL(15,2),
  detalhes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_disputas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own historico" ON public.historico_disputas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = historico_disputas.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own historico" ON public.historico_disputas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE empresas.id = historico_disputas.empresa_id 
      AND empresas.user_id = auth.uid()
    )
  );

-- =====================
-- CONFIGURACOES TABLE
-- =====================
CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  valor_minimo DECIMAL(15,2) DEFAULT 1000,
  valor_maximo DECIMAL(15,2) DEFAULT 35000,
  margem_minima DECIMAL(5,2) DEFAULT 8,
  lance_automatico BOOLEAN DEFAULT true,
  notificacoes_email BOOLEAN DEFAULT true,
  notificacoes_push BOOLEAN DEFAULT true,
  captacao_continua BOOLEAN DEFAULT true,
  prioridade_interior BOOLEAN DEFAULT true,
  ufs_priorizadas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own configuracoes" ON public.configuracoes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own configuracoes" ON public.configuracoes
  FOR ALL USING (auth.uid() = user_id);

-- =====================
-- LOGS AUDITORIA TABLE
-- =====================
CREATE TABLE public.logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES public.empresas(id),
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.logs_auditoria
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" ON public.logs_auditoria
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_licitacoes_updated_at BEFORE UPDATE ON public.licitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analise_editais_updated_at BEFORE UPDATE ON public.analise_editais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cotacoes_updated_at BEFORE UPDATE ON public.cotacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_licitacoes_status ON public.licitacoes(status);
CREATE INDEX idx_licitacoes_segmento ON public.licitacoes(segmento);
CREATE INDEX idx_licitacoes_portal ON public.licitacoes(portal);
CREATE INDEX idx_licitacoes_data_limite ON public.licitacoes(data_limite);
CREATE INDEX idx_licitacoes_valor ON public.licitacoes(valor);
CREATE INDEX idx_empresas_user_id ON public.empresas(user_id);
CREATE INDEX idx_propostas_status ON public.propostas(status);
CREATE INDEX idx_historico_disputas_licitacao ON public.historico_disputas(licitacao_id);
CREATE INDEX idx_logs_auditoria_user ON public.logs_auditoria(user_id);
CREATE INDEX idx_logs_auditoria_created ON public.logs_auditoria(created_at);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.licitacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.propostas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_disputas;