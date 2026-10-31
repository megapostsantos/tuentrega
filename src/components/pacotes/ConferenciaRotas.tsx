import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Minus, Plus, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Rota = { id: string; nome: string; quantidade_pacotes: number; oferta_id: string | null; status: string; pacotes_sistema?: number | null; ajuste_motivo?: string | null; conferida?: boolean | null };
type Oferta = { id: string; status: string; entregador_id: string | null };

const MOTIVOS = ["Não veio do galpão", "Avariado", "Extraviado", "Contagem errada no sistema", "Outro"];
const rpc = (fn: string, args: Record<string, unknown>) => (supabase as any).rpc(fn, args) as Promise<{ data: any; error: { message: string } | null }>;

function situacao(r: Rota, of?: Oferta) {
  if (!r.oferta_id || !of) return { txt: "Rascunho · não publicada", cls: "bg-muted text-muted-foreground" };
  if (of.entregador_id) return { txt: of.status === "in_progress" ? "Em andamento" : of.status === "completed" ? "Concluída" : "Com parceiro", cls: "bg-green-100 text-green-800" };
  return { txt: "Publicada no mercado", cls: "bg-amber-100 text-amber-800" };
}

/** Conferência final antes de ofertar: ajuste − / + em cada rota, motivo da diferença e publicação só quando você quiser. */
export function ConferenciaRotas({
  rotas, ofertas, onChanged, publicar,
}: {
  rotas: Rota[];
  ofertas: Oferta[];
  onChanged: () => void;
  publicar: (rotaIds: string[]) => Promise<number>;
}) {
  const [edits, setEdits] = useState<Record<string, { qtd: number; motivo: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const itens = rotas.filter((r) => r.status !== "cancelada");
  const rascunhos = itens.filter((r) => !r.oferta_id);
  const naoConferidas = itens.filter((r) => !r.conferida);
  const totais = useMemo(() => {
    const sistema = itens.reduce((s, r) => s + Number(r.pacotes_sistema ?? r.quantidade_pacotes), 0);
    const contados = itens.reduce((s, r) => s + (edits[r.id]?.qtd ?? r.quantidade_pacotes), 0);
    return { sistema, contados };
  }, [itens, edits]);

  const edit = (r: Rota) => edits[r.id] ?? { qtd: r.quantidade_pacotes, motivo: r.ajuste_motivo ?? "" };
  const set = (r: Rota, patch: Partial<{ qtd: number; motivo: string }>) => setEdits((e) => ({ ...e, [r.id]: { ...edit(r), ...patch } }));

  async function confirmar(r: Rota) {
    const e = edit(r);
    setBusy(r.id);
    const { error } = await rpc("ajustar_pacotes_rota", { _rota_id: r.id, _quantidade: e.qtd, _motivo: e.motivo, _conferida: true });
    setBusy(null);
    if (error) return toast.error(error.message);
    setEdits((x) => { const n = { ...x }; delete n[r.id]; return n; });
    toast.success(`${r.nome}: ${e.qtd} pacotes conferidos.`);
    onChanged();
  }

  async function conferirRestantes() {
    setBusy("todas");
    for (const r of naoConferidas) {
      const e = edit(r);
      const { error } = await rpc("ajustar_pacotes_rota", { _rota_id: r.id, _quantidade: e.qtd, _motivo: e.motivo, _conferida: true });
      if (error) { toast.error(`${r.nome}: ${error.message}`); break; }
    }
    setBusy(null);
    setEdits({});
    onChanged();
  }

  async function publicarRotas(ids: string[], nome?: string) {
    const pend = itens.filter((r) => ids.includes(r.id) && !r.conferida);
    if (pend.length && !confirm(`${pend.length} rota(s) ainda não foram conferidas${nome ? "" : ""}. Publicar mesmo assim?`)) return;
    setBusy("pub");
    try {
      const n = await publicar(ids);
      toast.success(`${n} rota(s) publicada(s) no mercado.`);
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao publicar."); } finally { setBusy(null); }
  }

  const dif = totais.contados - totais.sistema;
  return (
    <div className="space-y-3 rounded-lg border-2 border-primary/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">Conferência das rotas</div>
          <p className="text-xs text-muted-foreground">Confira quantos pacotes realmente chegaram em cada rota. Nada vai para os entregadores até você publicar.</p>
        </div>
        <div className="text-right text-xs">
          <div>Sistema: <strong>{totais.sistema}</strong> · Contados: <strong>{totais.contados}</strong></div>
          {dif !== 0 && <div className={dif < 0 ? "text-red-700" : "text-amber-700"}>{dif < 0 ? `${-dif} a menos` : `${dif} a mais`}</div>}
          <div className="text-muted-foreground">{itens.length - naoConferidas.length}/{itens.length} conferidas</div>
        </div>
      </div>

      <div className="space-y-2">
        {itens.map((r) => {
          const e = edit(r);
          const original = Number(r.pacotes_sistema ?? r.quantidade_pacotes);
          const alterado = e.qtd !== r.quantidade_pacotes || (e.motivo || "") !== (r.ajuste_motivo ?? "");
          const sit = situacao(r, ofertas.find((o) => o.id === r.oferta_id));
          const travada = !!r.oferta_id && ["in_progress", "awaiting_return", "completed"].includes(ofertas.find((o) => o.id === r.oferta_id)?.status ?? "");
          return (
            <div key={r.id} className={`rounded-lg border p-2.5 ${r.conferida && !alterado ? "bg-green-50/60" : "bg-card"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{r.nome}</span>
                    {r.conferida && !alterado && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                  </div>
                  <Badge className={`mt-0.5 ${sit.cls}`}>{sit.txt}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="mr-1 text-xs text-muted-foreground">Sistema {original}</span>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" disabled={travada || e.qtd <= 0} onClick={() => set(r, { qtd: e.qtd - 1 })} aria-label="Menos um pacote"><Minus className="h-4 w-4" /></Button>
                  <input type="number" min={0} value={e.qtd} disabled={travada}
                    onChange={(ev) => set(r, { qtd: Math.max(0, Math.floor(Number(ev.target.value) || 0)) })}
                    className={`h-9 w-16 rounded-md border text-center text-base font-bold ${e.qtd !== original ? "border-amber-400 bg-amber-50" : ""}`} />
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" disabled={travada} onClick={() => set(r, { qtd: e.qtd + 1 })} aria-label="Mais um pacote"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              {(e.qtd !== original || r.ajuste_motivo) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-amber-800">{e.qtd < original ? `${original - e.qtd} a menos que o sistema` : e.qtd > original ? `${e.qtd - original} a mais que o sistema` : ""}</span>
                  <select value={e.motivo} disabled={travada} onChange={(ev) => set(r, { motivo: ev.target.value })} className="h-8 rounded-md border bg-background px-2">
                    <option value="">Motivo (opcional)</option>
                    {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {!travada && (!r.conferida || alterado) && (
                  <Button size="sm" disabled={busy === r.id} onClick={() => confirmar(r)}>
                    {busy === r.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                    {alterado ? `Confirmar ${e.qtd}` : `Conferido (${e.qtd})`}
                  </Button>
                )}
                {!r.oferta_id && (
                  <Button size="sm" variant="outline" disabled={busy === "pub"} onClick={() => publicarRotas([r.id])}>
                    <Megaphone className="mr-1 h-4 w-4" />Publicar esta
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        {naoConferidas.length > 0 && (
          <Button variant="outline" disabled={busy === "todas"} onClick={conferirRestantes}>
            {busy === "todas" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Marcar as {naoConferidas.length} restantes como conferidas
          </Button>
        )}
        {rascunhos.length > 0 && (
          <Button disabled={busy === "pub"} onClick={() => publicarRotas(rascunhos.map((r) => r.id))}>
            {busy === "pub" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Megaphone className="mr-1 h-4 w-4" />}
            Publicar as {rascunhos.length} rotas no mercado
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Quer escolher quem leva antes de publicar? Use “Quem leva cada rota” abaixo: a rota atribuída só aparece para o parceiro escolhido.</p>
    </div>
  );
}
