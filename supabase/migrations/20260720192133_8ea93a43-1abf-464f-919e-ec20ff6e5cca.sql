
CREATE TABLE public.motoristas_nex (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text UNIQUE,
  telefone text,
  tipo_veiculo text CHECK (tipo_veiculo IN ('moto','carro','bike','van')),
  modelo_veiculo text,
  placa text,
  ativo boolean NOT NULL DEFAULT true,
  entregador_id uuid REFERENCES public.entregadores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoristas_nex TO authenticated;
GRANT ALL ON public.motoristas_nex TO service_role;
ALTER TABLE public.motoristas_nex ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/empresa manage motoristas_nex" ON public.motoristas_nex FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'empresa'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'empresa'));

CREATE TABLE public.saidas_nex (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_saida date NOT NULL DEFAULT current_date,
  motorista_id uuid REFERENCES public.motoristas_nex(id) ON DELETE SET NULL,
  qr_saca text NOT NULL,
  codigo_nx text NOT NULL,
  hora_saida time DEFAULT (now()::time),
  status text NOT NULL DEFAULT 'saiu' CHECK (status IN ('saiu','retornou_insucessos','finalizado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saidas_nex TO authenticated;
GRANT ALL ON public.saidas_nex TO service_role;
ALTER TABLE public.saidas_nex ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/empresa manage saidas_nex" ON public.saidas_nex FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'empresa'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'empresa'));

CREATE TABLE public.insucessos_nex (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saida_id uuid REFERENCES public.saidas_nex(id) ON DELETE CASCADE,
  qr_pacote text NOT NULL,
  motivo text,
  registrado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insucessos_nex TO authenticated;
GRANT ALL ON public.insucessos_nex TO service_role;
ALTER TABLE public.insucessos_nex ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/empresa manage insucessos_nex" ON public.insucessos_nex FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'empresa'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'empresa'));

CREATE INDEX idx_saidas_nex_data ON public.saidas_nex(data_saida DESC);
CREATE INDEX idx_saidas_nex_motorista ON public.saidas_nex(motorista_id);
CREATE INDEX idx_insucessos_nex_saida ON public.insucessos_nex(saida_id);
