import { useQuery } from "@tanstack/react-query";
import { ArrowRightFromLine, Truck, AlertTriangle, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleSummary, type SummaryItem } from "@/components/ModuleSummary";

function startOfTodayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}

export function NexStats() {
  const q = useQuery({
    queryKey: ["nex-stats-today"],
    queryFn: async () => {
      const sb = supabase as any;
      const todayIso = startOfTodayISO();

      const { data: saidas } = await sb
        .from("saidas_nex")
        .select("id, status, created_at, hora_saida")
        .gte("created_at", todayIso);

      const total = saidas?.length ?? 0;
      const emRota = (saidas ?? []).filter((s: any) => s.status === "saiu").length;

      const saidaIds = (saidas ?? []).map((s: any) => s.id);
      let insucessos = 0;
      if (saidaIds.length) {
        const { count } = await sb
          .from("insucessos_nex")
          .select("id", { count: "exact", head: true })
          .in("saida_id", saidaIds);
        insucessos = count ?? 0;
      }

      // Tempo médio entre created_at e hora_saida (min)
      let mediaMin = 0;
      const diffs: number[] = [];
      for (const s of saidas ?? []) {
        if (!s.hora_saida || !s.created_at) continue;
        const created = new Date(s.created_at);
        const [hh, mm] = String(s.hora_saida).split(":").map(Number);
        const saida = new Date(created);
        saida.setHours(hh || 0, mm || 0, 0, 0);
        const diff = (saida.getTime() - created.getTime()) / 60000;
        if (diff >= 0 && diff < 24 * 60) diffs.push(diff);
      }
      if (diffs.length) mediaMin = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);

      return { total, emRota, insucessos, mediaMin };
    },
  });

  const d = q.data;
  const items: SummaryItem[] = [
    { icon: ArrowRightFromLine, label: "Sacas saídas hoje", value: d?.total ?? 0 },
    { icon: Truck, label: "Motoristas em rota", value: d?.emRota ?? 0 },
    { icon: AlertTriangle, label: "Insucessos hoje", value: d?.insucessos ?? 0 },
    { icon: Timer, label: "Tempo médio (min)", value: d?.mediaMin ?? 0, hint: "Entre cadastro e saída" },
  ];

  return <ModuleSummary items={items} loading={q.isLoading} columns={4} />;
}
