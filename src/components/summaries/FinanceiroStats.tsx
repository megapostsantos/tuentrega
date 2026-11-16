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
      const filtra = (q: any) => (empresaId ? q.eq("empresa_id", empresaId) : q);

      const [lanc, pag, ops, devidas] = await Promise.all([
        filtra(sb.from("financeiro_lancamentos").select("tipo, valor").gte("data_lancamento", monthIso.slice(0, 10))),
        filtra(sb.from("pagamentos").select("entregador_id, valor_total").gte("data_pagamento", monthIso)),
        filtra(sb.from("operacoes").select("total_pacotes_sistema, valor_ml_por_pacote").gte("recebido_em", monthIso)),
        // devido = rota concluída que ainda não foi paga (rota cancelada ou aberta não conta)
        filtra(sb.from("ofertas").select("valor, payment_status").in("status", ["completed", "closed"])),
      ]);
      const soma = (l: any[], f: (r: any) => number) => (l ?? []).reduce((s: number, r: any) => s + f(r), 0);
      // receita = entradas lançadas + recebimentos da origem já marcados como recebidos
      const receita = soma((lanc.data ?? []).filter((r: any) => r.tipo === "entrada"), (r) => Number(r.valor ?? 0))
        + soma(ops.data ?? [], (r) => Number(r.total_pacotes_sistema ?? 0) * Number(r.valor_ml_por_pacote ?? 0));
      // pagamentos feitos de verdade (inclui adicional/bônus)
      const totalPagos = soma(pag.data ?? [], (r) => Number(r.valor_total ?? 0));
      const totalPendentes = soma((devidas.data ?? []).filter((r: any) => r.payment_status !== "paid"), (r) => Number(r.valor ?? 0));
      const pessoas = new Set((pag.data ?? []).map((r: any) => r.entregador_id).filter(Boolean));
      const media = pessoas.size ? totalPagos / pessoas.size : 0;
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
