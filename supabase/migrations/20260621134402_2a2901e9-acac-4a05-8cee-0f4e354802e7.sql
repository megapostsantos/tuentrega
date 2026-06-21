
ALTER TABLE public.entregas_pacotes
  ADD COLUMN IF NOT EXISTS assinatura_url text,
  ADD COLUMN IF NOT EXISTS foto_pod_url text,
  ADD COLUMN IF NOT EXISTS nome_recebedor text,
  ADD COLUMN IF NOT EXISTS observacao_entrega text,
  ADD COLUMN IF NOT EXISTS entregue_em timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_nao_entrega text,
  ADD COLUMN IF NOT EXISTS tentativas integer NOT NULL DEFAULT 0;

-- Storage policies for bucket provas-entrega
CREATE POLICY "Entregador upload prova na propria pasta"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'provas-entrega'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Entregador atualiza prova na propria pasta"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'provas-entrega'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Entregador le propria prova"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'provas-entrega'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Empresa le prova de suas ofertas"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'provas-entrega'
  AND EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = auth.uid()
      AND o.entregador_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Admin le todas provas"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'provas-entrega'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
