import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Package, Plus, Trash2, ArrowLeft, CheckCircle2, AlertTriangle, Eye, Users, Map as MapIcon, ScanLine, Sparkles, Save } from "lucide-react";
import { ScanOperationDialog } from "@/components/ScanOperationDialog";
import { geocodeAddress, geocodeMultiple } from "@/lib/geocoding";
import { optimizeRoute, formatDuration, type Stop } from "@/lib/route-optimizer";
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
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/pacotes")({
  component: PacotesPage,
});


type DivMethod = "packages" | "stops" | "manual";
type Rota = { nome: string; quantidade_pacotes: number; quantidade_paradas: number; valor_total: number; valor_por_pacote?: number };
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
  const [scanOpen, setScanOpen] = useState(false);

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

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          onClick={() => setMode("create")}
        >
          <Plus className="mr-2 h-5 w-5" />
          Iniciar nova operação
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setScanOpen(true)}
        >
          <ScanLine className="mr-2 h-5 w-5" />
          Escanear Pacotes
        </Button>
      </div>

      <ScanOperationDialog
        open={scanOpen}
        empresaId={userId}
        onClose={() => setScanOpen(false)}
        onCreated={(id) => {
          setScanOpen(false);
          load();
          setDetailId(id);
        }}
      />

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

/* ============ Create operation flow (4-step stepper) ============ */

type DivisionMode = "auto" | "manual" | "single";

const ORIGENS_PRESET = ["Mercado Livre", "Shopee", "Shein", "Amazon", "Magalu", "iFood", "Rappi"];

