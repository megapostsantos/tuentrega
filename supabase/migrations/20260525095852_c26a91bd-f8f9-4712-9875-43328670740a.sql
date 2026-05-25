
-- 1) ofertas payment columns
ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS payment_notes text,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid;

-- 2) pagamentos table
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  entregador_id uuid NOT NULL,
  ofertas_ids uuid[] NOT NULL DEFAULT '{}',
  valor_total numeric NOT NULL DEFAULT 0,
  data_pagamento timestamptz NOT NULL DEFAULT now(),
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage pagamentos" ON public.pagamentos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "empresa manage pagamentos" ON public.pagamentos
  FOR ALL TO authenticated
  USING (auth.uid() = empresa_id)
  WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "entregador view pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON public.pagamentos(empresa_id, data_pagamento DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_entregador ON public.pagamentos(entregador_id, data_pagamento DESC);

-- 3) extratos_mensais table
CREATE TABLE IF NOT EXISTS public.extratos_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL,
  mes_referencia text NOT NULL,
  total_entregas integer NOT NULL DEFAULT 0,
  total_pacotes integer NOT NULL DEFAULT 0,
  total_bruto numeric NOT NULL DEFAULT 0,
  total_recebido numeric NOT NULL DEFAULT 0,
  total_pendente numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entregador_id, mes_referencia)
);
ALTER TABLE public.extratos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage extratos" ON public.extratos_mensais
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "entregador view own extratos" ON public.extratos_mensais
  FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE POLICY "empresa view extratos" ON public.extratos_mensais
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'empresa'::app_role));
