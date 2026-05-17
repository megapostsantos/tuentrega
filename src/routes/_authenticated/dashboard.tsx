import { createFileRoute } from "@tanstack/react-router";
import { Package, Truck, Wallet, Users, BarChart3, Building2, CalendarDays, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role, user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.user_metadata?.company_name || user?.email;

  if (role === "admin") return <AdminDashboard name={name} />;
  if (role === "empresa") return <EmpresaDashboard name={name} />;
  return <EntregadorDashboard name={name} />;
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

function EmpresaDashboard({ name }: { name?: string }) {
  return (
    <div className="p-6">
      <PageHeader title={`Olá, ${name ?? "empresa"}`} description="Acompanhe suas operações de hoje" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Pacotes hoje" value="0" />
        <StatCard icon={Store} label="Ofertas ativas" value="0" />
        <StatCard icon={Truck} label="Em rota" value="0" />
        <StatCard icon={Wallet} label="PIX a pagar" value="R$ 0" />
      </div>
    </div>
  );
}

function EntregadorDashboard({ name }: { name?: string }) {
  return (
    <div className="p-6">
      <PageHeader title={`Olá, ${name ?? "entregador"}`} description="Suas ofertas e ganhos" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Store} label="Ofertas na região" value="0" />
        <StatCard icon={Truck} label="Entregas hoje" value="0" />
        <StatCard icon={CalendarDays} label="Próxima reserva" value="—" />
        <StatCard icon={Wallet} label="Ganhos do mês" value="R$ 0" />
      </div>
    </div>
  );
}
