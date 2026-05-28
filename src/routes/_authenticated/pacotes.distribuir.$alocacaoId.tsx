import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ArrowLeft, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { notifyWhatsAppBatch, WA_TEMPLATES } from "@/lib/whatsapp-notify";

export const Route = createFileRoute("/_authenticated/pacotes/distribuir/$alocacaoId")({
  component: DistribPage,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DistribPage() {
  const { alocacaoId } = Route.useParams();
  const { user, role } = useAuth();
  const nav = useNavigate();
  const sb = supabase as any;

  const [loading, setLoading] = useState(true);
  const [aloc, setAloc] = useState<any>(null);
  const [dispatcherRec, setDispatcherRec] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]); // includes self at top
  const [dist, setDist] = useState<Record<string, { pacotes: number; paradas: number; valor: number; isSelf?: boolean }>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<any[] | null>(null);

  useEffect(() => {
    if (!user || role !== "dispatcher") return;
    (async () => {
      setLoading(true);
      const { data: a } = await sb.from("dispatcher_alocacoes").select("*").eq("id", alocacaoId).maybeSingle();
      setAloc(a);
      if (!a) { setLoading(false); return; }
      const { data: d } = await sb.from("dispatchers").select("*").eq("id", a.dispatcher_id).maybeSingle();
      setDispatcherRec(d);

      const { data: team } = await sb.from("dispatcher_team").select("*").eq("dispatcher_id", a.dispatcher_id).eq("status", "ativo");
      const memIds = (team ?? []).map((t: any) => t.entregador_id);
      const allIds = Array.from(new Set([user.id, ...memIds]));
      const { data: ents } = allIds.length
        ? await sb.from("entregadores").select("id, nome_completo, reliability_level, tipo_veiculo, whatsapp").in("id", allIds)
        : { data: [] };

      const selfEnt = (ents ?? []).find((e: any) => e.id === user.id);
      const list = [
        { id: "self", entregador_id: user.id, entregador: selfEnt, valor_padrao_por_pacote: Number(a.valor_por_pacote), isSelf: true },
        ...(team ?? []).map((t: any) => ({ ...t, entregador: (ents ?? []).find((e: any) => e.id === t.entregador_id), isSelf: false })),
      ];
      setMembers(list);
      const init: any = {};
      list.forEach((m: any) => {
        init[m.id] = {
          pacotes: 0, paradas: 0,
          valor: m.isSelf ? Number(a.valor_por_pacote) : Number(m.valor_padrao_por_pacote) || 0,
          isSelf: m.isSelf,
        };
      });
      setDist(init);
      setLoading(false);
    })();
  }, [alocacaoId, user, role]);

  const totals = useMemo(() => ({
    pacotes: Object.values(dist).reduce((s, x) => s + (x.pacotes || 0), 0),
    paradas: Object.values(dist).reduce((s, x) => s + (x.paradas || 0), 0),
  }), [dist]);

  const preview = useMemo(() => {
    if (!aloc) return { proprio: 0, comissoes: [] as any[], total: 0 };
    const empresaRate = Number(aloc.valor_por_pacote);
    let proprio = 0;
    const comissoes: any[] = [];
    members.forEach((m) => {
      const a = dist[m.id]; if (!a || !a.pacotes) return;
      if (a.isSelf) proprio += a.pacotes * empresaRate;
      else {
        const margem = Math.max(0, empresaRate - a.valor);
        comissoes.push({ nome: m.entregador?.nome_completo || "—", pacotes: a.pacotes, margem, total: a.pacotes * margem });
      }
    });
    const total = proprio + comissoes.reduce((s, c) => s + c.total, 0);
    return { proprio, comissoes, total };
  }, [dist, members, aloc]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!aloc) return <div className="p-6 text-center text-muted-foreground">Alocação não encontrada.</div>;

  const fullyDistributed = totals.pacotes === Number(aloc.pacotes_alocados) && totals.pacotes > 0;

  async function publish() {
    if (!fullyDistributed) return;
    setSaving(true);
    try {
      const results: any[] = [];
      for (const m of members) {
        const a = dist[m.id]; if (!a || !a.pacotes) continue;
        const titulo = `Rota ${m.entregador?.nome_completo?.split(" ")[0] || "—"} - ${new Date().toLocaleDateString("pt-BR")}`;
        const valorTotal = a.pacotes * (a.isSelf ? Number(aloc.valor_por_pacote) : a.valor);
        const { data: of, error: ofErr } = await sb.from("ofertas").insert({
          empresa_id: aloc.empresa_id,
          titulo,
          quantidade_pacotes: a.pacotes,
          quantidade_paradas: a.paradas,
          valor: valorTotal,
          valor_por_pacote: a.isSelf ? Number(aloc.valor_por_pacote) : a.valor,
          status: "open",
          tipo: "private",
          tipo_entrega: "package_delivery",
          dispatcher_id: aloc.dispatcher_id,
          operacao_id: aloc.operacao_id,
          entregador_id: a.isSelf ? user!.id : null,
        }).select("id").single();
        if (ofErr) throw ofErr;
        await sb.from("ofertas_privadas_config").insert({
          oferta_id: of.id, entregador_id: m.entregador_id, empresa_id: aloc.empresa_id,
          valor_por_pacote: a.isSelf ? Number(aloc.valor_por_pacote) : a.valor,
          status: a.isSelf ? "accepted" : "invited",
          notificado_em: new Date().toISOString(),
        });
        results.push({ nome: m.entregador?.nome_completo, pacotes: a.pacotes, offerId: of.id, entregadorId: m.entregador_id, whatsapp: m.entregador?.whatsapp, isSelf: a.isSelf, valor: a.isSelf ? Number(aloc.valor_por_pacote) : a.valor, paradas: a.paradas });
      }
      await sb.from("dispatcher_alocacoes").update({ status: "distributed", distributed_at: new Date().toISOString() }).eq("id", alocacaoId);

      // Notify team members + dispatcher
      try {
        const { data: meEnt } = await sb.from("entregadores").select("nome_completo, whatsapp").eq("id", user!.id).maybeSingle();
        const dispatcherName = meEnt?.nome_completo || "Dispatcher";
        const memberNotifs = results
          .filter((r) => !r.isSelf)
          .map((r) => ({
            recipientId: r.entregadorId,
            destinatarioTipo: "entregador" as const,
            tipo: "distribuicao" as const,
            telefone: r.whatsapp ?? null,
            mensagem: WA_TEMPLATES.distribuicao({
              memberName: r.nome,
              dispatcherName,
              packages: r.pacotes,
              stops: r.paradas,
              price: r.valor,
              total: r.pacotes * r.valor,
              offerId: r.offerId,
            }),
          }));
        const summaryNotif = {
          recipientId: user!.id,
          destinatarioTipo: "dispatcher" as const,
          tipo: "publicacao" as const,
          telefone: meEnt?.whatsapp ?? null,
          mensagem: WA_TEMPLATES.publicacao({
            dispatcherName,
            lines: results.map((r) => `✅ ${r.nome}${r.isSelf ? " (você)" : ""} - ${r.pacotes} pct`),
          }),
        };
        await notifyWhatsAppBatch([...memberNotifs, summaryNotif]);
      } catch (e) { console.warn("notify failed", e); }

      setDone(results);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao publicar.");
    } finally { setSaving(false); }
  }

  if (done) {
    return (
      <div className="p-6 space-y-4">
        <Card className="border-emerald-500/40 bg-emerald-50">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h2 className="text-lg font-bold">Rotas publicadas!</h2>
            <div className="text-left text-sm space-y-1">
              {done.map((r, i) => <div key={i}>• {r.nome} → {r.pacotes} pacotes</div>)}
            </div>
            <p className="text-sm">Seu time foi notificado! 🎉</p>
            <Button onClick={() => nav({ to: "/dashboard" })}>Ver ofertas →</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pb-32 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dashboard" })}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
      <PageHeader title="Distribuir para meu time" description="Divida pacotes recebidos" />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm space-y-1">
          <div>📦 <strong>{aloc.pacotes_alocados}</strong> pacotes</div>
          <div>🗺️ <strong>{aloc.paradas_alocadas}</strong> paradas</div>
          <div>💰 <strong>{brl(Number(aloc.valor_por_pacote))}/pacote</strong></div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {members.map((m) => {
          const a = dist[m.id] || { pacotes: 0, paradas: 0, valor: 0 };
          const total = a.pacotes * a.valor;
          const margem = !a.isSelf ? Math.max(0, Number(aloc.valor_por_pacote) - a.valor) : 0;
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" />{m.entregador?.nome_completo || "—"} {m.isSelf && <span className="text-xs">(eu mesmo) 🎯</span>}</span>
                  <Badge variant="outline" className="capitalize">{m.entregador?.reliability_level || "—"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Pacotes</Label>
                  <Input type="number" min={0} value={a.pacotes || ""} onChange={(e) => setDist((s) => ({ ...s, [m.id]: { ...a, pacotes: Number(e.target.value) || 0 } }))} />
                </div>
                <div><Label className="text-xs">Paradas</Label>
                  <Input type="number" min={0} value={a.paradas || ""} onChange={(e) => setDist((s) => ({ ...s, [m.id]: { ...a, paradas: Number(e.target.value) || 0 } }))} />
                </div>
                <div><Label className="text-xs">Valor/pct</Label>
                  <Input type="number" step="0.01" disabled={a.isSelf} value={a.valor || ""} onChange={(e) => setDist((s) => ({ ...s, [m.id]: { ...a, valor: Number(e.target.value) || 0 } }))} />
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  Total: <strong>{brl(total)}</strong>
                  {!a.isSelf && <> · Margem: <strong>{brl(margem)}/pct</strong></>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">💰 Seus ganhos estimados</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {preview.proprio > 0 && <div>Entregas próprias: <strong>{brl(preview.proprio)}</strong></div>}
          {preview.comissoes.map((c, i) => <div key={i}>{c.nome}: {c.pacotes} × {brl(c.margem)} = <strong>{brl(c.total)}</strong></div>)}
          <div className="pt-2 border-t mt-2 font-semibold">TOTAL ESTIMADO: {brl(preview.total)}</div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 backdrop-blur p-3">
        <div className="mx-auto max-w-2xl space-y-2">
          <div className="flex justify-between text-xs"><span>Distribuídos: {totals.pacotes}/{aloc.pacotes_alocados} {fullyDistributed ? "✅" : "⚠️"}</span></div>
          <Progress value={aloc.pacotes_alocados ? (totals.pacotes / Number(aloc.pacotes_alocados)) * 100 : 0} className={fullyDistributed ? "[&>div]:bg-emerald-500" : ""} />
          <Button className="w-full bg-primary text-primary-foreground" disabled={!fullyDistributed || saving} onClick={publish}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar rotas do time"}
          </Button>
        </div>
      </div>
    </div>
  );
}
