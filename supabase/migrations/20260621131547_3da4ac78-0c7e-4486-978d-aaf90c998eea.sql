ALTER TABLE public.entregas_pacotes ADD COLUMN IF NOT EXISTS codigo_pacote TEXT;
CREATE INDEX IF NOT EXISTS idx_entregas_pacotes_codigo ON public.entregas_pacotes(codigo_pacote);