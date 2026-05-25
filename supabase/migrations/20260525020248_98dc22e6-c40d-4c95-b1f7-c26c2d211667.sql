-- Columns on ofertas
ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS pacotes_entregues integer,
  ADD COLUMN IF NOT EXISTS pacotes_nao_entregues integer,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closing_notes text;

-- Occurrences table
CREATE TABLE IF NOT EXISTS public.entregas_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL,
  entregador_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  numero_pacote integer NOT NULL,
  motivo text NOT NULL CHECK (motivo IN ('address_not_visited','lost','damaged','could_not_deliver')),
  sub_motivo text,
  fotos_urls text[] NOT NULL DEFAULT '{}',
  score_impact integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entregas_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage ocorrencias" ON public.entregas_ocorrencias
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "empresa view ocorrencias" ON public.entregas_ocorrencias
  FOR SELECT TO authenticated USING (auth.uid() = empresa_id);

CREATE POLICY "entregador insert ocorrencias" ON public.entregas_ocorrencias
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = entregador_id);

CREATE POLICY "entregador view own ocorrencias" ON public.entregas_ocorrencias
  FOR SELECT TO authenticated USING (auth.uid() = entregador_id);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_oferta ON public.entregas_ocorrencias(oferta_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_empresa ON public.entregas_ocorrencias(empresa_id);

ALTER TABLE public.entregas_ocorrencias REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas_ocorrencias;

-- Storage bucket for incident photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas-fotos','entregas-fotos', false)
ON CONFLICT (id) DO NOTHING;

-- Path layout: {oferta_id}/{package_num}/{timestamp}.jpg
CREATE POLICY "entregador upload entregas-fotos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'entregas-fotos'
    AND EXISTS (
      SELECT 1 FROM public.ofertas o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.entregador_id = auth.uid()
    )
  );

CREATE POLICY "entregador view own entregas-fotos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'entregas-fotos'
    AND EXISTS (
      SELECT 1 FROM public.ofertas o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.entregador_id = auth.uid()
    )
  );

CREATE POLICY "empresa view related entregas-fotos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'entregas-fotos'
    AND EXISTS (
      SELECT 1 FROM public.ofertas o
      WHERE o.id::text = (storage.foldername(name))[1]
        AND o.empresa_id = auth.uid()
    )
  );

CREATE POLICY "admin manage entregas-fotos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'entregas-fotos' AND has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'entregas-fotos' AND has_role(auth.uid(),'admin'::app_role));
