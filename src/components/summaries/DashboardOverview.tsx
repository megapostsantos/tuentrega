import { useQuery } from "@tanstack/react-query";
import { Package, Truck, Users, ArrowRightFromLine, DollarSign, Wallet, Zap, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleSummary, type SummaryItem } from "@/components/ModuleSummary";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppRole } from "@/hooks/use-auth";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function startOfTodayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function startOfWeekISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const day = d.getDay(); const diff = (day + 6) % 7; d.setDate(d.getDate() - diff);
  return d.toISOString();
}

export function DashboardOverview({ role, userId }: { role: AppRole; userId?: string }) {
  const showFinance = role === "admin" || role === "empresa";
  const scopedEmpresa = role === "empresa" ? userId : undefined;

  const statsQ = useQuery({
    queryKey: ["dashboard-overview", role, userId],
    queryFn: async () => {
      const sb = supabase as any;
      const todayIso = startOfTodayISO();
      const weekIso = startOfWeekISO();

      // Ofertas escopo
      const ofertasBase = () => {
        let q = sb.from("ofertas").select("id", { count: "exact", head: true });
        if (scopedEmpresa) q = q.eq("empresa_id", scopedEmpresa);
        return q;
      };

      // Pacotes cadastrados hoje: contamos via entregas_pacotes joined by oferta -> empresa
      // Simplificação: contar ofertas da empresa criadas hoje somando quantidade_pacotes
      const ofertasHojeQ = sb
        .from("ofertas")
        .select("quantidade_pacotes, empresa_id, created_at, status, entregador_id, valor")
        .gte("created_at", todayIso);
      if (scopedEmpresa) ofertasHojeQ.eq("empresa_id", scopedEmpresa);

      const [ofertasHoje, ofertasAtivas, entregadoresDisp, saidasHoje, semanaReceita, pagamentosPend] =
        await Promise.all([
          ofertasHojeQ,
          ofertasBase().eq("status", "in_progress"),
          sb.from("entregadores").select("id", { count: "exact", head: true }).eq("status", "ativo"),
          sb.from("saidas_nex").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
          showFinance
            ? sb.from("ofertas").select("valor, empresa_id, created_at, status").gte("created_at", weekIso).eq("status", "completed")
            : Promise.resolve({ data: [] }),
          showFinance
            ? sb.from("ofertas").select("valor, empresa_id, payment_status").eq("payment_status", "pending")
            : Promise.resolve({ data: [] }),
        ]);

      const totalPacotesHoje = (ofertasHoje.data ?? []).reduce(
        (s: number, o: any) => s + (o.quantidade_pacotes ?? 0),
        0,
      );

      const receitaSemana = (semanaReceita.data ?? [])
        .filter((r: any) => !scopedEmpresa || r.empresa_id === scopedEmpresa)
        .reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);

      const pendentes = (pagamentosPend.data ?? [])
        .filter((r: any) => !scopedEmpresa || r.empresa_id === scopedEmpresa)
        .reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0);

      return {
        totalPacotesHoje,
        rotasAtivas: ofertasAtivas.count ?? 0,
        entregadoresDisp: entregadoresDisp.count ?? 0,
        sacasHoje: saidasHoje.count ?? 0,
        receitaSemana,
        pagamentosPendentes: pendentes,
      };
    },
    enabled: !!userId || role === "admin",
  });

  const listsQ = useQuery({
    queryKey: ["dashboard-lists", role, userId],
    queryFn: async () => {
      const sb = supabase as any;
      const todayIso = startOfTodayISO();

      const ofertasQ = sb
        .from("ofertas")
        .select("id, titulo, status, valor, created_at, empresa_id")
        .order("created_at", { ascending: false })
        .limit(5);
      if (scopedEmpresa) ofertasQ.eq("empresa_id", scopedEmpresa);

      const [ofertas, saidas] = await Promise.all([
        ofertasQ,
        sb
          .from("saidas_nex")
          .select("id, hora_saida, codigo_nx, qr_saca, status, entregador_id, created_at")
          .gte("created_at", todayIso)
          .order("hora_saida", { ascending: false })
          .limit(6),
      ]);

      const entIds = Array.from(
        new Set((saidas.data ?? []).map((s: any) => s.entregador_id).filter(Boolean)),
      );
      let nameMap = new Map<string, string>();
      if (entIds.length) {
        const { data } = await sb.from("entregadores").select("id, nome_completo").in("id", entIds);
        (data ?? []).forEach((r: any) => nameMap.set(r.id, r.nome_completo));
      }

      return {
        ofertas: ofertas.data ?? [],
        saidas: (saidas.data ?? []).map((s: any) => ({
          ...s,
          motorista: nameMap.get(s.entregador_id) ?? "—",
        })),
      };
    },
    enabled: !!userId || role === "admin",
  });

  const s = statsQ.data;
  const items: SummaryItem[] = [
    { icon: Package, label: "Pacotes hoje", value: s?.totalPacotesHoje ?? 0 },
    { icon: Zap, label: "Rotas ativas", value: s?.rotasAtivas ?? 0 },
    { icon: Users, label: "Entregadores disponíveis", value: s?.entregadoresDisp ?? 0 },
    { icon: ArrowRightFromLine, label: "Sacas NEX hoje", value: s?.sacasHoje ?? 0 },
  ];
  if (showFinance) {
    items.push(
      { icon: DollarSign, label: "Receita da semana", value: brl(s?.receitaSemana ?? 0) },
      { icon: Wallet, label: "Pagamentos pendentes", value: brl(s?.pagamentosPendentes ?? 0) },
    );
  }

  const statusTone: Record<string, string> = {
    published: "bg-blue-100 text-blue-800",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-rose-100 text-rose-800",
  };

  return (
    <div className="space-y-4">
      <ModuleSummary items={items} loading={statsQ.isLoading} columns={showFinance ? 3 : 4} />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Últimas ofertas publicadas</h3>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </div>
          {listsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : listsQ.data && listsQ.data.ofertas.length > 0 ? (
            <ul className="divide-y divide-border">
              {listsQ.data.ofertas.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.titulo || "Oferta"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone[o.status] ?? "bg-muted"}`}>
                    {o.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma oferta ainda.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Saídas NEX de hoje</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          {listsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : listsQ.data && listsQ.data.saidas.length > 0 ? (
            <ul className="divide-y divide-border">
              {listsQ.data.saidas.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.motorista}</p>
                    <p className="text-[11px] text-muted-foreground">
                      NX {s.codigo_nx || "—"} · {s.hora_saida?.slice(0, 5) || "--:--"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma saída registrada hoje.</p>
          )}
        </div>
      </div>
    </div>
  );
}
