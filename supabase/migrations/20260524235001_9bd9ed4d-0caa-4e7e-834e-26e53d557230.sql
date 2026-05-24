
CREATE TABLE public.operacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  data_operacao DATE NOT NULL DEFAULT CURRENT_DATE,
  total_pacotes_sistema INTEGER NOT NULL DEFAULT 0,
  total_pacotes_contados INTEGER NOT NULL DEFAULT 0,
  total_paradas INTEGER NOT NULL DEFAULT 0,
  pacotes_faltando INTEGER NOT NULL DEFAULT 0,
  pacotes_a_mais INTEGER NOT NULL DEFAULT 0,
  valor_por_pacote NUMERIC NOT NULL DEFAULT 0,
  valor_ml_por_pacote NUMERIC NOT NULL DEFAULT 2.60,
  metodo_divisao TEXT NOT NULL DEFAULT 'packages',
  status TEXT NOT NULL DEFAULT 'draft',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operacoes_empresa ON public.operacoes(empresa_id, data_operacao DESC);

ALTER TABLE public.operacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa manage operacoes" ON public.operacoes
  FOR ALL TO authenticated
  USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "admin manage operacoes" ON public.operacoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_operacoes_updated_at
  BEFORE UPDATE ON public.operacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.rotas_operacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operacao_id UUID NOT NULL REFERENCES public.operacoes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  quantidade_pacotes INTEGER NOT NULL DEFAULT 0,
  quantidade_paradas INTEGER NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  oferta_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rotas_operacao_op ON public.rotas_operacao(operacao_id);
CREATE INDEX idx_rotas_operacao_empresa ON public.rotas_operacao(empresa_id);

ALTER TABLE public.rotas_operacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa manage rotas" ON public.rotas_operacao
  FOR ALL TO authenticated
  USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "admin manage rotas" ON public.rotas_operacao
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_rotas_operacao_updated_at
  BEFORE UPDATE ON public.rotas_operacao
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS operacao_id UUID,
  ADD COLUMN IF NOT EXISTS rota_operacao_id UUID,
  ADD COLUMN IF NOT EXISTS quantidade_paradas INTEGER;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS tms_valor_padrao_pacote NUMERIC,
  ADD COLUMN IF NOT EXISTS tms_pacotes_por_rota INTEGER,
  ADD COLUMN IF NOT EXISTS tms_metodo_padrao TEXT DEFAULT 'packages',
  ADD COLUMN IF NOT EXISTS tms_mostrar_margem BOOLEAN NOT NULL DEFAULT true;
