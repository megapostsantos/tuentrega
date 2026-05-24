
-- 1. EMPRESAS: scoped view for entregadores
DROP POLICY IF EXISTS "entregadores view empresas basics" ON public.empresas;

CREATE POLICY "entregadores view related empresas"
ON public.empresas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'entregador'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.empresa_id = empresas.id
      AND (o.entregador_id = auth.uid() OR o.status = 'open')
  )
);

-- 2. ENTREGADORES: scoped view for empresas
DROP POLICY IF EXISTS "empresas view entregadores" ON public.entregadores;

CREATE POLICY "empresas view related entregadores"
ON public.entregadores FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'empresa'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.ofertas o
    WHERE o.entregador_id = entregadores.id
      AND o.empresa_id = auth.uid()
  )
);

-- 3. Make entregador-docs bucket private and scope policies
UPDATE storage.buckets SET public = false WHERE id = 'entregador-docs';

DROP POLICY IF EXISTS "entregador-docs anon upload" ON storage.objects;
DROP POLICY IF EXISTS "entregador-docs public read" ON storage.objects;

CREATE POLICY "entregador-docs owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'entregador-docs'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "entregador-docs owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'entregador-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "entregador-docs owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'entregador-docs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4. OFERTAS: restrict entregador update to only entregador_id + status
DROP POLICY IF EXISTS "entregador accept open ofertas" ON public.ofertas;

CREATE OR REPLACE FUNCTION public.guard_oferta_entregador_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role)
     OR auth.uid() = OLD.empresa_id THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'entregador'::app_role) THEN
    IF NEW.titulo IS DISTINCT FROM OLD.titulo
       OR NEW.descricao IS DISTINCT FROM OLD.descricao
       OR NEW.valor IS DISTINCT FROM OLD.valor
       OR NEW.valor_por_pacote IS DISTINCT FROM OLD.valor_por_pacote
       OR NEW.quantidade_pacotes IS DISTINCT FROM OLD.quantidade_pacotes
       OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
       OR NEW.tipo_entrega IS DISTINCT FROM OLD.tipo_entrega
       OR NEW.veiculo_necessario IS DISTINCT FROM OLD.veiculo_necessario
       OR NEW.endereco_coleta IS DISTINCT FROM OLD.endereco_coleta
       OR NEW.bairro IS DISTINCT FROM OLD.bairro
       OR NEW.data_trabalho IS DISTINCT FROM OLD.data_trabalho
       OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio
       OR NEW.hora_fim IS DISTINCT FROM OLD.hora_fim
       OR NEW.prazo_pagamento IS DISTINCT FROM OLD.prazo_pagamento
       OR NEW.prazo_pagamento_data IS DISTINCT FROM OLD.prazo_pagamento_data
       OR NEW.exige_nota_fiscal IS DISTINCT FROM OLD.exige_nota_fiscal
       OR NEW.expira_em IS DISTINCT FROM OLD.expira_em
    THEN
      RAISE EXCEPTION 'Entregador may only update status and entregador_id';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update oferta';
END;
$$;

DROP TRIGGER IF EXISTS guard_oferta_entregador_update ON public.ofertas;
CREATE TRIGGER guard_oferta_entregador_update
BEFORE UPDATE ON public.ofertas
FOR EACH ROW EXECUTE FUNCTION public.guard_oferta_entregador_update();

CREATE POLICY "entregador accept open ofertas"
ON public.ofertas FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'entregador'::app_role)
  AND (status = 'open' OR entregador_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'entregador'::app_role)
  AND entregador_id = auth.uid()
);

-- 5. ENTREGAS: restrict entregador update to nota_fiscal_url only
DROP POLICY IF EXISTS "entregador update nota" ON public.entregas;

CREATE OR REPLACE FUNCTION public.guard_entregas_entregador_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role)
     OR auth.uid() = OLD.empresa_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.entregador_id THEN
    IF NEW.valor IS DISTINCT FROM OLD.valor
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.data_pagamento IS DISTINCT FROM OLD.data_pagamento
       OR NEW.data_entrega IS DISTINCT FROM OLD.data_entrega
       OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
       OR NEW.entregador_id IS DISTINCT FROM OLD.entregador_id
       OR NEW.oferta_id IS DISTINCT FROM OLD.oferta_id
       OR NEW.exige_nota_fiscal IS DISTINCT FROM OLD.exige_nota_fiscal
    THEN
      RAISE EXCEPTION 'Entregador may only update nota_fiscal_url';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update entrega';
END;
$$;

DROP TRIGGER IF EXISTS guard_entregas_entregador_update ON public.entregas;
CREATE TRIGGER guard_entregas_entregador_update
BEFORE UPDATE ON public.entregas
FOR EACH ROW EXECUTE FUNCTION public.guard_entregas_entregador_update();

CREATE POLICY "entregador update nota"
ON public.entregas FOR UPDATE TO authenticated
USING (auth.uid() = entregador_id)
WITH CHECK (auth.uid() = entregador_id);
