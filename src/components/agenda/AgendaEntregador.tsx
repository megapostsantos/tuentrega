import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CalendarDays, Loader2, MapPin, Clock, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Previsao = {
  id: string;
  empresa_id: string;
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
  empresas?: { nome_fantasia?: string | null; razao_social?: string | null } | null;
};

type Compromisso = {
  id: string;
  previsao_id: string;
  pacotes_comprometidos: number;
  pacotes_ajustados: number | null;
  status: string;
};

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });

export function AgendaEntregador({ userId }: { userId: string }) {
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [comps, setComps] = useState<Record<string, Compromisso>>({});
  const [qtd, setQtd] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: pv } = await supabase
      .from("agenda_previsoes")
      .select("*, empresas(nome_fantasia, razao_social)")
      .gte("data_prevista", hoje).order("data_prevista", { ascending: true });
    setPrevisoes((pv as Previsao[]) ?? []);
    const { data: cs } = await supabase
      .from("agenda_compromissos")
      .select("id, previsao_id, pacotes_comprometidos, pacotes_ajustados, status")
      .eq("entregador_id", userId);
    const m: Record<string, Compromisso> = {};
    for (const c of (cs as Compromisso[]) ?? []) m[c.previsao_id] = c;
    setComps(m);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  function podeAlterar(p: Previsao) {
    if (!p.permite_cancelamento) return false;
    return !p.cancelamento_ate || new Date(p.cancelamento_ate) > new Date();
  }

  async function comprometer(p: Previsao) {
    const n = parseInt(qtd[p.id] ?? String(p.pacotes_por_rota || 50), 10);
    if (!n || n <= 0) return toast.error("Informe quantos pacotes você consegue levar.");
    setBusy(p.id);
    const { error } = await supabase.from("agenda_compromissos").insert({
      previsao_id: p.id, empresa_id: p.empresa_id, entregador_id: userId, pacotes_comprometidos: n, status: "comprometido",
    } as any);
    setBusy(null);
    if (error) return toast.error(error.message.includes("duplicate") ? "Você já se comprometeu nesta data." : error.message);
    toast.success("Compromisso registrado. A empresa já vê a sua disponibilidade.");
    load();
  }

  async function alterar(p: Previsao, c: Compromisso) {
    const n = parseInt(qtd[p.id] ?? "", 10);
    if (!n || n <= 0) return toast.error("Informe a nova quantidade.");
    setBusy(p.id);
    const { error } = await supabase.from("agenda_compromissos")
      .update({ pacotes_comprometidos: n, updated_at: new Date().toISOString() } as any).eq("id", c.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Quantidade atualizada.");
    load();
  }

  async function cancelar(p: Previsao, c: Compromisso) {
    if (!confirm("Cancelar o seu compromisso nesta data?")) return;
    setBusy(p.id);
    const { error } = await supabase.from("agenda_compromissos")
      .update({ status: "cancelado", updated_at: new Date().toISOString() } as any).eq("id", c.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Compromisso cancelado.");
    load();
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader title="Agenda" description="Veja as rotas previstas e comprometa-se com antecedência" />

      {previsoes.length === 0 ? (
        <EmptyModule
          icon={CalendarDays}
          title="Nenhuma previsão aberta"
          description="Quando uma empresa publicar a previsão dos próximos dias, ela aparece aqui para você se comprometer."
        />
      ) : (
        <div className="space-y-3">
          {previsoes.map((p) => {
            const c = comps[p.id];
            const ativo = c && c.status !== "cancelado";
            const nome = p.empresas?.nome_fantasia || p.empresas?.razao_social || "Empresa parceira";
            return (
              <Card key={p.id} className={ativo ? "border-green-500/50" : ""}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold capitalize">{fmtData(p.data_prevista)}</div>
                      <div className="text-sm text-muted-foreground">{nome}</div>
                    </div>
                    {ativo ? (
                      <Badge className="bg-green-600"><CalendarCheck className="mr-1 h-3.5 w-3.5" />
                        {c.status === "confirmado" ? "Confirmado" : "Comprometido"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Aberta</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-muted-foreground" />{p.hora_abertura ?? "a combinar"}</span>
                    <span className="flex items-center gap-1"><Truck className="h-4 w-4 text-muted-foreground" />{p.veiculo_necessario ?? "Qualquer veículo"}</span>
                    <span>{brl(p.valor_por_pacote)} por pacote</span>
                    <span>~{p.pacotes_estimados} pacotes · {p.rotas_estimadas} rota(s)</span>
                  </div>
                  {ativo && p.endereco_coleta && (
                    <div className="flex items-start gap-1 rounded-md bg-muted p-2 text-xs">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{p.endereco_coleta}
                    </div>
                  )}

                  {ativo ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        Você se comprometeu com <strong>{c.pacotes_comprometidos}</strong> pacotes
                        {c.pacotes_ajustados != null && <> · a empresa ajustou para <strong>{c.pacotes_ajustados}</strong></>}
                      </div>
                      {podeAlterar(p) ? (
                        <div className="flex flex-wrap gap-2">
                          <Input type="number" min={1} className="h-9 w-28" placeholder="Nova qtd."
                            value={qtd[p.id] ?? ""} onChange={(e) => setQtd((q) => ({ ...q, [p.id]: e.target.value }))} />
                          <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => alterar(p, c)}>Alterar</Button>
                          <Button size="sm" variant="ghost" className="text-red-600" disabled={busy === p.id} onClick={() => cancelar(p, c)}>Cancelar</Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Compromisso firme: não pode mais ser alterado ou cancelado.</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input type="number" min={1} className="h-9 w-28" placeholder="Pacotes"
                        value={qtd[p.id] ?? String(p.pacotes_por_rota || 50)} onChange={(e) => setQtd((q) => ({ ...q, [p.id]: e.target.value }))} />
                      <Button size="sm" disabled={busy === p.id} onClick={() => comprometer(p)}>
                        {busy === p.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Comprometer-me
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {p.permite_cancelamento ? "Pode ser alterado até o prazo da empresa." : "Compromisso firme."}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
