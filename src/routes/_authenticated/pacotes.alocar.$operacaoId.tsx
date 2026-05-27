import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ArrowLeft, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/pacotes/alocar/$operacaoId")({
  component: AllocPage,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AllocPage() {
  const { operacaoId } = Route.useParams();
  const { user, role } = useAuth();
  const nav = useNavigate();
  const sb = supabase as any;

  const [loading, setLoading] = useState(true);
  const [op, setOp] = useState<any>(null);
  const [dispatchers, setDispatchers] = useState<any[]>([]);
  const [allocs, setAllocs] = useState<Record<string, { pacotes: number; paradas: number; valor: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role !== "empresa" || !user) return;
    (async () => {
      setLoading(true);
      const [{ data: opData }, { data: disp }] = await Promise.all([
        sb.from("operacoes").select("*").eq("id", operacaoId).maybeSingle(),
        sb.from("dispatchers").select("id, entregador_id, valor_por_pacote, status").eq("empresa_id", user.id).eq("status", "ativo"),
      ]);
      setOp(opData);
      const ids = (disp ?? []).map((d: any) => d.entregador_id);
      const { data: ents } = ids.length
        ? await sb.from("entregadores").select("id, nome_completo, reliability_level").in("id", ids)
        : { data: [] };
      const merged = (disp ?? []).map((d: any) => ({
        ...d,
        entregador: (ents ?? []).find((e: any) => e.id === d.entregador_id),
      }));
      setDispatchers(merged);
      const init: any = {};
      merged.forEach((d: any) => { init[d.id] = { pacotes: 0, paradas: 0, valor: Number(d.valor_por_pacote) || 0 }; });
      setAllocs(init);
      setLoading(false);
    })();
  }, [operacaoId, user, role]);

  const totals = useMemo(() => {
    const p = Object.values(allocs).reduce((s, a) => s + (a.pacotes || 0), 0);
    const s = Object.values(allocs).reduce((sum, a) => sum + (a.paradas || 0), 0);
    return { pacotes: p, paradas: s };
  }, [allocs]);

  const totalCost = useMemo(() => Object.values(allocs).reduce((s, a) => s + (a.pacotes || 0) * (a.valor || 0), 0), [allocs]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!op) return <div className="p-6 text-center text-muted-foreground">Operação não encontrada.</div>;

  const totalPkg = Number(op.total_pacotes_sistema) || 0;
  const totalStops = Number(op.total_paradas) || 0;
  const fullyAllocated = totals.pacotes === totalPkg && totals.paradas === totalStops && totalPkg > 0;

  async function confirm() {
    if (!fullyAllocated) return;
    setSaving(true);
    try {
      const rows = dispatchers
        .filter((d) => (allocs[d.id]?.pacotes || 0) > 0)
        .map((d) => ({
          empresa_id: user!.id,
          dispatcher_id: d.id,
          operacao_id: operacaoId,
          pacotes_alocados: allocs[d.id].pacotes,
          paradas_alocadas: allocs[d.id].paradas,
          valor_por_pacote: allocs[d.id].valor,
          status: "pending",
        }));
      const { error } = await sb.from("dispatcher_alocacoes").insert(rows);
      if (error) throw error;
      toast.success("Alocação confirmada! Dispatchers notificados.");
      nav({ to: "/pacotes" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  if (dispatchers.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/pacotes" })}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
        <PageHeader title="Alocar pacotes" description="Sem dispatchers ativos" />
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          Você não tem dispatchers ativos. Cadastre em <strong>Entregadores → Tornar Dispatcher</strong>.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-32 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/pacotes" })}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
      </div>
      <PageHeader title="Alocar pacotes" description="Distribua entre seus dispatchers ou gerencie direto" />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <strong>Total da operação:</strong> {totalPkg} pacotes / {totalStops} paradas
        </CardContent>
      </Card>

      <div className="space-y-3">
        {dispatchers.map((d) => {
          const a = allocs[d.id] || { pacotes: 0, paradas: 0, valor: 0 };
          const ganho = a.pacotes * a.valor;
          return (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> {d.entregador?.nome_completo || "—"}</span>
                  <Badge variant="outline" className="capitalize">{d.entregador?.reliability_level || "—"}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">Valor/pacote: {brl(Number(d.valor_por_pacote))}</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pacotes</Label>
                  <Input type="number" min={0} value={a.pacotes || ""} onChange={(e) => setAllocs((s) => ({ ...s, [d.id]: { ...a, pacotes: Number(e.target.value) || 0 } }))} />
                </div>
                <div>
                  <Label className="text-xs">Paradas</Label>
                  <Input type="number" min={0} value={a.paradas || ""} onChange={(e) => setAllocs((s) => ({ ...s, [d.id]: { ...a, paradas: Number(e.target.value) || 0 } }))} />
                </div>
                <div className="col-span-2 text-sm">
                  Ganho estimado: <strong>{brl(ganho)}</strong>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">💰 Resumo financeiro</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {dispatchers.filter((d) => (allocs[d.id]?.pacotes || 0) > 0).map((d) => {
            const a = allocs[d.id];
            return <div key={d.id}>{d.entregador?.nome_completo}: {a.pacotes}pct × {brl(a.valor)} = <strong>{brl(a.pacotes * a.valor)}</strong></div>;
          })}
          <div className="pt-2 border-t mt-2 font-semibold">Total a pagar dispatchers: {brl(totalCost)}</div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 backdrop-blur p-3 space-y-2">
        <div className="mx-auto max-w-2xl space-y-2">
          <div className="flex justify-between text-xs"><span>Pacotes: {totals.pacotes}/{totalPkg} {totals.pacotes === totalPkg ? "✅" : "⚠️"}</span><span>Paradas: {totals.paradas}/{totalStops} {totals.paradas === totalStops ? "✅" : "⚠️"}</span></div>
          <Progress value={totalPkg ? (totals.pacotes / totalPkg) * 100 : 0} className={fullyAllocated ? "[&>div]:bg-emerald-500" : ""} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => nav({ to: "/pacotes" })}>Gerenciar sem dispatchers</Button>
            <Button className="flex-1 bg-primary text-primary-foreground" disabled={!fullyAllocated || saving} onClick={confirm}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-1 h-4 w-4" />Confirmar alocação</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
