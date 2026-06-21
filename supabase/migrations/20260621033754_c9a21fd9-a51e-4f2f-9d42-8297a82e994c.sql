-- Add geocoding/optimization columns to entregas_pacotes
ALTER TABLE public.entregas_pacotes
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS ordem_otimizada integer,
  ADD COLUMN IF NOT EXISTS distancia_anterior_metros integer,
  ADD COLUMN IF NOT EXISTS tempo_estimado_minutos integer,
  ADD COLUMN IF NOT EXISTS janela_inicio time,
  ADD COLUMN IF NOT EXISTS janela_fim time,
  ADD COLUMN IF NOT EXISTS instrucoes_especiais text;

-- New table rotas_otimizadas
CREATE TABLE public.rotas_otimizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  distancia_total_km double precision,
  tempo_total_minutos integer,
  sequencia_otimizada jsonb NOT NULL DEFAULT '[]'::jsonb,
  otimizado_em timestamptz NOT NULL DEFAULT now(),
  algoritmo text NOT NULL DEFAULT 'nearest_neighbor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas_otimizadas TO authenticated;
GRANT ALL ON public.rotas_otimizadas TO service_role;

ALTER TABLE public.rotas_otimizadas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS rotas_otimizadas_oferta_id_idx ON public.rotas_otimizadas(oferta_id);

-- RLS: empresa dona da oferta e entregador alocado podem ver
CREATE POLICY "Empresa e entregador da oferta podem ver rotas otimizadas"
ON public.rotas_otimizadas FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.id = rotas_otimizadas.oferta_id
      AND (o.empresa_id = auth.uid() OR o.entregador_id = auth.uid())
  )
);

CREATE POLICY "Empresa da oferta pode inserir rotas otimizadas"
ON public.rotas_otimizadas FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.id = rotas_otimizadas.oferta_id
      AND o.empresa_id = auth.uid()
  )
);

CREATE POLICY "Empresa da oferta pode atualizar rotas otimizadas"
ON public.rotas_otimizadas FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.id = rotas_otimizadas.oferta_id
      AND o.empresa_id = auth.uid()
  )
);

CREATE POLICY "Empresa da oferta pode remover rotas otimizadas"
ON public.rotas_otimizadas FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.id = rotas_otimizadas.oferta_id
      AND o.empresa_id = auth.uid()
  )
);

CREATE TRIGGER rotas_otimizadas_set_updated_at
BEFORE UPDATE ON public.rotas_otimizadas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
