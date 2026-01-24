-- Adicionar campos de notificação avançada na tabela configuracoes
ALTER TABLE public.configuracoes
ADD COLUMN IF NOT EXISTS notificacoes_telefone boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS telefone_notificacao text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notificacoes_vitoria boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notificacoes_derrota boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notificacoes_nova_licitacao boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notificacoes_prazo_urgente boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notificacoes_disputa boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS som_notificacao boolean DEFAULT true;