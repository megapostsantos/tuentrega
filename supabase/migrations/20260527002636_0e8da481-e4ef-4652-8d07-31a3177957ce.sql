
ALTER TABLE public.dispatcher_alocacoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS distributed_at timestamptz,
  ADD COLUMN IF NOT EXISTS valor_por_pacote numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.dispatcher_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatcher_id uuid NOT NULL,
  entregador_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  valor_padrao_por_pacote numeric NOT NULL DEFAULT 0,
  exclusivo boolean NOT NULL DEFAULT false,
  exclusivo_aceito_dispatcher boolean NOT NULL DEFAULT false,
  exclusivo_aceito_entregador boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dispatcher_id, entregador_id)
);

CREATE TABLE IF NOT EXISTS public.dispatcher_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatcher_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  data_agendada date NOT NULL,
  pacotes_estimados integer NOT NULL DEFAULT 0,
  observacao text,
  status text NOT NULL DEFAULT 'agendado',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dispatcher_schedule_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.dispatcher_schedule(id) ON DELETE CASCADE,
  entregador_id uuid NOT NULL,
  valor_por_pacote numeric NOT NULL DEFAULT 0,
  confirmado text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, entregador_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatcher_team TO authenticated;
GRANT ALL ON public.dispatcher_team TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatcher_schedule TO authenticated;
GRANT ALL ON public.dispatcher_schedule TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatcher_schedule_members TO authenticated;
GRANT ALL ON public.dispatcher_schedule_members TO service_role;

ALTER TABLE public.dispatcher_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatcher_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatcher_schedule_members ENABLE ROW LEVEL SECURITY;

-- dispatcher_team policies
CREATE POLICY "admin manage dispatcher_team" ON public.dispatcher_team
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dispatcher manage own team" ON public.dispatcher_team
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dispatchers d WHERE d.id = dispatcher_team.dispatcher_id AND d.entregador_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dispatchers d WHERE d.id = dispatcher_team.dispatcher_id AND d.entregador_id = auth.uid()));

CREATE POLICY "empresa view dispatcher_team" ON public.dispatcher_team
  FOR SELECT TO authenticated
  USING (auth.uid() = empresa_id);

CREATE POLICY "entregador view own team membership" ON public.dispatcher_team
  FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE POLICY "entregador update own exclusivity" ON public.dispatcher_team
  FOR UPDATE TO authenticated
  USING (auth.uid() = entregador_id)
  WITH CHECK (auth.uid() = entregador_id);

-- dispatcher_schedule policies
CREATE POLICY "admin manage dispatcher_schedule" ON public.dispatcher_schedule
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dispatcher manage own schedule" ON public.dispatcher_schedule
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dispatchers d WHERE d.id = dispatcher_schedule.dispatcher_id AND d.entregador_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dispatchers d WHERE d.id = dispatcher_schedule.dispatcher_id AND d.entregador_id = auth.uid()));

CREATE POLICY "empresa view dispatcher_schedule" ON public.dispatcher_schedule
  FOR SELECT TO authenticated
  USING (auth.uid() = empresa_id);

CREATE POLICY "team members view related schedule" ON public.dispatcher_schedule
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dispatcher_schedule_members m
    WHERE m.schedule_id = dispatcher_schedule.id AND m.entregador_id = auth.uid()
  ));

-- dispatcher_schedule_members policies
CREATE POLICY "admin manage schedule_members" ON public.dispatcher_schedule_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "dispatcher manage own schedule_members" ON public.dispatcher_schedule_members
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dispatcher_schedule s
    JOIN public.dispatchers d ON d.id = s.dispatcher_id
    WHERE s.id = dispatcher_schedule_members.schedule_id AND d.entregador_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dispatcher_schedule s
    JOIN public.dispatchers d ON d.id = s.dispatcher_id
    WHERE s.id = dispatcher_schedule_members.schedule_id AND d.entregador_id = auth.uid()
  ));

CREATE POLICY "entregador view own schedule_members" ON public.dispatcher_schedule_members
  FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE POLICY "entregador confirm own schedule_members" ON public.dispatcher_schedule_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = entregador_id)
  WITH CHECK (auth.uid() = entregador_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatcher_team;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatcher_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatcher_schedule_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatcher_alocacoes;
