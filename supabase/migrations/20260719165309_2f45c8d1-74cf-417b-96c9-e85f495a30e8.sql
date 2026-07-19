
CREATE TABLE public.filiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cidade text,
  estado text,
  cep text,
  rua text,
  numero text,
  whatsapp text,
  responsavel text,
  ativa boolean NOT NULL DEFAULT true,
  pendente_aprovacao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_filiais_empresa ON public.filiais(empresa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.filiais TO authenticated;
GRANT ALL ON public.filiais TO service_role;

ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa vê suas filiais"
  ON public.filiais FOR SELECT TO authenticated
  USING (auth.uid() = empresa_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Empresa cria filiais pendentes"
  ON public.filiais FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = empresa_id AND pendente_aprovacao = true)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin atualiza filiais"
  ON public.filiais FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin remove filiais"
  ON public.filiais FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_filiais_updated_at
  BEFORE UPDATE ON public.filiais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.operacoes ADD COLUMN IF NOT EXISTS filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL;
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operacoes_filial ON public.operacoes(filial_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_filial ON public.ofertas(filial_id);
