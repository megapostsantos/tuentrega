
CREATE TABLE public.entregador_localizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL REFERENCES public.entregadores(id) ON DELETE CASCADE,
  oferta_id uuid REFERENCES public.ofertas(id) ON DELETE SET NULL,
  lat float8 NOT NULL,
  lng float8 NOT NULL,
  velocidade_kmh float8,
  registrado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entregador_localizacao_ent_data
  ON public.entregador_localizacao (entregador_id, registrado_em DESC);

GRANT SELECT, INSERT ON public.entregador_localizacao TO authenticated;
GRANT ALL ON public.entregador_localizacao TO service_role;

ALTER TABLE public.entregador_localizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entregador insere própria localização"
  ON public.entregador_localizacao FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = entregador_id);

CREATE POLICY "Entregador vê própria localização"
  ON public.entregador_localizacao FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE POLICY "Empresa vê localização de entregadores com oferta ativa"
  ON public.entregador_localizacao FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ofertas o
      WHERE o.entregador_id = entregador_localizacao.entregador_id
        AND o.empresa_id = auth.uid()
        AND o.status IN ('accepted', 'in_progress')
    )
  );

CREATE POLICY "Admin vê todas as localizações"
  ON public.entregador_localizacao FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE VIEW public.entregador_localizacao_atual
WITH (security_invoker = true) AS
SELECT DISTINCT ON (entregador_id)
  id, entregador_id, oferta_id, lat, lng, velocidade_kmh, registrado_em
FROM public.entregador_localizacao
ORDER BY entregador_id, registrado_em DESC;

GRANT SELECT ON public.entregador_localizacao_atual TO authenticated;
GRANT ALL ON public.entregador_localizacao_atual TO service_role;
