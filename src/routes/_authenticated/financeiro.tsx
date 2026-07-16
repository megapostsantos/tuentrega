import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2, Upload, Loader2,
  CalendarIcon, FileText, ArrowDownCircle, ArrowUpCircle, Download, AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { exportToExcel } from "@/lib/export";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});

type Tipo = "entrada" | "saida";

type Lancamento = {
  id: string;
  empresa_id: string;
  tipo: Tipo;
  categoria: string;
  descricao: string | null;
  valor: number;
  data_lancamento: string;
  comprovante_url: string | null;
  entregador_id: string | null;
  created_at: string;
};

const CAT_PAGAMENTO_ENTREGADOR = "Pagamento a entregadores";

const CATEGORIAS: Record<Tipo, string[]> = {
  entrada: ["Receita de cliente", "Adiantamento", "Outros recebimentos"],
  saida: [
    CAT_PAGAMENTO_ENTREGADOR,
    "Combustível", "Aluguel", "Salário", "Fornecedor",
    "Manutenção", "Impostos", "Marketing", "Outros",
  ],
};

const brl = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Periodo = "este_mes" | "mes_passado" | "ultimos_3" | "personalizado";

function periodRange(p: Periodo, custom?: { from?: Date; to?: Date }) {
  const now = new Date();
  if (p === "este_mes") return { from: startOfMonth(now), to: endOfMonth(now) };
  if (p === "mes_passado") {
    const d = subMonths(now, 1);
    return { from: startOfMonth(d), to: endOfMonth(d) };
  }
  if (p === "ultimos_3") return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
  return {
    from: custom?.from ? startOfDay(custom.from) : startOfMonth(now),
    to: custom?.to ? startOfDay(custom.to) : endOfMonth(now),
  };
}

