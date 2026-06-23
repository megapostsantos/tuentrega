ALTER TABLE public.entregadores ADD COLUMN IF NOT EXISTS cnpj text;

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
      id, nome_completo, cpf, cnpj, whatsapp, tipo_veiculo, bairros,
      pix_tipo, pix_chave, banco,
      data_nascimento, selfie_url, placa,
      cep, rua, numero, complemento, bairro, cidade, estado,
      turnos, plataformas, plataforma_comprovante_url
    ) VALUES (
      NEW.id,
      COALESCE(_meta->>'full_name', ''),
      _meta->>'cpf',
      NULLIF(_meta->>'cnpj',''),
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