
-- ============ NEW TABLES ============

-- Plans table
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  trial_days INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "everyone read plans" ON public.plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin write plans" ON public.plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (id, name, price_cents, trial_days, features) VALUES
  ('free', 'Free', 0, 14, '["Até 20 ofertas/mês","Suporte por e-mail"]'::jsonb),
  ('starter', 'Starter', 29900, 0, '["Ofertas ilimitadas","Painel financeiro","Suporte prioritário"]'::jsonb),
  ('pro', 'Pro', 59900, 0, '["Tudo do Starter","Roteirização avançada","Relatórios customizados"]'::jsonb),
  ('enterprise', 'Enterprise', 99900, 0, '["Tudo do Pro","SLA dedicado","Gerente de conta","API completa"]'::jsonb);

-- Admin impersonations log
CREATE TABLE public.admin_impersonations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('empresa','entregador')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.admin_impersonations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage impersonations" ON public.admin_impersonations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin actions log
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage logs" ON public.admin_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin notifications
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage notifications" ON public.admin_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin settings (single row)
CREATE TABLE public.admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  deliverer_subscription_cents INTEGER NOT NULL DEFAULT 1500,
  trial_days INTEGER NOT NULL DEFAULT 14,
  fiscal_note_deadline_day INTEGER NOT NULL DEFAULT 10,
  whatsapp_template_payment TEXT NOT NULL DEFAULT 'Olá {nome}, seu pagamento de R$ {valor} foi confirmado via PIX.',
  whatsapp_template_new_offer TEXT NOT NULL DEFAULT 'Nova oferta disponível: {titulo} - R$ {valor} no bairro {bairro}.',
  whatsapp_template_suspension TEXT NOT NULL DEFAULT 'Olá {nome}, sua conta foi suspensa. Entre em contato com o suporte.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_settings_updated_at BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.admin_settings (id) VALUES (1);

-- Admin notes
CREATE TABLE public.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('empresa','entregador')),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage notes" ON public.admin_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ ALTER EXISTING ============

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'free' REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso'));

ALTER TABLE public.entregadores
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso'));

-- Admin can view all empresas / entregadores / ofertas / entregas
CREATE POLICY "admin view all empresas" ON public.empresas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update all empresas" ON public.empresas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin view all entregadores" ON public.entregadores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update all entregadores" ON public.entregadores
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin view all ofertas" ON public.ofertas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin view all entregas" ON public.entregas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin role assignment helper (so first admin can be promoted via SQL)
-- Note: requires an existing user; assign manually in admin_logs UI later.
