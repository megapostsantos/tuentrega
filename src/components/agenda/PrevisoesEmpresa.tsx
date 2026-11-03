import { AudienciaSelect, audienciaSalva, type Audiencia } from "@/components/AudienciaSelect";
import { useAuth } from "@/hooks/use-auth";
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

type ZonaPrev = { id: string; previsao_id: string; nome: string; pacotes_estimados: number; entregador_id: string | null };
type Cand = { id: string; zona_id: string; entregador_id: string; nome: string; score: number | null; veiculo: string | null };

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
  const [zonasPrev, setZonasPrev] = useState<ZonaPrev[]>([]);
  const [cands, setCands] = useState<Cand[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});

  async function decidirZona(c: Cand, aprovar: boolean) {
    setBusy(c.id);
    const { error } = await (supabase as any).rpc("decidir_zona", { _candidatura_id: c.id, _aprovar: aprovar });
    setBusy(null);
    if (error) toast.error(error.message); else toast.success(aprovar ? `${c.nome} ficou com a zona.` : "Postulação recusada.");
    load();
  }

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
    if (list.length) {
      const sbx = supabase as any;
      const ids = list.map((p) => p.id);
      const { data: zs } = await sbx.from("agenda_previsao_zonas").select("id, previsao_id, nome, pacotes_estimados, entregador_id").in("previsao_id", ids).order("nome");
      setZonasPrev((zs as ZonaPrev[]) ?? []);
      const { data: cz } = await sbx.from("agenda_zona_candidaturas").select("id, zona_id, entregador_id").in("previsao_id", ids).eq("status", "pendente").order("created_at");
      const entIds = [...new Set([...((cz as any[]) ?? []).map((c) => c.entregador_id), ...((zs as any[]) ?? []).map((z) => z.entregador_id).filter(Boolean)])];
      const { data: ents } = entIds.length ? await sbx.from("entregadores").select("id, nome_completo, reliability_score, tipo_veiculo").in("id", entIds) : { data: [] };
      const nm: Record<string, string> = {};
      for (const e of (ents as any[]) ?? []) nm[e.id] = e.nome_completo;
      setNomes(nm);
      setCands(((cz as any[]) ?? []).map((c) => {
        const e = ((ents as any[]) ?? []).find((x) => x.id === c.entregador_id);
        return { id: c.id, zona_id: c.zona_id, entregador_id: c.entregador_id, nome: e?.nome_completo ?? "Entregador", score: e?.reliability_score ?? null, veiculo: e?.tipo_veiculo ?? null };
      }));
    } else { setZonasPrev([]); setCands([]); }
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
                        {p.pacotes_estimados} pacotes · {p.rotas_estimadas} rota(s){p.valor_por_pacote != null && ` · ${brl(p.valor_por_pacote)}/pacote`}
                        {p.veiculo_necessario ? ` · ${p.veiculo_necessario}` : ""}
                      </div>
                    </div>
                    <Badge variant={p.status === "aberta" ? "default" : "secondary"}>{p.status === "aberta" ? "Aberta" : "Encerrada"}</Badge>
                  </div>

                  {zonasPrev.some((z) => z.previsao_id === p.id) && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">Zonas: quem quer fazer cada uma</div>
                      {zonasPrev.filter((z) => z.previsao_id === p.id).map((z) => {
                        const cz = cands.filter((c) => c.zona_id === z.id);
                        return (
                          <div key={z.id} className="rounded-lg border p-2.5 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold">{z.nome} <span className="text-xs font-normal text-muted-foreground">~{z.pacotes_estimados} pacotes</span></div>
                              {z.entregador_id ? <Badge className="bg-green-600">✅ {nomes[z.entregador_id] ?? "Atribuída"}</Badge>
                                : cz.length ? <Badge className="bg-amber-100 text-amber-800">{cz.length} interessado(s)</Badge>
                                : <Badge variant="outline">Sem interessados</Badge>}
                            </div>
                            {!z.entregador_id && cz.map((c) => (
                              <div key={c.id} className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/60 p-2">
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{c.nome}</div>
                                  <div className="text-xs text-muted-foreground">{c.veiculo ?? "—"} · nota {c.score ?? 100}</div>
                                </div>
                                <div className="flex shrink-0 gap-1.5">
                                  <Button size="sm" disabled={busy === c.id} onClick={() => decidirZona(c, true)}>Aprovar</Button>
                                  <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => decidirZona(c, false)}>Recusar</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

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
  const { isOperador } = useAuth();
  const [valor, setValor] = useState("1.80");
  useEffect(() => {
    if (!open || isOperador) return;
    (supabase as any).from("empresas").select("tms_valor_padrao_pacote").eq("id", empresaId).maybeSingle()
      .then(({ data }: any) => { if (data?.tms_valor_padrao_pacote != null) setValor(String(data.tms_valor_padrao_pacote)); });
  }, [open, isOperador, empresaId]);
  const [veiculo, setVeiculo] = useState("");
  const [coleta, setColeta] = useState("");
  const [hora, setHora] = useState("07:00");
  const [audiencia, setAudiencia] = useState<Audiencia>(audienciaSalva());
  const [permite, setPermite] = useState(true);
  const [ate, setAte] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  const [catalogo, setCatalogo] = useState<{ id: string; nome: string; pacotes_tipicos: number }[]>([]);
  const [sel, setSel] = useState<Record<string, number>>({});
  const [zNome, setZNome] = useState("");
  const [zPac, setZPac] = useState("");
  useEffect(() => {
    if (!open) return;
    (supabase as any).from("zonas_empresa").select("id, nome, pacotes_tipicos").eq("empresa_id", empresaId).eq("ativa", true).order("nome")
      .then(({ data }: any) => setCatalogo(data ?? []));
    setSel({});
  }, [open, empresaId]);
  const zSel = catalogo.filter((z) => sel[z.id] !== undefined);
  const nPac = zSel.length ? zSel.reduce((s, z) => s + (sel[z.id] || 0), 0) : Math.max(0, parseInt(pacotes, 10) || 0);
  const nRota = Math.max(1, parseInt(porRota, 10) || 1);
  const rotas = zSel.length ? zSel.length : nPac ? Math.ceil(nPac / nRota) : 0;

  async function addZona() {
    const nome = zNome.trim();
    if (!nome) return;
    const { data, error } = await (supabase as any).from("zonas_empresa").insert({ nome, pacotes_tipicos: Math.max(0, parseInt(zPac, 10) || 0) }).select("id, nome, pacotes_tipicos").single();
    if (error) return toast.error(error.message.includes("duplicate") || error.message.includes("unique") ? "Essa zona já existe." : error.message);
    setCatalogo((c) => [...c, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setSel((s) => ({ ...s, [data.id]: data.pacotes_tipicos || 0 }));
    setZNome(""); setZPac("");
  }

  async function removerZona(id: string) {
    if (!confirm("Remover esta zona do seu cadastro de zonas fixas?")) return;
    await (supabase as any).from("zonas_empresa").delete().eq("id", id);
    setCatalogo((c) => c.filter((z) => z.id !== id));
  }

  async function salvar() {
    if (!data || nPac <= 0) return toast.error("Informe a data e a quantidade de pacotes.");
    setSaving(true);
    const { data: criada, error } = await (supabase as any).from("agenda_previsoes").insert({
      empresa_id: empresaId,
      data_prevista: data,
      pacotes_estimados: nPac,
      rotas_estimadas: rotas,
      pacotes_por_rota: zSel.length ? Math.max(1, Math.round(nPac / zSel.length)) : nRota,
      valor_por_pacote: Number(valor) || 0,
      veiculo_necessario: veiculo.trim() || null,
      endereco_coleta: [coleta.trim(), obs.trim()].filter(Boolean).join(" — ") || null,
      hora_abertura: hora || null,
      visibilidade: audiencia,
      permite_cancelamento: permite,
      cancelamento_ate: permite && ate ? new Date(ate).toISOString() : null,
      status: "aberta",
    } as any).select("id").single();
    if (!error && zSel.length) {
      const { error: ez } = await (supabase as any).from("agenda_previsao_zonas").insert(zSel.map((z) => ({ previsao_id: criada.id, nome: z.nome, pacotes_estimados: sel[z.id] || 0 })));
      if (ez) { setSaving(false); return toast.error(ez.message); }
    }
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
          <div className="space-y-2 rounded-lg border p-3">
            <div>
              <Label>Por zona (recomendado)</Label>
              <p className="text-xs text-muted-foreground">Marque as zonas do dia. Os entregadores se postulam à zona que querem e você aprova quem fica com cada uma.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {catalogo.map((z) => (
                <span key={z.id} className="inline-flex items-center">
                  <button type="button" onClick={() => setSel((s) => { const n = { ...s }; if (n[z.id] !== undefined) delete n[z.id]; else n[z.id] = z.pacotes_tipicos || 0; return n; })}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${sel[z.id] !== undefined ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>{z.nome}</button>
                  {sel[z.id] === undefined && <button type="button" aria-label="Remover zona" className="ml-0.5 text-xs text-muted-foreground hover:text-red-600" onClick={() => removerZona(z.id)}>×</button>}
                </span>
              ))}
              {catalogo.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma zona cadastrada ainda. Adicione abaixo.</span>}
            </div>
            {zSel.map((z) => (
              <div key={z.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{z.nome}</span>
                <div className="flex items-center gap-1.5"><Input type="number" min={0} className="h-8 w-24" value={sel[z.id] ?? 0} onChange={(e) => setSel((s) => ({ ...s, [z.id]: Math.max(0, parseInt(e.target.value, 10) || 0) }))} /><span className="text-xs text-muted-foreground">pacotes</span></div>
              </div>
            ))}
            <div className="flex gap-2">
              <Input className="h-9" placeholder="Nova zona (ex.: Gonzaga)" value={zNome} onChange={(e) => setZNome(e.target.value)} />
              <Input className="h-9 w-24" type="number" min={0} placeholder="Pacotes" value={zPac} onChange={(e) => setZPac(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={addZona} disabled={!zNome.trim()}>Adicionar</Button>
            </div>
          </div>
          <div className={`grid gap-3 ${zSel.length ? "grid-cols-1" : "grid-cols-3"}`}>
            {zSel.length === 0 && <div className="space-y-1"><Label>Pacotes</Label><Input type="number" min={1} value={pacotes} onChange={(e) => setPacotes(e.target.value)} /></div>}
            {zSel.length === 0 && <div className="space-y-1"><Label>Pacotes/rota</Label><Input type="number" min={1} value={porRota} onChange={(e) => setPorRota(e.target.value)} /></div>}
            {!isOperador && <div className="space-y-1"><Label>R$/pacote</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} /></div>}
          </div>
          <p className="text-xs text-muted-foreground">≈ {rotas} rota(s){!isOperador && ` · ${brl(nPac * (Number(valor) || 0))} no total`}</p>
          <div className="space-y-1.5 rounded-lg border p-3">
            <Label>Quem pode ver esta previsão?</Label>
            <AudienciaSelect value={audiencia} onChange={setAudiencia} compact />
          </div>
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
