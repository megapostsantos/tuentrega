
-- Extend ofertas with new business fields
ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS tipo_entrega text,
  ADD COLUMN IF NOT EXISTS veiculo_necessario text,
  ADD COLUMN IF NOT EXISTS quantidade_pacotes integer,
  ADD COLUMN IF NOT EXISTS valor_por_pacote numeric,
  ADD COLUMN IF NOT EXISTS endereco_coleta text,
  ADD COLUMN IF NOT EXISTS prazo_pagamento text,
  ADD COLUMN IF NOT EXISTS prazo_pagamento_data date,
  ADD COLUMN IF NOT EXISTS data_trabalho date,
  ADD COLUMN IF NOT EXISTS hora_inicio time,
  ADD COLUMN IF NOT EXISTS hora_fim time,
  ADD COLUMN IF NOT EXISTS expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS entregador_id uuid;

-- Normalize status default to 'open'
ALTER TABLE public.ofertas ALTER COLUMN status SET DEFAULT 'open';

-- Allow deliverer to accept an open offer (assign themselves)
DROP POLICY IF EXISTS "entregador accept open ofertas" ON public.ofertas;
CREATE POLICY "entregador accept open ofertas" ON public.ofertas
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'entregador'::app_role) AND (status = 'open' OR entregador_id = auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'entregador'::app_role) AND (entregador_id = auth.uid()));

-- Packages table
CREATE TABLE IF NOT EXISTS public.entregas_pacotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL,
  numero_pacote integer NOT NULL,
  endereco_entrega text,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.entregas_pacotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin all pacotes" ON public.entregas_pacotes;
CREATE POLICY "admin all pacotes" ON public.entregas_pacotes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "empresa manage pacotes" ON public.entregas_pacotes;
CREATE POLICY "empresa manage pacotes" ON public.entregas_pacotes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ofertas o WHERE o.id = oferta_id AND o.empresa_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ofertas o WHERE o.id = oferta_id AND o.empresa_id = auth.uid()));

DROP POLICY IF EXISTS "entregador view own pacotes" ON public.entregas_pacotes;
CREATE POLICY "entregador view own pacotes" ON public.entregas_pacotes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ofertas o WHERE o.id = oferta_id AND o.entregador_id = auth.uid()));

DROP POLICY IF EXISTS "entregador update own pacotes" ON public.entregas_pacotes;
CREATE POLICY "entregador update own pacotes" ON public.entregas_pacotes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ofertas o WHERE o.id = oferta_id AND o.entregador_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ofertas o WHERE o.id = oferta_id AND o.entregador_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pacotes_oferta ON public.entregas_pacotes(oferta_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_status ON public.ofertas(status);
CREATE INDEX IF NOT EXISTS idx_ofertas_entregador ON public.ofertas(entregador_id);

-- Enable realtime
ALTER TABLE public.ofertas REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ofertas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
