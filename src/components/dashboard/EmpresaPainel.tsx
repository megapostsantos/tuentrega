import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus, ChevronRight, UserX, Clock, Truck, RotateCcw, CheckCircle2, Wallet, Users, CalendarDays, Map as MapIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Oferta = {
  id: string; titulo: string; status: string; entregador_id: string | null; quantidade_pacotes: number | null;
  valor: number | null; payment_status: string | null; closed_at: string | null; data_trabalho: string | null;
  entregadores?: { nome_completo?: string | null } | null;
};
type Pk = { oferta_id: string; status: string };

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hojeISO = () => new Date().toLocaleDateString("en-CA");

const STATUS: Record<string, { label: string; cls: string; ordem: number }> = {
  awaiting_return: { label: "Aguardando devolução", cls: "bg-amber-500/15 text-amber-700", ordem: 0 },
  open: { label: "Sem entregador", cls: "bg-red-500/10 text-red-700", ordem: 1 },
  accepted: { label: "Aguardando início", cls: "bg-blue-500/10 text-blue-700", ordem: 2 },
  in_progress: { label: "Em rota", cls: "bg-green-500/15 text-green-700", ordem: 3 },
  completed: { label: "Concluída", cls: "bg-muted text-muted-foreground", ordem: 4 },
};

