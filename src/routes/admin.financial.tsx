import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/financial")({ component: FinancialPage });

type Pago = {
  id: string; valor: number; data_pagamento: string | null;
  empresa_id: string; entregador_id: string; oferta_id: string | null;
  empresa_name?: string; entregador_name?: string;
};

function brl(cents: number) { return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function FinancialPage() {
  const [mrr, setMrr] = useState(0);
  const [byPlan, setByPlan] = useState<Record<string, number>>({});
  const [byMonth, setByMonth] = useState<Array<{ month: string; cents: number }>>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const sb = supabase as any;
    const [{ data: plans }, { data: emp }, { data: ents }] = await Promise.all([
      sb.from("plans").select("id, price_cents"),
      sb.from("empresas").select("plano, status"),
      sb.from("entregas").select("id, valor, data_pagamento, empresa_id, entregador_id, oferta_id, status")
        .eq("status", "pago").order("data_pagamento", { ascending: false }).limit(100),
    ]);

    const planMap = new Map<string, number>((plans ?? []).map((p: any) => [p.id, p.price_cents]));
    const planAgg: Record<string, number> = {};
    let mrrSum = 0;
    (emp ?? []).filter((e: any) => e.status === "ativo").forEach((e: any) => {
      const c = planMap.get(e.plano) ?? 0; mrrSum += c;
      planAgg[e.plano] = (planAgg[e.plano] ?? 0) + c;
    });
    setMrr(mrrSum); setByPlan(planAgg);

    // by month (last 12 months) from delivered payments
    const monthAgg = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthAgg.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    (ents ?? []).forEach((e: any) => {
      if (!e.data_pagamento) return;
      const d = new Date(e.data_pagamento);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthAgg.has(k)) monthAgg.set(k, monthAgg.get(k)! + Math.round(Number(e.valor) * 100));
    });
    setByMonth(Array.from(monthAgg, ([month, cents]) => ({ month, cents })));

    // hydrate names
    const ids = new Set<string>();
    (ents ?? []).forEach((e: any) => { ids.add(e.empresa_id); ids.add(e.entregador_id); });
    const arr = [...ids];
    if (arr.length) {
      const [{ data: empN }, { data: entN }] = await Promise.all([
        sb.from("empresas").select("id, razao_social, nome_fantasia").in("id", arr),
        sb.from("entregadores").select("id, nome_completo").in("id", arr),
      ]);
      const nameMap = new Map<string, string>();
      (empN ?? []).forEach((r: any) => nameMap.set(r.id, r.nome_fantasia || r.razao_social));
      (entN ?? []).forEach((r: any) => nameMap.set(r.id, r.nome_completo));
      setPagos((ents ?? []).map((e: any) => ({
        ...e, empresa_name: nameMap.get(e.empresa_id), entregador_name: nameMap.get(e.entregador_id),
      })));
    } else {
      setPagos([]);
    }
    setLoading(false);
  }

  function exportCSV() {
    const headers = ["data_pagamento","empresa","entregador","valor","oferta_id"];
    const csv = [headers.join(",")].concat(pagos.map((p) => [
      p.data_pagamento ?? "", p.empresa_name ?? p.empresa_id, p.entregador_name ?? p.entregador_id, p.valor, p.oferta_id ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "financeiro.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const maxMonth = Math.max(1, ...byMonth.map((m) => m.cents));
  const totalPlan = Math.max(1, Object.values(byPlan).reduce((s, n) => s + n, 0));

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Financeiro" description="MRR, ARR e pagamentos confirmados"
        action={<Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={DollarSign} label="MRR" value={brl(mrr)} hint="Receita recorrente mensal" />
        <StatCard icon={TrendingUp} label="ARR" value={brl(mrr * 12)} hint="Projeção anual" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Receita por mês (últimos 12)</h3>
          <div className="mt-4 flex h-44 items-end gap-1.5">
            {byMonth.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${m.month}: ${brl(m.cents)}`}>
                <div className="w-full rounded-t bg-primary/80"
                  style={{ height: `${(m.cents / maxMonth) * 100}%`, minHeight: 2 }} />
                <span className="text-[10px] text-muted-foreground">{m.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold">Receita por plano</h3>
          <div className="mt-4 space-y-2">
            {Object.entries(byPlan).length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
            {Object.entries(byPlan).map(([plan, cents]) => (
              <div key={plan}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{plan}</span>
                  <span className="font-medium">{brl(cents)} ({Math.round((cents / totalPlan) * 100)}%)</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${(cents / totalPlan) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h3 className="font-semibold">Pagamentos PIX confirmados (últimos 100)</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Entregador</TableHead>
              <TableHead>Oferta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : pagos.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Nenhum pagamento confirmado ainda.</TableCell></TableRow>
            ) : pagos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleString("pt-BR") : "—"}</TableCell>
                <TableCell>{p.empresa_name ?? "—"}</TableCell>
                <TableCell>{p.entregador_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{p.oferta_id?.slice(0, 8) ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">{Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
