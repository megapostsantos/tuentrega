import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Users, Store, Truck, DollarSign, Wallet, Search, ArrowRightCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { setImpersonation } from "@/lib/impersonation";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/dashboard")({ component: AdminDashboard });

type Stats = {
  empresasTotal: number; empresasAtivas: number; empresasSuspensas: number;
  entregadoresTotal: number; entregadoresAtivos: number; entregadoresSuspensos: number;
  ofertasHoje: number; entregasHoje: number;
  mrrCents: number; pagoHojeCents: number;
};

const initial: Stats = {
  empresasTotal: 0, empresasAtivas: 0, empresasSuspensas: 0,
  entregadoresTotal: 0, entregadoresAtivos: 0, entregadoresSuspensos: 0,
  ofertasHoje: 0, entregasHoje: 0, mrrCents: 0, pagoHojeCents: 0,
};

type SearchResult =
  | { id: string; type: "empresa"; name: string; email: string; doc: string; plan: string; status: string }
  | { id: string; type: "entregador"; name: string; email: string; doc: string; plan: null; status: string };

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOfTodayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(initial);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const todayISO = startOfTodayISO();
    const sb = supabase as any;

    const [empAll, empAtivas, empSusp, entAll, entAtivos, entSusp, ofHoje, entHoje, plans, pagosHoje] = await Promise.all([
      sb.from("empresas").select("id", { count: "exact", head: true }),
      sb.from("empresas").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      sb.from("empresas").select("id", { count: "exact", head: true }).eq("status", "suspenso"),
      sb.from("entregadores").select("id", { count: "exact", head: true }),
      sb.from("entregadores").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      sb.from("entregadores").select("id", { count: "exact", head: true }).eq("status", "suspenso"),
      sb.from("ofertas").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      sb.from("entregas").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      sb.from("plans").select("id, price_cents"),
      sb.from("entregas").select("valor").eq("status", "pago").gte("data_pagamento", todayISO),
    ]);

    // MRR = sum over active empresas of plan price
    const planMap = new Map<string, number>();
    (plans.data ?? []).forEach((p: any) => planMap.set(p.id, p.price_cents));
    const { data: empPlanos } = await sb.from("empresas").select("plano, status").eq("status", "ativo");
    const mrrCents = (empPlanos ?? []).reduce((sum: number, e: any) => sum + (planMap.get(e.plano) ?? 0), 0);

    const pagoHojeCents = Math.round(
      (pagosHoje.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0) * 100
    );

    setStats({
      empresasTotal: empAll.count ?? 0,
      empresasAtivas: empAtivas.count ?? 0,
      empresasSuspensas: empSusp.count ?? 0,
      entregadoresTotal: entAll.count ?? 0,
      entregadoresAtivos: entAtivos.count ?? 0,
      entregadoresSuspensos: entSusp.count ?? 0,
      ofertasHoje: ofHoje.count ?? 0,
      entregasHoje: entHoje.count ?? 0,
      mrrCents, pagoHojeCents,
    });
    setLoading(false);
  }

  useEffect(() => {
    if (!q || q.length < 2) { setResults([]); return; }
    const t = setTimeout(runSearch, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function runSearch() {
    setSearching(true);
    const sb = supabase as any;
    const term = q.trim();
    const like = `%${term}%`;
    const [emp, ent] = await Promise.all([
      sb.from("empresas").select("id, razao_social, nome_fantasia, cnpj, responsavel, plano, status").or(
        `razao_social.ilike.${like},nome_fantasia.ilike.${like},cnpj.ilike.${like},responsavel.ilike.${like}`,
      ).limit(8),
      sb.from("entregadores").select("id, nome_completo, cpf, status").or(
        `nome_completo.ilike.${like},cpf.ilike.${like}`,
      ).limit(8),
    ]);

    // Fetch emails via profiles
    const ids = [...(emp.data ?? []).map((e: any) => e.id), ...(ent.data ?? []).map((e: any) => e.id)];
    const { data: profs } = ids.length
      ? await sb.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));

    const out: SearchResult[] = [
      ...(emp.data ?? []).map((e: any) => ({
        id: e.id, type: "empresa" as const,
        name: e.nome_fantasia || e.razao_social,
        email: profMap.get(e.id) || "",
        doc: e.cnpj, plan: e.plano, status: e.status,
      })),
      ...(ent.data ?? []).map((e: any) => ({
        id: e.id, type: "entregador" as const,
        name: e.nome_completo,
        email: profMap.get(e.id) || "",
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

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Dashboard Admin" description="Visão geral em tempo real da plataforma" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Building2} label="Empresas" value={String(stats.empresasTotal)}
          hint={`${stats.empresasAtivas} ativas · ${stats.empresasSuspensas} suspensas`} />
        <StatCard icon={Users} label="Entregadores" value={String(stats.entregadoresTotal)}
          hint={`${stats.entregadoresAtivos} ativos · ${stats.entregadoresSuspensos} suspensos`} />
        <StatCard icon={Store} label="Ofertas hoje" value={String(stats.ofertasHoje)} />
        <StatCard icon={Truck} label="Entregas hoje" value={String(stats.entregasHoje)} />
        <StatCard icon={DollarSign} label="MRR" value={brl(stats.mrrCents)} hint="Receita recorrente" />
        <StatCard icon={Wallet} label="Pago hoje (PIX)" value={brl(stats.pagoHojeCents)} />
      </div>

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

      {loading && <p className="text-xs text-muted-foreground">Atualizando dados...</p>}
    </div>
  );
}
