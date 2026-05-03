
CREATE TABLE IF NOT EXISTS public.sicaf_drive_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  folder_id text NOT NULL,
  folder_name text,
  ativo boolean NOT NULL DEFAULT true,
  ultima_sincronizacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sicaf_drive_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own drive config"
ON public.sicaf_drive_config FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_sicaf_drive_config_updated_at
BEFORE UPDATE ON public.sicaf_drive_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
