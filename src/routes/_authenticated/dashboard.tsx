import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package, Truck, Wallet, BarChart3, Building2, CalendarDays, Store, Star, Plus, ChevronRight, Users, UserCog,
  TrendingUp, MapPin, Navigation, Clock, CheckCircle2, XCircle, RotateCcw, Target,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PendingAllocationBanner } from "@/components/PendingAllocationBanner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role, user } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  if (role === "dispatcher") return <DispatcherDashboard userId={user?.id} />;
  if (role === "empresa") return <EmpresaDashboard userId={user?.id} />;
  return <EntregadorDashboard userId={user?.id} />;
}

/* ----------------- DISPATCHER ----------------- */

type DispStats = { pacotesAlocados: number; timeHoje: number; entregasConcluidas: number; ganhosHoje: number };

function DispatcherDashboard({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<DispStats>({ pacotesAlocados: 0, timeHoje: 0, entregasConcluidas: 0, ganhosHoje: 0 });
  const [alloc, setAlloc] = useState<{ id: string; pacotes: number; paradas: number; status: string; valor: number } | null>(null);
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const sb = supabase as any;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayDate = today.toISOString().slice(0, 10);
    const todayISO = today.toISOString();

    async function load() {
      const { data: dispRows } = await sb.from("dispatchers").select("id, empresa_id").eq("entregador_id", userId);
      if (!dispRows?.length) {
        setStats({ pacotesAlocados: 0, timeHoje: 0, entregasConcluidas: 0, ganhosHoje: 0 });
        setAlloc(null);
        setTeam([]);
        return;
      }
      const dispIds = dispRows.map((d: any) => d.id);

      // Today's allocation
      const { data: allocRows } = await sb
        .from("dispatcher_alocacoes")
        .select("id, pacotes_alocados, paradas_alocadas, status, valor_por_pacote, operacao_id")
        .in("dispatcher_id", dispIds)
        .order("created_at", { ascending: false });

      let todayAlloc: any = null;
      if (allocRows?.length) {
        const opIds = allocRows.map((a: any) => a.operacao_id);
        const { data: ops } = await sb.from("operacoes").select("id, data_operacao").in("id", opIds);
        const opMap = new Map((ops ?? []).map((o: any) => [o.id, o.data_operacao]));
        todayAlloc = allocRows.find((a: any) => opMap.get(a.operacao_id) === todayDate);
      }

      // Team
      const { data: teamRows } = await sb
        .from("dispatcher_team")
        .select("id, entregador_id, valor_padrao_por_pacote, exclusivo, exclusivo_aceito_dispatcher, exclusivo_aceito_entregador, status")
        .in("dispatcher_id", dispIds)
        .eq("status", "ativo");

      const entregadorIds = (teamRows ?? []).map((t: any) => t.entregador_id);
      let teamPeople: any[] = [];
      if (entregadorIds.length) {
        const { data: ents } = await sb.from("entregadores").select("id, nome_completo, tipo_veiculo, reliability_level").in("id", entregadorIds);
        const eMap = new Map((ents ?? []).map((e: any) => [e.id, e]));

        // Active offers today per entregador
        const { data: offersToday } = await sb
          .from("ofertas")
          .select("id, entregador_id, status, valor, pacotes_entregues, quantidade_pacotes, valor_por_pacote")
          .in("entregador_id", entregadorIds)
          .gte("updated_at", todayISO);

        teamPeople = (teamRows ?? []).map((t: any) => {
          const e: any = eMap.get(t.entregador_id) || {};
          const offers = (offersToday ?? []).filter((o: any) => o.entregador_id === t.entregador_id);
          const inProgress = offers.find((o: any) => o.status === "in_progress");
          const completed = offers.find((o: any) => o.status === "completed");
          const status = completed ? "concluido" : inProgress ? "em_rota" : offers.length ? "aguardando" : "disponivel";
          const target = offers.reduce((s: number, o: any) => s + (o.quantidade_pacotes || 0), 0);
          const done = offers.reduce((s: number, o: any) => s + (o.pacotes_entregues || 0), 0);
          const valor = offers.reduce((s: number, o: any) => s + Number(o.valor || 0), 0);
          return { id: t.id, entregador_id: t.entregador_id, nome: e.nome_completo, veiculo: e.tipo_veiculo, nivel: e.reliability_level, status, target, done, valor };
        });
      }

      // Stats
      const completedToday = teamPeople.filter((p) => p.status === "concluido").length;
      const activeToday = teamPeople.filter((p) => p.status !== "disponivel").length;

      // My own deliveries today
      const { data: myOffers } = await sb
        .from("ofertas")
        .select("valor")
        .eq("entregador_id", userId)
        .eq("status", "completed")
        .gte("closed_at", todayISO);
      const myEarnings = (myOffers ?? []).reduce((s: number, o: any) => s + Number(o.valor || 0), 0);

      // Margin commissions: alloc.valor - team member rate * delivered
      const commission = teamPeople.reduce((s, p) => {
        const member = (teamRows ?? []).find((t: any) => t.entregador_id === p.entregador_id);
        const margin = (todayAlloc?.valor_por_pacote || 0) - Number(member?.valor_padrao_por_pacote || 0);
        return s + Math.max(0, margin) * p.done;
      }, 0);

      setStats({
        pacotesAlocados: todayAlloc?.pacotes_alocados ?? 0,
        timeHoje: activeToday,
        entregasConcluidas: completedToday,
        ganhosHoje: myEarnings + commission,
      });
      setAlloc(todayAlloc ? {
        id: todayAlloc.id,
        pacotes: todayAlloc.pacotes_alocados,
        paradas: todayAlloc.paradas_alocadas,
        status: todayAlloc.status,
        valor: Number(todayAlloc.valor_por_pacote || 0),
      } : null);
      setTeam(teamPeople);
    }

    load();
    const ch = sb.channel(`dispatcher-dash-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatcher_alocacoes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatcher_team" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, load)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [userId]);

  const STATUS_LABEL: Record<string, { label: string; emoji: string; tone: string }> = {
    disponivel: { label: "Disponível", emoji: "⚪", tone: "bg-muted text-muted-foreground" },
    aguardando: { label: "Aguardando", emoji: "🟡", tone: "bg-amber-100 text-amber-800" },
    em_rota: { label: "Em rota", emoji: "🔵", tone: "bg-blue-100 text-blue-800" },
    concluido: { label: "Concluído", emoji: "✅", tone: "bg-green-100 text-green-800" },
  };

  return (
    <div className="space-y-5 p-4">
      {userId && <PendingAllocationBanner userId={userId} />}
      {alloc && (
        <Link
          to="/pacotes"
          className={`block rounded-2xl border-l-4 ${alloc.status === "distributed" ? "border-success" : "border-primary"} bg-card p-5 elev-2 press-scale`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            📦 {alloc.status === "distributed" ? "Distribuído ao time" : "Você tem pacotes alocados!"}
          </p>
          <p className="mt-2 text-xl font-bold">{alloc.pacotes} pacotes · {alloc.paradas} paradas</p>
          <p className="text-sm text-muted-foreground">R$ {alloc.valor.toFixed(2)}/pacote</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            {alloc.status === "distributed" ? "Ver distribuição" : "Distribuir pro time"} <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Package} label="Pacotes alocados" value={String(stats.pacotesAlocados)} to="/pacotes" />
        <StatCard icon={UserCog} label="Meu time hoje" value={String(stats.timeHoje)} to="/time" />
        <StatCard icon={Truck} label="Entregas concluídas" value={String(stats.entregasConcluidas)} to="/time" />
        <StatCard icon={Wallet} label="Meus ganhos hoje" value={brl(stats.ganhosHoje)} to="/ganhos" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 elev-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Meu time hoje</h2>
          <Link to="/time" className="text-xs font-semibold text-primary">Gerenciar →</Link>
        </div>
        {team.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum entregador no seu time ainda.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {team.map((p) => {
              const s = STATUS_LABEL[p.status];
              const pct = p.target ? Math.min(100, Math.round((p.done / p.target) * 100)) : 0;
              return (
                <li key={p.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {(p.nome || "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.nome || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{p.veiculo || "—"} · {p.nivel || "—"}</p>
                    </div>
                    <Badge className={`${s.tone} rounded-full px-2 py-0.5 text-[10px] font-semibold`}>{s.emoji} {s.label}</Badge>
                  </div>
                  {p.target > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{p.done}/{p.target} entregues</span>
                        <span>R$ {p.valor.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
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
  const [devolucoes, setDevolucoes] = useState(0);
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

      if (ids.length) {
        const { count: devCount } = await sb.from("entregas_pacotes")
          .select("id", { count: "exact", head: true })
          .in("oferta_id", ids)
          .in("status", ["devolvido", "problema"]);
        setDevolucoes(devCount ?? 0);
      } else {
        setDevolucoes(0);
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

      {/* Devoluções pendentes */}
      <Link
        to="/devolucoes"
        className={`block rounded-2xl border-l-4 p-4 elev-1 press-scale ${devolucoes > 0 ? "border-orange-500 bg-orange-500/5" : "border-border bg-card"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${devolucoes > 0 ? "bg-orange-500/15 text-orange-600" : "bg-muted text-muted-foreground"}`}>
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Devoluções pendentes</p>
              <p className="text-xs text-muted-foreground">
                {devolucoes > 0 ? `${devolucoes} pacote(s) aguardando reagendamento` : "Nenhuma devolução pendente"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>

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
  const [active, setActive] = useState<{ id: string; titulo: string; updated_at: string; quantidade_pacotes: number; pacotes_entregues: number } | null>(null);
  const [nextStops, setNextStops] = useState<any[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekly, setWeekly] = useState({ entregues: 0, devolvidas: 0, ganhos: 0, tempoMedio: 0 });

  useEffect(() => {
    if (!userId) return;
    const sb = supabase as any;
    const today = startOfTodayISO();
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400_000).toISOString();

    async function load() {
      const [disp, hoje, and, pend, sc, hi, act, comp, weekOffers, ocorrencias] = await Promise.all([
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("status", "open"),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("entregador_id", userId).gte("updated_at", today),
        sb.from("ofertas").select("id", { count: "exact", head: true }).eq("entregador_id", userId).eq("status", "in_progress"),
        sb.from("entregas").select("valor").eq("entregador_id", userId).neq("status", "pago"),
        sb.from("confiabilidade_score").select("score, nivel").eq("entregador_id", userId).maybeSingle(),
        sb.from("confiabilidade_historico").select("*").eq("entregador_id", userId).gte("created_at", fourWeeksAgo).order("created_at", { ascending: true }),
        sb.from("ofertas").select("id, titulo, updated_at, quantidade_pacotes, pacotes_entregues, status").eq("entregador_id", userId).in("status", ["in_progress", "accepted"]).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        sb.from("ofertas").select("valor").eq("entregador_id", userId).eq("status", "completed").gte("closed_at", today),
        sb.from("ofertas").select("valor, pacotes_entregues, pacotes_nao_entregues, created_at, closed_at").eq("entregador_id", userId).eq("status", "completed").gte("closed_at", weekAgo),
        sb.from("entregas_ocorrencias").select("id").eq("entregador_id", userId).gte("created_at", weekAgo),
      ]);
      const ar = (pend.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
      const earnings = (comp.data ?? []).reduce((s: number, r: any) => s + Number(r.valor || 0), 0);

      // Weekly performance
      const wo = weekOffers.data ?? [];
      const wEntregues = wo.reduce((s: number, o: any) => s + Number(o.pacotes_entregues || 0), 0);
      const wDevolvidas = (ocorrencias.data ?? []).length;
      const wGanhos = wo.reduce((s: number, o: any) => s + Number(o.valor || 0), 0);
      let totalMin = 0, totalStops = 0;
      for (const o of wo) {
        if (o.closed_at && o.created_at && o.pacotes_entregues) {
          const min = (new Date(o.closed_at).getTime() - new Date(o.created_at).getTime()) / 60000;
          if (min > 0 && min < 24 * 60) { totalMin += min; totalStops += o.pacotes_entregues; }
        }
      }
      const tempoMedio = totalStops ? Math.round(totalMin / totalStops) : 0;

      setStats({ disponiveis: disp.count ?? 0, minhasHoje: hoje.count ?? 0, emAndamento: and.count ?? 0, aReceber: ar });
      setScore(sc.data ?? { score: 100, nivel: "gold" });
      setHist(hi.data ?? []);
      setActive(act.data ?? null);
      setTodayEarnings(earnings);
      setWeekly({ entregues: wEntregues, devolvidas: wDevolvidas, ganhos: wGanhos, tempoMedio });

      // Next stops
      if (act.data?.id) {
        const { data: pacotes } = await sb.from("entregas_pacotes")
          .select("id, numero_pacote, endereco_entrega, status, ordem_otimizada")
          .eq("oferta_id", act.data.id)
          .eq("status", "pendente")
          .order("ordem_otimizada", { ascending: true, nullsFirst: false })
          .order("numero_pacote", { ascending: true })
          .limit(3);
        setNextStops(pacotes ?? []);
      } else {
        setNextStops([]);
      }
    }

    load();
    const ch = sb.channel(`entregador-dash-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas", filter: `entregador_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "confiabilidade_score", filter: `entregador_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "entregas_pacotes" }, load)
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, [userId]);

  const lvl = LEVELS[score?.nivel || "gold"] || LEVELS.gold;

  // 4-week score chart: walk backward from current
  const chartData = useMemo(() => {
    const now = Date.now();
    const current = score?.score ?? 100;
    // sum of points at or after each week boundary going back
    const buckets = [3, 2, 1, 0].map((w) => {
      const end = now - w * 7 * 86400_000;
      // score at "end" = current - sum(pontos for events with created_at > end)
      const after = hist.filter((h) => new Date(h.created_at).getTime() > end)
        .reduce((s, h) => s + Number(h.pontos || 0), 0);
      const label = w === 0 ? "Hoje" : `−${w}sem`;
      return { semana: label, score: current - after };
    });
    return buckets;
  }, [hist, score]);

  const lastEvent = hist.length ? hist[hist.length - 1] : null;
  const activeProgress = active ? Math.round(((active.pacotes_entregues || 0) / Math.max(1, active.quantidade_pacotes || 1)) * 100) : 0;
  const progressColor = activeProgress <= 30 ? "bg-destructive" : activeProgress <= 70 ? "bg-amber-500" : "bg-success";
  const weeklyTotal = weekly.entregues + weekly.devolvidas;
  const successRate = weeklyTotal ? Math.round((weekly.entregues / weeklyTotal) * 100) : 0;

  return (
    <div className="space-y-5 p-4">
      {/* Rota de hoje */}
      {active && (
        <div className="rounded-2xl border border-border bg-card p-5 elev-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">🚚 Rota de hoje</p>
              <p className="mt-1 text-base font-bold">{active.titulo}</p>
            </div>
            <span className="text-2xl font-bold text-primary">
              {active.pacotes_entregues ?? 0}<span className="text-base text-muted-foreground">/{active.quantidade_pacotes ?? 0}</span>
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${progressColor} transition-all`} style={{ width: `${activeProgress}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{activeProgress}% concluído</p>
          <Link to="/rotas" className="mt-3 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground elev-1 press-scale">
            Continuar rota <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
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

      {/* Próximas paradas */}
      {active && nextStops.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 elev-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Próximas paradas</h3>
            <Link to="/rotas" className="text-xs font-semibold text-primary">Ver todas →</Link>
          </div>
          <ul className="mt-3 space-y-2">
            {nextStops.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Pacote #{p.numero_pacote}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{p.endereco_entrega || "Sem endereço"}</p>
                </div>
                {p.endereco_entrega && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.endereco_entrega)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground press-scale"
                  >
                    <Navigation className="h-3.5 w-3.5" /> Navegar
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Desempenho da semana */}
      <div className="rounded-2xl border border-border bg-card p-5 elev-1">
        <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Desempenho da semana</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><CheckCircle2 className="h-3 w-3 text-success" /> Entregues</div>
            <p className="mt-1 text-xl font-bold text-success">{weekly.entregues}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><RotateCcw className="h-3 w-3 text-destructive" /> Devolvidas</div>
            <p className="mt-1 text-xl font-bold text-destructive">{weekly.devolvidas}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Wallet className="h-3 w-3" /> Ganhos</div>
            <p className="mt-1 text-xl font-bold">{brl(weekly.ganhos)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Target className="h-3 w-3 text-primary" /> Taxa de sucesso</div>
            <p className={`mt-1 text-xl font-bold ${successRate >= 90 ? "text-success" : successRate >= 70 ? "text-amber-600" : "text-destructive"}`}>{weeklyTotal ? `${successRate}%` : "—"}</p>
          </div>
        </div>
      </div>

      {/* Reliability with chart */}
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

        <div className="mt-4 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {lastEvent && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/40 p-3">
            {lastEvent.pontos >= 0
              ? <TrendingUp className="h-4 w-4 shrink-0 text-success" />
              : <TrendingDown className="h-4 w-4 shrink-0 text-destructive" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{lastEvent.descricao || lastEvent.evento}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(lastEvent.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <span className={`shrink-0 text-sm font-bold ${lastEvent.pontos >= 0 ? "text-success" : "text-destructive"}`}>
              {lastEvent.pontos > 0 ? "+" : ""}{lastEvent.pontos}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

