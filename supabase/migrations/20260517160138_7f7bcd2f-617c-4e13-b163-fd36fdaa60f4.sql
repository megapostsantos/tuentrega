
-- Empresas
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  nome_fantasia TEXT,
  segmento TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  whatsapp TEXT,
  responsavel TEXT,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa own select" ON public.empresas FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "empresa own insert" ON public.empresas FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "empresa own update" ON public.empresas FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "entregadores view empresas basics" ON public.empresas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'entregador'));
CREATE TRIGGER empresas_updated BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Entregadores
CREATE TYPE public.veiculo_tipo AS ENUM ('walker','biker','motoboy','carro','caminhao');
CREATE TYPE public.pix_tipo AS ENUM ('cpf','cnpj','email','telefone','aleatoria');

CREATE TABLE public.entregadores (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  tipo_veiculo public.veiculo_tipo,
  bairros TEXT[] NOT NULL DEFAULT '{}',
  pix_tipo public.pix_tipo,
  pix_chave TEXT,
  banco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entregadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregador own select" ON public.entregadores FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "entregador own insert" ON public.entregadores FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "entregador own update" ON public.entregadores FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "empresas view entregadores" ON public.entregadores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'empresa'));
CREATE TRIGGER entregadores_updated BEFORE UPDATE ON public.entregadores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ofertas
CREATE TABLE public.ofertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  bairro TEXT,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  exige_nota_fiscal BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa manage ofertas" ON public.ofertas FOR ALL TO authenticated USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);
CREATE POLICY "entregadores view ofertas abertas" ON public.ofertas FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'entregador'));
CREATE TRIGGER ofertas_updated BEFORE UPDATE ON public.ofertas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Entregas
CREATE TABLE public.entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id UUID REFERENCES public.ofertas(id) ON DELETE SET NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  entregador_id UUID NOT NULL REFERENCES public.entregadores(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  exige_nota_fiscal BOOLEAN NOT NULL DEFAULT FALSE,
  nota_fiscal_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | pago
  data_entrega TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_pagamento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa manage entregas" ON public.entregas FOR ALL TO authenticated USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);
CREATE POLICY "entregador view entregas" ON public.entregas FOR SELECT TO authenticated USING (auth.uid() = entregador_id);
CREATE POLICY "entregador update nota" ON public.entregas FOR UPDATE TO authenticated USING (auth.uid() = entregador_id) WITH CHECK (auth.uid() = entregador_id);
CREATE INDEX idx_entregas_empresa ON public.entregas(empresa_id, data_entrega);
CREATE INDEX idx_entregas_entregador ON public.entregas(entregador_id, data_entrega);
CREATE TRIGGER entregas_updated BEFORE UPDATE ON public.entregas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket notas fiscais (privado)
INSERT INTO storage.buckets (id, name, public) VALUES ('notas-fiscais', 'notas-fiscais', false);

CREATE POLICY "entregador upload nota" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas-fiscais' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "entregador read own nota" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notas-fiscais' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "empresa read notas of own entregas" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'notas-fiscais'
    AND EXISTS (
      SELECT 1 FROM public.entregas e
      WHERE e.nota_fiscal_url = storage.objects.name
        AND e.empresa_id = auth.uid()
    )
  );

-- Update handle_new_user to also populate empresas/entregadores from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _meta jsonb;
BEGIN
  _meta := NEW.raw_user_meta_data;
  _role := COALESCE((_meta->>'role')::public.app_role, 'entregador');

  INSERT INTO public.profiles (id, full_name, phone, company_name)
  VALUES (NEW.id, _meta->>'full_name', _meta->>'phone', _meta->>'company_name');

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'empresa' AND (_meta->>'cnpj') IS NOT NULL THEN
    INSERT INTO public.empresas (
      id, razao_social, cnpj, nome_fantasia, segmento, cep, rua, numero, complemento,
      bairro, cidade, estado, whatsapp, responsavel
    ) VALUES (
      NEW.id,
      COALESCE(_meta->>'razao_social', _meta->>'company_name', ''),
      _meta->>'cnpj',
      _meta->>'nome_fantasia',
      _meta->>'segmento',
      _meta->>'cep',
      _meta->>'rua',
      _meta->>'numero',
      _meta->>'complemento',
      _meta->>'bairro',
      _meta->>'cidade',
      _meta->>'estado',
      _meta->>'whatsapp',
      _meta->>'responsavel'
    );
  ELSIF _role = 'entregador' AND (_meta->>'cpf') IS NOT NULL THEN
    INSERT INTO public.entregadores (
      id, nome_completo, cpf, whatsapp, tipo_veiculo, bairros, pix_tipo, pix_chave, banco
    ) VALUES (
      NEW.id,
      COALESCE(_meta->>'full_name', ''),
      _meta->>'cpf',
      _meta->>'whatsapp',
      NULLIF(_meta->>'tipo_veiculo','')::public.veiculo_tipo,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_meta->'bairros')), '{}'::text[]),
      NULLIF(_meta->>'pix_tipo','')::public.pix_tipo,
      _meta->>'pix_chave',
      _meta->>'banco'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger on auth.users exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
