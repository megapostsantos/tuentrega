
-- pagamentos: NF fields
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS nf_numero text,
  ADD COLUMN IF NOT EXISTS nf_url text;

-- entregadores: tipo_pessoa (cnpj já existe)
ALTER TABLE public.entregadores
  ADD COLUMN IF NOT EXISTS tipo_pessoa text NOT NULL DEFAULT 'pf'
    CHECK (tipo_pessoa IN ('pf','pj'));

-- Backfill: quem já tem CNPJ vira PJ
UPDATE public.entregadores SET tipo_pessoa = 'pj'
  WHERE cnpj IS NOT NULL AND length(btrim(cnpj)) > 0 AND tipo_pessoa <> 'pj';

-- financeiro_lancamentos: vínculo opcional com entregador
ALTER TABLE public.financeiro_lancamentos
  ADD COLUMN IF NOT EXISTS entregador_id uuid REFERENCES public.entregadores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS financeiro_lancamentos_entregador_idx
  ON public.financeiro_lancamentos(entregador_id);