export function EmpresaPainel({ userId }: { userId?: string }) {
  const { isOperador } = useAuth();
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [pks, setPks] = useState<Pk[]>([]);
  const [aPagar, setAPagar] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const sb = supabase as any;
    let vivo = true;
    async function load() {
      const hoje = hojeISO();
      const { data: ofs } = await sb.from("ofertas")
        .select("id, titulo, status, entregador_id, quantidade_pacotes, valor, payment_status, closed_at, data_trabalho, entregadores(nome_completo)")
        .eq("empresa_id", userId)
        .or(`data_trabalho.eq.${hoje},status.in.(open,accepted,in_progress,awaiting_return)`)
        .neq("status", "cancelled");
      const lista = ((ofs as Oferta[]) ?? []).filter((o) => o.status !== "completed" || o.data_trabalho === hoje || (o.closed_at ?? "").slice(0, 10) === hoje);
      const ids = lista.map((o) => o.id);
      const [{ data: p }, { data: pagar }] = await Promise.all([
        ids.length ? sb.from("entregas_pacotes").select("oferta_id, status").in("oferta_id", ids) : Promise.resolve({ data: [] }),
        sb.from("ofertas").select("valor").eq("empresa_id", userId).eq("status", "completed").or("payment_status.is.null,payment_status.eq.pending"),
      ]);
      if (!vivo) return;
      setOfertas(lista);
      setPks((p as Pk[]) ?? []);
      setAPagar(((pagar as any[]) ?? []).reduce((s, r) => s + Number(r.valor || 0), 0));
      setLoading(false);
    }
    load();
    const t = setInterval(load, 20000);
    return () => { vivo = false; clearInterval(t); };
  }, [userId]);

  const porOferta = useMemo(() => {
    const m = new Map<string, { total: number; entregues: number; problemas: number }>();
    for (const o of ofertas) m.set(o.id, { total: Number(o.quantidade_pacotes || 0), entregues: 0, problemas: 0 });
    for (const x of pks) {
      const c = m.get(x.oferta_id);
      if (!c) continue;
      if (x.status === "delivered") c.entregues++;
      else if (["not_delivered", "devolvido", "extraviado"].includes(x.status)) c.problemas++;
    }
    return m;
  }, [ofertas, pks]);

  const tot = useMemo(() => {
    let total = 0, entregues = 0, problemas = 0;
    for (const c of porOferta.values()) { total += c.total; entregues += c.entregues; problemas += c.problemas; }
    return { total, entregues, problemas, pendentes: Math.max(0, total - entregues - problemas) };
  }, [porOferta]);

  const conta = (st: string) => ofertas.filter((o) => o.status === st).length;
  const pct = tot.total ? Math.round(((tot.entregues + tot.problemas) / tot.total) * 100) : 0;
  const ordenadas = [...ofertas].sort((a, b) => (STATUS[a.status]?.ordem ?? 9) - (STATUS[b.status]?.ordem ?? 9) || a.titulo.localeCompare(b.titulo));
  const dataFmt = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  const tiles = [
    { label: "Sem entregador", n: conta("open"), icon: UserX, to: "/pacotes", alerta: true, tom: "text-red-600 bg-red-500/10" },
    { label: "Aguardando início", n: conta("accepted"), icon: Clock, to: "/rotas", tom: "text-blue-600 bg-blue-500/10" },
    { label: "Em rota", n: conta("in_progress"), icon: Truck, to: "/rotas", tom: "text-green-600 bg-green-500/10" },
    { label: "Devolver / dar baixa", n: conta("awaiting_return"), icon: RotateCcw, to: "/rotas", alerta: true, tom: "text-amber-600 bg-amber-500/15" },
    { label: "Concluídas hoje", n: conta("completed"), icon: CheckCircle2, to: "/ofertas", tom: "text-emerald-600 bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Hoje</p>
          <h1 className="text-xl font-bold capitalize">{dataFmt}</h1>
        </div>
        <Link to="/pacotes" className="inline-flex h-10 items-center gap-1 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground elev-1 press-scale">
          <Plus className="h-4 w-4" /> Nova operação
        </Link>
      </div>

      <Link to="/rotas" className="block rounded-2xl border border-border bg-card p-5 elev-1 press-scale">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Pacotes do dia</p>
            <p className="text-3xl font-bold tracking-tight">{tot.entregues}<span className="text-lg font-medium text-muted-foreground"> / {tot.total}</span></p>
          </div>
          <span className="text-2xl font-bold text-primary">{pct}%</span>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted">
          <div className="bg-green-500 transition-all" style={{ width: `${tot.total ? (tot.entregues / tot.total) * 100 : 0}%` }} />
          <div className="bg-amber-500 transition-all" style={{ width: `${tot.total ? (tot.problemas / tot.total) * 100 : 0}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div><p className="text-base font-bold text-green-600">{tot.entregues}</p>entregues</div>
          <div><p className="text-base font-bold">{tot.pendentes}</p>a entregar</div>
          <div><p className="text-base font-bold text-amber-600">{tot.problemas}</p>com problema</div>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`rounded-2xl border bg-card p-4 elev-1 press-scale ${t.alerta && t.n > 0 ? "border-orange-400" : "border-border"}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${t.tom}`}><t.icon className="h-[18px] w-[18px]" /></div>
            <p className="mt-3 text-2xl font-bold leading-none">{t.n}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.label}</p>
          </Link>
        ))}
        {!isOperador && <Link to="/pagamentos" className="rounded-2xl border border-border bg-card p-4 elev-1 press-scale">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary"><Wallet className="h-[18px] w-[18px]" /></div>
          <p className="mt-3 text-2xl font-bold leading-none">{brl(aPagar)}</p>
          <p className="mt-1 text-xs text-muted-foreground">A pagar aos entregadores</p>
        </Link>}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Rotas / zonas de hoje ({ofertas.length})</h2>
          <Link to="/ofertas" className="text-xs font-semibold text-primary">Ver todas →</Link>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : ordenadas.length === 0 ? (
          <Link to="/pacotes" className="flex items-center justify-between rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5 press-scale">
            <div>
              <p className="text-sm font-semibold">Nenhuma operação hoje</p>
              <p className="text-xs text-muted-foreground">Cadastre os pacotes e as zonas do dia para começar.</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ) : (
          <div className="space-y-2">
            {ordenadas.map((o) => {
              const c = porOferta.get(o.id)!;
              const feitos = c.entregues + c.problemas;
              const st = STATUS[o.status] ?? { label: o.status, cls: "bg-muted", ordem: 9 };
              const nome = o.titulo.includes("·") ? o.titulo.split("·").slice(1).join("·").trim() : o.titulo;
              return (
                <Link key={o.id} to={o.status === "open" ? "/pacotes" : "/rotas"} className="block rounded-xl border border-border bg-card p-3 elev-1 press-scale">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{o.entregadores?.nome_completo ?? "Sem entregador"} · {c.total} pacotes</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                  {o.status !== "open" && c.total > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-green-500" style={{ width: `${(feitos / c.total) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{feitos}/{c.total}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[
          { label: "Entregadores", to: "/entregadores", icon: Users },
          { label: "Agenda", to: "/agenda", icon: CalendarDays },
          { label: "Rotas ao vivo", to: "/rotas", icon: MapIcon },
          ...(isOperador ? [] : [{ label: "Pagamentos", to: "/pagamentos", icon: Wallet }]),
        ].map((a) => (
          <Link key={a.label} to={a.to} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold elev-1 press-scale">
            <a.icon className="h-3.5 w-3.5" />{a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
