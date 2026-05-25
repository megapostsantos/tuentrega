import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Package, Truck, Wallet, BarChart3, Building2, CalendarDays, Store, Star, Plus, ChevronRight, Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role, user } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  if (role === "empresa") return <EmpresaDashboard userId={user?.id} />;
  return <EntregadorDashboard userId={user?.id} />;
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function startOfTodayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}

function AdminDashboard() {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={BarChart3} label="MRR" value="R$ 0" />
        <StatCard icon={Building2} label="Empresas" value="0" />
        <StatCard icon={Users} label="Entregadores" value="0" />
        <StatCard icon={Truck} label="Entregas" value="0" />
      </div>
    </div>
  );
}

/* ----------------- EMPRESA ----------------- */

type EmpresaStats = { pacotesHoje: number; ofertasAtivas: number; emRota: number; pixPagar: number };

function EmpresaDashboard({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<EmpresaStats>({ pacotesHoje: 0, ofertasAtivas: 0, emRota: 0, pixPagar: 0 });
  const [opActive, setOpActive] = useState<{ id: string; pacotes: number; paradas: number; rotas: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const sb = supabase as any;
    const today = startOfTodayISO();

    async function load() {
      const { data: minhasOfertas } = await sb.from("ofertas").select("id").eq("empresa_id", userId);
      const ids = (minhasOfertas ?? []).map((o: any) => o.id);

      const [pacotes, ativas, rota, pendentes, op] = await Promise.all([
        ids.length
          ? sb.from("entregas_pacotes").select("id", { count: "exact", head: true }).in("oferta_id", ids).gte("created_at", today)
          : Promise.resolve({ count: 0 }),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("empresa_id", userId).in("status", ["open", "accepted", "in_progress"]),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("empresa_id", userId).eq("status", "in_progress"),
        sb.from("entregas").select("valor").eq("empresa_id", userId).neq("status", "pago"),
        sb.from("operacoes").select("id, total_pacotes, total_paradas").eq("empresa_id", userId).gte("data_operacao", today.slice(0,10)).maybeSingle().then((r: any) => r).catch(() => ({ data: null })),
      ]);

      const pix = (pendentes.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
      setStats({
        pacotesHoje: pacotes.count ?? 0,
        ofertasAtivas: ativas.count ?? 0,
        emRota: rota.count ?? 0,
        pixPagar: pix,
      });

      if (op?.data) {
        const { count: rotas } = await sb.from("rotas_operacao").select("id", { count: "exact", head: true }).eq("operacao_id", op.data.id);
        setOpActive({
          id: op.data.id,
          pacotes: op.data.total_pacotes ?? 0,
          paradas: op.data.total_paradas ?? 0,
          rotas: rotas ?? 0,
        });
      } else {
        setOpActive(null);
      }
    }

    load();
    const ch = sb.channel(`empresa-dash-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas", filter: `empresa_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas", filter: `empresa_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas_pacotes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "operacoes", filter: `empresa_id=eq.${userId}` }, load)
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, [userId]);

  return (
    <div className="space-y-5 p-4">
      {/* Operation status */}
      {opActive ? (
        <Link
          to="/pacotes"
          className="block rounded-2xl border-l-4 border-primary bg-card p-5 elev-1 press-scale"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">⚡ Operação ativa hoje</p>
          <p className="mt-2 text-xl font-bold">{opActive.pacotes} pacotes · {opActive.paradas} paradas</p>
          <p className="text-sm text-muted-foreground">{opActive.rotas} rotas criadas</p>
          <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary">
            Ver operação <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
      ) : (
        <Link
          to="/pacotes"
          className="flex items-center justify-between rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5 press-scale"
        >
          <div>
            <p className="text-sm font-semibold">Nenhuma operação hoje</p>
            <p className="text-xs text-muted-foreground">Comece importando seus pacotes</p>
          </div>
          <span className="inline-flex h-10 items-center gap-1 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground elev-1">
            <Plus className="h-4 w-4" /> Iniciar
          </span>
        </Link>
      )}

      {/* Stats 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Package} label="Pacotes hoje" value={String(stats.pacotesHoje)} to="/pacotes" />
        <StatCard icon={Store} label="Ofertas ativas" value={String(stats.ofertasAtivas)} to="/ofertas" />
        <StatCard icon={Truck} label="Em rota" value={String(stats.emRota)} to="/ofertas" />
        <StatCard icon={Wallet} label="PIX a pagar" value={brl(stats.pixPagar)} to="/pagamentos" />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Ações rápidas</h2>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {[
            { label: "+ Nova operação", to: "/pacotes" },
            { label: "Entregadores", to: "/entregadores" },
            { label: "Pagamentos", to: "/pagamentos" },
            { label: "Agenda", to: "/agenda" },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground elev-1 press-scale"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Active routes preview */}
      <div className="rounded-2xl border border-border bg-card p-5 elev-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Rotas de hoje</h2>
          <Link to="/ofertas" className="text-xs font-semibold text-primary">Ver todas →</Link>
        </div>
        {stats.emRota === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhuma rota em andamento.</p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{stats.emRota} rota(s) em andamento agora.</p>
        )}
      </div>
    </div>
  );
}

/* ----------------- ENTREGADOR ----------------- */

type EntStats = { disponiveis: number; minhasHoje: number; emAndamento: number; aReceber: number };

const LEVELS: Record<string, { label: string; tone: string; stars: number }> = {
  diamond: { label: "Diamond", tone: "bg-cyan-100 text-cyan-800", stars: 5 },
  gold:    { label: "Gold", tone: "bg-amber-100 text-amber-800", stars: 4 },
  silver:  { label: "Silver", tone: "bg-slate-200 text-slate-700", stars: 3 },
  bronze:  { label: "Bronze", tone: "bg-orange-100 text-orange-800", stars: 2 },
  at_risk: { label: "Em risco", tone: "bg-red-100 text-red-800", stars: 1 },
  suspended:{ label: "Suspenso", tone: "bg-destructive text-destructive-foreground", stars: 0 },
};

function EntregadorDashboard({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<EntStats>({ disponiveis: 0, minhasHoje: 0, emAndamento: 0, aReceber: 0 });
  const [score, setScore] = useState<{ score: number; nivel: string } | null>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [active, setActive] = useState<{ id: string; titulo: string; updated_at: string } | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const sb = supabase as any;
    const today = startOfTodayISO();

    async function load() {
      const [disp, hoje, and, pend, sc, hi, act, comp] = await Promise.all([
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("status", "open"),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("entregador_id", userId).gte("updated_at", today),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("entregador_id", userId).eq("status", "in_progress"),
        sb.from("entregas").select("valor").eq("entregador_id", userId).neq("status", "pago"),
        sb.from("confiabilidade_score").select("score, nivel").eq("entregador_id", userId).maybeSingle(),
        sb.from("confiabilidade_historico").select("*").eq("entregador_id", userId).order("created_at", { ascending: false }).limit(5),
        sb.from("ofertas").select("id, titulo, updated_at").eq("entregador_id", userId).eq("status", "in_progress").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        sb.from("ofertas").select("valor").eq("entregador_id", userId).eq("status", "completed").gte("closed_at", today),
      ]);
      const ar = (pend.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
      const earnings = (comp.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
      setStats({
        disponiveis: disp.count ?? 0,
        minhasHoje: hoje.count ?? 0,
        emAndamento: and.count ?? 0,
        aReceber: ar,
      });
      setScore(sc.data ?? { score: 100, nivel: "gold" });
      setHist(hi.data ?? []);
      setActive(act.data ?? null);
      setTodayEarnings(earnings);
    }

    load();
    const ch = sb.channel(`entregador-dash-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas", filter: `entregador_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "confiabilidade_score", filter: `entregador_id=eq.${userId}` }, load)
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, [userId]);

  const lvl = LEVELS[score?.nivel || "gold"] || LEVELS.gold;

  return (
    <div className="space-y-5 p-4">
      {/* Active route */}
      {active && (
        <Link
          to="/ofertas"
          search={{ close: active.id } as never}
          className="block rounded-2xl bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground elev-3 press-scale"
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">🚚 Rota ativa agora</p>
          <p className="mt-2 text-xl font-bold">{active.titulo}</p>
          <p className="text-sm opacity-90">
            Iniciada às {new Date(active.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-primary">
            Fechar rota <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      {/* Earnings today */}
      <div className="rounded-2xl border border-border bg-card p-5 elev-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">💰 Seus ganhos hoje</p>
        <p className="mt-2 text-[32px] font-bold leading-none text-primary">{brl(todayEarnings)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{stats.minhasHoje} oferta(s) trabalhada(s) hoje</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Store} label="Ofertas disponíveis" value={String(stats.disponiveis)} to="/ofertas" />
        <StatCard icon={Truck} label="Minhas entregas hoje" value={String(stats.minhasHoje)} to="/rotas" />
        <StatCard icon={CalendarDays} label="Em andamento" value={String(stats.emAndamento)} to="/rotas" />
        <StatCard icon={Wallet} label="A receber" value={brl(stats.aReceber)} to="/pagamentos" />
      </div>

      {/* Reliability */}
      <div className="rounded-2xl border border-border bg-card p-5 elev-1">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Sua confiabilidade</h3>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[32px] font-bold leading-none">{score?.score ?? 100}</span>
          <Badge className={`${lvl.tone} rounded-full px-3 py-1 text-[11px] font-semibold`}>
            {"★".repeat(lvl.stars)}{"☆".repeat(5 - lvl.stars)} {lvl.label}
          </Badge>
        </div>
        {hist.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Últimas mudanças</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {hist.map((h) => (
                <li key={h.id} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">{h.descricao || h.evento}</span>
                  <span className={`shrink-0 font-semibold ${h.pontos >= 0 ? "text-success" : "text-destructive"}`}>
                    {h.pontos > 0 ? "+" : ""}{h.pontos}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
