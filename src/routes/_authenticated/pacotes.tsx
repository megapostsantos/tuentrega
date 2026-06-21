import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Package, Plus, Trash2, ArrowLeft, CheckCircle2, AlertTriangle, Eye, Users, Map as MapIcon } from "lucide-react";
import { geocodeMultiple } from "@/lib/geocoding";
const RouteMap = lazy(() => import("@/components/RouteMap").then((m) => ({ default: m.RouteMap })));
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/pacotes")({
  component: PacotesPage,
});


type DivMethod = "packages" | "stops" | "manual";
type Rota = { nome: string; quantidade_pacotes: number; quantidade_paradas: number; valor_total: number };
type Operacao = {
  id: string;
  empresa_id: string;
  data_operacao: string;
  total_pacotes_sistema: number;
  total_pacotes_contados: number;
  total_paradas: number;
  pacotes_faltando: number;
  pacotes_a_mais: number;
  valor_por_pacote: number;
  valor_ml_por_pacote: number;
  metodo_divisao: string;
  status: string;
  observacoes: string | null;
  created_at: string;
};

type EmpresaTms = {
  tms_valor_padrao_pacote: number | null;
  tms_pacotes_por_rota: number | null;
  tms_metodo_padrao: string | null;
  tms_mostrar_margem: boolean;
};

function PacotesPage() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (role !== "empresa") {
    return (
      <div className="p-6">
        <PageHeader title="Pacotes (TMS)" description="Importe pacotes em lote e divida por bairro automaticamente" />
        <EmptyModule icon={Package} title="Disponível para empresas" description="Apenas empresas podem operar o TMS." />
      </div>
    );
  }

  return <EmpresaTms userId={user!.id} />;
}

