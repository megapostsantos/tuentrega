import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, ArrowRightCircle, Pause, Play, NotebookPen } from "lucide-react";
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

export const Route = createFileRoute("/admin/companies")({ component: CompaniesPage });

type Empresa = {
  id: string; razao_social: string; nome_fantasia: string | null; cnpj: string;
  responsavel: string | null; whatsapp: string | null; plano: string;
  status: string; trial_ends_at: string; created_at: string;
};

function CompaniesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [planDialog, setPlanDialog] = useState<{ id: string; current: string } | null>(null);
  const [noteDialog, setNoteDialog] = useState<Empresa | null>(null);
  const [note, setNote] = useState("");
  const [stats, setStats] = useState<Record<string, { ofertas: number; entregas: number }>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const sb = supabase as any;
    const { data } = await sb.from("empresas")
      .select("id, razao_social, nome_fantasia, cnpj, responsavel, whatsapp, plano, status, trial_ends_at, created_at")
      .order("created_at", { ascending: false });
    setRows(data ?? []);

    const ids = (data ?? []).map((e: any) => e.id);
    if (ids.length) {
      const [{ data: ofs }, { data: ents }] = await Promise.all([
        sb.from("ofertas").select("empresa_id").in("empresa_id", ids),
        sb.from("entregas").select("empresa_id").in("empresa_id", ids),
      ]);
      const map: Record<string, { ofertas: number; entregas: number }> = {};
      ids.forEach((id: string) => (map[id] = { ofertas: 0, entregas: 0 }));
      (ofs ?? []).forEach((o: any) => map[o.empresa_id] && map[o.empresa_id].ofertas++);
      (ents ?? []).forEach((e: any) => map[e.empresa_id] && map[e.empresa_id].entregas++);
      setStats(map);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (plano !== "all" && r.plano !== plano) return false;
    if (status !== "all" && r.status !== status) return false;
    if (q && !`${r.razao_social} ${r.nome_fantasia} ${r.cnpj} ${r.responsavel}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, plano, status, q]);

  async function changeStatus(id: string, next: "ativo" | "suspenso") {
    const sb = supabase as any;
    const { error } = await sb.from("empresas").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    await sb.from("admin_logs").insert({ admin_id: user?.id, action: `empresa_${next}`, target: id });
    toast.success(`Empresa ${next === "ativo" ? "reativada" : "suspensa"}`);
    load();
  }

  async function changePlan(id: string, plano: string) {
    const sb = supabase as any;
    const { error } = await sb.from("empresas").update({ plano }).eq("id", id);
    if (error) return toast.error(error.message);
    await sb.from("admin_logs").insert({ admin_id: user?.id, action: "empresa_plan_change", target: id, details: { plano } });
    toast.success("Plano atualizado");
    setPlanDialog(null);
    load();
  }

  async function saveNote() {
    if (!noteDialog || !user) return;
    const sb = supabase as any;
    const { error } = await sb.from("admin_notes").insert({
      admin_id: user.id, target_user_id: noteDialog.id, target_type: "empresa", note,
    });
    if (error) return toast.error(error.message);
    toast.success("Anotação salva");
    setNoteDialog(null); setNote("");
  }

  async function impersonate(e: Empresa) {
    if (!user) return;
    const sb = supabase as any;
    const { data, error } = await sb.from("admin_impersonations").insert({
      admin_id: user.id, target_user_id: e.id, target_type: "empresa",
    }).select("id").single();
    if (error) return toast.error(error.message);
    setImpersonation({
      targetUserId: e.id, targetType: "empresa",
      targetName: e.nome_fantasia || e.razao_social,
      sessionId: data.id, adminId: user.id,
    });
    navigate({ to: "/dashboard" });
  }

  function exportCSV() {
    const headers = ["razao_social","nome_fantasia","cnpj","responsavel","whatsapp","plano","status","trial_ends_at","created_at","ofertas","entregas"];
    const csv = [headers.join(",")].concat(
      filtered.map((r) => [
        r.razao_social, r.nome_fantasia ?? "", r.cnpj, r.responsavel ?? "", r.whatsapp ?? "",
        r.plano, r.status, r.trial_ends_at, r.created_at,
        stats[r.id]?.ofertas ?? 0, stats[r.id]?.entregas ?? 0,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "empresas.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Empresas" description="Gerencie todas as empresas cadastradas"
        action={<Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>} />

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={plano} onValueChange={setPlano}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="suspenso">Suspensos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ofertas</TableHead>
              <TableHead>Entregas</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">Nenhuma empresa encontrada.</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.nome_fantasia || e.razao_social}</TableCell>
                <TableCell className="font-mono text-xs">{e.cnpj}</TableCell>
                <TableCell>{e.responsavel ?? "—"}</TableCell>
                <TableCell>{e.whatsapp ?? "—"}</TableCell>
                <TableCell><span className="rounded bg-primary/10 px-2 py-0.5 text-xs uppercase text-primary">{e.plano}</span></TableCell>
                <TableCell className="text-xs">{new Date(e.trial_ends_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>
                  <span className={`rounded px-2 py-0.5 text-xs ${e.status === "ativo" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{e.status}</span>
                </TableCell>
                <TableCell>{stats[e.id]?.ofertas ?? 0}</TableCell>
                <TableCell>{stats[e.id]?.entregas ?? 0}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Entrar como" onClick={() => impersonate(e)}><ArrowRightCircle className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Mudar plano" onClick={() => setPlanDialog({ id: e.id, current: e.plano })}>
                      <span className="text-xs font-bold">$</span>
                    </Button>
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

      <Dialog open={!!planDialog} onOpenChange={(o) => !o && setPlanDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mudar plano</DialogTitle></DialogHeader>
          {planDialog && (
            <Select defaultValue={planDialog.current} onValueChange={(v) => changePlan(planDialog.id, v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteDialog} onOpenChange={(o) => { if (!o) { setNoteDialog(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anotação sobre {noteDialog?.razao_social}</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="Escreva sua observação..." />
          <DialogFooter>
            <Button onClick={saveNote} disabled={!note.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
