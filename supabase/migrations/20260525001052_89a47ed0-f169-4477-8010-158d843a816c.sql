
-- ============== AGENDA PREVISOES ==============
CREATE TABLE public.agenda_previsoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  data_prevista date NOT NULL,
  pacotes_estimados integer NOT NULL DEFAULT 0,
  rotas_estimadas integer NOT NULL DEFAULT 0,
  pacotes_por_rota integer NOT NULL DEFAULT 50,
  valor_por_pacote numeric NOT NULL DEFAULT 0,
  veiculo_necessario text,
  endereco_coleta text,
  permite_cancelamento boolean NOT NULL DEFAULT true,
  cancelamento_ate time,
  hora_abertura time DEFAULT '00:00',
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agenda_previsoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa manage previsoes" ON public.agenda_previsoes FOR ALL TO authenticated
  USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);
CREATE POLICY "admin manage previsoes" ON public.agenda_previsoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "entregadores view previsoes" ON public.agenda_previsoes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'entregador'::app_role));
CREATE TRIGGER set_updated_at_agenda_previsoes BEFORE UPDATE ON public.agenda_previsoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link offers to previsoes
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS previsao_id uuid;
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS permite_cancelamento boolean DEFAULT true;
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS cancelamento_ate time;

-- ============== AUDITORIA FAIXAS ==============
CREATE TABLE public.auditoria_faixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  faixa_inicio integer NOT NULL,
  faixa_fim integer NOT NULL,
  pacotes_contados integer NOT NULL DEFAULT 0,
  rota_id uuid,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria_faixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa manage faixas" ON public.auditoria_faixas FOR ALL TO authenticated
  USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);
CREATE POLICY "admin manage faixas" ON public.auditoria_faixas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER set_updated_at_auditoria_faixas BEFORE UPDATE ON public.auditoria_faixas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== ALOCACOES ==============
CREATE TABLE public.alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL,
  rota_id uuid NOT NULL,
  entregador_id uuid NOT NULL,
  oferta_id uuid,
  empresa_id uuid NOT NULL,
  alocado_em timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'allocated',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alocacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresa manage alocacoes" ON public.alocacoes FOR ALL TO authenticated
  USING (auth.uid() = empresa_id) WITH CHECK (auth.uid() = empresa_id);
CREATE POLICY "entregador view alocacoes" ON public.alocacoes FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);
CREATE POLICY "admin manage alocacoes" ON public.alocacoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== CONFIABILIDADE ==============
CREATE TABLE public.confiabilidade_score (
  entregador_id uuid PRIMARY KEY,
  score integer NOT NULL DEFAULT 100,
  nivel text NOT NULL DEFAULT 'gold',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.confiabilidade_score ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregador view own score" ON public.confiabilidade_score FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);
CREATE POLICY "empresa view scores" ON public.confiabilidade_score FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'empresa'::app_role));
CREATE POLICY "admin manage score" ON public.confiabilidade_score FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "empresa update scores" ON public.confiabilidade_score FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'empresa'::app_role)) WITH CHECK (has_role(auth.uid(), 'empresa'::app_role));
CREATE POLICY "empresa insert scores" ON public.confiabilidade_score FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'empresa'::app_role));
CREATE TRIGGER set_updated_at_conf_score BEFORE UPDATE ON public.confiabilidade_score
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.confiabilidade_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL,
  evento text NOT NULL,
  pontos integer NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.confiabilidade_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregador view own history" ON public.confiabilidade_historico FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);
CREATE POLICY "empresa view history" ON public.confiabilidade_historico FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'empresa'::app_role));
CREATE POLICY "empresa insert history" ON public.confiabilidade_historico FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'empresa'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin manage history" ON public.confiabilidade_historico FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== ENTREGADORES SUSPENSION ==============
ALTER TABLE public.entregadores ADD COLUMN IF NOT EXISTS reliability_score integer DEFAULT 100;
ALTER TABLE public.entregadores ADD COLUMN IF NOT EXISTS reliability_level text DEFAULT 'gold';
ALTER TABLE public.entregadores ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.entregadores ADD COLUMN IF NOT EXISTS suspension_reason text;

-- ============== HELPER: apply reliability event ==============
CREATE OR REPLACE FUNCTION public.apply_reliability_event(
  _entregador_id uuid, _evento text, _pontos integer, _descricao text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _new_score integer;
  _new_level text;
BEGIN
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
$$;

-- Realtime
ALTER TABLE public.agenda_previsoes REPLICA IDENTITY FULL;
ALTER TABLE public.alocacoes REPLICA IDENTITY FULL;
ALTER TABLE public.confiabilidade_score REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_previsoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alocacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.confiabilidade_score;
