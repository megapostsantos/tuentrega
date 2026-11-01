import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Megaphone, Minus, MoreHorizontal, Plus, Trash2, UserPlus, Users, Wand2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RegisterEntregadorDialog } from "@/components/RegisterEntregadorDialog";

export type RotaOp = {
  id: string; nome: string; quantidade_pacotes: number; quantidade_paradas: number; valor_total: number;
  oferta_id: string | null; status: string; pacotes_sistema?: number | null; ajuste_motivo?: string | null; conferida?: boolean | null;
};
type OfertaOp = { id: string; status: string; entregador_id: string | null };

const MOTIVOS = ["Não veio do galpão", "Avariado", "Extraviado", "Contagem errada no sistema", "Outro"];
const rpc = (fn: string, args: Record<string, unknown>) => (supabase as any).rpc(fn, args) as Promise<{ data: any; error: { message: string } | null }>;
const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Um cartão por rota: conferir (− / +), escolher parceiro, publicar e eliminar no mesmo lugar. */
export function RotasOperacao({
  operacaoId, empresaId, dataOperacao, rotas, ofertas, onChanged, publicar, onEliminar,
}: {
  operacaoId: string; empresaId: string; dataOperacao: string;
  rotas: RotaOp[]; ofertas: OfertaOp[];
  onChanged: () => void;
  publicar: (rotaIds: string[]) => Promise<number>;
  onEliminar: (r: RotaOp) => void;
}) {
  const { isOperador } = useAuth();
  const [edits, setEdits] = useState<Record<string, { qtd: number; motivo: string }>>({});
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [aceitos, setAceitos] = useState<any[]>([]);
  const [ativos, setAtivos] = useState<{ id: string; nome_completo: string }[]>([]);
  const [alocacoes, setAlocacoes] = useState<any[]>([]);

  async function load() {
    const sb = supabase as any;
    const { data: prevs } = await sb.from("agenda_previsoes").select("id").eq("empresa_id", empresaId).eq("data_prevista", dataOperacao);
    const prevIds = (prevs ?? []).map((p: any) => p.id);
    if (prevIds.length) {
      const { data: cs } = await sb.from("agenda_compromissos").select("id, entregador_id").in("previsao_id", prevIds).neq("status", "cancelado");
      setAceitos(cs ?? []);
    } else setAceitos([]);
    const { data: alc } = await sb.from("alocacoes").select("*, entregadores(nome_completo)").eq("operacao_id", operacaoId);
    setAlocacoes((alc ?? []).filter((a: any) => !["recusada", "removida"].includes(a.status)));
    const { data: ents } = await sb.from("entregadores").select("id, nome_completo").eq("status", "ativo").order("nome_completo");
    setAtivos(ents ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [operacaoId, empresaId, dataOperacao, rotas.length]);

  const itens = rotas.filter((r) => r.status !== "cancelada");
  const alocDe = (rotaId: string) => alocacoes.find((a) => a.rota_id === rotaId);
  const confirmados = useMemo(() => new Set(aceitos.map((a) => a.entregador_id)), [aceitos]);
  const opcoes = useMemo(() => [...ativos].sort((x, y) => Number(confirmados.has(y.id)) - Number(confirmados.has(x.id))), [ativos, confirmados]);
  const edit = (r: RotaOp) => edits[r.id] ?? { qtd: r.quantidade_pacotes, motivo: r.ajuste_motivo ?? "" };
  const set = (r: RotaOp, p: Partial<{ qtd: number; motivo: string }>) => setEdits((e) => ({ ...e, [r.id]: { ...edit(r), ...p } }));
  const statusOferta = (r: RotaOp) => ofertas.find((o) => o.id === r.oferta_id)?.status;

  const rascunhos = itens.filter((r) => !r.oferta_id);
  const naoConferidas = itens.filter((r) => !r.conferida);
  const semParceiro = itens.filter((r) => !alocDe(r.id));
  const totais = useMemo(() => ({
    sistema: itens.reduce((s, r) => s + Number(r.pacotes_sistema ?? r.quantidade_pacotes), 0),
    contados: itens.reduce((s, r) => s + (edits[r.id]?.qtd ?? r.quantidade_pacotes), 0),
  }), [itens, edits]);

  async function confirmar(r: RotaOp) {
    const e = edit(r);
    setBusy(r.id);
    const { error } = await rpc("ajustar_pacotes_rota", { _rota_id: r.id, _quantidade: e.qtd, _motivo: e.motivo, _conferida: true });
    setBusy(null);
    if (error) return toast.error(error.message);
    setEdits((x) => { const n = { ...x }; delete n[r.id]; return n; });
    onChanged();
  }

  async function conferirRestantes() {
    setBusy("todas");
    for (const r of naoConferidas) {
      const e = edit(r);
      const { error } = await rpc("ajustar_pacotes_rota", { _rota_id: r.id, _quantidade: e.qtd, _motivo: e.motivo, _conferida: true });
      if (error) { toast.error(`${r.nome}: ${error.message}`); break; }
    }
    setBusy(null); setEdits({}); onChanged();
  }

  async function publicarIds(ids: string[]) {
    const pend = itens.filter((r) => ids.includes(r.id) && !r.conferida);
    if (pend.length && !confirm(`${pend.length} rota(s) ainda não foram conferidas. Publicar mesmo assim?`)) return;
    setBusy("pub");
    try { toast.success(`${await publicar(ids)} rota(s) publicada(s) no mercado.`); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao publicar."); } finally { setBusy(null); }
  }

  async function atribuir(r: RotaOp, entId: string) {
    const sb = supabase as any;
    const { error } = await sb.from("alocacoes").insert({ operacao_id: operacaoId, rota_id: r.id, entregador_id: entId, oferta_id: r.oferta_id, empresa_id: empresaId, status: "allocated" });
    if (error) throw error;
    if (r.oferta_id) await sb.from("ofertas").update({ entregador_id: entId, status: "accepted", atribuida_em: new Date().toISOString() }).eq("id", r.oferta_id);
    else await publicar([r.id]);
  }

  async function atribuirUma(r: RotaOp) {
    const entId = escolha[r.id];
    if (!entId) return toast.error("Escolha quem leva esta rota.");
    setBusy(r.id);
    try { await atribuir(r, entId); toast.success("Rota atribuída."); await load(); onChanged(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function distribuir() {
    setBusy("dist");
    try {
      const livres = aceitos.filter((a) => !alocacoes.some((al) => al.entregador_id === a.entregador_id));
      let i = 0;
      for (const r of semParceiro) { if (i >= livres.length) break; await atribuir(r, livres[i++].entregador_id); }
      toast.success(`${Math.min(livres.length, semParceiro.length)} rota(s) atribuídas.`);
      await load(); onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function iniciar() {
    const sb = supabase as any;
    const ids = itens.map((r) => r.oferta_id).filter((x): x is string => !!x);
    if (ids.length) {
      await sb.from("ofertas").update({ status: "in_progress", iniciada_em: new Date().toISOString() }).in("id", ids).not("entregador_id", "is", null);
      const { notifyDestinatarioOferta } = await import("@/lib/whatsapp-notify");
      ids.forEach((id: string) => { notifyDestinatarioOferta(id).catch(() => {}); });
    }
    await sb.from("alocacoes").update({ status: "started" }).eq("operacao_id", operacaoId);
    toast.success("Operação iniciada!");
    load(); onChanged();
  }

  const dif = totais.contados - totais.sistema;
  return (
    <div className="space-y-3 rounded-lg border-2 border-primary/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" />Rotas da operação ({itens.length})</div>
          <p className="text-xs text-muted-foreground">Confira a quantidade, escolha o parceiro e publique. Nada vai aos entregadores antes de você publicar.</p>
        </div>
        <div className="text-right text-xs">
          <div>Sistema <strong>{totais.sistema}</strong> · Contados <strong>{totais.contados}</strong>{dif !== 0 && <span className={dif < 0 ? " text-red-700" : " text-amber-700"}> ({dif > 0 ? "+" : ""}{dif})</span>}</div>
          <div className="text-muted-foreground">{itens.length - naoConferidas.length}/{itens.length} conferidas · {itens.length - semParceiro.length}/{itens.length} com parceiro</div>
        </div>
      </div>

      <div className="space-y-2">
        {itens.map((r) => {
          const e = edit(r);
          const original = Number(r.pacotes_sistema ?? r.quantidade_pacotes);
          const alterado = e.qtd !== r.quantidade_pacotes || (e.motivo || "") !== (r.ajuste_motivo ?? "");
          const so = statusOferta(r);
          const travada = !!r.oferta_id && ["in_progress", "awaiting_return", "completed"].includes(so ?? "");
          const aloc = alocDe(r.id);
          const sit = !r.oferta_id ? { t: "Rascunho", c: "bg-muted text-muted-foreground" } : aloc || so === "accepted" || travada ? { t: travada ? (so === "completed" ? "Concluída" : "Em andamento") : "Com parceiro", c: "bg-green-100 text-green-800" } : { t: "No mercado", c: "bg-amber-100 text-amber-800" };
          return (
            <div key={r.id} className={`rounded-lg border p-2.5 ${r.conferida && !alterado ? "bg-green-50/50" : "bg-card"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold">{r.nome}</span>
                  {r.conferida && !alterado && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                  <Badge className={sit.c}>{sit.t}</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!r.oferta_id && <DropdownMenuItem onClick={() => publicarIds([r.id])}><Megaphone className="mr-2 h-4 w-4" />Publicar só esta no mercado</DropdownMenuItem>}
                    {!isOperador && !travada && <DropdownMenuItem className="text-red-600" onClick={() => onEliminar(r)}><Trash2 className="mr-2 h-4 w-4" />Eliminar rota…</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" disabled={travada || e.qtd <= 0} onClick={() => set(r, { qtd: e.qtd - 1 })} aria-label="Menos um pacote"><Minus className="h-4 w-4" /></Button>
                  <input type="number" min={0} value={e.qtd} disabled={travada} onChange={(ev) => set(r, { qtd: Math.max(0, Math.floor(Number(ev.target.value) || 0)) })}
                    className={`h-9 w-16 rounded-md border text-center text-base font-bold ${e.qtd !== original ? "border-amber-400 bg-amber-50" : ""}`} />
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" disabled={travada} onClick={() => set(r, { qtd: e.qtd + 1 })} aria-label="Mais um pacote"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  sistema {original}{r.quantidade_paradas > 0 ? ` · ${r.quantidade_paradas} paradas` : ""}{!isOperador ? ` · ${brl(r.valor_total)}` : ""}
                </div>
                {(e.qtd !== original || r.ajuste_motivo) && (
                  <select value={e.motivo} disabled={travada} onChange={(ev) => set(r, { motivo: ev.target.value })} className="h-8 rounded-md border bg-background px-2 text-xs">
                    <option value="">Motivo da diferença</option>
                    {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
                {!travada && (!r.conferida || alterado) && (
                  <Button size="sm" disabled={busy === r.id} onClick={() => confirmar(r)}>
                    {busy === r.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                    {alterado ? `Confirmar ${e.qtd}` : "Conferido"}
                  </Button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2">
                {aloc ? (
                  <span className="text-sm text-emerald-700">✅ {(aloc.entregadores as any)?.nome_completo ?? "Parceiro"}</span>
                ) : (
                  <>
                    <select className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" value={escolha[r.id] ?? ""} onChange={(ev) => setEscolha((p) => ({ ...p, [r.id]: ev.target.value }))}>
                      <option value="">Escolher parceiro…</option>
                      {opcoes.map((en) => <option key={en.id} value={en.id}>{confirmados.has(en.id) ? "★ " : ""}{en.nome_completo}</option>)}
                    </select>
                    <Button size="sm" variant="outline" disabled={busy === r.id || !escolha[r.id]} onClick={() => atribuirUma(r)}>Atribuir</Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        {naoConferidas.length > 0 && (
          <Button variant="outline" size="sm" disabled={busy === "todas"} onClick={conferirRestantes}>
            {busy === "todas" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Conferir as {naoConferidas.length} restantes
          </Button>
        )}
        {aceitos.length > 0 && semParceiro.length > 0 && (
          <Button variant="outline" size="sm" disabled={busy === "dist"} onClick={distribuir}><Wand2 className="mr-1 h-4 w-4" />Distribuir entre os confirmados</Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setNovoOpen(true)}><UserPlus className="mr-1 h-4 w-4" />Cadastrar parceiro</Button>
        {rascunhos.length > 0 && (
          <Button size="sm" disabled={busy === "pub"} onClick={() => publicarIds(rascunhos.map((r) => r.id))}>
            {busy === "pub" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Megaphone className="mr-1 h-4 w-4" />}Publicar as {rascunhos.length} no mercado
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={itens.length - semParceiro.length === 0} onClick={iniciar}><Play className="mr-1 h-4 w-4" />Iniciar operação</Button>
      </div>
      <RegisterEntregadorDialog open={novoOpen} onClose={() => setNovoOpen(false)} onCreated={load} />
    </div>
  );
}
