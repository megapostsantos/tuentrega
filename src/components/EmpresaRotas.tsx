import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Bike, CheckCircle2, AlertTriangle, Radio, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type RotaOferta = {
  id: string;
  titulo: string;
  status: string;
  entregador_id: string | null;
  operacao_id: string | null;
  quantidade_pacotes: number | null;
  closed_at: string | null;
  updated_at: string | null;
  entregadores?: { nome_completo?: string | null; tipo_veiculo?: string | null } | null;
};

type Contagem = { total: number; entregues: number; problemas: number };
type Pos = { registrado_em: string };

function ago(iso: string | undefined | null) {
  if (!iso) return null;
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h`;
}

export function EmpresaRotas({ empresaId }: { empresaId: string | null }) {
  const [rotas, setRotas] = useState<RotaOferta[]>([]);
  const [concluidas, setConcluidas] = useState<RotaOferta[]>([]);
  const [contagem, setContagem] = useState<Record<string, Contagem>>({});
  const [posicao, setPosicao] = useState<Record<string, Pos>>({});
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<RotaOferta | null>(null);
  const [, tick] = useState(0);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    const sel = "id, titulo, status, entregador_id, operacao_id, quantidade_pacotes, closed_at, updated_at, entregadores(nome_completo, tipo_veiculo)";
    let qa = supabase.from("ofertas").select(sel).in("status", ["accepted", "in_progress"]);
    if (empresaId) qa = qa.eq("empresa_id", empresaId);
    const { data: ativas } = await qa.order("updated_at", { ascending: false });
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let qf = supabase.from("ofertas").select(sel).eq("status", "completed").gte("closed_at", hoje.toISOString());
    if (empresaId) qf = qf.eq("empresa_id", empresaId);
    const { data: fim } = await qf.order("closed_at", { ascending: false }).limit(30);

    const a = (ativas as RotaOferta[]) ?? [];
    const c = (fim as RotaOferta[]) ?? [];
    setRotas(a);
    setConcluidas(c);

    const ids = [...a, ...c].map((o) => o.id);
    if (ids.length) {
      const { data: pks } = await supabase.from("entregas_pacotes").select("oferta_id, status").in("oferta_id", ids);
      const m: Record<string, Contagem> = {};
      for (const p of (pks as any[]) ?? []) {
        const x = (m[p.oferta_id] ??= { total: 0, entregues: 0, problemas: 0 });
        x.total++;
        if (p.status === "delivered") x.entregues++;
        else if (p.status === "not_delivered") x.problemas++;
      }
      setContagem(m);
    } else setContagem({});

    const entIds = [...new Set(a.map((o) => o.entregador_id).filter(Boolean))] as string[];
    if (entIds.length) {
      const { data: locs } = await supabase
        .from("entregador_localizacao").select("entregador_id, registrado_em")
        .in("entregador_id", entIds).order("registrado_em", { ascending: false }).limit(300);
      const p: Record<string, Pos> = {};
      for (const l of (locs as any[]) ?? []) if (!p[l.entregador_id]) p[l.entregador_id] = { registrado_em: l.registrado_em };
      setPosicao(p);
    } else setPosicao({});
    setLoading(false);
  }

  useEffect(() => {
    load(true);
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000);
    const clock = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(t); clearInterval(clock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const resumo = useMemo(() => {
    let total = 0, entregues = 0, problemas = 0;
    for (const o of rotas) {
      const c = contagem[o.id];
      if (c) { total += c.total; entregues += c.entregues; problemas += c.problemas; }
    }
    return { total, entregues, problemas, pendentes: total - entregues - problemas };
  }, [rotas, contagem]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <PageHeader title="Rotas ao vivo" description="Acompanhe suas rotas em andamento e onde cada entregador está" />
        <Button variant="outline" size="sm" onClick={() => load(true)}><RefreshCw className="mr-1 h-4 w-4" />Atualizar</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rotas ativas" value={rotas.length} />
        <Stat label="Entregues" value={`${resumo.entregues}/${resumo.total}`} />
        <Stat label="Pendentes" value={resumo.pendentes} />
        <Stat label="Com problema" value={resumo.problemas} tone={resumo.problemas > 0 ? "warn" : undefined} />
      </div>

      {rotas.length === 0 ? (
        <EmptyModule
          icon={MapPin}
          title="Nenhuma rota em andamento"
          description="Quando um entregador aceitar uma oferta sua e iniciar a rota, ela aparece aqui com o progresso e a localização."
        />
      ) : (
        <div className="space-y-3">
          {rotas.map((o) => {
            const c = contagem[o.id] ?? { total: o.quantidade_pacotes ?? 0, entregues: 0, problemas: 0 };
            const feitos = c.entregues + c.problemas;
            const pct = c.total ? (feitos / c.total) * 100 : 0;
            const pos = o.entregador_id ? posicao[o.entregador_id] : undefined;
            const seg = pos ? (Date.now() - new Date(pos.registrado_em).getTime()) / 1000 : null;
            const sinal = seg == null ? "sem sinal" : `há ${ago(pos!.registrado_em)}`;
            const cor = seg == null ? "text-red-600" : seg < 120 ? "text-green-600" : seg < 600 ? "text-amber-600" : "text-red-600";
            return (
              <Card key={o.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{o.titulo}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <Bike className="h-4 w-4" />
                        {o.entregadores?.nome_completo ?? "Entregador não identificado"}
                      </div>
                    </div>
                    <Badge variant="outline">{o.status === "in_progress" ? "Em andamento" : "Aceita"}</Badge>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{c.entregues} entregues · {c.problemas} com problema</span>
                      <span>{feitos}/{c.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1 text-xs ${cor}`}>
                      <Radio className="h-3.5 w-3.5" /> Localização {sinal}
                    </span>
                    <Button size="sm" disabled={!o.entregador_id} onClick={() => setTracking(o)}>
                      <MapPin className="mr-1 h-4 w-4" /> Mapa ao vivo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {concluidas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Concluídas hoje</h3>
          {concluidas.map((o) => {
            const c = contagem[o.id];
            return (
              <Card key={o.id}>
                <CardContent className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.titulo}</div>
                    <div className="text-xs text-muted-foreground">{o.entregadores?.nome_completo ?? "—"}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" />{c?.entregues ?? 0}</span>
                    {(c?.problemas ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-orange-600"><AlertTriangle className="h-4 w-4" />{c?.problemas}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {tracking && (
        <LiveTrackingMap
          open
          onClose={() => setTracking(null)}
          ofertaId={tracking.id}
          entregadorId={tracking.entregador_id}
          operacaoId={tracking.operacao_id}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "warn" }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold tabular-nums ${tone === "warn" ? "text-orange-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
