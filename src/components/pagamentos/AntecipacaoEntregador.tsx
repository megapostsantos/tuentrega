import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Saldo = { ativa: boolean; total: number; aberto: number; disponivel: number; minimo: number };
type Simulacao = { valor: number; desconto: number; liquido: number };
type Pedido = {
  id: string; empresa_id: string; valor_bruto: number; desconto: number; valor_liquido: number;
  status: string; created_at: string; abatida_em: string | null;
};

const brl = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: Record<string, { label: string; cls: string }> = {
  solicitada: { label: "Aguardando a empresa", cls: "bg-amber-100 text-amber-800" },
  aprovada: { label: "Aprovada — aguardando o PIX", cls: "bg-blue-100 text-blue-800" },
  paga: { label: "Paga", cls: "bg-green-100 text-green-800" },
  recusada: { label: "Recusada", cls: "bg-red-100 text-red-800" },
  cancelada: { label: "Cancelada", cls: "bg-gray-200 text-gray-700" },
};

export function AntecipacaoEntregador({ userId }: { userId: string }) {
  const [saldos, setSaldos] = useState<Array<{ empresaId: string; nome: string; saldo: Saldo }>>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [valor, setValor] = useState<Record<string, string>>({});
  const [sim, setSim] = useState<Record<string, Simulacao | string | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const sb = supabase as any;
    const { data: ent } = await sb.from("entregas").select("empresa_id")
      .eq("entregador_id", userId).in("status", ["pendente", "concluida"]);
    const { data: ped } = await sb.from("antecipacoes")
      .select("id, empresa_id, valor_bruto, desconto, valor_liquido, status, created_at, abatida_em")
      .eq("entregador_id", userId).order("created_at", { ascending: false }).limit(30);
    const ids = [...new Set([...(ent ?? []).map((x: any) => x.empresa_id), ...(ped ?? []).map((x: any) => x.empresa_id)])] as string[];
    const nm: Record<string, string> = {};
    if (ids.length) {
      const { data: emp } = await sb.from("empresas").select("id, nome_fantasia, razao_social").in("id", ids);
      for (const e of emp ?? []) nm[e.id] = e.nome_fantasia || e.razao_social || "Empresa";
    }
    setNomes(nm);
    setPedidos((ped as Pedido[]) ?? []);
    const lista: Array<{ empresaId: string; nome: string; saldo: Saldo }> = [];
    for (const id of [...new Set((ent ?? []).map((x: any) => x.empresa_id))] as string[]) {
      const { data } = await sb.rpc("saldo_antecipacao", { _empresa_id: id });
      if (data?.ativa) lista.push({ empresaId: id, nome: nm[id] ?? "Empresa", saldo: data as Saldo });
    }
    setSaldos(lista);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  async function calcular(empresaId: string) {
    const v = Number((valor[empresaId] ?? "").replace(",", "."));
    setBusy(empresaId);
    const { data, error } = await (supabase as any).rpc("simular_antecipacao", { _empresa_id: empresaId, _valor: v });
    setBusy(null);
    setSim((s) => ({ ...s, [empresaId]: error ? error.message : (data as Simulacao) }));
  }

  async function solicitar(empresaId: string) {
    const v = Number((valor[empresaId] ?? "").replace(",", "."));
    setBusy(empresaId);
    const { error } = await (supabase as any).rpc("solicitar_antecipacao", { _empresa_id: empresaId, _valor: v });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado. A empresa vai analisar.");
    setSim((s) => ({ ...s, [empresaId]: null }));
    setValor((x) => ({ ...x, [empresaId]: "" }));
    load();
  }

  async function cancelar(p: Pedido) {
    const { error } = await supabase.from("antecipacoes").update({ status: "cancelada" } as any).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pedido cancelado.");
    load();
  }

  if (loading) return null;
  if (saldos.length === 0 && pedidos.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Antecipação de pagamento</h2>
      </div>

      {saldos.map(({ empresaId, nome, saldo }) => {
        const s = sim[empresaId];
        return (
          <Card key={empresaId}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{nome}</div>
                  <div className="text-xs text-muted-foreground">
                    A receber no ciclo: {brl(saldo.total)} · já antecipado: {brl(saldo.aberto)}
                  </div>
                </div>
                <Badge variant="secondary">Disponível {brl(saldo.disponivel)}</Badge>
              </div>
              {saldo.disponivel >= saldo.minimo ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="h-9 w-36" inputMode="decimal" placeholder={`mín. ${saldo.minimo.toFixed(0)}`}
                      value={valor[empresaId] ?? ""}
                      onChange={(e) => { setValor((x) => ({ ...x, [empresaId]: e.target.value })); setSim((y) => ({ ...y, [empresaId]: null })); }}
                    />
                    <Button size="sm" variant="outline" disabled={busy === empresaId || !valor[empresaId]} onClick={() => calcular(empresaId)}>
                      {busy === empresaId ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Calcular
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setValor((x) => ({ ...x, [empresaId]: String(saldo.disponivel) }))}>
                      Usar o máximo
                    </Button>
                  </div>
                  {typeof s === "string" && <p className="text-sm text-red-600">{s}</p>}
                  {s && typeof s === "object" && (
                    <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
                      <div>Valor antecipado: <strong>{brl(s.valor)}</strong></div>
                      <div>Desconto da empresa: <strong className="text-red-600">- {brl(s.desconto)}</strong></div>
                      <div>Você recebe: <strong className="text-green-700">{brl(s.liquido)}</strong></div>
                      <p className="text-xs text-muted-foreground">
                        O valor antecipado é abatido do seu próximo pagamento do ciclo. A empresa precisa aprovar e fazer o PIX.
                      </p>
                      <Button size="sm" disabled={busy === empresaId} onClick={() => solicitar(empresaId)}>Solicitar antecipação</Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Ainda não há saldo suficiente para antecipar (mínimo {brl(saldo.minimo)}).</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {pedidos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Meus pedidos</h3>
          {pedidos.map((p) => {
            const st = STATUS[p.status] ?? { label: p.status, cls: "bg-gray-200" };
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium">{nomes[p.empresa_id] ?? "Empresa"} · {brl(p.valor_bruto)}</div>
                    <div className="text-xs text-muted-foreground">
                      Recebe {brl(p.valor_liquido)} · {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      {p.abatida_em ? " · já abatida" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    {p.status === "solicitada" && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancelar(p)}>Cancelar</Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
