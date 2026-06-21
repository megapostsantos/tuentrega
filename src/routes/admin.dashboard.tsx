import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Users, Truck, DollarSign, Search, ArrowRightCircle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { setImpersonation } from "@/lib/impersonation";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDashboard });

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type SearchResult =
  | { id: string; type: "empresa"; name: string; email: string; doc: string; plan: string; status: string }
  | { id: string; type: "entregador"; name: string; email: string; doc: string; plan: null; status: string };

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ------------ Stats query ------------
  const statsQ = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const sb = supabase as any;
      const nowIso = new Date().toISOString();
      const monthStart = (() => {
        const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
      })();

      const [empAtivasTrial, empAtivasPlano, entCount, entregasMes, planos, empPlanos] = await Promise.all([
        // Empresas ativas: trial não expirado
        sb.from("empresas").select("id", { count: "exact", head: true })
          .eq("status", "ativo").eq("plano", "free").gt("trial_ends_at", nowIso),
        // Empresas ativas: plano pago
        sb.from("empresas").select("id", { count: "exact", head: true })
          .eq("status", "ativo").neq("plano", "free"),
        sb.from("entregadores").select("id", { count: "exact", head: true }),
        sb.from("ofertas").select("id", { count: "exact", head: true })
          .eq("status", "completed").gte("created_at", monthStart),
        sb.from("plans").select("id, price_cents"),
        sb.from("empresas").select("plano").eq("status", "ativo").neq("plano", "free"),
      ]);

      const planMap = new Map<string, number>();
      (planos.data ?? []).forEach((p: any) => planMap.set(p.id, p.price_cents));
      const mrrCents = (empPlanos.data ?? []).reduce(
        (sum: number, e: any) => sum + (planMap.get(e.plano) ?? 0), 0,
      );

      return {
        empresasAtivas: (empAtivasTrial.count ?? 0) + (empAtivasPlano.count ?? 0),
        entregadoresTotal: entCount.count ?? 0,
        entregasMes: entregasMes.count ?? 0,
        mrrCents,
      };
    },
  });

  // ------------ Entregas por dia (últimos 30 dias) ------------
  const entregasDiaQ = useQuery({
    queryKey: ["admin-entregas-30d"],
    queryFn: async () => {
      const since = startOfDay(subDays(new Date(), 29));
      const sb = supabase as any;
      const { data, error } = await sb
        .from("ofertas")
        .select("created_at")
        .eq("status", "completed")
        .gte("created_at", since.toISOString());
      if (error) throw error;

      const buckets = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
        buckets.set(d, 0);
      }
      (data ?? []).forEach((r: any) => {
        const k = format(new Date(r.created_at), "yyyy-MM-dd");
        if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
      });
      return Array.from(buckets.entries()).map(([date, total]) => ({
        date,
        label: format(new Date(date + "T00:00"), "dd/MM"),
        total,
      }));
    },
  });

  // ------------ Empresas por semana (últimas 8 semanas) ------------
  const empresasSemanaQ = useQuery({
    queryKey: ["admin-empresas-8w"],
    queryFn: async () => {
      const since = startOfWeek(subWeeks(new Date(), 7), { weekStartsOn: 1 });
      const sb = supabase as any;
      const { data, error } = await sb
        .from("empresas")
        .select("created_at")
        .gte("created_at", since.toISOString());
      if (error) throw error;

      const buckets = new Map<string, number>();
      for (let i = 0; i < 8; i++) {
        const w = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 });
        buckets.set(format(w, "yyyy-MM-dd"), 0);
      }
      (data ?? []).forEach((r: any) => {
        const w = startOfWeek(new Date(r.created_at), { weekStartsOn: 1 });
        const k = format(w, "yyyy-MM-dd");
        if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
      });
      return Array.from(buckets.entries()).map(([date, total]) => ({
        date,
        label: format(new Date(date + "T00:00"), "dd/MM", { locale: ptBR }),
        total,
      }));
    },
  });

  // ------------ Search / impersonation (mantido) ------------
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    const t = setTimeout(runSearch, 250);
    return () => clearTimeout(t);
     
  }, [q]);

  async function runSearch() {
    setSearching(true);
    const sb = supabase as any;
    const like = `%${q.trim()}%`;
    const [emp, ent] = await Promise.all([
      sb.from("empresas").select("id, razao_social, nome_fantasia, cnpj, responsavel, plano, status").or(
        `razao_social.ilike.${like},nome_fantasia.ilike.${like},cnpj.ilike.${like},responsavel.ilike.${like}`,
      ).limit(8),
      sb.from("entregadores").select("id, nome_completo, cpf, status").or(
        `nome_completo.ilike.${like},cpf.ilike.${like}`,
      ).limit(8),
    ]);
    const ids = [...(emp.data ?? []).map((e: any) => e.id), ...(ent.data ?? []).map((e: any) => e.id)];
    const { data: profs } = ids.length
      ? await sb.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    const out: SearchResult[] = [
      ...(emp.data ?? []).map((e: any) => ({
        id: e.id, type: "empresa" as const,
        name: e.nome_fantasia || e.razao_social,
        email: (profMap.get(e.id) as string) || "",
        doc: e.cnpj, plan: e.plano, status: e.status,
      })),
      ...(ent.data ?? []).map((e: any) => ({
        id: e.id, type: "entregador" as const,
        name: e.nome_completo,
        email: (profMap.get(e.id) as string) || "",
        doc: e.cpf, plan: null, status: e.status,
      })),
    ];
    setResults(out);
    setSearching(false);
  }

  async function impersonate(r: SearchResult) {
    if (!user) return;
    const sb = supabase as any;
    const { data, error } = await sb.from("admin_impersonations").insert({
      admin_id: user.id, target_user_id: r.id, target_type: r.type,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await sb.from("admin_logs").insert({
      admin_id: user.id, action: "impersonate", target: r.id,
      details: { type: r.type, name: r.name },
    });
    setImpersonation({
      targetUserId: r.id, targetType: r.type, targetName: r.name,
      sessionId: data.id, adminId: user.id,
    });
    toast.success(`Visualizando como ${r.name}`);
    navigate({ to: "/dashboard" });
  }

  const s = statsQ.data;
  const loadingStats = statsQ.isLoading;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Dashboard Admin" description="Visão geral em tempo real da plataforma" />

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard icon={Building2} label="Empresas ativas" value={String(s?.empresasAtivas ?? 0)}
              hint="Trial vigente ou plano pago" />
            <StatCard icon={Users} label="Entregadores" value={String(s?.entregadoresTotal ?? 0)} />
            <StatCard icon={Truck} label="Entregas no mês" value={String(s?.entregasMes ?? 0)}
              hint="Ofertas concluídas" />
            <StatCard icon={DollarSign} label="MRR" value={brl(s?.mrrCents ?? 0)}
              hint="Soma dos planos ativos" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entregas por dia (30d)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {entregasDiaQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entregasDiaQ.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novas empresas por semana (8s)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {empresasSemanaQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={empresasSemanaQ.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2}
                    dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search / impersonation */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Entrar como empresa ou entregador</h2>
        <p className="text-sm text-muted-foreground">Busque por nome, e-mail, CNPJ ou CPF.</p>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {searching && <p className="mt-3 text-xs text-muted-foreground">Buscando...</p>}
        {results.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border">
            {results.map((r) => (
              <div key={`${r.type}-${r.id}`} className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{r.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{r.type}</span>
                    {r.plan && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase text-primary">{r.plan}</span>}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${r.status === "ativo" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.doc}</p>
                </div>
                <Button size="sm" variant="default" onClick={() => impersonate(r)}>
                  <ArrowRightCircle className="mr-1 h-4 w-4" /> Entrar como
                </Button>
              </div>
            ))}
          </div>
        )}
        {!searching && q.length >= 2 && results.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">Nenhum resultado.</p>
        )}
      </div>
    </div>
  );
}
