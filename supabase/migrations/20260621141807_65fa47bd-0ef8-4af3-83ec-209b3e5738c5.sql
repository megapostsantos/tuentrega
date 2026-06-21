
ALTER TABLE public.entregas_pacotes
  ADD COLUMN IF NOT EXISTS destinatario_nome text,
  ADD COLUMN IF NOT EXISTS destinatario_telefone text,
  ADD COLUMN IF NOT EXISTS destinatario_email text,
  ADD COLUMN IF NOT EXISTS token_rastreamento text UNIQUE DEFAULT gen_random_uuid()::text;

CREATE TABLE public.notificacoes_destinatario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pacote_id uuid NOT NULL REFERENCES public.entregas_pacotes(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('saiu_para_entrega','entregue','tentativa_falha')),
  mensagem text,
  enviado_em timestamptz,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes_destinatario TO authenticated;
GRANT ALL ON public.notificacoes_destinatario TO service_role;

ALTER TABLE public.notificacoes_destinatario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa reads own pacote notifications"
ON public.notificacoes_destinatario FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.entregas_pacotes p
    JOIN public.ofertas o ON o.id = p.oferta_id
    WHERE p.id = notificacoes_destinatario.pacote_id
      AND o.empresa_id = auth.uid()
  )
);

CREATE POLICY "Admin manages notifications"
ON public.notificacoes_destinatario FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_notif_dest_updated_at
BEFORE UPDATE ON public.notificacoes_destinatario
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notif_dest_pacote ON public.notificacoes_destinatario(pacote_id);
