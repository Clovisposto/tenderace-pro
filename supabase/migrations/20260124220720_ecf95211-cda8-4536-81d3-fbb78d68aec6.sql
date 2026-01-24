-- Add column for tender type preference (compra, servico, or both)
ALTER TABLE public.configuracoes 
ADD COLUMN tipos_licitacao text[] DEFAULT ARRAY['compra', 'servico']::text[];

COMMENT ON COLUMN public.configuracoes.tipos_licitacao IS 'Tipos de licitação permitidos: compra, servico, ou ambos';