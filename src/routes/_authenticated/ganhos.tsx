import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { StatCard } from "@/components/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/ganhos")({
  component: GanhosPage,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function GanhosPage() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "dispatcher") {
    return <div className="p-6"><EmptyModule icon={Wallet} title="Acesso restrito" description="Esta área é exclusiva para dispatchers." /></div>;
  }
  return <GanhosView userId={user!.id} />;
}

function GanhosView({ userId }: { userId: string }) {
  const sb = supabase as any;
  const [own, setOwn] = useState<any[]>([]);
  const [comms, setComms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [{ data: ownDel }, { data: commData }] = await Promise.all([
        sb.from("ofertas").select("id, titulo, valor, status, closed_at, payment_status, quantidade_pacotes, valor_por_pacote")
          .eq("entregador_id", userId).gte("closed_at", monthStart.toISOString()).order("closed_at", { ascending: false }),
        sb.from("dispatcher_commissions").select("*").eq("dispatcher_user_id", userId)
          .gte("closed_at", monthStart.toISOString()).order("closed_at", { ascending: false }),
      ]);

      setOwn(ownDel ?? []);
      // resolve member names
      const memIds = Array.from(new Set((commData ?? []).map((c: any) => c.member_user_id).filter(Boolean)));
      const { data: ents } = memIds.length ? await sb.from("entregadores").select("id, nome_completo").in("id", memIds) : { data: [] };
      const nameMap: Record<string,string> = {};
      (ents ?? []).forEach((e: any) => { nameMap[e.id] = e.nome_completo; });
      setComms((commData ?? []).map((c: any) => ({ ...c, member_nome: nameMap[c.member_user_id] || "—" })));
      setLoading(false);
    })();
  }, [userId]);

  const stats = useMemo(() => {
    const proprios = own.reduce((s, o) => s + Number(o.valor || 0), 0);
    const comissoes = comms.reduce((s, c) => s + Number(c.comissao_total || 0), 0);
    const aReceber = own.filter((o) => o.payment_status !== "paid").reduce((s, o) => s + Number(o.valor || 0), 0)
      + comms.filter((c) => c.payment_status !== "paid").reduce((s, c) => s + Number(c.comissao_total || 0), 0);
    return { proprios, comissoes, total: proprios + comissoes, aReceber };
  }, [own, comms]);

  const commsByMember = useMemo(() => {
    const map: Record<string, { nome: string; items: any[]; total: number; pacotes: number }> = {};
    comms.forEach((c) => {
      const k = c.member_user_id;
      if (!map[k]) map[k] = { nome: c.member_nome, items: [], total: 0, pacotes: 0 };
      map[k].items.push(c);
      map[k].total += Number(c.comissao_total || 0);
      map[k].pacotes += Number(c.pacotes_entregues || 0);
    });
    return Object.values(map);
  }, [comms]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Meus Ganhos" description="Suas entregas e comissões do time" />
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Wallet} label="Próprias (mês)" value={brl(stats.proprios)} />
        <StatCard icon={Wallet} label="Comissões (mês)" value={brl(stats.comissoes)} />
        <StatCard icon={Wallet} label="Total do mês" value={brl(stats.total)} />
        <StatCard icon={Wallet} label="A receber" value={brl(stats.aReceber)} />
      </div>

      <Tabs defaultValue="proprias">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proprias">Próprias</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="extrato">Extrato</TabsTrigger>
        </TabsList>

        <TabsContent value="proprias" className="space-y-2">
          {own.length === 0 ? <EmptyModule icon={Wallet} title="Sem entregas" description="Você ainda não concluiu entregas neste mês." /> :
            own.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="text-sm font-semibold">{o.titulo}</p>
                  <p className="text-[11px] text-muted-foreground">{o.closed_at?.slice(0,10)} · {o.quantidade_pacotes} pct</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{brl(Number(o.valor || 0))}</p>
                  <p className={`text-[11px] ${o.payment_status === "paid" ? "text-success" : "text-amber-600"}`}>{o.payment_status === "paid" ? "Pago" : "Pendente"}</p>
                </div>
              </div>
            ))
          }
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-3">
          {commsByMember.length === 0 ? <EmptyModule icon={Wallet} title="Sem comissões" description="As comissões aparecem aqui após as entregas do time serem concluídas." /> :
            commsByMember.map((grp) => (
              <div key={grp.nome} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{grp.nome}</p>
                    <p className="text-[11px] text-muted-foreground">{grp.pacotes} pacotes</p>
                  </div>
                  <p className="font-bold">{brl(grp.total)}</p>
                </div>
                {grp.items.map((c: any) => (
                  <div key={c.oferta_id} className="rounded border p-2 text-xs space-y-0.5">
                    <div className="flex justify-between"><span>{c.titulo}</span><span className="text-muted-foreground">{c.closed_at?.slice(0,10)}</span></div>
                    <div>Pacotes: {c.pacotes_entregues} · Empresa: {brl(Number(c.valor_empresa))}/pct · Membro: {brl(Number(c.valor_membro))}/pct</div>
                    <div>Comissão: {c.pacotes_entregues}×{brl(Number(c.comissao_por_pacote))} = <strong>{brl(Number(c.comissao_total))}</strong> · <span className={c.payment_status === "paid" ? "text-emerald-600" : "text-amber-600"}>{c.payment_status === "paid" ? "🟢 Pago" : "🟡 Pendente"}</span></div>
                  </div>
                ))}
              </div>
            ))
          }
          {commsByMember.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
              <strong>Total comissões do mês: {brl(stats.comissoes)}</strong>
            </div>
          )}
        </TabsContent>

        <TabsContent value="extrato">
          <Button variant="outline" className="w-full" onClick={() => window.print()}>📄 Exportar PDF (imprimir)</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
