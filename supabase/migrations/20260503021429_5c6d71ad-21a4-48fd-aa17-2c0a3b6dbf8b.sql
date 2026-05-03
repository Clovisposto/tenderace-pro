
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS certidoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sicaf_validade timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sicaf_atualizado_em timestamp with time zone;
