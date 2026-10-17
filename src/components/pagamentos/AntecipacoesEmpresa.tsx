import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Settings2, Zap, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Config = { ciclo: string; antecipacao_ativa: boolean; antecipacao_percentual: number; limite_percentual: number; valor_minimo: number };
type Pedido = {
  id: string; entregador_id: string; valor_bruto: number; percentual: number; desconto: number; valor_liquido: number;
  status: string; created_at: string; paga_em: string | null; abatida_em: string | null;
  entregadores?: { nome_completo?: string | null; pix_tipo?: string | null; pix_chave?: string | null } | null;
};

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PADRAO: Config = { ciclo: "quinzenal", antecipacao_ativa: false, antecipacao_percentual: 10, limite_percentual: 100, valor_minimo: 50 };

export function AntecipacoesEmpresa({ empresaId }: { empresaId: string }) {
  const [cfg, setCfg] = useState<Config>(PADRAO);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  async function load() {
    const sb = supabase as any;
    const { data: c } = await sb.from("config_pagamento").select("*").eq("empresa_id", empresaId).maybeSingle();
    if (c) setCfg({
      ciclo: c.ciclo, antecipacao_ativa: !!c.antecipacao_ativa, antecipacao_percentual: Number(c.antecipacao_percentual),
      limite_percentual: Number(c.limite_percentual), valor_minimo: Number(c.valor_minimo),
    });
    const { data: p } = await sb.from("antecipacoes")
      .select("*, entregadores(nome_completo, pix_tipo, pix_chave)")
      .eq("empresa_id", empresaId).in("status", ["solicitada", "aprovada", "paga"])
      .order("created_at", { ascending: false }).limit(100);
    setPedidos(((p as Pedido[]) ?? []).filter((x) => x.status !== "paga" || !x.abatida_em));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaId]);

  async function salvar() {
    if (cfg.antecipacao_percentual < 0 || cfg.antecipacao_percentual > 50) return toast.error("O percentual deve ficar entre 0% e 50%.");
    if (cfg.limite_percentual < 1 || cfg.limite_percentual > 100) return toast.error("O limite deve ficar entre 1% e 100%.");
    setSaving(true);
    const { error } = await supabase.from("config_pagamento").upsert({
      empresa_id: empresaId, ...cfg, updated_at: new Date().toISOString(),
    } as any, { onConflict: "empresa_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva.");
  }

  async function atualizar(p: Pedido, patch: Record<string, unknown>, msg: string) {
    setBusy(p.id);
    const { error } = await supabase.from("antecipacoes").update(patch as any).eq("id", p.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(msg);
    load();
  }

  const agora = () => new Date().toISOString();
  const pendentes = pedidos.filter((p) => p.status === "solicitada");
  const aAbater = pedidos.filter((p) => p.status === "paga" && !p.abatida_em);
  const totalAbater = aAbater.reduce((s, p) => s + Number(p.valor_bruto), 0);

  if (loading) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Antecipações e ciclo de pagamento</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAberto((v) => !v)}>
          <Settings2 className="mr-1 h-4 w-4" />{aberto ? "Fechar configuração" : "Configurar"}
        </Button>
      </div>

      {aberto && (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Ciclo de pagamento</Label>
              <Select value={cfg.ciclo} onValueChange={(v) => setCfg({ ...cfg, ciclo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Permitir antecipação</div>
                <div className="text-xs text-muted-foreground">O entregador pode pedir adiantamento do que tem a receber.</div>
              </div>
              <Switch checked={cfg.antecipacao_ativa} onCheckedChange={(v) => setCfg({ ...cfg, antecipacao_ativa: v })} />
            </div>
            <div className="space-y-1">
              <Label>Desconto cobrado na antecipação (%)</Label>
              <Input type="number" step="0.1" min={0} max={50} value={cfg.antecipacao_percentual}
                onChange={(e) => setCfg({ ...cfg, antecipacao_percentual: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Só você configura. O entregador vê o valor final que receberá.</p>
            </div>
            <div className="space-y-1">
              <Label>Máximo antecipável do saldo (%)</Label>
              <Input type="number" min={1} max={100} value={cfg.limite_percentual}
                onChange={(e) => setCfg({ ...cfg, limite_percentual: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Valor mínimo por pedido (R$)</Label>
              <Input type="number" min={0} value={cfg.valor_minimo}
                onChange={(e) => setCfg({ ...cfg, valor_minimo: Number(e.target.value) })} />
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={salvar} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Resumo label="Aguardando decisão" valor={String(pendentes.length)} />
        <Resumo label="A pagar (PIX)" valor={brl(pedidos.filter((p) => p.status === "aprovada").reduce((s, p) => s + Number(p.valor_liquido), 0))} />
        <Resumo label="A abater no ciclo" valor={brl(totalAbater)} />
      </div>

      {pedidos.length === 0 ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          Nenhum pedido de antecipação no momento. {cfg.antecipacao_ativa ? "" : "A antecipação está desligada: ative em Configurar."}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {pedidos.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-2 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.entregadores?.nome_completo ?? "Entregador"}</div>
                    <div className="text-xs text-muted-foreground">
                      Pediu {brl(p.valor_bruto)} · desconto {brl(p.desconto)} ({Number(p.percentual).toFixed(1)}%) · enviar <strong>{brl(p.valor_liquido)}</strong>
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {p.status === "solicitada" ? "Solicitada" : p.status === "aprovada" ? "Aprovada" : "Paga — a abater"}
                  </span>
                </div>
                {p.status === "aprovada" && p.entregadores?.pix_chave && (
                  <button
                    className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
                    onClick={() => { navigator.clipboard?.writeText(p.entregadores!.pix_chave!); toast.success("Chave PIX copiada"); }}
                  >
                    <Copy className="h-3.5 w-3.5" /> PIX {p.entregadores.pix_tipo ?? ""}: {p.entregadores.pix_chave}
                  </button>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  {p.status === "solicitada" && (
                    <>
                      <Button size="sm" variant="ghost" className="text-red-600" disabled={busy === p.id}
                        onClick={() => atualizar(p, { status: "recusada", decidida_em: agora() }, "Pedido recusado.")}>Recusar</Button>
                      <Button size="sm" disabled={busy === p.id}
                        onClick={() => atualizar(p, { status: "aprovada", decidida_em: agora() }, "Aprovado. Faça o PIX e marque como pago.")}>Aprovar</Button>
                    </>
                  )}
                  {p.status === "aprovada" && (
                    <Button size="sm" disabled={busy === p.id}
                      onClick={() => atualizar(p, { status: "paga", paga_em: agora() }, "Marcado como pago.")}>Marcar PIX como enviado</Button>
                  )}
                  {p.status === "paga" && (
                    <Button size="sm" variant="outline" disabled={busy === p.id}
                      onClick={() => atualizar(p, { abatida_em: agora() }, "Abatido do pagamento do ciclo.")}>Já abati no pagamento do ciclo</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{valor}</div>
    </CardContent></Card>
  );
}
