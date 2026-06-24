
CREATE POLICY "empresa upload nota own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notas-fiscais'
    AND (storage.foldername(name))[1] = 'empresa'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "empresa read own nota uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'notas-fiscais'
    AND (storage.foldername(name))[1] = 'empresa'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "empresa delete own nota uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'notas-fiscais'
    AND (storage.foldername(name))[1] = 'empresa'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow entregador to read NFs the empresa uploaded for them is not needed here;
-- we use signed URLs for cross-access.
