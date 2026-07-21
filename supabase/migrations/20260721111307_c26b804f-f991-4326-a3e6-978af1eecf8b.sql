
ALTER TABLE public.ofertas ADD COLUMN IF NOT EXISTS data_agendada date;
ALTER TABLE public.entregas_pacotes ADD COLUMN IF NOT EXISTS data_agendada date;

CREATE TABLE IF NOT EXISTS public.eventos_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('pagamento','coleta','oferta','disponibilidade','outro')),
  titulo text NOT NULL,
  descricao text,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz,
  cor text DEFAULT '#FFB700',
  valor numeric,
  entregador_id uuid,
  referencia_id uuid,
  referencia_tabela text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos_agenda TO authenticated;
GRANT ALL ON public.eventos_agenda TO service_role;

ALTER TABLE public.eventos_agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access eventos_agenda"
  ON public.eventos_agenda FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Empresa manage own eventos_agenda"
  ON public.eventos_agenda FOR ALL TO authenticated
  USING (auth.uid() = empresa_id)
  WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "Entregador view own disponibilidade"
  ON public.eventos_agenda FOR SELECT TO authenticated
  USING (entregador_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_eventos_agenda_empresa_data ON public.eventos_agenda(empresa_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_ofertas_data_agendada ON public.ofertas(data_agendada);
CREATE INDEX IF NOT EXISTS idx_entregas_pacotes_data_agendada ON public.entregas_pacotes(data_agendada);

CREATE TRIGGER trg_eventos_agenda_updated_at
  BEFORE UPDATE ON public.eventos_agenda
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
