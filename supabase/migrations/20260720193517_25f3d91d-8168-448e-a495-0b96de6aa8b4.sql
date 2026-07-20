
ALTER TABLE public.saidas_nex DROP COLUMN IF EXISTS motorista_id;
ALTER TABLE public.saidas_nex ADD COLUMN entregador_id uuid REFERENCES public.entregadores(id) ON DELETE SET NULL;
DROP TABLE IF EXISTS public.motoristas_nex CASCADE;
