import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart3, Download, TrendingUp, Package, DollarSign, CheckCircle2, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { exportToExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/metricas")({
  component: MetricasPage,
});

type Periodo = "este_mes" | "mes_passado" | "ultimos_3" | "ultimos_6";

function periodRange(p: Periodo) {
  const now = new Date();
  if (p === "este_mes") return { from: startOfMonth(now), to: endOfMonth(now) };
  if (p === "mes_passado") {
    const d = subMonths(now, 1);
    return { from: startOfMonth(d), to: endOfMonth(d) };
  }
  if (p === "ultimos_3") return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
  return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) };
}

const brl = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MetricasPage() {
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
  return <MetricasEmpresa empresaId={user.id} />;
}

function MetricasEmpresa({ empresaId }: { empresaId: string }) {
  const [periodo, setPeriodo] = useState<Periodo>("este_mes");
  const range = useMemo(() => periodRange(periodo), [periodo]);

  const { data: ofertas = [], isLoading } = useQuery({
    queryKey: ["metricas", empresaId, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ofertas")
        .select("id, titulo, data_trabalho, status, valor, quantidade_pacotes, entregador_id, payment_status, created_at")
        .eq("empresa_id", empresaId)
        .gte("data_trabalho", format(range.from, "yyyy-MM-dd"))
        .lte("data_trabalho", format(range.to, "yyyy-MM-dd"))
        .order("data_trabalho", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const totalOfertas = ofertas.length;
    const concluidas = ofertas.filter((o: any) => o.status === "completed").length;
    const totalPacotes = ofertas.reduce((s: number, o: any) => s + Number(o.quantidade_pacotes || 0), 0);
    const totalGasto = ofertas.reduce((s: number, o: any) => s + Number(o.valor || 0), 0);
    const taxaConclusao = totalOfertas > 0 ? Math.round((concluidas / totalOfertas) * 100) : 0;
    return { totalOfertas, concluidas, totalPacotes, totalGasto, taxaConclusao };
  }, [ofertas]);

  function handleExport() {
    const headers = ["Data", "Título", "Status", "Pacotes", "Valor", "Pagamento"];
    const rows: (string | number)[][] = ofertas.map((o: any) => [
      o.data_trabalho ?? "",
      o.titulo ?? "",
      o.status ?? "",
      Number(o.quantidade_pacotes || 0),
      Number(o.valor || 0),
      o.payment_status ?? "",
    ]);
    rows.push(["", "", "", "", "", ""]);
    rows.push(["TOTAL", "", `${stats.concluidas}/${stats.totalOfertas} concluídas`, stats.totalPacotes, stats.totalGasto, ""]);
    exportToExcel(
      `metricas-${format(range.from, "yyyy-MM-dd")}_${format(range.to, "yyyy-MM-dd")}`,
      headers,
      rows,
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Métricas"
        description="Acompanhe operações, pacotes e gastos do período"
        action={
          <Button variant="outline" onClick={handleExport} disabled={ofertas.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Período</Label>
            <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="este_mes">Este mês</SelectItem>
                <SelectItem value="mes_passado">Mês passado</SelectItem>
                <SelectItem value="ultimos_3">Últimos 3 meses</SelectItem>
                <SelectItem value="ultimos_6">Últimos 6 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex items-end text-xs text-muted-foreground">
            {format(range.from, "dd MMM yyyy", { locale: ptBR })} — {format(range.to, "dd MMM yyyy", { locale: ptBR })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<BarChart3 className="h-5 w-5" />} label="Operações" value={String(stats.totalOfertas)} />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Taxa conclusão" value={`${stats.taxaConclusao}%`} />
        <Stat icon={<Package className="h-5 w-5" />} label="Pacotes" value={String(stats.totalPacotes)} />
        <Stat icon={<DollarSign className="h-5 w-5" />} label="Total gasto" value={brl(stats.totalGasto)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ofertas.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Nenhuma operação no período selecionado
            </div>
          ) : (
            <ul className="divide-y">
              {ofertas.map((o: any) => (
                <li key={o.id} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{o.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.data_trabalho} · {o.quantidade_pacotes ?? 0} pacotes · {o.status}
                    </p>
                  </div>
                  <div className="font-semibold tabular-nums whitespace-nowrap">
                    {brl(Number(o.valor || 0))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
