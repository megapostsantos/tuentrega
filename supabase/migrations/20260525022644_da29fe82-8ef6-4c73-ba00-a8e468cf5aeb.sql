ALTER TABLE public.entregas_ocorrencias
  ADD COLUMN IF NOT EXISTS package_id text,
  ADD COLUMN IF NOT EXISTS package_id_scan_method text;