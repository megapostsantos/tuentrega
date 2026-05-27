
-- 1. Add dispatcher role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dispatcher';

-- 2. Update ofertas table
ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS dispatcher_id uuid;

CREATE INDEX IF NOT EXISTS idx_ofertas_tipo ON public.ofertas(tipo);
CREATE INDEX IF NOT EXISTS idx_ofertas_dispatcher_id ON public.ofertas(dispatcher_id);

-- 3. Add private invite template
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS whatsapp_template_private_invite text NOT NULL DEFAULT
    'TuEntrega 🔒 Você recebeu um convite privado! {empresa} te convidou para: {titulo}. Data: {data}. Valor: R$ {valor}/pacote. Pacotes: ~{pacotes}. Acesse o app para aceitar ou recusar.';

-- 4. dispatchers table
CREATE TABLE IF NOT EXISTS public.dispatchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  valor_por_pacote numeric NOT NULL DEFAULT 0,
  plataformas text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entregador_id, empresa_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatchers TO authenticated;
GRANT ALL ON public.dispatchers TO service_role;

ALTER TABLE public.dispatchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage dispatchers" ON public.dispatchers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "empresa manage dispatchers" ON public.dispatchers
  FOR ALL TO authenticated
  USING (auth.uid() = empresa_id)
  WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "dispatcher view own record" ON public.dispatchers
  FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

-- 5. dispatcher_alocacoes table
CREATE TABLE IF NOT EXISTS public.dispatcher_alocacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL,
  dispatcher_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  pacotes_alocados integer NOT NULL DEFAULT 0,
  paradas_alocadas integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatcher_alocacoes_operacao ON public.dispatcher_alocacoes(operacao_id);
CREATE INDEX IF NOT EXISTS idx_dispatcher_alocacoes_dispatcher ON public.dispatcher_alocacoes(dispatcher_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatcher_alocacoes TO authenticated;
GRANT ALL ON public.dispatcher_alocacoes TO service_role;

ALTER TABLE public.dispatcher_alocacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage dispatcher_alocacoes" ON public.dispatcher_alocacoes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "empresa manage dispatcher_alocacoes" ON public.dispatcher_alocacoes
  FOR ALL TO authenticated
  USING (auth.uid() = empresa_id)
  WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "dispatcher view own alocacoes" ON public.dispatcher_alocacoes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dispatchers d WHERE d.id = dispatcher_alocacoes.dispatcher_id AND d.entregador_id = auth.uid()));

-- 6. ofertas_privadas_config
CREATE TABLE IF NOT EXISTS public.ofertas_privadas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oferta_id uuid NOT NULL,
  entregador_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  valor_por_pacote numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'invited',
  notificado_em timestamptz,
  aceito_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (oferta_id, entregador_id)
);

CREATE INDEX IF NOT EXISTS idx_ofertas_privadas_oferta ON public.ofertas_privadas_config(oferta_id);
CREATE INDEX IF NOT EXISTS idx_ofertas_privadas_entregador ON public.ofertas_privadas_config(entregador_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofertas_privadas_config TO authenticated;
GRANT ALL ON public.ofertas_privadas_config TO service_role;

ALTER TABLE public.ofertas_privadas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage privadas_config" ON public.ofertas_privadas_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "empresa manage privadas_config" ON public.ofertas_privadas_config
  FOR ALL TO authenticated
  USING (auth.uid() = empresa_id)
  WITH CHECK (auth.uid() = empresa_id);

CREATE POLICY "entregador view own privadas_config" ON public.ofertas_privadas_config
  FOR SELECT TO authenticated
  USING (auth.uid() = entregador_id);

CREATE POLICY "entregador update own privadas_config" ON public.ofertas_privadas_config
  FOR UPDATE TO authenticated
  USING (auth.uid() = entregador_id)
  WITH CHECK (auth.uid() = entregador_id);

-- 7. Update ofertas SELECT policy for entregadores: public OR invited
DROP POLICY IF EXISTS "entregadores view ofertas abertas" ON public.ofertas;

CREATE POLICY "entregadores view ofertas visiveis" ON public.ofertas
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'entregador'::app_role)
    AND (
      tipo = 'public'
      OR entregador_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.ofertas_privadas_config c
        WHERE c.oferta_id = ofertas.id AND c.entregador_id = auth.uid()
      )
    )
  );
