import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

function brl(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

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
  const [stats, setStats] = useState({ proprios: 0, comissoes: 0, total: 0, aReceber: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const { data: ownDel } = await sb.from("ofertas").select("id, titulo, valor, status, closed_at, payment_status, quantidade_pacotes, valor_por_pacote")
        .eq("entregador_id", userId).gte("closed_at", monthStart.toISOString()).order("closed_at", { ascending: false });
      const proprios = (ownDel ?? []).reduce((s: number, o: any) => s + Number(o.valor || 0), 0);
      const aReceber = (ownDel ?? []).filter((o: any) => o.payment_status !== "paid").reduce((s: number, o: any) => s + Number(o.valor || 0), 0);
      setOwn(ownDel ?? []);
      setStats({ proprios, comissoes: 0, total: proprios, aReceber });
      setLoading(false);
    }
    load();
  }, [userId]);

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
        <TabsContent value="comissoes">
          <EmptyModule icon={Wallet} title="Comissões" description="As comissões aparecem aqui após as entregas do time serem concluídas." />
        </TabsContent>
        <TabsContent value="extrato">
          <Button variant="outline" className="w-full" onClick={() => window.print()}>📄 Exportar PDF (imprimir)</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
