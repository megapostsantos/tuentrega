import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Wallet, Plus, Pencil, Trash2, Upload, Loader2,
  CalendarIcon, FileText, ArrowDownCircle, ArrowUpCircle,
} from "lucide-react";
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
  created_at: string;
};

const CATEGORIAS: Record<Tipo, string[]> = {
  entrada: ["Receita de cliente", "Adiantamento", "Outros recebimentos"],
  saida: [
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

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [toDelete, setToDelete] = useState<Lancamento | null>(null);

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

  const { totalEntradas, totalSaidas, saldo } = useMemo(() => {
    let e = 0, s = 0;
    for (const l of lancamentos) {
      if (l.tipo === "entrada") e += Number(l.valor);
      else s += Number(l.valor);
    }
    return { totalEntradas: e, totalSaidas: s, saldo: e - s };
  }, [lancamentos]);

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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Financeiro"
        description="Controle suas entradas e saídas"
        action={
          <Button onClick={() => { setEditing(null); setOpenDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo lançamento
          </Button>
        }
      />

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

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Nenhum lançamento no período
            </div>
          ) : (
            <ul className="divide-y">
              {lancamentos.map((l) => (
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
    },
  });

  const tipo = watch("tipo");
  const valor = watch("valor");
  const data = watch("data_lancamento");
  const categoria = watch("categoria");

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
      });
    } else {
      reset({
        tipo: "entrada", categoria: "", descricao: "", valor: 0,
        data_lancamento: new Date(),
      });
    }
    setFile(null);
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
      };

      if (editing) {
        const { error } = await supabase
          .from("financeiro_lancamentos")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Lançamento atualizado");
      } else {
        const { error } = await supabase.from("financeiro_lancamentos").insert(payload);
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
