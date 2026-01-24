-- Add column for modalidades preference
ALTER TABLE public.configuracoes 
ADD COLUMN modalidades_permitidas text[] DEFAULT ARRAY['Dispensa com Disputa', 'Dispensa sem Disputa', 'Compra Direta']::text[];

COMMENT ON COLUMN public.configuracoes.modalidades_permitidas IS 'Modalidades de licitação permitidas para captação';