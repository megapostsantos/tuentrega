ALTER TABLE public.entregas_pacotes
  ADD COLUMN IF NOT EXISTS operacao_id uuid REFERENCES public.operacoes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entregas_pacotes_operacao_id
  ON public.entregas_pacotes(operacao_id);

DROP POLICY IF EXISTS "entregador insert own pacotes" ON public.entregas_pacotes;
CREATE POLICY "entregador insert own pacotes" ON public.entregas_pacotes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ofertas o
      WHERE o.id = entregas_pacotes.oferta_id
        AND o.entregador_id = auth.uid()
    )
  );

INSERT INTO public.entregas_pacotes (oferta_id, operacao_id, numero_pacote, endereco_entrega, status)
SELECT
  o.id,
  o.operacao_id,
  gs.numero,
  NULL,
  'pending'
FROM public.ofertas o
CROSS JOIN LATERAL generate_series(1, GREATEST(COALESCE(o.quantidade_pacotes, 0), 0)) AS gs(numero)
WHERE o.operacao_id IS NOT NULL
  AND COALESCE(o.quantidade_pacotes, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.entregas_pacotes p
    WHERE p.oferta_id = o.id
  );
