import { useQuery } from "@tanstack/react-query";
import { Package, Route, CheckCircle2, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleSummary, type SummaryItem } from "@/components/ModuleSummary";

function startOfTodayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}

export function DistribuicaoStats({ empresaId }: { empresaId?: string }) {
  const q = useQuery({
    queryKey: ["distribuicao-stats", empresaId],
    queryFn: async () => {
      const sb = supabase as any;
      const todayIso = startOfTodayISO();

      const ofertasQ = sb.from("ofertas").select("id, entregador_id, status").gte("created_at", todayIso);
      if (empresaId) ofertasQ.eq("empresa_id", empresaId);
      const { data: ofertas } = await ofertasQ;
      const ofertaIds = (ofertas ?? []).map((o: any) => o.id);

      let totalHoje = 0, alocados = 0, entregues = 0, pendentes = 0;
      if (ofertaIds.length) {
        const { data: pacs } = await sb
          .from("entregas_pacotes")
          .select("status, oferta_id")
          .in("oferta_id", ofertaIds);
        totalHoje = pacs?.length ?? 0;
        for (const p of pacs ?? []) {
          if (p.status === "entregue") entregues++;
          else if (p.status === "em_rota" || p.status === "alocado") alocados++;
          else pendentes++;
        }
      }

      const entregadoresAtivos = new Set(
        (ofertas ?? []).filter((o: any) => o.entregador_id).map((o: any) => o.entregador_id),
      ).size;

      return { totalHoje, alocados, entregues, pendentes, entregadoresAtivos };
    },
  });

  const d = q.data;
  const items: SummaryItem[] = [
    { icon: Package, label: "Pacotes do dia", value: d?.totalHoje ?? 0 },
    { icon: Route, label: "Alocados em rota", value: d?.alocados ?? 0 },
    { icon: CheckCircle2, label: "Entregues", value: d?.entregues ?? 0 },
    { icon: Clock, label: "Pendentes", value: d?.pendentes ?? 0 },
    { icon: Users, label: "Entregadores ativos", value: d?.entregadoresAtivos ?? 0 },
  ];

  return <ModuleSummary items={items} loading={q.isLoading} columns={5} />;
}
