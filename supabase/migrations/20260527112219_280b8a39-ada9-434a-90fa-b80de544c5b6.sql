
ALTER TABLE public.dispatcher_alocacoes
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.dispatcher_schedule_members
  ADD COLUMN IF NOT EXISTS recusado_at timestamptz,
  ADD COLUMN IF NOT EXISTS recusa_motivo text;

-- Commission view: aggregates per-package difference between empresa rate and member rate
CREATE OR REPLACE VIEW public.dispatcher_commissions AS
SELECT
  d.id AS dispatcher_id,
  d.entregador_id AS dispatcher_user_id,
  o.entregador_id AS member_user_id,
  o.id AS oferta_id,
  o.titulo,
  o.closed_at,
  o.data_trabalho,
  o.payment_status,
  o.quantidade_pacotes,
  COALESCE(o.pacotes_entregues, o.quantidade_pacotes, 0) AS pacotes_entregues,
  o.valor_por_pacote AS valor_membro,
  da.valor_por_pacote AS valor_empresa,
  GREATEST(COALESCE(da.valor_por_pacote,0) - COALESCE(o.valor_por_pacote,0), 0) AS comissao_por_pacote,
  GREATEST(COALESCE(da.valor_por_pacote,0) - COALESCE(o.valor_por_pacote,0), 0)
    * COALESCE(o.pacotes_entregues, o.quantidade_pacotes, 0) AS comissao_total
FROM public.ofertas o
JOIN public.dispatchers d ON d.id = o.dispatcher_id
LEFT JOIN public.dispatcher_alocacoes da ON da.operacao_id = o.operacao_id AND da.dispatcher_id = d.id
WHERE o.dispatcher_id IS NOT NULL
  AND o.tipo = 'private';

GRANT SELECT ON public.dispatcher_commissions TO authenticated;
