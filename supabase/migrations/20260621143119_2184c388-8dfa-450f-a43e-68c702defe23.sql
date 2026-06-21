CREATE TABLE public.financeiro_lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida')),
  categoria text NOT NULL,
  descricao text,
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_lancamentos TO authenticated;
GRANT ALL ON public.financeiro_lancamentos TO service_role;

ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa manages own lancamentos"
ON public.financeiro_lancamentos FOR ALL
TO authenticated
USING (auth.uid() = empresa_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = empresa_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX idx_financeiro_lancamentos_empresa_data
  ON public.financeiro_lancamentos(empresa_id, data_lancamento DESC);

CREATE TRIGGER trg_financeiro_lancamentos_updated_at
BEFORE UPDATE ON public.financeiro_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for financeiro-comprovantes bucket (bucket criado via tool)
CREATE POLICY "Empresa reads own financeiro comprovantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'financeiro-comprovantes'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Empresa uploads own financeiro comprovantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'financeiro-comprovantes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Empresa updates own financeiro comprovantes"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'financeiro-comprovantes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Empresa deletes own financeiro comprovantes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'financeiro-comprovantes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
