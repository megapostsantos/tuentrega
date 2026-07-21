import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Package, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleSummary, type SummaryItem } from "@/components/ModuleSummary";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function startOfWeekISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const day = d.getDay(); const diff = (day + 6) % 7; d.setDate(d.getDate() - diff);
  return d.toISOString();
}

export function EntregadoresStats() {
  const q = useQuery({
    queryKey: ["entregadores-stats"],
    queryFn: async () => {
      const sb = supabase as any;
      const weekIso = startOfWeekISO();

      const [{ count: total }, { data: semana }] = await Promise.all([
        sb.from("entregadores").select("id", { count: "exact", head: true }),
        sb
          .from("ofertas")
          .select("entregador_id, valor, quantidade_pacotes, status, created_at")
          .gte("created_at", weekIso)
          .not("entregador_id", "is", null),
      ]);

      const ativos = new Set((semana ?? []).map((r: any) => r.entregador_id)).size;
      const completed = (semana ?? []).filter((r: any) => r.status === "completed");
      const pacotesSemana = completed.reduce((s: number, r: any) => s + (r.quantidade_pacotes ?? 0), 0);
      const ganho = completed.reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);

      return { total: total ?? 0, ativos, pacotesSemana, ganho };
    },
  });

  const d = q.data;
  const items: SummaryItem[] = [
    { icon: Users, label: "Total cadastrados", value: d?.total ?? 0 },
    { icon: UserCheck, label: "Ativos esta semana", value: d?.ativos ?? 0 },
    { icon: Package, label: "Pacotes entregues (semana)", value: d?.pacotesSemana ?? 0 },
    { icon: DollarSign, label: "Total ganho (semana)", value: brl(d?.ganho ?? 0) },
  ];

  return <ModuleSummary items={items} loading={q.isLoading} columns={4} />;
}
