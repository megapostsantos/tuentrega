import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Download, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadSaidasCsv, type SaidaExportRow } from "@/lib/nex-export";

export const Route = createFileRoute("/_authenticated/nex/historico")({
  component: HistoricoNexPage,
});

type Entregador = { id: string; nome_completo: string | null; placa: string | null };
type Row = {
  id: string;
  data_saida: string;
  qr_saca: string;
  codigo_nx: string;
  hora_saida: string | null;
  status: string;
  entregador: Entregador | null;
  insucessos_count: number;
};

function HistoricoNexPage() {
  const { role, loading } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entregadorId, setEntregadorId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadEntregadores() {
    const { data } = await (supabase as any).from("entregadores").select("id,nome_completo,placa").order("nome_completo");
    setEntregadores(data ?? []);
  }
  async function refresh() {
    setBusy(true);
    let q = (supabase as any)
      .from("saidas_nex")
      .select("*, entregador:entregadores(id,nome_completo,placa), insucessos_nex(id)")
      .order("data_saida", { ascending: false })
      .order("hora_saida", { ascending: false })
      .limit(500);
    if (from) q = q.gte("data_saida", from);
    if (to) q = q.lte("data_saida", to);
    if (entregadorId !== "all") q = q.eq("entregador_id", entregadorId);
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setRows(((data ?? []) as any[]).map((s) => ({ ...s, insucessos_count: (s.insucessos_nex ?? []).length })));
    setBusy(false);
  }
  useEffect(() => {
    if (role === "admin" || role === "empresa") { loadEntregadores(); refresh(); }
  }, [role]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "admin" && role !== "empresa") {
    return (
      <div className="p-6">
        <PageHeader title="Histórico NEX" description="Histórico de saídas NEX" />
        <EmptyModule icon={Truck} title="Acesso restrito" description="Apenas admin ou empresa." />
      </div>
    );
  }

  function exportCsv() {
    const csvRows: SaidaExportRow[] = rows.map((s) => ({
      data_saida: s.data_saida,
      motorista: s.entregador?.nome_completo ?? "—",
      placa: s.entregador?.placa ?? "—",
      qr_saca: s.qr_saca,
      codigo_nx: s.codigo_nx,
      hora_saida: s.hora_saida ?? "",
      status: s.status,
      qtd_insucessos: s.insucessos_count ?? 0,
    }));
    downloadSaidasCsv(csvRows, `nex-historico.csv`);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Histórico NEX" description="Todas as saídas NEX com filtros" />
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label>De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="grid gap-1.5 min-w-[160px]">
          <Label>Entregador</Label>
          <Select value={entregadorId} onValueChange={setEntregadorId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {entregadores.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome_completo ?? "Sem nome"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5 min-w-[140px]">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="saiu">Saiu</SelectItem>
              <SelectItem value="retornou_insucessos">Retornou c/ insucessos</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={refresh}>Aplicar filtros</Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Saídas</CardTitle></CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Entregador</TableHead>
                    <TableHead>QR Saca</TableHead>
                    <TableHead>Código NX</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Insucessos</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.data_saida}</TableCell>
                      <TableCell>
                        {s.entregador?.nome_completo ?? "—"}
                        {s.entregador?.placa ? <span className="text-xs text-muted-foreground"> · {s.entregador.placa}</span> : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.qr_saca}</TableCell>
                      <TableCell className="font-mono text-xs">{s.codigo_nx}</TableCell>
                      <TableCell>{s.hora_saida?.slice(0, 5) ?? "—"}</TableCell>
                      <TableCell>{s.insucessos_count}</TableCell>
                      <TableCell>
                        {s.status === "saiu" ? <Badge className="bg-blue-100 text-blue-800">Saiu</Badge>
                          : s.status === "retornou_insucessos" ? <Badge className="bg-amber-100 text-amber-800">Retornou</Badge>
                          : <Badge className="bg-emerald-100 text-emerald-800">Finalizado</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
