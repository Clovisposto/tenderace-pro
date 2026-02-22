
-- Create storage bucket for letterheads
INSERT INTO storage.buckets (id, name, public)
VALUES ('papeis-timbrados', 'papeis-timbrados', false);

-- RLS: Users can upload their own company letterheads
CREATE POLICY "Users can upload own letterheads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'papeis-timbrados' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can view their own letterheads
CREATE POLICY "Users can view own letterheads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'papeis-timbrados' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can update their own letterheads
CREATE POLICY "Users can update own letterheads"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'papeis-timbrados' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Users can delete their own letterheads
CREATE POLICY "Users can delete own letterheads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'papeis-timbrados' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add column to empresas for the letterhead file path
ALTER TABLE public.empresas
ADD COLUMN papel_timbrado_url text DEFAULT NULL;
