CREATE TABLE public.integracoes_ml (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  ml_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integracoes_ml TO authenticated;
GRANT ALL ON public.integracoes_ml TO service_role;

ALTER TABLE public.integracoes_ml ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa manages own ML integration"
ON public.integracoes_ml FOR ALL
TO authenticated
USING (auth.uid() = empresa_id)
WITH CHECK (auth.uid() = empresa_id);

CREATE TRIGGER set_updated_at_integracoes_ml
BEFORE UPDATE ON public.integracoes_ml
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();