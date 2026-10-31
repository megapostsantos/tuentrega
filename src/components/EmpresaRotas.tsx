import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronDown, Loader2, MapPin, Bike, CheckCircle2, AlertTriangle, Radio, RefreshCw, UserX, Undo2, Timer, PauseCircle, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { reofertarRota } from "@/lib/reofertar";
import { FleetMap, type FleetMarker } from "@/components/FleetMap";
import { estadoMovimento, fmtDur, type EstadoMov, type Ponto } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DevolucoesPendentes, OcorrenciasLista } from "@/components/rotas/DevolucoesPendentes";
import { FecharRotaGestorDialog } from "@/components/rotas/FecharRotaGestorDialog";
import { EntregadorRotas } from "@/components/rotas/EntregadorRotas";

type RotaOferta = {
  id: string;
  empresa_id: string;
  titulo: string;
  status: string;
  entregador_id: string | null;
  operacao_id: string | null;
  quantidade_pacotes: number | null;
  closed_at: string | null;
  iniciada_em: string | null;
  updated_at: string | null;
  entregadores?: { nome_completo?: string | null; tipo_veiculo?: string | null } | null;
};

type Recusa = {
  id: string; origem: string; motivo: string | null; created_at: string;
  ofertas?: { titulo?: string | null; status?: string | null } | null;
  entregadores?: { nome_completo?: string | null } | null;
};
type Contagem = { total: number; entregues: number; problemas: number };
type Pos = { registrado_em: string };
type PontoVel = Ponto & { vel: number | null };

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
  const [pontos, setPontos] = useState<Record<string, PontoVel[]>>({});
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<RotaOferta | null>(null);
  const [recusas, setRecusas] = useState<Recusa[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, tick] = useState(0);
  const [gerenciados, setGerenciados] = useState<Set<string>>(new Set());
  const [operar, setOperar] = useState<RotaOferta | null>(null);
  const [ocorr, setOcorr] = useState<RotaOferta | null>(null);
  const [fechar, setFechar] = useState<RotaOferta | null>(null);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [semMotorista, setSemMotorista] = useState<RotaOferta[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "em_rota" | "aguardando" | "sem_motorista" | "concluidas">("todas");

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    const sel = "id, empresa_id, titulo, status, entregador_id, operacao_id, quantidade_pacotes, closed_at, iniciada_em, updated_at, entregadores(nome_completo, tipo_veiculo)";
    let qa = supabase.from("ofertas").select(sel).in("status", ["accepted", "in_progress"]);
    if (empresaId) qa = qa.eq("empresa_id", empresaId);
    const { data: ativas } = await qa.order("updated_at", { ascending: false });
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let qf = supabase.from("ofertas").select(sel).eq("status", "completed").gte("closed_at", hoje.toISOString());
    if (empresaId) qf = qf.eq("empresa_id", empresaId);
    const { data: fim } = await qf.order("closed_at", { ascending: false }).limit(30);

    let qo = supabase.from("ofertas").select(sel).eq("status", "open");
    if (empresaId) qo = qo.eq("empresa_id", empresaId);
    const { data: abertasSem } = await qo.order("updated_at", { ascending: false });
    setSemMotorista((abertasSem as RotaOferta[]) ?? []);

    const a = (ativas as RotaOferta[]) ?? [];
    const c = (fim as RotaOferta[]) ?? [];
    setRotas(a);
    setConcluidas(c);
    const { data: ger } = await supabase.from("entregadores_gerenciados").select("entregador_id");
    setGerenciados(new Set(((ger as any[]) ?? []).map((g) => g.entregador_id)));

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
      const desde20 = new Date(Date.now() - 20 * 60000).toISOString();
      const { data: locs } = await supabase
        .from("entregador_localizacao").select("entregador_id, lat, lng, registrado_em, velocidade_kmh")
        .in("entregador_id", entIds).gte("registrado_em", desde20)
        .order("registrado_em", { ascending: false }).limit(3000);
      const pt: Record<string, PontoVel[]> = {};
      const p: Record<string, Pos> = {};
      for (const l of (locs as any[]) ?? []) {
        (pt[l.entregador_id] ??= []).push({
          lat: Number(l.lat), lng: Number(l.lng), t: new Date(l.registrado_em).getTime(),
          vel: l.velocidade_kmh != null ? Number(l.velocidade_kmh) : null,
        });
        if (!p[l.entregador_id]) p[l.entregador_id] = { registrado_em: l.registrado_em };
      }
      setPontos(pt);
      setPosicao(p);
    } else { setPosicao({}); setPontos({}); }

    const desde = new Date(Date.now() - 7 * 86400000).toISOString();
    let qr = supabase.from("ofertas_recusas")
      .select("id, origem, motivo, created_at, ofertas(titulo, status), entregadores(nome_completo)")
      .gte("created_at", desde);
    if (empresaId) qr = qr.eq("empresa_id", empresaId);
    const { data: rec } = await qr.order("created_at", { ascending: false }).limit(20);
    setRecusas((rec as Recusa[]) ?? []);
    setLoading(false);
  }

  async function reofertar(o: RotaOferta) {
    if (!o.entregador_id) return;
    if (!confirm(`Tirar ${o.entregadores?.nome_completo ?? "o entregador"} desta rota e oferecê-la a outros entregadores?`)) return;
    setBusyId(o.id);
    try {
      await reofertarRota({
        ofertaId: o.id, empresaId: o.empresa_id, entregadorId: o.entregador_id,
        motivo: "Empresa removeu o entregador (não compareceu ou desistiu)",
      });
      toast.success("Rota reofertada. Ela voltou para o mercado.");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível reofertar.");
    } finally {
      setBusyId(null);
    }
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

  const frota = useMemo(() => {
    return rotas.filter((o) => o.entregador_id).map((o) => {
      const pts = pontos[o.entregador_id!] ?? [];
      const mov: EstadoMov = estadoMovimento(pts);
      const c = contagem[o.id] ?? { total: o.quantidade_pacotes ?? 0, entregues: 0, problemas: 0 };
      const inicio = o.iniciada_em ? new Date(o.iniciada_em).getTime() : null;
      const decorrido = inicio ? Date.now() - inicio : null;
      const horas = decorrido ? decorrido / 3600000 : 0;
      const ritmo = horas > 0.05 && c.entregues > 0 ? c.entregues / horas : null;
      const restantes = Math.max(0, c.total - c.entregues - c.problemas);
      const previsaoMs = ritmo && restantes > 0 ? (restantes / ritmo) * 3600000 : null;
      return { o, c, mov, pts, inicio, decorrido, ritmo, previsaoMs, vel: pts[0]?.vel ?? null };
    });
  }, [rotas, pontos, contagem]);

  const marcadores: FleetMarker[] = frota
    .filter((f) => f.pts[0])
    .map((f) => ({ id: f.o.id, lat: f.pts[0].lat, lng: f.pts[0].lng, nome: f.o.entregadores?.nome_completo ?? "Entregador", estado: f.mov.estado, trilha: [...f.pts].reverse().map((x) => [x.lat, x.lng] as [number, number]) }));
  const contEstado = {
    movimento: frota.filter((f) => f.mov.estado === "movimento").length,
    parado: frota.filter((f) => f.mov.estado === "parado").length,
    sem_sinal: frota.filter((f) => f.mov.estado === "sem_sinal").length,
  };

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

      <DevolucoesPendentes empresaId={empresaId} onChanged={() => load()} />

      {frota.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-600" />Em movimento ({contEstado.movimento})</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-500" />Parado ({contEstado.parado})</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-gray-400" />Sem sinal ({contEstado.sem_sinal})</span>
          </div>
          <FleetMap marcadores={marcadores} />
        </section>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {([
          ["todas", "Todas", rotas.length + semMotorista.length + concluidas.length],
          ["em_rota", "Em rota", rotas.filter((o) => o.status === "in_progress").length],
          ["aguardando", "Aguardando início", rotas.filter((o) => o.status === "accepted").length],
          ["sem_motorista", "Sem motorista", semMotorista.length],
          ["concluidas", "Concluídas hoje", concluidas.length],
        ] as const).map(([k, label, n]) => (
          <button key={k} type="button" onClick={() => setFiltro(k)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filtro === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"} ${k === "sem_motorista" && n > 0 && filtro !== k ? "border-red-300 text-red-700" : ""}`}>
            {label} ({n})
          </button>
        ))}
      </div>

      {["sem_motorista", "todas"].includes(filtro) && semMotorista.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-700">Sem motorista ({semMotorista.length})</h3>
          {semMotorista.map((o) => (
            <Card key={o.id} className="border-red-200">
              <CardContent className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{o.titulo.includes("·") ? o.titulo.split("·").slice(1).join("·").trim() : o.titulo}</div>
                  <div className="text-xs text-muted-foreground">{o.quantidade_pacotes ?? 0} pacotes · aguardando um entregador aceitar</div>
                </div>
                <Button asChild size="sm" variant="outline"><Link to="/pacotes">Atribuir</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {["em_rota", "aguardando", "todas"].includes(filtro) && (rotas.length === 0 ? (
        filtro === "todas" && semMotorista.length > 0 ? null : (
        <EmptyModule
          icon={MapPin}
          title="Nenhuma rota em andamento"
          description="Quando um entregador aceitar uma oferta sua e iniciar a rota, ela aparece aqui com o progresso e a localização."
        />)
      ) : (
        <div className="space-y-3">
          {rotas.filter((o) => filtro === "todas" || (filtro === "em_rota" ? o.status === "in_progress" : o.status === "accepted")).map((o) => {
            const c = contagem[o.id] ?? { total: o.quantidade_pacotes ?? 0, entregues: 0, problemas: 0 };
            const feitos = c.entregues + c.problemas;
            const pct = c.total ? (feitos / c.total) * 100 : 0;
            const pos = o.entregador_id ? posicao[o.entregador_id] : undefined;
            const seg = pos ? (Date.now() - new Date(pos.registrado_em).getTime()) / 1000 : null;
            const gerenciado = !!o.entregador_id && gerenciados.has(o.entregador_id);
            const sinal = seg == null ? "sem sinal" : `há ${ago(pos!.registrado_em)}`;
            const cor = seg == null ? "text-red-600" : seg < 120 ? "text-green-600" : seg < 600 ? "text-amber-600" : "text-red-600";
            return (
              <Card key={o.id}>
                <CardContent className="space-y-3 p-3 sm:p-4">
                  <button type="button" className="flex w-full items-center gap-3 text-left"
                    onClick={() => setAbertas((x) => { const n = new Set(x); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })}>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${abertas.has(o.id) ? "" : "-rotate-90"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{o.titulo.includes("·") ? o.titulo.split("·").slice(1).join("·").trim() : o.titulo}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Bike className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{o.entregadores?.nome_completo ?? "Entregador não identificado"}</span>
                        <span className="shrink-0">· {feitos}/{c.total}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline">{o.status === "in_progress" ? "Em andamento" : "Aceita"}</Badge>
                      {gerenciado && <Badge variant="secondary">Sem app</Badge>}
                    </div>
                  </button>

                  {abertas.has(o.id) && (<>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{c.entregues} entregues · {c.problemas} com problema</span>
                      <span>{feitos}/{c.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {(() => {
                    const f = frota.find((x) => x.o.id === o.id);
                    if (!f) return null;
                    return (
                      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-2 text-xs sm:grid-cols-4">
                        <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" />
                          {f.inicio ? `Iniciou ${new Date(f.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Ainda não iniciou"}
                        </span>
                        <span>{f.decorrido != null ? `Em rota há ${fmtDur(f.decorrido)}` : "—"}</span>
                        <span>{f.ritmo ? `Ritmo ${f.ritmo.toFixed(0)} pacotes/h` : "Ritmo —"}</span>
                        <span>{f.previsaoMs ? `Termina em ~${fmtDur(f.previsaoMs)}` : "Previsão —"}</span>
                        <span className="col-span-2 flex items-center gap-1 sm:col-span-4">
                          {f.mov.estado === "movimento" && <><Navigation className="h-3.5 w-3.5 text-green-600" />Em movimento{f.vel ? ` · ${f.vel.toFixed(0)} km/h` : ""}</>}
                          {f.mov.estado === "parado" && <><PauseCircle className="h-3.5 w-3.5 text-amber-600" />Parado há {Math.floor(f.mov.paradoMin)} min{f.mov.paradoMin >= 19 ? "+" : ""}</>}
                          {f.mov.estado === "sem_sinal" && <><Radio className="h-3.5 w-3.5 text-gray-500" />Sem sinal de GPS</>}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between">
                    {gerenciado ? (
                      <span className="text-xs text-muted-foreground">Você opera esta rota</span>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs ${cor}`}>
                        <Radio className="h-3.5 w-3.5" /> Localização {sinal}
                      </span>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      {gerenciado && o.entregador_id ? (
                        <Button size="sm" onClick={() => setOperar(o)}>Operar rota</Button>
                      ) : (
                        <Button size="sm" disabled={!o.entregador_id} onClick={() => setTracking(o)}>
                          <MapPin className="mr-1 h-4 w-4" /> Mapa ao vivo
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(o.status === "in_progress" || o.status === "accepted") && (
                            <DropdownMenuItem onClick={() => setFechar(o)}>Encerrar pelo gestor</DropdownMenuItem>
                          )}
                          {c.problemas > 0 && <DropdownMenuItem onClick={() => setOcorr(o)}>Ocorrências ({c.problemas})</DropdownMenuItem>}
                          <DropdownMenuItem disabled={!o.entregador_id || busyId === o.id} className="text-red-600" onClick={() => reofertar(o)}>
                            Reofertar (tirar o entregador)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  </>)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {filtro === "todas" && recusas.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"><Undo2 className="h-4 w-4" />Recusas e remoções (7 dias)</h3>
          {recusas.map((r) => (
            <Card key={r.id} className="border-orange-300/60">
              <CardContent className="space-y-1 p-3 text-sm">
                <div>
                  <strong>{r.entregadores?.nome_completo ?? "Entregador"}</strong>{" "}
                  {r.origem === "entregador" ? "recusou" : "foi removido de"} <strong>{r.ofertas?.titulo ?? "a rota"}</strong>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.motivo ? `${r.motivo} · ` : ""}{new Date(r.created_at).toLocaleString("pt-BR")} ·{" "}
                  {r.ofertas?.status === "open" ? "aguardando outro entregador no mercado" : `situação: ${r.ofertas?.status ?? "—"}`}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {["concluidas", "todas"].includes(filtro) && concluidas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Concluídas hoje</h3>
          {concluidas.map((o) => {
            const c = contagem[o.id];
            return (
              <Card key={o.id}>
                <CardContent className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.entregadores?.nome_completo ?? "—"}
                      {o.iniciada_em && o.closed_at ? ` · duração ${fmtDur(new Date(o.closed_at).getTime() - new Date(o.iniciada_em).getTime())}` : ""}
                    </div>
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

      <Dialog open={!!operar} onOpenChange={(v) => !v && (setOperar(null), load())}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="sr-only"><DialogTitle>Operar rota</DialogTitle></DialogHeader>
          {operar?.entregador_id && <EntregadorRotas actingFor={{ ofertaId: operar.id, entregadorId: operar.entregador_id }} />}
        </DialogContent>
      </Dialog>
      <FecharRotaGestorDialog
        rota={fechar ? { id: fechar.id, titulo: fechar.titulo, entregadorNome: fechar.entregadores?.nome_completo } : null}
        total={fechar ? (contagem[fechar.id]?.total ?? fechar.quantidade_pacotes ?? 0) : 0}
        entreguesAtuais={fechar ? (contagem[fechar.id]?.entregues ?? 0) : 0}
        insucessosAtuais={fechar ? (contagem[fechar.id]?.problemas ?? 0) : 0}
        onClose={() => setFechar(null)}
        onDone={() => load()}
      />
      <Dialog open={!!ocorr} onOpenChange={(v) => !v && setOcorr(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Ocorrências — {ocorr?.titulo}</DialogTitle></DialogHeader>
          {ocorr && <OcorrenciasLista ofertaId={ocorr.id} />}
        </DialogContent>
      </Dialog>
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
