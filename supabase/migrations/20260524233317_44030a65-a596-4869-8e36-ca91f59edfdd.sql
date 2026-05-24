ALTER TABLE public.ofertas REPLICA IDENTITY FULL;
ALTER TABLE public.entregas REPLICA IDENTITY FULL;
ALTER TABLE public.entregas_pacotes REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ofertas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas_pacotes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;