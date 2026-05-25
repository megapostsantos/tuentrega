
CREATE INDEX IF NOT EXISTS idx_ofertas_empresa_status ON public.ofertas (empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_ofertas_entregador_status ON public.ofertas (entregador_id, status);
CREATE INDEX IF NOT EXISTS idx_ofertas_data_trabalho ON public.ofertas (data_trabalho);
CREATE INDEX IF NOT EXISTS idx_ofertas_status_created ON public.ofertas (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entregas_empresa ON public.entregas (empresa_id);
CREATE INDEX IF NOT EXISTS idx_entregas_entregador ON public.entregas (entregador_id);
CREATE INDEX IF NOT EXISTS idx_entregas_oferta ON public.entregas (oferta_id);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_oferta ON public.entregas_ocorrencias (oferta_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_entregador ON public.entregas_ocorrencias (entregador_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_empresa ON public.entregas_ocorrencias (empresa_id);

CREATE INDEX IF NOT EXISTS idx_confiab_score_entregador ON public.confiabilidade_score (entregador_id);
CREATE INDEX IF NOT EXISTS idx_confiab_hist_entregador ON public.confiabilidade_historico (entregador_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operacoes_empresa_data ON public.operacoes (empresa_id, data_operacao DESC);

CREATE INDEX IF NOT EXISTS idx_pagamentos_entregador ON public.pagamentos (entregador_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON public.pagamentos (empresa_id, created_at DESC);
