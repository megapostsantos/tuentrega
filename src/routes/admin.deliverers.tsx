import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, ArrowRightCircle, Pause, Play, NotebookPen, Image as ImageIcon, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setImpersonation } from "@/lib/impersonation";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/deliverers")({ component: DeliverersPage });

type Entregador = {
  id: string; nome_completo: string; cpf: string; whatsapp: string | null;
  tipo_veiculo: string | null; turnos: string[]; plataformas: string[];
  pix_tipo: string | null; pix_chave: string | null; banco: string | null;
  status: string; created_at: string; cidade: string | null;
  selfie_url: string | null; plataforma_comprovante_url: string | null;
};

function DeliverersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Entregador[]>([]);
  const [loading, setLoading] = useState(true);
  const [veiculo, setVeiculo] = useState("all");
  const [status, setStatus] = useState("all");
  const [turno, setTurno] = useState("all");
  const [cidade, setCidade] = useState("");
  const [q, setQ] = useState("");
  const [noteDialog, setNoteDialog] = useState<Entregador | null>(null);
  const [note, setNote] = useState("");
  const [imgDialog, setImgDialog] = useState<{ url: string; title: string } | null>(null);
  const [stats, setStats] = useState<Record<string, { entregas: number; receberCents: number }>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const sb = supabase as any;
    const { data } = await sb.from("entregadores")
      .select("id, nome_completo, cpf, whatsapp, tipo_veiculo, turnos, plataformas, pix_tipo, pix_chave, banco, status, created_at, cidade, selfie_url, plataforma_comprovante_url")
      .order("created_at", { ascending: false });
    setRows(data ?? []);

    const ids = (data ?? []).map((e: any) => e.id);
    if (ids.length) {
      const { data: ents } = await sb.from("entregas").select("entregador_id, valor, status").in("entregador_id", ids);
      const map: Record<string, { entregas: number; receberCents: number }> = {};
      ids.forEach((id: string) => (map[id] = { entregas: 0, receberCents: 0 }));
      (ents ?? []).forEach((e: any) => {
        if (!map[e.entregador_id]) return;
        map[e.entregador_id].entregas++;
        if (e.status === "pago") map[e.entregador_id].receberCents += Math.round(Number(e.valor) * 100);
      });
      setStats(map);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (veiculo !== "all" && r.tipo_veiculo !== veiculo) return false;
    if (status !== "all" && r.status !== status) return false;
    if (turno !== "all" && !(r.turnos ?? []).includes(turno)) return false;
    if (cidade && !(r.cidade ?? "").toLowerCase().includes(cidade.toLowerCase())) return false;
    if (q && !`${r.nome_completo} ${r.cpf}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, veiculo, status, turno, cidade, q]);

  async function changeStatus(id: string, next: "ativo" | "suspenso") {
    const sb = supabase as any;
    const { error } = await sb.from("entregadores").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    await sb.from("admin_logs").insert({ admin_id: user?.id, action: `entregador_${next}`, target: id });
    toast.success(`Entregador ${next === "ativo" ? "reativado" : "suspenso"}`);
    load();
  }

  async function saveNote() {
    if (!noteDialog || !user) return;
    const sb = supabase as any;
    const { error } = await sb.from("admin_notes").insert({
      admin_id: user.id, target_user_id: noteDialog.id, target_type: "entregador", note,
    });
    if (error) return toast.error(error.message);
    toast.success("Anotação salva");
    setNoteDialog(null); setNote("");
  }

  async function impersonate(e: Entregador) {
    if (!user) return;
    const sb = supabase as any;
    const { data, error } = await sb.from("admin_impersonations").insert({
      admin_id: user.id, target_user_id: e.id, target_type: "entregador",
    }).select("id").single();
    if (error) return toast.error(error.message);
    setImpersonation({
      targetUserId: e.id, targetType: "entregador",
      targetName: e.nome_completo,
      sessionId: data.id, adminId: user.id,
    });
    navigate({ to: "/dashboard" });
  }

  function exportCSV() {
    const headers = ["nome_completo","cpf","whatsapp","tipo_veiculo","turnos","plataformas","pix_tipo","pix_chave","banco","status","cidade","created_at","entregas","recebidoCents"];
    const csv = [headers.join(",")].concat(
      filtered.map((r) => [
        r.nome_completo, r.cpf, r.whatsapp ?? "", r.tipo_veiculo ?? "",
        (r.turnos ?? []).join("|"), (r.plataformas ?? []).join("|"),
        r.pix_tipo ?? "", r.pix_chave ?? "", r.banco ?? "",
        r.status, r.cidade ?? "", r.created_at,
        stats[r.id]?.entregas ?? 0, stats[r.id]?.receberCents ?? 0,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "entregadores.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Entregadores" description="Gerencie sua rede de entregadores PJ"
        action={<Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>} />

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar nome ou CPF..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={veiculo} onValueChange={setVeiculo}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Veículo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos veículos</SelectItem>
            <SelectItem value="walker">A pé</SelectItem>
            <SelectItem value="biker">Bicicleta</SelectItem>
            <SelectItem value="moto_eletrica">Moto elétrica</SelectItem>
            <SelectItem value="motoboy">Moto</SelectItem>
            <SelectItem value="carro">Carro</SelectItem>
            <SelectItem value="caminhao">Caminhão</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="suspenso">Suspensos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={turno} onValueChange={setTurno}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Turno" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos turnos</SelectItem>
            <SelectItem value="manha">Manhã</SelectItem>
            <SelectItem value="tarde">Tarde</SelectItem>
            <SelectItem value="noite">Noite</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Cidade..." value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-40" />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Turnos</TableHead>
              <TableHead>Plataformas</TableHead>
              <TableHead>PIX</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entregas</TableHead>
              <TableHead>Recebido</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={13} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={13} className="text-center text-sm text-muted-foreground py-8">Nenhum entregador encontrado.</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  {e.selfie_url ? (
                    <button onClick={() => setImgDialog({ url: e.selfie_url!, title: "Selfie" })}>
                      <img src={e.selfie_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    </button>
                  ) : <div className="h-9 w-9 rounded-full bg-muted" />}
                </TableCell>
                <TableCell className="font-medium">{e.nome_completo}</TableCell>
                <TableCell className="font-mono text-xs">{e.cpf}</TableCell>
                <TableCell>{e.whatsapp ?? "—"}</TableCell>
                <TableCell>{e.tipo_veiculo ?? "—"}</TableCell>
                <TableCell className="text-xs">{(e.turnos ?? []).join(", ") || "—"}</TableCell>
                <TableCell className="text-xs">{(e.plataformas ?? []).join(", ") || "—"}</TableCell>
                <TableCell className="text-xs">{e.pix_tipo ? `${e.pix_tipo}: ${e.pix_chave}` : "—"}</TableCell>
                <TableCell>{e.banco ?? "—"}</TableCell>
                <TableCell>
                  <span className={`rounded px-2 py-0.5 text-xs ${e.status === "ativo" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{e.status}</span>
                </TableCell>
                <TableCell>{stats[e.id]?.entregas ?? 0}</TableCell>
                <TableCell>{((stats[e.id]?.receberCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Entrar como" onClick={() => impersonate(e)}><ArrowRightCircle className="h-4 w-4" /></Button>
                    {e.plataforma_comprovante_url && (
                      <Button size="icon" variant="ghost" title="Ver comprovante" onClick={() => setImgDialog({ url: e.plataforma_comprovante_url!, title: "Comprovante de plataforma" })}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    {e.selfie_url && (
                      <Button size="icon" variant="ghost" title="Ver selfie" onClick={() => setImgDialog({ url: e.selfie_url!, title: "Selfie" })}>
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    )}
                    {e.status === "ativo" ? (
                      <Button size="icon" variant="ghost" title="Suspender" onClick={() => changeStatus(e.id, "suspenso")}><Pause className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="icon" variant="ghost" title="Reativar" onClick={() => changeStatus(e.id, "ativo")}><Play className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" title="Anotação" onClick={() => setNoteDialog(e)}><NotebookPen className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!noteDialog} onOpenChange={(o) => { if (!o) { setNoteDialog(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anotação sobre {noteDialog?.nome_completo}</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} />
          <DialogFooter><Button onClick={saveNote} disabled={!note.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imgDialog} onOpenChange={(o) => !o && setImgDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{imgDialog?.title}</DialogTitle></DialogHeader>
          {imgDialog && <img src={imgDialog.url} alt="" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
