
ALTER TABLE public.entregadores ALTER COLUMN cpf DROP NOT NULL;
ALTER TABLE public.entregadores
  ADD COLUMN IF NOT EXISTS tipo_operacao text NOT NULL DEFAULT 'ambos',
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS modelo_veiculo text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE public.entregadores
  DROP CONSTRAINT IF EXISTS entregadores_tipo_operacao_check;
ALTER TABLE public.entregadores
  ADD CONSTRAINT entregadores_tipo_operacao_check
  CHECK (tipo_operacao IN ('nex','distribuicao','ambos'));

-- Trigger to mark entregador as activated on first sign-in
CREATE OR REPLACE FUNCTION public.mark_entregador_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) THEN
    UPDATE public.entregadores
      SET activated_at = COALESCE(activated_at, now())
      WHERE id = NEW.id AND activated_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_signin_mark_entregador ON auth.users;
CREATE TRIGGER on_auth_user_signin_mark_entregador
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.mark_entregador_activated();

-- Allow empresas to insert entregadores they invite
DROP POLICY IF EXISTS "empresa can invite entregadores" ON public.entregadores;
CREATE POLICY "empresa can invite entregadores"
ON public.entregadores FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'empresa'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);
