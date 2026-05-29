
-- 1) confiabilidade_historico: scope empresa view + insert to related entregadores
DROP POLICY IF EXISTS "empresa view history" ON public.confiabilidade_historico;
CREATE POLICY "empresa view history" ON public.confiabilidade_historico
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = auth.uid()
      AND o.entregador_id = confiabilidade_historico.entregador_id
  )
);

DROP POLICY IF EXISTS "empresa insert history" ON public.confiabilidade_historico;
CREATE POLICY "empresa insert history" ON public.confiabilidade_historico
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'empresa'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.ofertas o
      WHERE o.empresa_id = auth.uid()
        AND o.entregador_id = confiabilidade_historico.entregador_id
    )
  )
);

-- 2) extratos_mensais: scope empresa view
DROP POLICY IF EXISTS "empresa view extratos" ON public.extratos_mensais;
CREATE POLICY "empresa view extratos" ON public.extratos_mensais
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = auth.uid()
      AND o.entregador_id = extratos_mensais.entregador_id
  )
);

-- 3) confiabilidade_score: scope empresa insert + update
DROP POLICY IF EXISTS "empresa insert scores" ON public.confiabilidade_score;
CREATE POLICY "empresa insert scores" ON public.confiabilidade_score
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'empresa'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = auth.uid()
      AND o.entregador_id = confiabilidade_score.entregador_id
  )
);

DROP POLICY IF EXISTS "empresa update scores" ON public.confiabilidade_score;
CREATE POLICY "empresa update scores" ON public.confiabilidade_score
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'empresa'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = auth.uid()
      AND o.entregador_id = confiabilidade_score.entregador_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'empresa'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = auth.uid()
      AND o.entregador_id = confiabilidade_score.entregador_id
  )
);

-- 4) empresas: remove open-offer exposure
DROP POLICY IF EXISTS "entregadores view related empresas" ON public.empresas;
CREATE POLICY "entregadores view related empresas" ON public.empresas
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'entregador'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = empresas.id
      AND o.entregador_id = auth.uid()
  )
);

-- 5) Storage: explicit DELETE policy on notas-fiscais (owner folder OR admin)
DROP POLICY IF EXISTS "entregador delete own notas-fiscais" ON storage.objects;
CREATE POLICY "entregador delete own notas-fiscais" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'notas-fiscais'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- 6) Lock down apply_reliability_event: require empresa/admin caller, revoke anon
CREATE OR REPLACE FUNCTION public.apply_reliability_event(_entregador_id uuid, _evento text, _pontos integer, _descricao text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_score integer;
  _new_level text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR (
    has_role(auth.uid(), 'empresa'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.ofertas o
      WHERE o.empresa_id = auth.uid()
        AND o.entregador_id = _entregador_id
    )
  )) THEN
    RAISE EXCEPTION 'Not authorized to apply reliability event for this entregador';
  END IF;

  INSERT INTO public.confiabilidade_score (entregador_id, score, nivel)
  VALUES (_entregador_id, 100, 'gold')
  ON CONFLICT (entregador_id) DO NOTHING;

  UPDATE public.confiabilidade_score
  SET score = score + _pontos
  WHERE entregador_id = _entregador_id
  RETURNING score INTO _new_score;

  _new_level := CASE
    WHEN _new_score >= 90 THEN 'diamond'
    WHEN _new_score >= 75 THEN 'gold'
    WHEN _new_score >= 60 THEN 'silver'
    WHEN _new_score >= 40 THEN 'bronze'
    WHEN _new_score >= 0  THEN 'at_risk'
    ELSE 'suspended'
  END;

  UPDATE public.confiabilidade_score SET nivel = _new_level WHERE entregador_id = _entregador_id;
  UPDATE public.entregadores SET reliability_score = _new_score, reliability_level = _new_level WHERE id = _entregador_id;

  INSERT INTO public.confiabilidade_historico (entregador_id, evento, pontos, descricao)
  VALUES (_entregador_id, _evento, _pontos, _descricao);

  IF _new_score < 0 THEN
    UPDATE public.entregadores
    SET suspended_at = now(), suspension_reason = 'Auto-suspended: reliability score below 0', status = 'suspenso'
    WHERE id = _entregador_id AND suspended_at IS NULL;
  END IF;

  RETURN _new_score;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_reliability_event(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_reliability_event(uuid, text, integer, text) TO authenticated, service_role;
