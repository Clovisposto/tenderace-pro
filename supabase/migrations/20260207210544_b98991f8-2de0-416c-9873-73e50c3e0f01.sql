
-- Adicionar novas colunas à tabela empresas para suportar CNAE, Certificado Digital, Gov.br e Política de Participação
ALTER TABLE public.empresas 
  ADD COLUMN IF NOT EXISTS cnae_codigo text,
  ADD COLUMN IF NOT EXISTS cnae_descricao text,
  ADD COLUMN IF NOT EXISTS certificado_digital_tipo text,
  ADD COLUMN IF NOT EXISTS certificado_digital_validade timestamp with time zone,
  ADD COLUMN IF NOT EXISTS certificado_digital_emissor text,
  ADD COLUMN IF NOT EXISTS govbr_vinculado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS politica_participacao jsonb DEFAULT '{}'::jsonb;