function FinanceiroPage() {
  const { role, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (role !== "empresa") return <Navigate to="/dashboard" />;
  if (!user) return null;

  return <FinanceiroEmpresa empresaId={user.id} />;
}

function FinanceiroEmpresa({ empresaId }: { empresaId: string }) {
  const qc = useQueryClient();
  const [periodo, setPeriodo] = useState<Periodo>("este_mes");
  const [custom, setCustom] = useState<{ from?: Date; to?: Date }>({});
  const [tipoFilter, setTipoFilter] = useState<"todos" | Tipo>("todos");
  const [catFilter, setCatFilter] = useState<string>("todas");
  const [dayFilter, setDayFilter] = useState<string | null>(null); // yyyy-MM-dd

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [toDelete, setToDelete] = useState<Lancamento | null>(null);
  const [showPjList, setShowPjList] = useState(false);

  const range = useMemo(() => periodRange(periodo, custom), [periodo, custom]);

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ["financeiro", empresaId, range.from.toISOString(), range.to.toISOString(), tipoFilter, catFilter],
    queryFn: async () => {
      let q = supabase
        .from("financeiro_lancamentos")
        .select("*")
        .eq("empresa_id", empresaId)
        .gte("data_lancamento", format(range.from, "yyyy-MM-dd"))
        .lte("data_lancamento", format(range.to, "yyyy-MM-dd"))
        .order("data_lancamento", { ascending: false })
        .order("created_at", { ascending: false });
      if (tipoFilter !== "todos") q = q.eq("tipo", tipoFilter);
      if (catFilter !== "todas") q = q.eq("categoria", catFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Lancamento[];
    },
  });


  // Lançamentos filtrados pelo dia (se selecionado no gráfico)
  const lancamentosFiltrados = useMemo(
    () => dayFilter ? lancamentos.filter(l => l.data_lancamento === dayFilter) : lancamentos,
    [lancamentos, dayFilter],
  );

  const { totalEntradas, totalSaidas, saldo } = useMemo(() => {
    let e = 0, s = 0;
    for (const l of lancamentosFiltrados) {
      if (l.tipo === "entrada") e += Number(l.valor);
      else s += Number(l.valor);
    }
    return { totalEntradas: e, totalSaidas: s, saldo: e - s };
  }, [lancamentosFiltrados]);

  // Dados do gráfico (todos os dias do período, sempre baseado em lancamentos completos)
  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: range.from, end: range.to });
    const map = new Map<string, { date: string; entradas: number; saidas: number }>();
    days.forEach(d => {
      const key = format(d, "yyyy-MM-dd");
      map.set(key, { date: key, entradas: 0, saidas: 0 });
    });
    lancamentos.forEach(l => {
      const row = map.get(l.data_lancamento);
      if (!row) return;
      if (l.tipo === "entrada") row.entradas += Number(l.valor);
      else row.saidas += Number(l.valor);
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      label: format(new Date(r.date + "T00:00"), "dd/MM"),
    }));
  }, [lancamentos, range]);

  // Alerta fiscal: entregadores PJ com pendente > R$500 no mês atual
  const now = new Date();
  const rangeFromIso = format(startOfMonth(now), "yyyy-MM-dd");
  const rangeToIso = format(endOfMonth(now), "yyyy-MM-dd");
  const { data: pjAlerts = [] } = useQuery({
    queryKey: ["financeiro-pj-alerts", empresaId, rangeFromIso, rangeToIso],
    queryFn: async () => {
      const sb = supabase as any;
      const { data: ofs } = await sb.from("ofertas")
        .select("id, entregador_id, valor, status, data_trabalho")
        .eq("empresa_id", empresaId)
        .in("status", ["completed", "closed"])
        .gte("data_trabalho", rangeFromIso)
        .lte("data_trabalho", rangeToIso);
      const ofertas = (ofs ?? []) as Array<{ id: string; entregador_id: string | null; valor: number }>;
      const entIds = Array.from(new Set(ofertas.map(o => o.entregador_id).filter(Boolean))) as string[];
      if (!entIds.length) return [];
      const { data: ents } = await sb.from("entregadores")
        .select("id, nome_completo, cnpj, tipo_pessoa").in("id", entIds);
      const pjIds = new Set(
        (ents ?? [])
          .filter((e: any) => e.tipo_pessoa === "pj" || (e.cnpj && String(e.cnpj).trim().length > 0))
          .map((e: any) => e.id as string)
      );
      const nameById = new Map<string, string>((ents ?? []).map((e: any) => [e.id, e.nome_completo]));
      if (!pjIds.size) return [];

      // pagamentos for these PJ entregadores from this empresa
      const { data: pgs } = await sb.from("pagamentos")
        .select("entregador_id, ofertas_ids, nf_numero")
        .eq("empresa_id", empresaId)
        .in("entregador_id", Array.from(pjIds));
      const paidOfertaIds = new Set<string>();
      const nfByOferta = new Map<string, string | null>();
      (pgs ?? []).forEach((p: any) => {
        (p.ofertas_ids ?? []).forEach((oid: string) => {
          paidOfertaIds.add(oid);
          nfByOferta.set(oid, p.nf_numero ?? null);
        });
      });

      const pendingByEnt = new Map<string, number>();
      ofertas.forEach(o => {
        if (!o.entregador_id || !pjIds.has(o.entregador_id)) return;
        // "sem NF" = pagamento existe mas sem nf_numero, OU pagamento ainda não gerado
        const hasNf = paidOfertaIds.has(o.id) && !!nfByOferta.get(o.id);
        if (!hasNf) {
          pendingByEnt.set(o.entregador_id, (pendingByEnt.get(o.entregador_id) ?? 0) + Number(o.valor || 0));
        }
      });
      return Array.from(pendingByEnt.entries())
        .map(([id, valor]) => ({ id, nome: nameById.get(id) ?? "Entregador", valor }))
        .sort((a, b) => b.valor - a.valor);
    },
  });
  const pjAlertTotal = pjAlerts.reduce((s: number, p: any) => s + p.valor, 0);

  const allCategorias = useMemo(
    () => Array.from(new Set([...CATEGORIAS.entrada, ...CATEGORIAS.saida])),
    [],
  );

  const deleteMut = useMutation({
    mutationFn: async (l: Lancamento) => {
      if (l.comprovante_url) {
        const idx = l.comprovante_url.indexOf("/financeiro-comprovantes/");
        if (idx >= 0) {
          const path = l.comprovante_url.substring(idx + "/financeiro-comprovantes/".length);
          await supabase.storage.from("financeiro-comprovantes").remove([path]);
        }
      }
      const { error } = await supabase.from("financeiro_lancamentos").delete().eq("id", l.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento excluído");
      qc.invalidateQueries({ queryKey: ["financeiro", empresaId] });
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  function handleExport() {
    const headers = ["Data", "Tipo", "Categoria", "Descrição", "Valor"];
    const rows: (string | number)[][] = lancamentosFiltrados.map((l) => [
      format(new Date(l.data_lancamento + "T00:00"), "dd/MM/yyyy"),
      l.tipo === "entrada" ? "Entrada" : "Saída",
      l.categoria,
      l.descricao ?? "",
      Number(l.valor),
    ]);
    rows.push(["", "", "", "", ""]);
    rows.push(["", "", "", "Total Entradas", totalEntradas]);
    rows.push(["", "", "", "Total Saídas", totalSaidas]);
    rows.push(["", "", "", "Saldo", saldo]);
    exportToExcel(`financeiro-${format(range.from, "yyyy-MM-dd")}_${format(range.to, "yyyy-MM-dd")}`, headers, rows);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Financeiro"
        description="Controle suas entradas e saídas"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={lancamentos.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
            <Button onClick={() => { setEditing(null); setOpenDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo lançamento
            </Button>
          </div>
        }
      />

      {/* Alertas fiscais — PJ com pendência > R$500 */}
      {pjAlerts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                ⚠️ {pjAlerts.length} entregador{pjAlerts.length > 1 ? "es" : ""} PJ com NF pendente — valor total: {brl(pjAlertTotal)}
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Pagamentos pendentes acima de R$ 500,00 no mês atual.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowPjList(true)}>
              Ver lista
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <SummaryCard
          label="Total Entradas"
          value={brl(totalEntradas)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="green"
        />
        <SummaryCard
          label="Total Saídas"
          value={brl(totalSaidas)}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="red"
        />
        <SummaryCard
          label="Saldo"
          value={brl(saldo)}
          icon={<Wallet className="h-5 w-5" />}
          tone={saldo < 0 ? "red" : "blue"}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Período</Label>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="este_mes">Este mês</SelectItem>
                <SelectItem value="mes_passado">Mês passado</SelectItem>
                <SelectItem value="ultimos_3">Últimos 3 meses</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodo === "personalizado" && (
            <div className="md:col-span-1">
              <Label className="text-xs">Intervalo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {custom.from
                      ? `${format(custom.from, "dd/MM")} – ${custom.to ? format(custom.to, "dd/MM") : "?"}`
                      : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: custom.from, to: custom.to }}
                    onSelect={(r) => setCustom({ from: r?.from, to: r?.to })}
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {allCategorias.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico diário */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Entradas vs Saídas por dia</p>
            {dayFilter && (
              <Button size="sm" variant="ghost" onClick={() => setDayFilter(null)}>
                Limpar filtro de dia ({format(new Date(dayFilter + "T00:00"), "dd/MM")})
              </Button>
            )}
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} onClick={(e: any) => {
                const p = e?.activePayload?.[0]?.payload;
                if (p?.date) setDayFilter(prev => prev === p.date ? null : p.date);
              }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(v: any) => brl(Number(v))}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill="hsl(142 71% 45%)" cursor="pointer" />
                <Bar dataKey="saidas" name="Saídas" fill="hsl(0 72% 51%)" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lancamentosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              {dayFilter ? "Nenhum lançamento neste dia" : "Nenhum lançamento no período"}
            </div>
          ) : (
            <ul className="divide-y">
              {lancamentosFiltrados.map((l) => (
                <li key={l.id} className="p-4 flex items-center gap-3 hover:bg-muted/40">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    l.tipo === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                  )}>
                    {l.tipo === "entrada"
                      ? <ArrowUpCircle className="h-5 w-5" />
                      : <ArrowDownCircle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{l.categoria}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(l.data_lancamento + "T00:00"), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      {l.comprovante_url && (
                        <a
                          href={l.comprovante_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          comprovante
                        </a>
                      )}
                    </div>
                    {l.descricao && (
                      <p className="text-sm text-foreground/80 truncate mt-0.5">{l.descricao}</p>
                    )}
                  </div>
                  <div className={cn(
                    "font-semibold tabular-nums whitespace-nowrap",
                    l.tipo === "entrada" ? "text-green-600" : "text-red-600",
                  )}>
                    {l.tipo === "entrada" ? "+" : "−"} {brl(Number(l.valor))}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setOpenDialog(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(l)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LancamentoDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        empresaId={empresaId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["financeiro", empresaId] })}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMut.mutate(toDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPjList} onOpenChange={setShowPjList}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entregadores PJ com NF pendente</DialogTitle>
            <DialogDescription>
              Pagamentos pendentes acima de R$ 500 no mês atual.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y max-h-80 overflow-auto">
            {pjAlerts.map((p: any) => (
              <li key={p.id} className="py-2 flex justify-between items-center">
                <span className="text-sm truncate">{p.nome}</span>
                <span className="font-semibold text-amber-700 tabular-nums">{brl(p.valor)}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <div className="flex w-full justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold">{brl(pjAlertTotal)}</span>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}

function SummaryCard({
  label, value, icon, tone,
}: {
  label: string; value: string; icon: React.ReactNode;
  tone: "green" | "red" | "blue";
}) {
  const map = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  } as const;
  return (
    <Card className={cn("border", map[tone])}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center bg-white/70")}>
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============== Dialog criar/editar ============== */

const formSchema = z.object({
  tipo: z.enum(["entrada", "saida"]),
  categoria: z.string().min(1, "Selecione uma categoria"),
  descricao: z.string().max(500).optional().or(z.literal("")),
  valor: z.number({ invalid_type_error: "Informe o valor" }).positive("Valor deve ser maior que 0"),
  data_lancamento: z.date({ required_error: "Selecione a data" }),
  entregador_id: z.string().nullable().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function parseBRLInput(s: string): number {
  const clean = s.replace(/[^\d]/g, "");
  if (!clean) return 0;
  return Number(clean) / 100;
}

function LancamentoDialog({
  open, onOpenChange, empresaId, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaId: string;
  editing: Lancamento | null;
  onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [entSearch, setEntSearch] = useState("");

  const {
    register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: "entrada",
      categoria: "",
      descricao: "",
      valor: 0,
      data_lancamento: new Date(),
      entregador_id: null,
    },
  });

  const tipo = watch("tipo");
  const valor = watch("valor");
  const data = watch("data_lancamento");
  const categoria = watch("categoria");
  const entregadorId = watch("entregador_id");

  // Carrega entregadores quando categoria for "Pagamento a entregadores"
  const { data: entregadoresList = [] } = useQuery({
    queryKey: ["entregadores-empresa", empresaId],
    queryFn: async () => {
      const sb = supabase as any;
      // pega entregadores que já trabalharam com a empresa
      const { data: ofs } = await sb.from("ofertas")
        .select("entregador_id").eq("empresa_id", empresaId).not("entregador_id", "is", null);
      const ids = Array.from(new Set((ofs ?? []).map((o: any) => o.entregador_id))) as string[];
      if (!ids.length) return [] as { id: string; nome: string; tipo_pessoa: string | null }[];
      const { data: ents } = await sb.from("entregadores")
        .select("id, nome_completo, tipo_pessoa, cnpj").in("id", ids);
      return (ents ?? []).map((e: any) => ({
        id: e.id, nome: e.nome_completo,
        tipo_pessoa: e.tipo_pessoa ?? (e.cnpj ? "pj" : "pf"),
      }));
    },
    enabled: open && categoria === CAT_PAGAMENTO_ENTREGADOR,
  });

  const entregadoresFiltrados = useMemo(() =>
    entregadoresList.filter((e: any) =>
      e.nome.toLowerCase().includes(entSearch.toLowerCase())
    ).slice(0, 20),
    [entregadoresList, entSearch],
  );

  // reset on open
  useMemo(() => {
    if (!open) return;
    if (editing) {
      reset({
        tipo: editing.tipo,
        categoria: editing.categoria,
        descricao: editing.descricao ?? "",
        valor: Number(editing.valor),
        data_lancamento: new Date(editing.data_lancamento + "T00:00"),
        entregador_id: editing.entregador_id ?? null,
      });
    } else {
      reset({
        tipo: "entrada", categoria: "", descricao: "", valor: 0,
        data_lancamento: new Date(), entregador_id: null,
      });
    }
    setFile(null);
    setEntSearch("");
  }, [open, editing, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      let comprovante_url = editing?.comprovante_url ?? null;
      if (file) {
        setUploading(true);
        const ext = file.name.split(".").pop() || "bin";
        const path = `${empresaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("financeiro-comprovantes")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("financeiro-comprovantes")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        comprovante_url = signed?.signedUrl ?? null;
        setUploading(false);
      }

      const payload = {
        empresa_id: empresaId,
        tipo: values.tipo,
        categoria: values.categoria,
        descricao: values.descricao || null,
        valor: values.valor,
        data_lancamento: format(values.data_lancamento, "yyyy-MM-dd"),
        comprovante_url,
        entregador_id: values.categoria === CAT_PAGAMENTO_ENTREGADOR ? (values.entregador_id ?? null) : null,
      };

      if (editing) {
        const { error } = await (supabase as any)
          .from("financeiro_lancamentos")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Lançamento atualizado");
      } else {
        const { error } = await (supabase as any).from("financeiro_lancamentos").insert(payload);
        if (error) throw error;
        toast.success("Lançamento criado");
      }

      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      setUploading(false);
      toast.error(e.message ?? "Erro ao salvar");
    }
  };

  const categoriasDisponiveis = CATEGORIAS[tipo];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>Registre uma entrada ou saída financeira.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Toggle Entrada / Saída */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setValue("tipo", "entrada"); setValue("categoria", ""); }}
              className={cn(
                "p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition",
                tipo === "entrada"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-muted text-muted-foreground hover:border-green-300",
              )}
            >
              <ArrowUpCircle className="h-5 w-5" /> Entrada
            </button>
            <button
              type="button"
              onClick={() => { setValue("tipo", "saida"); setValue("categoria", ""); }}
              className={cn(
                "p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition",
                tipo === "saida"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-muted text-muted-foreground hover:border-red-300",
              )}
            >
              <ArrowDownCircle className="h-5 w-5" /> Saída
            </button>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setValue("categoria", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categoriasDisponiveis.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoria && <p className="text-xs text-red-600 mt-1">{errors.categoria.message}</p>}
          </div>

          {tipo === "saida" && categoria === CAT_PAGAMENTO_ENTREGADOR && (
            <div>
              <Label>Entregador</Label>
              <Input
                placeholder="Buscar por nome..."
                value={entSearch}
                onChange={(e) => setEntSearch(e.target.value)}
              />
              <div className="mt-2 max-h-40 overflow-auto rounded border divide-y">
                {entregadoresFiltrados.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">Nenhum entregador encontrado</p>
                ) : entregadoresFiltrados.map((e: any) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => setValue("entregador_id", e.id, { shouldValidate: true })}
                    className={cn(
                      "w-full text-left p-2 text-sm hover:bg-muted/50 flex items-center justify-between",
                      entregadorId === e.id && "bg-primary/10"
                    )}
                  >
                    <span className="truncate">{e.nome}</span>
                    <Badge variant="outline" className="text-[10px] ml-2">
                      {e.tipo_pessoa === "pj" ? "PJ" : "PF"}
                    </Badge>
                  </button>
                ))}
              </div>
              {entregadorId && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Selecionado: {entregadoresList.find((e: any) => e.id === entregadorId)?.nome ?? "—"}
                </p>
              )}
            </div>
          )}

          <div>
            <Label>Valor</Label>
            <Input
              inputMode="numeric"
              value={brl(valor || 0)}
              onChange={(e) => setValue("valor", parseBRLInput(e.target.value), { shouldValidate: true })}
            />
            {errors.valor && <p className="text-xs text-red-600 mt-1">{errors.valor.message}</p>}
          </div>

          <div>
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {data ? format(data, "PPP", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(d) => d && setValue("data_lancamento", d, { shouldValidate: true })}
                  locale={ptBR}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.data_lancamento && (
              <p className="text-xs text-red-600 mt-1">{errors.data_lancamento.message}</p>
            )}
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea {...register("descricao")} rows={2} placeholder="Detalhes do lançamento" />
          </div>

          <div>
            <Label>Comprovante (PDF ou imagem)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <Upload className="h-4 w-4 text-green-600" />}
            </div>
            {editing?.comprovante_url && !file && (
              <a
                href={editing.comprovante_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline mt-1 inline-block"
              >
                Ver comprovante atual
              </a>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {(isSubmitting || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
