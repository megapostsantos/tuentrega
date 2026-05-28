
CREATE TABLE public.notificacoes_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  destinatario_tipo text NOT NULL,
  tipo text NOT NULL,
  telefone text,
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'logged',
  message_id text,
  enviado_em timestamp with time zone,
  lido_em timestamp with time zone,
  erro_msg text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notificacoes_whatsapp TO authenticated;
GRANT ALL ON public.notificacoes_whatsapp TO service_role;

ALTER TABLE public.notificacoes_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage notificacoes_whatsapp"
ON public.notificacoes_whatsapp FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user view own notificacoes"
ON public.notificacoes_whatsapp FOR SELECT TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "authenticated insert notificacoes"
ON public.notificacoes_whatsapp FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_notif_wa_recipient ON public.notificacoes_whatsapp(recipient_id, created_at DESC);