function EmpresaTms({ userId }: { userId: string }) {
  const [mode, setMode] = useState<"list" | "create">("list");
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [empresa, setEmpresa] = useState<EmpresaTms | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    setLoadingList(true);
    const { data } = await supabase
      .from("operacoes")
      .select("*")
      .eq("empresa_id", userId)
      .order("data_operacao", { ascending: false })
      .order("created_at", { ascending: false });
    setOperacoes((data as Operacao[]) ?? []);
    setLoadingList(false);
  }

  async function loadEmpresa() {
    const { data } = await supabase
      .from("empresas")
      .select("tms_valor_padrao_pacote, tms_pacotes_por_rota, tms_metodo_padrao, tms_mostrar_margem")
      .eq("id", userId)
      .maybeSingle();
    setEmpresa((data as EmpresaTms) ?? null);
  }

  useEffect(() => {
    load();
    loadEmpresa();
  }, [userId]);

  if (mode === "create") {
    return (
      <CreateOperation
        userId={userId}
        empresa={empresa}
        onCancel={() => setMode("list")}
        onDone={() => {
          setMode("list");
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Pacotes (TMS)" description="Gerencie suas operações de entrega" />

      <Button
        size="lg"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
        onClick={() => setMode("create")}
      >
        <Plus className="mr-2 h-5 w-5" />
        Iniciar nova operação
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de operações</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : operacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma operação ainda.</p>
          ) : (
            <div className="space-y-3">
              {operacoes.map((op) => (
                <OperationCard key={op.id} op={op} onView={() => setDetailId(op.id)} showMargem={empresa?.tms_mostrar_margem ?? true} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <OperationDetail operacaoId={detailId} onClose={() => setDetailId(null)} showMargem={empresa?.tms_mostrar_margem ?? true} />
    </div>
  );
}

function statusInfo(op: Operacao, hasOpen: boolean, allDone: boolean) {
  if (op.pacotes_faltando > 0 || op.pacotes_a_mais > 0) {
    return { label: "Divergência", color: "bg-amber-100 text-amber-800", icon: AlertTriangle };
  }
  if (op.status === "draft") return { label: "Rascunho", color: "bg-slate-200 text-slate-700", icon: Package };
  if (allDone) return { label: "Concluída", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 };
  if (hasOpen) return { label: "Em andamento", color: "bg-yellow-100 text-yellow-800", icon: Package };
  return { label: op.status, color: "bg-slate-200 text-slate-700", icon: Package };
}

function OperationCard({ op, onView, showMargem }: { op: Operacao; onView: () => void; showMargem: boolean }) {
  const [stats, setStats] = useState<{ rotas: number; pagoEntregadores: number; hasOpen: boolean; allDone: boolean }>({
    rotas: 0, pagoEntregadores: 0, hasOpen: false, allDone: false,
  });

  useEffect(() => {
    (async () => {
      const { data: rotas } = await supabase
        .from("rotas_operacao")
        .select("valor_total, oferta_id")
        .eq("operacao_id", op.id);
      const list = rotas ?? [];
      const pago = list.reduce((s, r: any) => s + Number(r.valor_total || 0), 0);
      let hasOpen = false;
      let allDone = list.length > 0;
      if (list.length > 0) {
        const ofertaIds = list.map((r: any) => r.oferta_id).filter(Boolean);
        if (ofertaIds.length > 0) {
          const { data: ofs } = await supabase.from("ofertas").select("status").in("id", ofertaIds);
          for (const o of ofs ?? []) {
            if (["open", "accepted", "in_progress"].includes((o as any).status)) hasOpen = true;
            if ((o as any).status !== "completed") allDone = false;
          }
        }
      }
      setStats({ rotas: list.length, pagoEntregadores: pago, hasOpen, allDone });
    })();
  }, [op.id]);

  const info = statusInfo(op, stats.hasOpen, stats.allDone);
  const Icon = info.icon;
  const receitaML = op.total_pacotes_sistema * Number(op.valor_ml_por_pacote || 2.6);
  const margem = receitaML - stats.pagoEntregadores;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{new Date(op.data_operacao).toLocaleDateString("pt-BR")}</span>
          <Badge className={info.color}><Icon className="mr-1 h-3 w-3" />{info.label}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {op.total_pacotes_sistema} pacotes · {stats.rotas} rotas · R$ {stats.pagoEntregadores.toFixed(2)} aos entregadores
          {showMargem && <> · Margem R$ {margem.toFixed(2)}</>}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onView}>
        <Eye className="mr-2 h-4 w-4" />Ver detalhes
      </Button>
    </div>
  );
}

/* ============ Create operation flow ============ */

function CreateOperation({
  userId, empresa, onCancel, onDone,
}: { userId: string; empresa: EmpresaTms | null; onCancel: () => void; onDone: () => void }) {
  const [step, setStep] = useState<1 | "audit" | 2 | 3>(1);
  const [auditFaixas, setAuditFaixas] = useState<{ inicio: number; fim: number; pacotes: number }[]>([]);

  const [data, setData] = useState({
    data_operacao: new Date().toISOString().slice(0, 10),
    total_pacotes_sistema: 0,
    total_pacotes_contados: 0,
    total_paradas: 0,
    observacoes: "",
    valor_por_pacote: empresa?.tms_valor_padrao_pacote ?? 1.8,
    valor_ml_por_pacote: 2.6,
  });

  const faltando = Math.max(0, data.total_pacotes_sistema - data.total_pacotes_contados);
  const aMais = Math.max(0, data.total_pacotes_contados - data.total_pacotes_sistema);
  const margemPorPacote = Number(data.valor_ml_por_pacote) - Number(data.valor_por_pacote);
  const margemTotal = margemPorPacote * data.total_pacotes_sistema;

  // step 2: division
  const [metodo, setMetodo] = useState<DivMethod>((empresa?.tms_metodo_padrao as DivMethod) || "packages");
  const [perRoute, setPerRoute] = useState<number>(empresa?.tms_pacotes_por_rota ?? 50);
  const [stopsPerRoute, setStopsPerRoute] = useState<number>(28);
  const [manualRotas, setManualRotas] = useState<Rota[]>([]);

  const rotas: Rota[] = useMemo(() => {
    const totalPkg = data.total_pacotes_sistema;
    const totalStops = data.total_paradas;
    if (totalPkg <= 0) return [];

    if (metodo === "packages") {
      const n = Math.max(1, Math.ceil(totalPkg / Math.max(1, perRoute)));
      const out: Rota[] = [];
      let rest = totalPkg;
      let restStops = totalStops;
      for (let i = 0; i < n; i++) {
        const left = n - i;
        const pkg = i === n - 1 ? rest : Math.min(perRoute, rest - (left - 1));
        const stops = Math.round((pkg / totalPkg) * totalStops);
        const actualStops = i === n - 1 ? restStops : Math.min(stops, restStops);
        out.push({
          nome: `Rota ${i + 1}`,
          quantidade_pacotes: pkg,
          quantidade_paradas: actualStops,
          valor_total: pkg * Number(data.valor_por_pacote),
        });
        rest -= pkg;
        restStops -= actualStops;
      }
      return out;
    }
    if (metodo === "stops") {
      if (totalStops <= 0) return [];
      const n = Math.max(1, Math.ceil(totalStops / Math.max(1, stopsPerRoute)));
      const out: Rota[] = [];
      let restPkg = totalPkg;
      let restStops = totalStops;
      for (let i = 0; i < n; i++) {
        const left = n - i;
        const stops = i === n - 1 ? restStops : Math.min(stopsPerRoute, restStops - (left - 1));
        const pkg = i === n - 1 ? restPkg : Math.round((stops / totalStops) * totalPkg);
        const actualPkg = Math.min(pkg, restPkg);
        out.push({
          nome: `Rota ${i + 1}`,
          quantidade_pacotes: actualPkg,
          quantidade_paradas: stops,
          valor_total: actualPkg * Number(data.valor_por_pacote),
        });
        restPkg -= actualPkg;
        restStops -= stops;
      }
      return out;
    }
    return manualRotas.map((r) => ({ ...r, valor_total: r.quantidade_pacotes * Number(data.valor_por_pacote) }));
  }, [metodo, perRoute, stopsPerRoute, manualRotas, data]);

  const totalPkgRotas = rotas.reduce((s, r) => s + r.quantidade_pacotes, 0);
  const totalStopsRotas = rotas.reduce((s, r) => s + r.quantidade_paradas, 0);
  const totalValorRotas = rotas.reduce((s, r) => s + r.valor_total, 0);
  const remaining = data.total_pacotes_sistema - totalPkgRotas;

  const receitaML = data.total_pacotes_sistema * Number(data.valor_ml_por_pacote);
  const margemFinal = receitaML - totalValorRotas;
  const margemPct = receitaML > 0 ? (margemFinal / receitaML) * 100 : 0;

  const [publishing, setPublishing] = useState(false);
  const [hasDispatchers, setHasDispatchers] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    (async () => {
      const { count } = await (supabase as any).from("dispatchers")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", userId).eq("status", "ativo");
      setHasDispatchers((count || 0) > 0);
    })();
  }, [userId]);

  async function saveOpDraft() {
    const { data: opRow, error } = await supabase.from("operacoes").insert({
      empresa_id: userId,
      data_operacao: data.data_operacao,
      total_pacotes_sistema: data.total_pacotes_sistema,
      total_pacotes_contados: data.total_pacotes_contados,
      total_paradas: data.total_paradas,
      pacotes_faltando: faltando,
      pacotes_a_mais: aMais,
      valor_por_pacote: data.valor_por_pacote,
      valor_ml_por_pacote: data.valor_ml_por_pacote,
      metodo_divisao: metodo,
      status: "allocating",
      observacoes: data.observacoes || null,
    }).select("id").single();
    if (error) throw error;
    return (opRow as any).id as string;
  }
  async function goAlocar() {
    try {
      const id = await saveOpDraft();
      nav({ to: "/pacotes/alocar/$operacaoId", params: { operacaoId: id } });
    } catch (e: any) { toast.error(e.message ?? "Erro."); }
  }

  async function publishAll() {
    if (rotas.length === 0) {
      toast.error("Crie ao menos uma rota.");
      return;
    }
    setPublishing(true);
    try {
      const { data: opRow, error: opErr } = await supabase
        .from("operacoes")
        .insert({
          empresa_id: userId,
          data_operacao: data.data_operacao,
          total_pacotes_sistema: data.total_pacotes_sistema,
          total_pacotes_contados: data.total_pacotes_contados,
          total_paradas: data.total_paradas,
          pacotes_faltando: faltando,
          pacotes_a_mais: aMais,
          valor_por_pacote: data.valor_por_pacote,
          valor_ml_por_pacote: data.valor_ml_por_pacote,
          metodo_divisao: metodo,
          status: "published",
          observacoes: data.observacoes || null,
        })
        .select("id")
        .single();
      if (opErr) throw opErr;
      const operacaoId = (opRow as any).id as string;

      for (const r of rotas) {
        const { data: rotaRow, error: rotaErr } = await supabase
          .from("rotas_operacao")
          .insert({
            operacao_id: operacaoId,
            empresa_id: userId,
            nome: r.nome,
            quantidade_pacotes: r.quantidade_pacotes,
            quantidade_paradas: r.quantidade_paradas,
            valor_total: r.valor_total,
            status: "open",
          })
          .select("id")
          .single();
        if (rotaErr) throw rotaErr;
        const rotaId = (rotaRow as any).id as string;

        const { data: ofRow, error: ofErr } = await supabase
          .from("ofertas")
          .insert({
            empresa_id: userId,
            titulo: `${r.nome} - ${new Date(data.data_operacao).toLocaleDateString("pt-BR")}`,
            descricao: data.observacoes || null,
            quantidade_pacotes: r.quantidade_pacotes,
            quantidade_paradas: r.quantidade_paradas,
            valor: r.valor_total,
            valor_por_pacote: data.valor_por_pacote,
            status: "open",
            tipo_entrega: "package_delivery",
            operacao_id: operacaoId,
            rota_operacao_id: rotaId,
          })
          .select("id")
          .single();
        if (ofErr) throw ofErr;
        await supabase.from("rotas_operacao").update({ oferta_id: (ofRow as any).id }).eq("id", rotaId);
      }

      toast.success(`🎉 ${rotas.length} ofertas publicadas!`);
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao publicar.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
        <PageHeader title="Nova operação" description={`Etapa ${step} de 3`} />
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Dados da operação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data da operação">
                <Input type="date" value={data.data_operacao} onChange={(e) => setData({ ...data, data_operacao: e.target.value })} />
              </Field>
              <Field label="Pacotes recebidos (sistema)">
                <Input type="number" min={0} value={data.total_pacotes_sistema || ""} onChange={(e) => setData({ ...data, total_pacotes_sistema: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Total de paradas (Logísticos)">
                <Input type="number" min={0} value={data.total_paradas || ""} onChange={(e) => setData({ ...data, total_paradas: Number(e.target.value) || 0 })} />
              </Field>
            </div>

            <Field label="Observações (opcional)">
              <Textarea value={data.observacoes} onChange={(e) => setData({ ...data, observacoes: e.target.value })} placeholder="Pacotes faltando, danos, etc." />
            </Field>

            <p className="text-xs text-muted-foreground">
              A contagem física dos pacotes acontece no Step 2 (auditoria). Valores financeiros padrão ficam em Configurações.
            </p>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep("audit")}
                disabled={data.total_pacotes_sistema <= 0 || data.total_paradas <= 0}
              >
                Iniciar auditoria →
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {step === "audit" && (
        <AuditByRanges
          totalStops={data.total_paradas}
          totalPackages={data.total_pacotes_sistema}
          valorPorPacote={Number(data.valor_por_pacote)}
          initialFaixas={auditFaixas}
          onBack={() => setStep(1)}
          onConfirm={(faixas, rotasFromAudit) => {
            setAuditFaixas(faixas);
            setMetodo("manual");
            setManualRotas(rotasFromAudit);
            setStep(3);
          }}
        />
      )}

      {step === 2 && (

        <Card>
          <CardHeader><CardTitle>Divisão em rotas</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <RadioGroup value={metodo} onValueChange={(v) => setMetodo(v as DivMethod)} className="grid gap-3 sm:grid-cols-3">
              {[
                { v: "packages", label: "Por pacotes", d: "Rotas com X pacotes cada" },
                { v: "stops", label: "Por paradas", d: "Rotas com X paradas cada" },
                { v: "manual", label: "Manual", d: "Defino rota a rota" },
              ].map((opt) => (
                <label key={opt.v} className={`cursor-pointer rounded-lg border p-3 ${metodo === opt.v ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={opt.v} />
                    <span className="font-medium">{opt.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.d}</p>
                </label>
              ))}
            </RadioGroup>

            {metodo === "packages" && (
              <Field label="Pacotes por rota">
                <Input type="number" min={1} value={perRoute} onChange={(e) => setPerRoute(Math.max(1, Number(e.target.value) || 1))} />
              </Field>
            )}
            {metodo === "stops" && (
              <Field label="Paradas por rota">
                <Input type="number" min={1} value={stopsPerRoute} onChange={(e) => setStopsPerRoute(Math.max(1, Number(e.target.value) || 1))} />
              </Field>
            )}
            {metodo === "manual" && (
              <ManualRoutes
                rotas={manualRotas}
                setRotas={setManualRotas}
                valorPorPacote={Number(data.valor_por_pacote)}
              />
            )}

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="mb-2 font-medium">Prévia ({rotas.length} rotas)</div>
              {rotas.length === 0 ? (
                <p className="text-muted-foreground">Preencha os campos para ver a prévia.</p>
              ) : (
                <ul className="space-y-1">
                  {rotas.map((r, i) => (
                    <li key={i}>{r.nome}: ~{r.quantidade_pacotes} pacotes · {r.quantidade_paradas} paradas = R$ {r.valor_total.toFixed(2)}</li>
                  ))}
                </ul>
              )}
              <div className="mt-2 border-t pt-2">
                <div>Pacotes distribuídos: <strong>{totalPkgRotas}/{data.total_pacotes_sistema}</strong></div>
                <div>Total a pagar entregadores: <strong>R$ {totalValorRotas.toFixed(2)}</strong></div>
                <div>Sua margem total: <strong>R$ {margemFinal.toFixed(2)}</strong></div>
              </div>
              {remaining > 0 && metodo === "manual" && (
                <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">
                  ⚠️ Ainda restam {remaining} pacote(s) sem rota.
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={rotas.length === 0}>Revisar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Revisão e publicação</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>Data: <strong>{new Date(data.data_operacao).toLocaleDateString("pt-BR")}</strong></div>
              <div>Pacotes totais: <strong>{data.total_pacotes_sistema}</strong></div>
              <div>Paradas: <strong>{data.total_paradas}</strong></div>
              <div>Valor por pacote: <strong>R$ {Number(data.valor_por_pacote).toFixed(2)}</strong></div>
              {faltando > 0 && <div>Faltando: <strong className="text-amber-700">{faltando}</strong></div>}
              {aMais > 0 && <div>A mais: <strong className="text-amber-700">{aMais}</strong></div>}
              <div>Rotas: <strong>{rotas.length}</strong></div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rota</TableHead>
                    <TableHead className="text-right">Pacotes</TableHead>
                    <TableHead className="text-right">Paradas</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rotas.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell className="text-right">{r.quantidade_pacotes}</TableCell>
                      <TableCell className="text-right">{r.quantidade_paradas}</TableCell>
                      <TableCell className="text-right">R$ {r.valor_total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{totalPkgRotas}</TableCell>
                    <TableCell className="text-right">{totalStopsRotas}</TableCell>
                    <TableCell className="text-right">R$ {totalValorRotas.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm">
              <div>Total pacotes: <strong>{data.total_pacotes_sistema}</strong></div>
              <div>ML paga à empresa: {data.total_pacotes_sistema} × R$ {Number(data.valor_ml_por_pacote).toFixed(2)} = <strong>R$ {receitaML.toFixed(2)}</strong></div>
              <div>Empresa paga entregadores: <strong>R$ {totalValorRotas.toFixed(2)}</strong></div>
              <div>Margem da empresa: <strong>R$ {margemFinal.toFixed(2)} ({margemPct.toFixed(1)}%)</strong></div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Editar</Button>
              <div className="flex flex-wrap gap-2">
                {hasDispatchers && (
                  <Button variant="outline" onClick={goAlocar} disabled={publishing}>
                    <Users className="mr-2 h-4 w-4" />Alocar entre dispatchers
                  </Button>
                )}
                <Button size="lg" onClick={publishAll} disabled={publishing} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {publishing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publicando...</> : "Publicar todas as ofertas"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ManualRoutes({ rotas, setRotas, valorPorPacote }: { rotas: Rota[]; setRotas: (r: Rota[]) => void; valorPorPacote: number }) {
  function add() {
    setRotas([...rotas, { nome: `Rota ${rotas.length + 1}`, quantidade_pacotes: 0, quantidade_paradas: 0, valor_total: 0 }]);
  }
  function update(i: number, patch: Partial<Rota>) {
    const next = rotas.map((r, idx) => {
      if (idx !== i) return r;
      const merged = { ...r, ...patch };
      merged.valor_total = merged.quantidade_pacotes * valorPorPacote;
      return merged;
    });
    setRotas(next);
  }
  function remove(i: number) {
    setRotas(rotas.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-3">
      {rotas.map((r, i) => (
        <div key={i} className="grid gap-2 rounded border p-3 sm:grid-cols-[1fr_120px_120px_120px_auto] sm:items-end">
          <Field label="Nome">
            <Input value={r.nome} onChange={(e) => update(i, { nome: e.target.value })} />
          </Field>
          <Field label="Pacotes">
            <Input type="number" min={0} value={r.quantidade_pacotes || ""} onChange={(e) => update(i, { quantidade_pacotes: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Paradas">
            <Input type="number" min={0} value={r.quantidade_paradas || ""} onChange={(e) => update(i, { quantidade_paradas: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Valor">
            <Input disabled value={`R$ ${r.valor_total.toFixed(2)}`} />
          </Field>
          <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}><Plus className="mr-1 h-4 w-4" />Adicionar rota</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/* ============ Detail dialog ============ */

function OperationDetail({ operacaoId, onClose, showMargem }: { operacaoId: string | null; onClose: () => void; showMargem: boolean }) {
  const [op, setOp] = useState<Operacao | null>(null);
  const [rotas, setRotas] = useState<any[]>([]);
  const [ofertas, setOfertas] = useState<any[]>([]);

  useEffect(() => {
    if (!operacaoId) return;
    (async () => {
      const { data: o } = await supabase.from("operacoes").select("*").eq("id", operacaoId).maybeSingle();
      setOp(o as any);
      const { data: rs } = await supabase.from("rotas_operacao").select("*").eq("operacao_id", operacaoId).order("nome");
      setRotas(rs ?? []);
      const ids = (rs ?? []).map((r: any) => r.oferta_id).filter(Boolean);
      if (ids.length) {
        const { data: ofs } = await supabase.from("ofertas").select("id, status, entregador_id").in("id", ids);
        setOfertas(ofs ?? []);
      } else {
        setOfertas([]);
      }
    })();
  }, [operacaoId]);

  if (!operacaoId) return null;
  if (!op) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent><Loader2 className="h-5 w-5 animate-spin" /></DialogContent>
      </Dialog>
    );
  }

  const totalPago = rotas.reduce((s, r) => s + Number(r.valor_total || 0), 0);
  const receita = op.total_pacotes_sistema * Number(op.valor_ml_por_pacote);
  const margem = receita - totalPago;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Operação {new Date(op.data_operacao).toLocaleDateString("pt-BR")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>Pacotes (sistema): <strong>{op.total_pacotes_sistema}</strong></div>
            <div>Pacotes (contados): <strong>{op.total_pacotes_contados}</strong></div>
            <div>Paradas: <strong>{op.total_paradas}</strong></div>
            <div>Valor por pacote: <strong>R$ {Number(op.valor_por_pacote).toFixed(2)}</strong></div>
            {op.pacotes_faltando > 0 && <div className="text-amber-700">Faltando: {op.pacotes_faltando}</div>}
            {op.pacotes_a_mais > 0 && <div className="text-amber-700">A mais: {op.pacotes_a_mais}</div>}
          </div>
          {op.observacoes && (
            <div className="rounded border bg-muted/40 p-2"><strong>Obs:</strong> {op.observacoes}</div>
          )}
          <div>
            <div className="mb-1 font-medium">Rotas</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rota</TableHead>
                  <TableHead className="text-right">Pacotes</TableHead>
                  <TableHead className="text-right">Paradas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rotas.map((r) => {
                  const of = ofertas.find((o) => o.id === r.oferta_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell className="text-right">{r.quantidade_pacotes}</TableCell>
                      <TableCell className="text-right">{r.quantidade_paradas}</TableCell>
                      <TableCell className="text-right">R$ {Number(r.valor_total).toFixed(2)}</TableCell>
                      <TableCell>{of?.status ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="rounded bg-muted p-3">
            <div>Receita ML: <strong>R$ {receita.toFixed(2)}</strong></div>
            <div>Pago aos entregadores: <strong>R$ {totalPago.toFixed(2)}</strong></div>
            {showMargem && <div>Margem: <strong>R$ {margem.toFixed(2)}</strong></div>}
          </div>
          <AllocationPanel operacaoId={op.id} empresaId={op.empresa_id ?? ""} dataOperacao={op.data_operacao} rotas={rotas} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Audit by ranges ============ */

type Faixa = { inicio: number; fim: number; pacotes: number };

function AuditByRanges({
  totalStops, totalPackages, valorPorPacote, initialFaixas, onBack, onConfirm,
}: {
  totalStops: number; totalPackages: number; valorPorPacote: number;
  initialFaixas: Faixa[];
  onBack: () => void;
  onConfirm: (faixas: Faixa[], rotas: Rota[]) => void;
}) {
  const [phase, setPhase] = useState<"define" | "count" | "group">("define");
  const [mode, setMode] = useState<"faixas" | "zonas">("faixas");
  const [stopsPerRange, setStopsPerRange] = useState(10);
  const [numZonas, setNumZonas] = useState(3);
  const [zonas, setZonas] = useState<{ pacotes: number; paradas: number }[]>([]);
  const [faixas, setFaixas] = useState<Faixa[]>(initialFaixas.length ? initialFaixas : []);
  const [targetPerRoute, setTargetPerRoute] = useState(50);
  const [groups, setGroups] = useState<number[][]>([]); // each group is list of faixa indices

  function generate() {
    const out: Faixa[] = [];
    let s = 1;
    while (s <= totalStops) {
      const e = Math.min(totalStops, s + stopsPerRange - 1);
      out.push({ inicio: s, fim: e, pacotes: 0 });
      s = e + 1;
    }
    setFaixas(out);
    setPhase("count");
  }

  function generateZonas() {
    const n = Math.max(1, numZonas);
    setZonas(Array.from({ length: n }, (_, i) => zonas[i] ?? { pacotes: 0, paradas: 0 }));
  }

  function updateZona(i: number, patch: Partial<{ pacotes: number; paradas: number }>) {
    setZonas((prev) => prev.map((z, idx) => idx === i ? { ...z, ...patch } : z));
  }

  function confirmZonas() {
    const out: Faixa[] = [];
    let s = 1;
    zonas.forEach((z) => {
      const stops = Math.max(0, Number(z.paradas) || 0);
      const e = s + stops - 1;
      out.push({ inicio: s, fim: e, pacotes: Number(z.pacotes) || 0 });
      s = e + 1;
    });
    setFaixas(out);
    setPhase("group");
  }

  const zonasTotPkg = zonas.reduce((s, z) => s + (Number(z.pacotes) || 0), 0);
  const zonasTotStops = zonas.reduce((s, z) => s + (Number(z.paradas) || 0), 0);

  function updateFaixa(i: number, patch: Partial<Faixa>) {
    setFaixas(faixas.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  }
  function addFaixa() {
    const last = faixas[faixas.length - 1];
    const s = last ? last.fim + 1 : 1;
    setFaixas([...faixas, { inicio: s, fim: Math.min(totalStops, s + 9), pacotes: 0 }]);
  }
  function removeFaixa(i: number) { setFaixas(faixas.filter((_, idx) => idx !== i)); }

  const contadoTotal = faixas.reduce((s, f) => s + (Number(f.pacotes) || 0), 0);
  const pct = totalPackages > 0 ? Math.min(100, (contadoTotal / totalPackages) * 100) : 0;
  const diff = contadoTotal - totalPackages;

  function suggestGroups() {
    const g: number[][] = [];
    let cur: number[] = [];
    let curPkg = 0;
    faixas.forEach((f, i) => {
      if (curPkg + f.pacotes > targetPerRoute && cur.length) {
        g.push(cur); cur = []; curPkg = 0;
      }
      cur.push(i); curPkg += f.pacotes;
    });
    if (cur.length) g.push(cur);
    setGroups(g);
  }

  function moveFaixaToGroup(faixaIdx: number, targetGroup: number) {
    const next = groups.map((g) => g.filter((i) => i !== faixaIdx));
    if (targetGroup >= 0) {
      next[targetGroup] = [...(next[targetGroup] || []), faixaIdx];
    }
    setGroups(next.filter((g) => g.length > 0));
  }

  const groupRotas: Rota[] = useMemo(() => groups.map((g, i) => {
    const pkg = g.reduce((s, idx) => s + (faixas[idx]?.pacotes || 0), 0);
    const stops = g.reduce((s, idx) => s + ((faixas[idx]?.fim - faixas[idx]?.inicio + 1) || 0), 0);
    return { nome: `Rota ${i + 1}`, quantidade_pacotes: pkg, quantidade_paradas: stops, valor_total: pkg * valorPorPacote };
  }), [groups, faixas, valorPorPacote]);

  const assigned = groups.flat();
  const unassigned = faixas.map((_, i) => i).filter((i) => !assigned.includes(i));
  const unassignedPkg = unassigned.reduce((s, i) => s + faixas[i].pacotes, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria por faixas — {phase === "define" ? "Definir faixas" : phase === "count" ? "Contar pacotes" : "Agrupar em rotas"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {phase === "define" && (
          <>
            <div className="flex gap-2">
              <Button type="button" variant={mode === "faixas" ? "default" : "outline"} size="sm" onClick={() => setMode("faixas")}>Por faixas de paradas</Button>
              <Button type="button" variant={mode === "zonas" ? "default" : "outline"} size="sm" onClick={() => setMode("zonas")}>Por zonas</Button>
            </div>

            {mode === "faixas" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Separar a cada X paradas</Label>
                    <Input type="number" min={1} value={stopsPerRange} onChange={(e) => setStopsPerRange(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div className="text-sm text-muted-foreground self-end">Total de paradas: <strong>{totalStops}</strong></div>
                </div>
                <Button onClick={generate}>Gerar faixas</Button>
                {faixas.length > 0 && (
                  <div className="space-y-2">
                    {faixas.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input className="w-20" type="number" value={f.inicio} onChange={(e) => updateFaixa(i, { inicio: Number(e.target.value) || 0 })} />
                        <span>até</span>
                        <Input className="w-20" type="number" value={f.fim} onChange={(e) => updateFaixa(i, { fim: Number(e.target.value) || 0 })} />
                        <Button variant="ghost" size="icon" onClick={() => removeFaixa(i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addFaixa}><Plus className="mr-1 h-4 w-4" />Adicionar faixa</Button>
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={onBack}>Voltar</Button>
                  <Button onClick={() => setPhase("count")} disabled={faixas.length === 0}>Próximo: contar</Button>
                </div>
              </>
            )}

            {mode === "zonas" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantas zonas?</Label>
                    <Input type="number" min={1} value={numZonas} onChange={(e) => setNumZonas(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div className="text-sm text-muted-foreground self-end">Total esperado: <strong>{totalPackages}</strong> pacotes / <strong>{totalStops}</strong> paradas</div>
                </div>
                <Button onClick={generateZonas}>Gerar zonas</Button>
                {zonas.length > 0 && (
                  <div className="space-y-2">
                    {zonas.map((z, i) => (
                      <div key={i} className="rounded border p-3 space-y-2">
                        <div className="text-sm font-medium">Zona {i + 1}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Pacotes</Label>
                            <Input type="number" min={0} value={z.pacotes || ""} onChange={(e) => updateZona(i, { pacotes: Number(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <Label className="text-xs">Paradas</Label>
                            <Input type="number" min={0} value={z.paradas || ""} onChange={(e) => updateZona(i, { paradas: Number(e.target.value) || 0 })} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded border p-2 text-sm">
                      Totais: <strong>{zonasTotPkg}</strong>/{totalPackages} pacotes · <strong>{zonasTotStops}</strong>/{totalStops} paradas
                      {(zonasTotPkg !== totalPackages || zonasTotStops !== totalStops) && (
                        <span className="ml-2 text-amber-700">⚠️ Totais não batem</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={onBack}>Voltar</Button>
                  <Button onClick={confirmZonas} disabled={zonas.length === 0 || zonasTotPkg === 0}>Próximo: agrupar</Button>
                </div>
              </>
            )}
          </>
        )}


        {phase === "count" && (
          <>
            <div className="space-y-3">
              {faixas.map((f, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="mb-2 text-sm font-medium">Faixa: paradas {f.inicio} a {f.fim}</div>
                  <Label className="text-xs">Pacotes contados</Label>
                  <Input type="number" min={0} value={f.pacotes || ""} onChange={(e) => updateFaixa(i, { pacotes: Number(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="text-sm">Contados até agora: <strong>{contadoTotal}</strong> / {totalPackages} pacotes</div>
              <Progress value={pct} />
              {diff !== 0 && (
                <div className={`rounded border p-2 text-sm ${diff < 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-blue-300 bg-blue-50 text-blue-900"}`}>
                  ⚠️ Contado {contadoTotal}, esperado {totalPackages} — {Math.abs(diff)} pacote(s) {diff < 0 ? "faltando" : "a mais"}
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setPhase("define")}>Voltar</Button>
              <Button onClick={() => { suggestGroups(); setPhase("group"); }}>Próximo: agrupar</Button>
            </div>
          </>
        )}

        {phase === "group" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Pacotes-alvo por rota</Label>
                <Input type="number" min={1} value={targetPerRoute} onChange={(e) => setTargetPerRoute(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <Button variant="outline" onClick={suggestGroups} className="self-end">Sugerir agrupamento</Button>
            </div>

            <div className="space-y-3">
              {groups.map((g, gi) => {
                const r = groupRotas[gi];
                return (
                  <div key={gi} className="rounded border p-3">
                    <div className="mb-2 font-medium">{r.nome} — {r.quantidade_pacotes} pacotes / {r.quantidade_paradas} paradas = R$ {r.valor_total.toFixed(2)}</div>
                    <div className="flex flex-wrap gap-2">
                      {g.map((fi) => {
                        const f = faixas[fi];
                        return (
                          <Badge key={fi} variant="outline" className="cursor-pointer" onClick={() => moveFaixaToGroup(fi, -1)}>
                            {f.inicio}-{f.fim} · {f.pacotes}p ✕
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={() => setGroups([...groups, []])}>
                <Plus className="mr-1 h-4 w-4" />Nova rota
              </Button>
            </div>

            {unassigned.length > 0 && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3">
                <div className="mb-2 text-sm font-medium text-amber-900">⚠️ {unassignedPkg} pacote(s) não atribuídos a rotas</div>
                <div className="flex flex-wrap gap-2">
                  {unassigned.map((fi) => {
                    const f = faixas[fi];
                    return (
                      <div key={fi} className="flex items-center gap-1">
                        <Badge variant="outline">{f.inicio}-{f.fim} · {f.pacotes}p</Badge>
                        <Select onValueChange={(v) => moveFaixaToGroup(fi, Number(v))}>
                          <SelectTrigger className="w-32 h-7"><SelectValue placeholder="→ Rota" /></SelectTrigger>
                          <SelectContent>
                            {groups.map((_, gi) => <SelectItem key={gi} value={String(gi)}>Rota {gi + 1}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setPhase("count")}>Voltar</Button>
              <Button
                onClick={() => onConfirm(faixas, groupRotas)}
                disabled={groupRotas.length === 0 || unassigned.length > 0}
              >
                Confirmar rotas
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ============ Allocation panel ============ */

function AllocationPanel({
  operacaoId, empresaId, dataOperacao, rotas,
}: { operacaoId: string; empresaId: string; dataOperacao: string; rotas: any[] }) {
  const [aceitos, setAceitos] = useState<any[]>([]);
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const sb = supabase as any;
    // entregadores que aceitaram previsoes do dia
    const { data: prevs } = await sb.from("agenda_previsoes")
      .select("id").eq("empresa_id", empresaId).eq("data_prevista", dataOperacao);
    const prevIds = (prevs ?? []).map((p: any) => p.id);
    let entregadoresAceitos: any[] = [];
    if (prevIds.length) {
      const { data: ofs } = await sb.from("ofertas")
        .select("id, entregador_id, updated_at, entregadores(nome_completo, tipo_veiculo, reliability_level, reliability_score)")
        .in("previsao_id", prevIds).not("entregador_id", "is", null)
        .order("updated_at", { ascending: true });
      entregadoresAceitos = ofs ?? [];
    }
    setAceitos(entregadoresAceitos);
    const { data: alc } = await sb.from("alocacoes").select("*, entregadores(nome_completo)").eq("operacao_id", operacaoId);
    setAlocacoes(alc ?? []);
  }
  useEffect(() => { load(); }, [operacaoId, empresaId, dataOperacao]);

  function alocadoPara(rotaId: string) {
    return alocacoes.find((a) => a.rota_id === rotaId);
  }

  async function autoAllocate() {
    setBusy(true);
    try {
      const sb = supabase as any;
      const disponiveis = aceitos.filter((a) => !alocacoes.some((al) => al.entregador_id === a.entregador_id));
      const rotasLivres = rotas.filter((r) => !alocadoPara(r.id));
      let i = 0;
      for (const rota of rotasLivres) {
        if (i >= disponiveis.length) break;
        const ent = disponiveis[i++];
        const { error } = await sb.from("alocacoes").insert({
          operacao_id: operacaoId, rota_id: rota.id, entregador_id: ent.entregador_id,
          oferta_id: rota.oferta_id, empresa_id: empresaId, status: "allocated",
        });
        if (error) throw error;
        if (rota.oferta_id) {
          await sb.from("ofertas").update({ entregador_id: ent.entregador_id, status: "accepted" }).eq("id", rota.oferta_id);
        }
      }
      toast.success(`${Math.min(disponiveis.length, rotasLivres.length)} rota(s) alocadas.`);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function startOperation() {
    const sb = supabase as any;
    const ofertaIds = rotas.map((r) => r.oferta_id).filter(Boolean);
    if (ofertaIds.length) await sb.from("ofertas").update({ status: "in_progress" }).in("id", ofertaIds);
    await sb.from("alocacoes").update({ status: "started" }).eq("operacao_id", operacaoId);
    toast.success("Operação iniciada!");
    load();
  }

  return (
    <div className="rounded border p-3 space-y-3">
      <div className="flex items-center gap-2 font-medium"><Users className="h-4 w-4" />Alocação ({alocacoes.length}/{rotas.length})</div>
      <p className="text-sm text-muted-foreground">
        {aceitos.length} entregador(es) aceitaram previsões para {new Date(dataOperacao).toLocaleDateString("pt-BR")}.
      </p>

      <Table>
        <TableHeader>
          <TableRow><TableHead>Rota</TableHead><TableHead>Entregador</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {rotas.map((r) => {
            const a = alocadoPara(r.id);
            return (
              <TableRow key={r.id}>
                <TableCell>{r.nome} · {r.quantidade_pacotes}p · R$ {Number(r.valor_total).toFixed(2)}</TableCell>
                <TableCell>{a ? <span className="text-emerald-700">✅ {(a.entregadores as any)?.nome_completo}</span> : <span className="text-muted-foreground">❌ ninguém</span>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex flex-wrap gap-2">
        <Button onClick={autoAllocate} disabled={busy || aceitos.length === 0} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Auto-alocar
        </Button>
        <Button variant="outline" onClick={startOperation} disabled={alocacoes.length === 0}>
          Iniciar operação
        </Button>
      </div>
    </div>
  );
}

