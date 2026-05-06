
ALTER PUBLICATION supabase_realtime DROP TABLE public.empresas;

CREATE POLICY "Users can update own digital certificates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'certificados-digitais'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'certificados-digitais'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
