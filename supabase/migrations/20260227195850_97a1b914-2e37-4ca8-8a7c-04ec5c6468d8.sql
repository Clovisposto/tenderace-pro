-- Add encrypted certificate password field to empresas
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS certificado_digital_senha text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.empresas.certificado_digital_senha IS 'Senha do certificado digital A1 (.pfx/.p12) para autenticação Gov.br';