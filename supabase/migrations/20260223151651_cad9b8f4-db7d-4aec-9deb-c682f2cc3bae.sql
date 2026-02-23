
-- Bucket privado para certificados digitais
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-digitais', 'certificados-digitais', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: apenas o dono pode fazer upload/ver seus certificados
CREATE POLICY "Users can upload their own certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificados-digitais' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificados-digitais' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own certificates"
ON storage.objects FOR DELETE
USING (bucket_id = 'certificados-digitais' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Tabela de controle do robô por licitação
CREATE TABLE public.robo_configuracao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  licitacao_id UUID NOT NULL REFERENCES public.licitacoes(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT false,
  valor_minimo NUMERIC,
  margem_minima NUMERIC DEFAULT 8,
  lance_agressivo BOOLEAN DEFAULT false,
  certificado_path TEXT,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'conectando', 'na_sala', 'disputando', 'finalizado', 'erro')),
  ultimo_heartbeat TIMESTAMPTZ,
  erro_mensagem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, licitacao_id)
);

ALTER TABLE public.robo_configuracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own robot configs"
ON public.robo_configuracao FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_robo_configuracao_updated_at
BEFORE UPDATE ON public.robo_configuracao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para o painel ver status do robô
ALTER PUBLICATION supabase_realtime ADD TABLE public.robo_configuracao;
