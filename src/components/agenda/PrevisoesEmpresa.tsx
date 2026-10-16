import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Users, Lock, Unlock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Previsao = {
  id: string;
  data_prevista: string;
  pacotes_estimados: number;
  rotas_estimadas: number;
  pacotes_por_rota: number;
  valor_por_pacote: number;
  veiculo_necessario: string | null;
  endereco_coleta: string | null;
  hora_abertura: string | null;
  permite_cancelamento: boolean;
  cancelamento_ate: string | null;
  status: string;
};

type Compromisso = {
  id: string;
  previsao_id: string;
  entregador_id: string;
  pacotes_comprometidos: number;
  pacotes_ajustados: number | null;
  status: string;
  entregadores?: { nome_completo?: string | null; tipo_veiculo?: string | null } | null;
};

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
const hojeISO = () => new Date().toISOString().slice(0, 10);

export function PrevisoesEmpresa({ empresaId }: { empresaId: string }) {
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [comps, setComps] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(false);
  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data: pv } = await supabase
      .from("agenda_previsoes").select("*").eq("empresa_id", empresaId)
      .gte("data_prevista", hojeISO()).order("data_prevista", { ascending: true });
    const list = (pv as Previsao[]) ?? [];
    setPrevisoes(list);
    if (list.length) {
      const { data: cs } = await supabase
        .from("agenda_compromissos")
        .select("id, previsao_id, entregador_id, pacotes_comprometidos, pacotes_ajustados, status, entregadores(nome_completo, tipo_veiculo)")
        .in("previsao_id", list.map((p) => p.id)).order("created_at", { ascending: true });
      setComps((cs as Compromisso[]) ?? []);
    } else setComps([]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaId]);

  async function salvarAjuste(c: Compromisso) {
    const raw = ajustes[c.id];
    const n = raw === "" || raw === undefined ? null : Math.max(0, parseInt(raw, 10) || 0);
    setBusy(c.id);
    const { error } = await supabase.from("agenda_compromissos")
      .update({ pacotes_ajustados: n, status: "confirmado", updated_at: new Date().toISOString() } as any).eq("id", c.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Ajuste salvo.");
    load();
  }

  async function mudarStatus(p: Previsao, status: "aberta" | "encerrada") {
    setBusy(p.id);
    const { error } = await supabase.from("agenda_previsoes")
      .update({ status, updated_at: new Date().toISOString() } as any).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    load();
  }

  async function excluir(p: Previsao) {
    if (!confirm("Excluir esta previsão e os compromissos dos entregadores?")) return;
    setBusy(p.id);
    await supabase.from("agenda_compromissos").delete().eq("previsao_id", p.id);
    const { error } = await supabase.from("agenda_previsoes").delete().eq("id", p.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Previsões de rota</h2>
          <p className="text-sm text-muted-foreground">
            Publique a previsão dos próximos dias; os entregadores se comprometem e você ajusta na hora.
          </p>
        </div>
        <Button onClick={() => setNovo(true)}><CalendarPlus className="mr-2 h-4 w-4" />Nova previsão</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : previsoes.length === 0 ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">Nenhuma previsão futura. Crie uma para os entregadores já se comprometerem.</CardContent></Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {previsoes.map((p) => {
            const cs = comps.filter((c) => c.previsao_id === p.id && c.status !== "cancelado");
            const total = cs.reduce((s, c) => s + (c.pacotes_ajustados ?? c.pacotes_comprometidos), 0);
            const pct = p.pacotes_estimados ? Math.min(100, (total / p.pacotes_estimados) * 100) : 0;
            return (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold capitalize">{fmtData(p.data_prevista)}{p.hora_abertura ? ` · ${p.hora_abertura}` : ""}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.pacotes_estimados} pacotes · {p.rotas_estimadas} rota(s) · {brl(p.valor_por_pacote)}/pacote
                        {p.veiculo_necessario ? ` · ${p.veiculo_necessario}` : ""}
                      </div>
                    </div>
                    <Badge variant={p.status === "aberta" ? "default" : "secondary"}>{p.status === "aberta" ? "Aberta" : "Encerrada"}</Badge>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{cs.length} entregador(es)</span>
                      <span>{total} de {p.pacotes_estimados} pacotes cobertos</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {cs.length > 0 && (
                    <div className="space-y-2">
                      {cs.map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{c.entregadores?.nome_completo ?? "Entregador"}</div>
                            <div className="text-xs text-muted-foreground">
                              Prometeu {c.pacotes_comprometidos}
                              {c.pacotes_ajustados != null ? ` · ajustado para ${c.pacotes_ajustados}` : ""}
                            </div>
                          </div>
                          <Input
                            type="number" min={0} className="h-8 w-24" placeholder="Ajustar"
                            value={ajustes[c.id] ?? ""} onChange={(e) => setAjustes((a) => ({ ...a, [c.id]: e.target.value }))}
                          />
                          <Button size="sm" variant="outline" disabled={busy === c.id || (ajustes[c.id] ?? "") === ""} onClick={() => salvarAjuste(c)}>
                            Salvar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-2">
                    {p.status === "aberta" ? (
                      <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => mudarStatus(p, "encerrada")}>
                        <Lock className="mr-1 h-4 w-4" />Encerrar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => mudarStatus(p, "aberta")}>
                        <Unlock className="mr-1 h-4 w-4" />Reabrir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-600" disabled={busy === p.id} onClick={() => excluir(p)}>
                      <Trash2 className="mr-1 h-4 w-4" />Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NovaPrevisao open={novo} onOpenChange={setNovo} empresaId={empresaId} onCreated={load} />
    </section>
  );
}

function NovaPrevisao({
  open, onOpenChange, empresaId, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; empresaId: string; onCreated: () => void }) {
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [data, setData] = useState(amanha);
  const [pacotes, setPacotes] = useState("150");
  const [porRota, setPorRota] = useState("50");
  const [valor, setValor] = useState("1.80");
  const [veiculo, setVeiculo] = useState("");
  const [coleta, setColeta] = useState("");
  const [hora, setHora] = useState("07:00");
  const [permite, setPermite] = useState(true);
  const [ate, setAte] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const nPac = Math.max(0, parseInt(pacotes, 10) || 0);
  const nRota = Math.max(1, parseInt(porRota, 10) || 1);
  const rotas = nPac ? Math.ceil(nPac / nRota) : 0;

  async function salvar() {
    if (!data || nPac <= 0) return toast.error("Informe a data e a quantidade de pacotes.");
    setSaving(true);
    const { error } = await supabase.from("agenda_previsoes").insert({
      empresa_id: empresaId,
      data_prevista: data,
      pacotes_estimados: nPac,
      rotas_estimadas: rotas,
      pacotes_por_rota: nRota,
      valor_por_pacote: Number(valor) || 0,
      veiculo_necessario: veiculo.trim() || null,
      endereco_coleta: [coleta.trim(), obs.trim()].filter(Boolean).join(" — ") || null,
      hora_abertura: hora || null,
      permite_cancelamento: permite,
      cancelamento_ate: permite && ate ? new Date(ate).toISOString() : null,
      status: "aberta",
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Previsão publicada para os entregadores.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Nova previsão de rota</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Data</Label><Input type="date" value={data} min={hojeISO()} onChange={(e) => setData(e.target.value)} /></div>
            <div className="space-y-1"><Label>Horário de saída</Label><Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Pacotes</Label><Input type="number" min={1} value={pacotes} onChange={(e) => setPacotes(e.target.value)} /></div>
            <div className="space-y-1"><Label>Pacotes/rota</Label><Input type="number" min={1} value={porRota} onChange={(e) => setPorRota(e.target.value)} /></div>
            <div className="space-y-1"><Label>R$/pacote</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">≈ {rotas} rota(s) · {brl(nPac * (Number(valor) || 0))} no total</p>
          <div className="space-y-1"><Label>Veículo necessário (opcional)</Label><Input placeholder="Ex.: moto, carro, van" value={veiculo} onChange={(e) => setVeiculo(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Local de coleta (só aparece depois que o entregador se comprometer)</Label>
            <Input value={coleta} onChange={(e) => setColeta(e.target.value)} />
          </div>
          <div className="space-y-1"><Label>Observações (opcional)</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Permite alterar ou cancelar o compromisso</div>
              <div className="text-xs text-muted-foreground">Se desligado, o compromisso é firme.</div>
            </div>
            <Switch checked={permite} onCheckedChange={setPermite} />
          </div>
          {permite && (
            <div className="space-y-1"><Label>Pode alterar até (opcional)</Label><Input type="datetime-local" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Publicar previsão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
