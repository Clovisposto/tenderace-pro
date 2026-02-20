
-- Adicionar coluna para CNAEs secundários (array de objetos {codigo, descricao})
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS cnaes_secundarios jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.empresas.cnaes_secundarios IS 'Lista de CNAEs secundários: [{codigo: string, descricao: string}]';
