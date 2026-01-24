-- Adicionar coluna para municípios priorizados
ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS municipios_priorizados jsonb DEFAULT '{}'::jsonb;

-- O formato será: { "PA": ["Belém", "Santarém"], "GO": ["Goiânia"] }

COMMENT ON COLUMN public.configuracoes.municipios_priorizados IS 'JSON com municípios selecionados por UF. Formato: {"UF": ["Município1", "Município2"]}. Vazio significa todos os municípios do estado.';