
DROP POLICY IF EXISTS "admin manage ofertas" ON public.ofertas;
DROP POLICY IF EXISTS "admin manage entregas" ON public.entregas;
DROP POLICY IF EXISTS "admin insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "admin insert entregadores" ON public.entregadores;

CREATE POLICY "admin manage ofertas" ON public.ofertas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manage entregas" ON public.entregas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
