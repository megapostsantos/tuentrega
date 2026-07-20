import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Download, AlertTriangle, Truck } from "lucide-react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadSaidasCsv, type SaidaExportRow } from "@/lib/nex-export";

export const Route = createFileRoute("/_authenticated/nex/saidas")({
  component: SaidasNexPage,
});

type Motorista = { id: string; nome: string; placa: string | null; ativo: boolean };
type Saida = {
  id: string;
  data_saida: string;
  motorista_id: string | null;
  qr_saca: string;
  codigo_nx: string;
  hora_saida: string | null;
  status: string;
  motorista?: Motorista | null;
  insucessos_count?: number;
};

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function SaidasNexPage() {
  const { role, loading } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [busy, setBusy] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [insucessoTarget, setInsucessoTarget] = useState<Saida | null>(null);

  async function refresh() {
    setBusy(true);
    const [{ data: sd }, { data: md }] = await Promise.all([
      (supabase as any)
        .from("saidas_nex")
        .select("*, motorista:motoristas_nex(id,nome,placa,ativo), insucessos_nex(id)")
        .eq("data_saida", date)
        .order("hora_saida", { ascending: false }),
      (supabase as any).from("motoristas_nex").select("id,nome,placa,ativo").eq("ativo", true).order("nome"),
    ]);
    setSaidas(
      ((sd ?? []) as any[]).map((s) => ({
        ...s,
        insucessos_count: (s.insucessos_nex ?? []).length,
      })),
    );
    setMotoristas((md as Motorista[]) ?? []);
    setBusy(false);
  }

  useEffect(() => {
    if (role === "admin" || role === "empresa") refresh();
  }, [role, date]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "admin" && role !== "empresa") {
    return (
      <div className="p-6">
        <PageHeader title="Saídas do dia" description="Registro de saídas NEX" />
        <EmptyModule icon={Truck} title="Acesso restrito" description="Apenas admin ou empresa." />
      </div>
    );
  }

  function exportCsv() {
    const rows: SaidaExportRow[] = saidas.map((s) => ({
      data_saida: s.data_saida,
      motorista: s.motorista?.nome ?? "—",
      placa: s.motorista?.placa ?? "—",
      qr_saca: s.qr_saca,
      codigo_nx: s.codigo_nx,
      hora_saida: s.hora_saida ?? "",
      status: s.status,
      qtd_insucessos: s.insucessos_count ?? 0,
    }));
    downloadSaidasCsv(rows, `nex-saidas-${date}.csv`);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Saídas do dia" description="Registro de saídas do serviço NEX" />
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label>Data</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={saidas.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-2" /> Registrar saída
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Saídas em {date}</CardTitle></CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : saidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma saída registrada nesta data.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motorista</TableHead>
                    <TableHead>QR Saca</TableHead>
                    <TableHead>Código NX</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Insucessos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saidas.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.motorista?.nome ?? "—"}
                        {s.motorista?.placa ? <span className="text-xs text-muted-foreground"> · {s.motorista.placa}</span> : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.qr_saca}</TableCell>
                      <TableCell className="font-mono text-xs">{s.codigo_nx}</TableCell>
                      <TableCell>{s.hora_saida?.slice(0, 5) ?? "—"}</TableCell>
                      <TableCell>{s.insucessos_count ?? 0}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell className="text-right">
                        {s.status !== "finalizado" && (
                          <Button variant="outline" size="sm" onClick={() => setInsucessoTarget(s)}>
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Insucessos
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NovaSaidaDialog
        open={openNew}
        onClose={() => setOpenNew(false)}
        motoristas={motoristas}
        onDone={() => { setOpenNew(false); refresh(); }}
        date={date}
      />
      <InsucessosDialog
        saida={insucessoTarget}
        onClose={() => setInsucessoTarget(null)}
        onDone={() => { setInsucessoTarget(null); refresh(); }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "saiu") return <Badge className="bg-blue-100 text-blue-800">Saiu</Badge>;
  if (status === "retornou_insucessos") return <Badge className="bg-amber-100 text-amber-800">Retornou c/ insucessos</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800">Finalizado</Badge>;
}

function NovaSaidaDialog({
  open, onClose, motoristas, onDone, date,
}: {
  open: boolean; onClose: () => void; motoristas: Motorista[]; onDone: () => void; date: string;
}) {
  const [motoristaId, setMotoristaId] = useState<string>("");
  const [qrSaca, setQrSaca] = useState("");
  const [codigoNx, setCodigoNx] = useState("");
  const [hora, setHora] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMotoristaId(""); setQrSaca(""); setCodigoNx("");
      setHora(new Date().toTimeString().slice(0, 5));
    }
  }, [open]);

  async function submit() {
    if (!motoristaId) { toast.error("Selecione o motorista"); return; }
    if (!qrSaca.trim() || !codigoNx.trim()) { toast.error("Preencha QR da saca e código NX"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("saidas_nex").insert({
      data_saida: date,
      motorista_id: motoristaId,
      qr_saca: qrSaca.trim(),
      codigo_nx: codigoNx.trim(),
      hora_saida: hora,
      status: "saiu",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saída registrada");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrar saída</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Motorista</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {motoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}{m.placa ? ` · ${m.placa}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>QR da saca</Label>
            <Input value={qrSaca} onChange={(e) => setQrSaca(e.target.value)} placeholder="Digite ou bipe o QR" />
          </div>
          <div className="grid gap-1.5">
            <Label>Código NX</Label>
            <Input value={codigoNx} onChange={(e) => setCodigoNx(e.target.value)} placeholder="ex: NX-1234" />
          </div>
          <div className="grid gap-1.5">
            <Label>Hora de saída</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InsucessosDialog({ saida, onClose, onDone }: { saida: Saida | null; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<{ id: string; qr_pacote: string; motivo: string | null }[]>([]);
  const [qr, setQr] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saida) return;
    (async () => {
      setBusy(true);
      const { data } = await (supabase as any)
        .from("insucessos_nex")
        .select("id, qr_pacote, motivo")
        .eq("saida_id", saida.id)
        .order("registrado_em");
      setRows(data ?? []);
      setBusy(false);
    })();
  }, [saida]);

  if (!saida) return null;

  async function add() {
    if (!qr.trim()) return;
    const { data, error } = await (supabase as any).from("insucessos_nex").insert({
      saida_id: saida!.id,
      qr_pacote: qr.trim(),
      motivo: motivo.trim() || null,
    }).select("id, qr_pacote, motivo").single();
    if (error) { toast.error(error.message); return; }
    setRows((r) => [...r, data]);
    setQr(""); setMotivo("");
    // ensure saida is marked as retornou_insucessos if it was still 'saiu'
    if (saida!.status === "saiu") {
      await (supabase as any).from("saidas_nex").update({ status: "retornou_insucessos" }).eq("id", saida!.id);
    }
  }

  async function finalizar() {
    setSaving(true);
    const { error } = await (supabase as any).from("saidas_nex").update({ status: "finalizado" }).eq("id", saida!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saída finalizada");
    onDone();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insucessos — {saida.motorista?.nome ?? "motorista"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input placeholder="QR do pacote" value={qr} onChange={(e) => setQr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Input placeholder="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <Button onClick={add}>Adicionar</Button>
          </div>
          <div className="border rounded-md max-h-64 overflow-y-auto">
            {busy ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">Nenhum insucesso registrado.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.id} className="px-3 py-2 text-sm flex justify-between">
                    <span className="font-mono">{r.qr_pacote}</span>
                    <span className="text-muted-foreground">{r.motivo ?? ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={finalizar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finalizar saída"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
