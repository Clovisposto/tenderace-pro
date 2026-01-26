-- Adicionar constraint UNIQUE na coluna numero da tabela licitacoes
-- Isso permite upsert por número da licitação
ALTER TABLE public.licitacoes 
ADD CONSTRAINT licitacoes_numero_unique UNIQUE (numero);