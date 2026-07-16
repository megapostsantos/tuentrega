
ALTER TABLE public.operacoes
  ADD COLUMN IF NOT EXISTS tipo_servico text NOT NULL DEFAULT 'flex',
  ADD COLUMN IF NOT EXISTS nx_code text,
  ADD COLUMN IF NOT EXISTS saca_qr_code text;

ALTER TABLE public.operacoes
  DROP CONSTRAINT IF EXISTS operacoes_tipo_servico_check;
ALTER TABLE public.operacoes
  ADD CONSTRAINT operacoes_tipo_servico_check CHECK (tipo_servico IN ('flex','nex'));

ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS tipo_servico text NOT NULL DEFAULT 'flex';
ALTER TABLE public.ofertas
  DROP CONSTRAINT IF EXISTS ofertas_tipo_servico_check;
ALTER TABLE public.ofertas
  ADD CONSTRAINT ofertas_tipo_servico_check CHECK (tipo_servico IN ('flex','nex'));

ALTER TABLE public.entregas_pacotes
  ADD COLUMN IF NOT EXISTS nx_code text;

CREATE INDEX IF NOT EXISTS operacoes_nx_code_idx ON public.operacoes (nx_code) WHERE nx_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS entregas_pacotes_nx_code_idx ON public.entregas_pacotes (nx_code) WHERE nx_code IS NOT NULL;
