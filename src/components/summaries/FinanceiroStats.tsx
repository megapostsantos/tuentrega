import { useQuery } from "@tanstack/react-query";
import { DollarSign, CheckCircle2, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleSummary, type SummaryItem } from "@/components/ModuleSummary";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function startOfMonthISO() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
}

export function FinanceiroStats({ empresaId }: { empresaId?: string }) {
  const q = useQuery({
    queryKey: ["financeiro-stats", empresaId],
    queryFn: async () => {
      const sb = supabase as any;
      const monthIso = startOfMonthISO();

      const lancQ = sb
        .from("financeiro_lancamentos")
        .select("tipo, valor, entregador_id, data_lancamento")
        .gte("data_lancamento", monthIso.slice(0, 10));
      if (empresaId) lancQ.eq("empresa_id", empresaId);

      const pagQ = sb
        .from("ofertas")
        .select("valor, payment_status, entregador_id, created_at")
        .gte("created_at", monthIso);
      if (empresaId) pagQ.eq("empresa_id", empresaId);

      const [lanc, pag] = await Promise.all([lancQ, pagQ]);
      const receita = (lanc.data ?? [])
        .filter((r: any) => r.tipo === "entrada")
        .reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);

      const pagos = (pag.data ?? []).filter((r: any) => r.payment_status === "paid");
      const pendentes = (pag.data ?? []).filter((r: any) => r.payment_status === "pending");
      const totalPagos = pagos.reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);
      const totalPendentes = pendentes.reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);

      const porEntregador = new Map<string, number>();
      for (const p of pagos) {
        if (!p.entregador_id) continue;
        porEntregador.set(p.entregador_id, (porEntregador.get(p.entregador_id) ?? 0) + Number(p.valor ?? 0));
      }
      const media = porEntregador.size ? totalPagos / porEntregador.size : 0;

      return { receita, totalPagos, totalPendentes, media };
    },
  });

  const d = q.data;
  const items: SummaryItem[] = [
    { icon: DollarSign, label: "Receita do mês", value: brl(d?.receita ?? 0) },
    { icon: CheckCircle2, label: "Pagamentos realizados", value: brl(d?.totalPagos ?? 0) },
    { icon: Clock, label: "Pagamentos pendentes", value: brl(d?.totalPendentes ?? 0) },
    { icon: Users, label: "Média por entregador", value: brl(d?.media ?? 0) },
  ];

  return <ModuleSummary items={items} loading={q.isLoading} columns={4} />;
}