function CreateOperation({
  userId, empresa, onCancel, onDone,
}: { userId: string; empresa: EmpresaTms | null; onCancel: () => void; onDone: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [origem, setOrigem] = useState<string>("Mercado Livre");
  const [origemCustom, setOrigemCustom] = useState<string>("");
  const [dataOperacao, setDataOperacao] = useState(new Date().toISOString().slice(0, 10));
  const [totalPacotes, setTotalPacotes] = useState<number>(0);
  const [totalParadas, setTotalParadas] = useState<number>(0);
  const [valorPorPacote, setValorPorPacote] = useState<number>(empresa?.tms_valor_padrao_pacote ?? 1.8);
  const [scanOpen, setScanOpen] = useState(false);

  const origemFinal = origem === "Outro" ? origemCustom.trim() : origem;
  const mediaPorParada = totalParadas > 0 ? (totalPacotes / totalParadas) : 0;
  const totalEstimado = totalPacotes * valorPorPacote;

  // Step 2
  const [divisionMode, setDivisionMode] = useState<DivisionMode>("auto");
  const [numRotas, setNumRotas] = useState<number>(3);
  const [manualRotas, setManualRotas] = useState<Rota[]>([]);
  const [rotas, setRotas] = useState<Rota[]>([]);

  function buildAuto(n: number): Rota[] {
    const out: Rota[] = [];
    const N = Math.max(1, n);
    const baseP = Math.floor(totalPacotes / N);
    const restP = totalPacotes - baseP * N;
    const baseS = Math.floor(totalParadas / N);
    const restS = totalParadas - baseS * N;
    for (let i = 0; i < N; i++) {
      const p = baseP + (i < restP ? 1 : 0);
      const s = baseS + (i < restS ? 1 : 0);
      out.push({ nome: `Rota ${i + 1}`, quantidade_pacotes: p, quantidade_paradas: s, valor_total: p * valorPorPacote });
    }
    return out;
  }

  function buildSingle(): Rota[] {
    return [{ nome: "Rota única", quantidade_pacotes: totalPacotes, quantidade_paradas: totalParadas, valor_total: totalPacotes * valorPorPacote }];
  }

  function addManual() {
    setManualRotas([...manualRotas, { nome: `Rota ${manualRotas.length + 1}`, quantidade_pacotes: 0, quantidade_paradas: 0, valor_total: 0 }]);
  }
  function updateManual(i: number, patch: Partial<Rota>) {
    setManualRotas((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const m = { ...r, ...patch };
      m.valor_total = m.quantidade_pacotes * valorPorPacote;
      return m;
    }));
  }
  function removeManual(i: number) { setManualRotas(manualRotas.filter((_, idx) => idx !== i)); }
  function distribuirRestante() {
    const somaP = manualRotas.reduce((s, r) => s + r.quantidade_pacotes, 0);
    const somaS = manualRotas.reduce((s, r) => s + r.quantidade_paradas, 0);
    const restP = totalPacotes - somaP;
    const restS = totalParadas - somaS;
    if (manualRotas.length === 0) { addManual(); return; }
    const last = manualRotas.length - 1;
    updateManual(last, {
      quantidade_pacotes: manualRotas[last].quantidade_pacotes + Math.max(0, restP),
      quantidade_paradas: manualRotas[last].quantidade_paradas + Math.max(0, restS),
    });
  }

  const manualSomaP = manualRotas.reduce((s, r) => s + r.quantidade_pacotes, 0);
  const manualSomaS = manualRotas.reduce((s, r) => s + r.quantidade_paradas, 0);

  function confirmDivision() {
    let r: Rota[] = [];
    if (divisionMode === "auto") r = buildAuto(numRotas);
    else if (divisionMode === "single") r = buildSingle();
    else r = manualRotas.map((x) => ({ ...x, valor_total: x.quantidade_pacotes * valorPorPacote }));
    setRotas(r);
    setStep(3);
  }

  // Step 3 — review (inline edit)
  const [observacoes, setObservacoes] = useState("");
  function updateRota(i: number, patch: Partial<Rota>) {
    setRotas((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const m = { ...r, ...patch };
      m.valor_total = m.quantidade_pacotes * valorPorPacote;
      return m;
    }));
  }
  const totalGeral = rotas.reduce((s, r) => s + r.valor_total, 0);
  const totalPkgRotas = rotas.reduce((s, r) => s + r.quantidade_pacotes, 0);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [createdOpId, setCreatedOpId] = useState<string | null>(null);
  const [createdRotaIds, setCreatedRotaIds] = useState<string[]>([]);

  async function createOperation() {
    if (!origemFinal) { toast.error("Informe a origem."); return; }
    if (rotas.length === 0) { toast.error("Crie ao menos uma rota."); return; }
    setSubmitting(true);
    try {
      const { data: opRow, error: opErr } = await supabase.from("operacoes").insert({
        empresa_id: userId,
        data_operacao: dataOperacao,
        total_pacotes_sistema: totalPacotes,
        total_pacotes_contados: totalPacotes,
        total_paradas: totalParadas,
        valor_por_pacote: valorPorPacote,
        metodo_divisao: divisionMode,
        status: "draft",
        observacoes: observacoes || null,
        origem: origemFinal,
      } as any).select("id").single();
      if (opErr) throw opErr;
      const opId = (opRow as any).id as string;

      const rotaIds: string[] = [];
      for (const r of rotas) {
        const { data: rRow, error: rErr } = await supabase.from("rotas_operacao").insert({
          operacao_id: opId,
          empresa_id: userId,
          nome: r.nome,
          quantidade_pacotes: r.quantidade_pacotes,
          quantidade_paradas: r.quantidade_paradas,
          valor_total: r.valor_total,
          status: "draft",
        }).select("id").single();
        if (rErr) throw rErr;
        rotaIds.push((rRow as any).id);
      }

      setCreatedOpId(opId);
      setCreatedRotaIds(rotaIds);
      toast.success("Operação criada!");
      setStep(4);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar operação.");
    } finally {
      setSubmitting(false);
    }
  }

  // Step 4 actions
  async function publishAsOffers() {
    if (!createdOpId) return;
    setSubmitting(true);
    try {
      for (let i = 0; i < rotas.length; i++) {
        const r = rotas[i];
        const rotaId = createdRotaIds[i];
        const { data: of, error: ofErr } = await supabase.from("ofertas").insert({
          empresa_id: userId,
          titulo: `${origemFinal} · ${r.nome} - ${new Date(dataOperacao).toLocaleDateString("pt-BR")}`,
          descricao: observacoes || null,
          quantidade_pacotes: r.quantidade_pacotes,
          quantidade_paradas: r.quantidade_paradas,
          valor: r.valor_total,
          valor_por_pacote: valorPorPacote,
          status: "open",
          tipo_entrega: "package_delivery",
          operacao_id: createdOpId,
          rota_operacao_id: rotaId,
          data_trabalho: dataOperacao,
        } as any).select("id").single();
        if (ofErr) throw ofErr;
        await supabase.from("rotas_operacao").update({ oferta_id: (of as any).id, status: "open" }).eq("id", rotaId);
      }
      await supabase.from("operacoes").update({ status: "published" } as any).eq("id", createdOpId);
      toast.success(`🎉 ${rotas.length} oferta(s) publicada(s)!`);
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao publicar.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setStep(1); setOrigem("Mercado Livre"); setOrigemCustom("");
    setDataOperacao(new Date().toISOString().slice(0, 10));
    setTotalPacotes(0); setTotalParadas(0);
    setValorPorPacote(empresa?.tms_valor_padrao_pacote ?? 1.8);
    setDivisionMode("auto"); setNumRotas(3); setManualRotas([]); setRotas([]);
    setObservacoes(""); setCreatedOpId(null); setCreatedRotaIds([]);
  }

  const step1Valid = !!origemFinal && totalPacotes > 0 && totalParadas > 0 && valorPorPacote > 0;
  const step2Valid =
    divisionMode === "single" ||
    (divisionMode === "auto" && numRotas > 0) ||
    (divisionMode === "manual" && manualRotas.length > 0 && manualSomaP === totalPacotes && manualSomaS === totalParadas);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
        <PageHeader title="Nova operação" description={`Etapa ${step} de 4`} />
      </div>

      {/* Stepper indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`h-2 flex-1 rounded-full transition-colors ${step >= n ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* ============ STEP 1 ============ */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Origem e volumes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Origem / Cliente">
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGENS_PRESET.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  <SelectItem value="Outro">Outro (digitar)</SelectItem>
                </SelectContent>
              </Select>
              {origem === "Outro" && (
                <Input
                  className="mt-2"
                  placeholder="Digite o nome do cliente"
                  value={origemCustom}
                  onChange={(e) => setOrigemCustom(e.target.value)}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data da operação">
                <Input type="date" value={dataOperacao} onChange={(e) => setDataOperacao(e.target.value)} />
              </Field>
              <Field label="Valor por pacote (R$)">
                <Input
                  type="number" step="0.01" min={0}
                  value={valorPorPacote || ""}
                  onChange={(e) => setValorPorPacote(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Total estimado: <strong>R$ {totalEstimado.toFixed(2)}</strong>
                </p>
              </Field>
              <Field label="Total de pacotes">
                <Input
                  type="number" min={0}
                  value={totalPacotes || ""}
                  onChange={(e) => setTotalPacotes(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Total de paradas">
                <Input
                  type="number" min={0}
                  value={totalParadas || ""}
                  onChange={(e) => setTotalParadas(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Média: <strong>{mediaPorParada > 0 ? mediaPorParada.toFixed(1) : "—"}</strong> pacotes por parada
                </p>
              </Field>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="font-medium mb-1">Métodos alternativos</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
                  <ScanLine className="mr-1 h-4 w-4" />Escanear pacotes
                </Button>
                <Button variant="outline" size="sm" disabled title="Em breve">
                  <Package className="mr-1 h-4 w-4" />Importar planilha
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={() => setStep(2)} disabled={!step1Valid}>Próximo</Button>
            </div>

            <ScanOperationDialog
              open={scanOpen}
              empresaId={userId}
              onClose={() => setScanOpen(false)}
              onCreated={() => { setScanOpen(false); onDone(); }}
            />
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 2 ============ */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Como quer dividir as rotas?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { v: "auto" as DivisionMode, title: "Divisão automática", d: "Sistema divide igualmente por quantidade de rotas" },
                { v: "manual" as DivisionMode, title: "Divisão manual", d: "Você define cada rota individualmente" },
                { v: "single" as DivisionMode, title: "Rota única", d: "Tudo em uma única rota sem divisão" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setDivisionMode(opt.v)}
                  className={`text-left rounded-lg border-2 p-4 transition-all ${divisionMode === opt.v ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
                >
                  <div className="font-semibold">{opt.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{opt.d}</p>
                </button>
              ))}
            </div>

            {divisionMode === "auto" && (
              <div className="space-y-3 rounded-md border p-3">
                <Field label="Quantas rotas?">
                  <Input type="number" min={1} value={numRotas} onChange={(e) => setNumRotas(Math.max(1, Number(e.target.value) || 1))} />
                </Field>
                <div className="rounded bg-muted/40 p-2 text-sm">
                  Prévia:
                  <ul className="mt-1 list-disc pl-5">
                    {buildAuto(numRotas).map((r, i) => (
                      <li key={i}>{r.nome}: {r.quantidade_pacotes} pacotes · {r.quantidade_paradas} paradas · R$ {r.valor_total.toFixed(2)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {divisionMode === "manual" && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span><strong>{manualSomaP}</strong> / {totalPacotes} pacotes · <strong>{manualSomaS}</strong> / {totalParadas} paradas</span>
                  <Button variant="outline" size="sm" onClick={distribuirRestante} disabled={manualRotas.length === 0}>
                    Distribuir restante
                  </Button>
                </div>
                {manualRotas.map((r, i) => (
                  <div key={i} className="grid gap-2 rounded border p-3 sm:grid-cols-[1fr_110px_110px_auto] sm:items-end">
                    <Field label="Nome da rota">
                      <Input value={r.nome} onChange={(e) => updateManual(i, { nome: e.target.value })} />
                    </Field>
                    <Field label="Pacotes">
                      <Input type="number" min={0} value={r.quantidade_pacotes || ""} onChange={(e) => updateManual(i, { quantidade_pacotes: Number(e.target.value) || 0 })} />
                    </Field>
                    <Field label="Paradas">
                      <Input type="number" min={0} value={r.quantidade_paradas || ""} onChange={(e) => updateManual(i, { quantidade_paradas: Number(e.target.value) || 0 })} />
                    </Field>
                    <Button variant="ghost" size="icon" onClick={() => removeManual(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addManual}><Plus className="mr-1 h-4 w-4" />Adicionar rota</Button>
                {(manualSomaP !== totalPacotes || manualSomaS !== totalParadas) && manualRotas.length > 0 && (
                  <div className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
                    ⚠️ Soma deve bater com totais: {totalPacotes} pacotes / {totalParadas} paradas
                  </div>
                )}
              </div>
            )}

            {divisionMode === "single" && (
              <div className="rounded-md border p-3 text-sm">
                Uma única rota com <strong>{totalPacotes}</strong> pacotes · <strong>{totalParadas}</strong> paradas · <strong>R$ {totalEstimado.toFixed(2)}</strong>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button size="lg" onClick={confirmDivision} disabled={!step2Valid}>Próximo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 3 ============ */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Revisão e ajustes</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>Origem: <strong>{origemFinal}</strong></div>
              <div>Data: <strong>{new Date(dataOperacao).toLocaleDateString("pt-BR")}</strong></div>
              <div>Total pacotes: <strong>{totalPacotes}</strong></div>
              <div>Total paradas: <strong>{totalParadas}</strong></div>
              <div>Valor por pacote: <strong>R$ {valorPorPacote.toFixed(2)}</strong></div>
              <div>Rotas: <strong>{rotas.length}</strong></div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Rotas (clique para editar)</div>
              {rotas.map((r, i) => (
                <div key={i} className="grid gap-2 rounded border p-3 sm:grid-cols-[1fr_100px_100px_120px] sm:items-end">
                  <Field label="Nome">
                    <Input value={r.nome} onChange={(e) => updateRota(i, { nome: e.target.value })} />
                  </Field>
                  <Field label="Pacotes">
                    <Input type="number" min={0} value={r.quantidade_pacotes || ""} onChange={(e) => updateRota(i, { quantidade_pacotes: Number(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Paradas">
                    <Input type="number" min={0} value={r.quantidade_paradas || ""} onChange={(e) => updateRota(i, { quantidade_paradas: Number(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Valor">
                    <Input disabled value={`R$ ${r.valor_total.toFixed(2)}`} />
                  </Field>
                </div>
              ))}
            </div>

            <Field label="Observações gerais (opcional)">
              <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas, instruções especiais..." />
            </Field>

            <div className="rounded-md bg-muted p-3 text-sm">
              <div>Pacotes distribuídos: <strong>{totalPkgRotas}</strong> / {totalPacotes}</div>
              <div>Total geral: <strong className="text-lg">R$ {totalGeral.toFixed(2)}</strong></div>
              {totalPkgRotas !== totalPacotes && (
                <div className="mt-2 text-amber-700">⚠️ Soma das rotas difere do total declarado.</div>
              )}
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)} disabled={submitting}>Voltar</Button>
              <Button size="lg" onClick={createOperation} disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar operação"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 4 — Success ============ */}
      {step === 4 && createdOpId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              Operação criada com sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">O que você deseja fazer agora?</p>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={publishAsOffers}
                disabled={submitting}
                className="text-left rounded-lg border-2 border-primary bg-primary/5 p-4 transition-all hover:shadow-md disabled:opacity-50"
              >
                <div className="text-2xl">📢</div>
                <div className="mt-2 font-semibold">Publicar como Oferta</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Publica {rotas.length} oferta(s) já vinculadas a esta operação.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { onDone(); }}
                className="text-left rounded-lg border-2 border-border p-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="text-2xl">📋</div>
                <div className="mt-2 font-semibold">Ver operação</div>
                <p className="mt-1 text-xs text-muted-foreground">Volta para a lista e abre o detalhe.</p>
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="text-left rounded-lg border-2 border-border p-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="text-2xl">➕</div>
                <div className="mt-2 font-semibold">Nova operação</div>
                <p className="mt-1 text-xs text-muted-foreground">Reinicia o assistente.</p>
              </button>
            </div>

            {submitting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Publicando ofertas...
              </div>
            )}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregando operação...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  const totalPago = rotas.reduce((s, r) => s + Number(r.valor_total || 0), 0);
  const receita = op.total_pacotes_sistema * Number(op.valor_ml_por_pacote);
  const margem = receita - totalPago;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <RouteMapButton ofertaIds={rotas.map((r: any) => r.oferta_id).filter(Boolean)} />
          <OptimizeRouteButton operacaoId={op.id} ofertaIds={rotas.map((r: any) => r.oferta_id).filter(Boolean)} />
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
    if (ofertaIds.length) {
      await sb.from("ofertas").update({ status: "in_progress" }).in("id", ofertaIds);
      const { notifyDestinatarioOferta } = await import("@/lib/whatsapp-notify");
      ofertaIds.forEach((id: string) => { notifyDestinatarioOferta(id).catch(() => {}); });
    }
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


/* ============ Route map button + dialog ============ */

function RouteMapButton({ ofertaIds }: { ofertaIds: string[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stops, setStops] = useState<Array<{ id: string; lat: number; lng: number; label: string; status?: string }>>([]);
  const [skipped, setSkipped] = useState(0);

  async function handleOpen() {
    if (ofertaIds.length === 0) {
      toast.error("Nenhuma rota publicada nesta operação.");
      return;
    }
    setOpen(true);
    setLoading(true);
    setStops([]);
    setSkipped(0);
    try {
      const { data: pacotes } = await supabase
        .from("entregas_pacotes")
        .select("id, endereco_entrega, lat, lng, status, numero_pacote, ordem_otimizada")
        .in("oferta_id", ofertaIds)
        .order("numero_pacote");

      const all = (pacotes ?? []).filter((p: any) => p.endereco_entrega);
      const limited = all.slice(0, 20);
      const skippedCount = Math.max(0, all.length - limited.length);

      // Use cached lat/lng when present, otherwise geocode
      const needGeo = limited.filter((p: any) => p.lat == null || p.lng == null);
      const geoResults = needGeo.length
        ? await geocodeMultiple(needGeo.map((p: any) => p.endereco_entrega))
        : [];
      const geoMap = new Map<string, { lat: number; lng: number }>();
      needGeo.forEach((p: any, i: number) => {
        const r = geoResults[i];
        if (r) geoMap.set(p.id, { lat: r.lat, lng: r.lng });
      });

      const result = limited
        .map((p: any) => {
          const coords =
            p.lat != null && p.lng != null
              ? { lat: Number(p.lat), lng: Number(p.lng) }
              : geoMap.get(p.id);
          if (!coords) return null;
          return {
            id: p.id,
            lat: coords.lat,
            lng: coords.lng,
            label: p.endereco_entrega as string,
            status: p.status as string | undefined,
          };
        })
        .filter(Boolean) as Array<{ id: string; lat: number; lng: number; label: string; status?: string }>;

      // Respect optimized order if all have it
      const orderMap = new Map(limited.map((p: any) => [p.id, p.ordem_otimizada ?? p.numero_pacote]));
      result.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

      setStops(result);
      setSkipped(skippedCount + (limited.length - result.length));
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar mapa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="w-full">
        <MapIcon className="mr-2 h-4 w-4" /> Ver rota no mapa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Rota no mapa</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Geocodificando endereços...</span>
            </div>
          ) : stops.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Nenhum endereço pôde ser geocodificado.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Mostrando {stops.length} paradas
                {skipped > 0 && ` (${skipped} ignoradas — limite de 20 por vez)`}
              </div>
              <Suspense fallback={<div className="flex h-72 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
                <RouteMap stops={stops} height={420} />
              </Suspense>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ============ Optimize Route ============ */

type OptStop = Stop & { status?: string; numero?: number };

function OptimizeRouteButton({ operacaoId, ofertaIds }: { operacaoId: string; ofertaIds: string[] }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "geocoding" | "ready" | "saving">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [stops, setStops] = useState<OptStop[]>([]);
  const [totalKm, setTotalKm] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [skipped, setSkipped] = useState(0);

  async function handleOpen() {
    if (ofertaIds.length === 0) {
      toast.error("Nenhuma rota publicada nesta operação.");
      return;
    }
    setOpen(true);
    setPhase("geocoding");
    setStops([]);
    setTotalKm(0);
    setMinutes(0);
    setSkipped(0);

    try {
      const { data: pacotes } = await supabase
        .from("entregas_pacotes")
        .select("id, endereco_entrega, lat, lng, status, numero_pacote")
        .in("oferta_id", ofertaIds)
        .order("numero_pacote");

      const withAddr = (pacotes ?? []).filter((p: any) => p.endereco_entrega);
      setProgress({ done: 0, total: withAddr.length });

      const geocoded: OptStop[] = [];
      let skipCount = 0;

      for (let i = 0; i < withAddr.length; i++) {
        const p: any = withAddr[i];
        let coords: { lat: number; lng: number } | null = null;
        if (p.lat != null && p.lng != null) {
          coords = { lat: Number(p.lat), lng: Number(p.lng) };
        } else {
          if (i > 0) await new Promise((r) => setTimeout(r, 1100));
          coords = await geocodeAddress(p.endereco_entrega);
        }
        if (coords) {
          geocoded.push({
            id: p.id,
            lat: coords.lat,
            lng: coords.lng,
            address: p.endereco_entrega,
            status: p.status,
            numero: p.numero_pacote,
          });
        } else {
          skipCount++;
        }
        setProgress({ done: i + 1, total: withAddr.length });
      }

      if (geocoded.length === 0) {
        toast.error("Nenhum endereço pôde ser geocodificado.");
        setPhase("idle");
        setOpen(false);
        return;
      }

      const origin = { lat: geocoded[0].lat, lng: geocoded[0].lng };
      const optimized = optimizeRoute(origin, geocoded);
      const orderedStops = optimized.stops.map((s) => {
        const src = geocoded.find((g) => g.id === s.id)!;
        return { ...s, status: src.status, numero: src.numero };
      });
      setStops(orderedStops);
      setTotalKm(optimized.totalDistanceKm);
      setMinutes(optimized.estimatedMinutes);
      setSkipped(skipCount);
      setPhase("ready");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao otimizar rota.");
      setPhase("idle");
      setOpen(false);
    }
  }

  async function handleSave() {
    setPhase("saving");
    try {
      for (let i = 0; i < stops.length; i++) {
        const { error } = await supabase
          .from("entregas_pacotes")
          .update({ ordem_otimizada: i + 1, lat: stops[i].lat, lng: stops[i].lng } as any)
          .eq("id", stops[i].id);
        if (error) throw error;
      }
      toast.success("Ordem otimizada salva.");
      setOpen(false);
      setPhase("idle");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar ordem.");
      setPhase("ready");
    }
  }

  const mapStops = stops.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.address, status: s.status }));

  return (
    <>
      <Button variant="default" onClick={handleOpen} className="w-full">
        <Sparkles className="mr-2 h-4 w-4" /> Otimizar rota
      </Button>
      <Dialog open={open} onOpenChange={(v) => { if (phase !== "geocoding" && phase !== "saving") setOpen(v); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Otimizar rota</DialogTitle>
          </DialogHeader>

          {phase === "geocoding" && (
            <div className="space-y-3 py-6">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Geocodificando {progress.done}/{progress.total} endereços...</span>
              </div>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
            </div>
          )}

          {phase === "ready" || phase === "saving" ? (
            <div className="space-y-4">
              <Suspense fallback={<div className="flex h-72 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
                <RouteMap stops={mapStops} origin={stops[0] ? { lat: stops[0].lat, lng: stops[0].lng } : undefined} height={360} />
              </Suspense>

              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Distância total</div>
                  <div className="text-lg font-semibold">{totalKm.toFixed(1)} km</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Tempo estimado</div>
                  <div className="text-lg font-semibold">{formatDuration(minutes)}</div>
                </CardContent></Card>
              </div>

              {skipped > 0 && (
                <div className="text-xs text-amber-600">{skipped} endereço(s) ignorado(s) por falha na geocodificação.</div>
              )}

              <div className="space-y-1">
                <div className="text-sm font-medium">Ordem otimizada</div>
                <ol className="space-y-1 text-sm">
                  {stops.map((s, i) => (
                    <li key={s.id} className="flex gap-2 rounded border p-2">
                      <span className="font-semibold w-6">{i + 1}.</span>
                      <span className="flex-1">{s.address}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={phase === "saving"}>Cancelar</Button>
                <Button onClick={handleSave} disabled={phase === "saving"}>
                  {phase === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar ordem
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
