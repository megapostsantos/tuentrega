
-- Add 'moto_eletrica' to vehicle enum
ALTER TYPE public.veiculo_tipo ADD VALUE IF NOT EXISTS 'moto_eletrica';

-- Add new entregador columns
ALTER TABLE public.entregadores
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS placa text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS rua text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS turnos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS plataformas text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS plataforma_comprovante_url text;

-- Make bairros optional with default (was already default '{}')
ALTER TABLE public.entregadores ALTER COLUMN bairros SET DEFAULT '{}'::text[];

-- Recreate handle_new_user with the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      id, nome_completo, cpf, whatsapp, tipo_veiculo, bairros,
      pix_tipo, pix_chave, banco,
      data_nascimento, selfie_url, placa,
      cep, rua, numero, complemento, bairro, cidade, estado,
      turnos, plataformas, plataforma_comprovante_url
    ) VALUES (
      NEW.id,
      COALESCE(_meta->>'full_name', ''),
      _meta->>'cpf',
      _meta->>'whatsapp',
      NULLIF(_meta->>'tipo_veiculo','')::public.veiculo_tipo,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_meta->'bairros')), '{}'::text[]),
      NULLIF(_meta->>'pix_tipo','')::public.pix_tipo,
      _meta->>'pix_chave',
      _meta->>'banco',
      NULLIF(_meta->>'data_nascimento','')::date,
      _meta->>'selfie_url',
      _meta->>'placa',
      _meta->>'cep',
      _meta->>'rua',
      _meta->>'numero',
      _meta->>'complemento',
      _meta->>'bairro',
      _meta->>'cidade',
      _meta->>'estado',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_meta->'turnos')), '{}'::text[]),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_meta->'plataformas')), '{}'::text[]),
      _meta->>'plataforma_comprovante_url'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Public storage bucket for entregador docs (selfies, platform proofs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregador-docs', 'entregador-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read (public bucket); only authed users can upload to their own folder
DROP POLICY IF EXISTS "entregador-docs public read" ON storage.objects;
CREATE POLICY "entregador-docs public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'entregador-docs');

DROP POLICY IF EXISTS "entregador-docs anon upload" ON storage.objects;
CREATE POLICY "entregador-docs anon upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'entregador-docs');
