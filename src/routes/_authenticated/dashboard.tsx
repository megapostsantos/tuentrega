import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, Truck, Wallet, Users, BarChart3, Building2, CalendarDays, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role, user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.user_metadata?.company_name || user?.email;

  if (role === "admin") return <AdminDashboard name={name} />;
  if (role === "empresa") return <EmpresaDashboard name={name} userId={user?.id} />;
  return <EntregadorDashboard name={name} userId={user?.id} />;
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOfTodayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}

function AdminDashboard({ name }: { name?: string }) {
  return (
    <div className="p-6">
      <PageHeader title={`Olá, ${name ?? "admin"}`} description="Visão geral da plataforma TuEntrega" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BarChart3} label="MRR" value="R$ 0" hint="Mensalidade recorrente" />
        <StatCard icon={Building2} label="Empresas" value="0" hint="Total cadastradas" />
        <StatCard icon={Users} label="Entregadores" value="0" hint="PJ ativos" />
        <StatCard icon={Truck} label="Entregas" value="0" hint="Últimos 30 dias" />
      </div>
    </div>
  );
}

type EmpresaStats = { pacotesHoje: number; ofertasAtivas: number; emRota: number; pixPagar: number };

function EmpresaDashboard({ name, userId }: { name?: string; userId?: string }) {
  const [stats, setStats] = useState<EmpresaStats>({ pacotesHoje: 0, ofertasAtivas: 0, emRota: 0, pixPagar: 0 });

  useEffect(() => {
    if (!userId) return;
    const sb = supabase as any;
    const today = startOfTodayISO();

    async function load() {
      const { data: minhasOfertas } = await sb.from("ofertas").select("id").eq("empresa_id", userId);
      const ids = (minhasOfertas ?? []).map((o: any) => o.id);

      const [pacotes, ativas, rota, pendentes] = await Promise.all([
        ids.length
          ? sb.from("entregas_pacotes").select("id", { count: "exact", head: true }).in("oferta_id", ids).gte("created_at", today)
          : Promise.resolve({ count: 0 }),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("empresa_id", userId).in("status", ["open", "accepted", "in_progress"]),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("empresa_id", userId).eq("status", "in_progress"),
        sb.from("entregas").select("valor").eq("empresa_id", userId).neq("status", "pago"),
      ]);

      const pix = (pendentes.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
      setStats({
        pacotesHoje: pacotes.count ?? 0,
        ofertasAtivas: ativas.count ?? 0,
        emRota: rota.count ?? 0,
        pixPagar: pix,
      });
    }

    load();
    const ch = sb.channel(`empresa-dash-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas", filter: `empresa_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas", filter: `empresa_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas_pacotes" }, load)
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, [userId]);

  return (
    <div className="p-6">
      <PageHeader title={`Olá, ${name ?? "empresa"}`} description="Acompanhe suas operações de hoje" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Pacotes hoje" value={String(stats.pacotesHoje)} />
        <StatCard icon={Store} label="Ofertas ativas" value={String(stats.ofertasAtivas)} />
        <StatCard icon={Truck} label="Em rota" value={String(stats.emRota)} />
        <StatCard icon={Wallet} label="PIX a pagar" value={brl(stats.pixPagar)} />
      </div>
    </div>
  );
}

type EntStats = { disponiveis: number; minhasHoje: number; emAndamento: number; aReceber: number };

function EntregadorDashboard({ name, userId }: { name?: string; userId?: string }) {
  const [stats, setStats] = useState<EntStats>({ disponiveis: 0, minhasHoje: 0, emAndamento: 0, aReceber: 0 });

  useEffect(() => {
    if (!userId) return;
    const sb = supabase as any;
    const today = startOfTodayISO();

    async function load() {
      const [disp, hoje, and, pend] = await Promise.all([
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("status", "open"),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("entregador_id", userId).gte("updated_at", today),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("entregador_id", userId).eq("status", "in_progress"),
        sb.from("entregas").select("valor").eq("entregador_id", userId).neq("status", "pago"),
      ]);
      const ar = (pend.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
      setStats({
        disponiveis: disp.count ?? 0,
        minhasHoje: hoje.count ?? 0,
        emAndamento: and.count ?? 0,
        aReceber: ar,
      });
    }

    load();
    const ch = sb.channel(`entregador-dash-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas", filter: `entregador_id=eq.${userId}` }, load)
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, [userId]);

  return (
    <div className="p-6">
      <PageHeader title={`Olá, ${name ?? "entregador"}`} description="Suas ofertas e ganhos em tempo real" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Store} label="Ofertas disponíveis" value={String(stats.disponiveis)} />
        <StatCard icon={Truck} label="Minhas entregas hoje" value={String(stats.minhasHoje)} />
        <StatCard icon={CalendarDays} label="Em andamento" value={String(stats.emAndamento)} />
        <StatCard icon={Wallet} label="A receber" value={brl(stats.aReceber)} />
      </div>
    </div>
  );
}
