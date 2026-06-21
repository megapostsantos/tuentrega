import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, ArrowRightCircle, Pause, Play, NotebookPen, Award, Bike, Car, Footprints, Truck, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { setImpersonation } from "@/lib/impersonation";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/deliverers")({ component: DeliverersPage });

type Entregador = {
  id: string; nome_completo: string; cpf: string; whatsapp: string | null;
  tipo_veiculo: string | null; status: string; created_at: string;
  cidade: string | null; selfie_url: string | null;
  reliability_score: number | null; reliability_level: string | null;
};

const PAGE_SIZE = 20;

const VEHICLE_ICONS: Record<string, { icon: any; label: string }> = {
  walker: { icon: Footprints, label: "A pé" },
  biker: { icon: Bike, label: "Bicicleta" },
  moto_eletrica: { icon: Bike, label: "Moto elétrica" },
  motoboy: { icon: Bike, label: "Moto" },
  carro: { icon: Car, label: "Carro" },
  caminhao: { icon: Truck, label: "Caminhão" },
};

const LEVEL_STYLES: Record<string, { label: string; tone: string }> = {
  diamond:   { label: "Diamond",   tone: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30" },
  gold:      { label: "Gold",      tone: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  silver:    { label: "Silver",    tone: "bg-slate-400/20 text-slate-600 border-slate-400/40" },
  bronze:    { label: "Bronze",    tone: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  at_risk:   { label: "At Risk",   tone: "bg-destructive/15 text-destructive border-destructive/30" },
  suspended: { label: "Suspended", tone: "bg-destructive/30 text-destructive border-destructive/50" },
};

function maskCPF(cpf: string) {
  const d = (cpf ?? "").replace(/\D/g, "").padStart(11, "0").slice(-11);
  return `***.***.${d.slice(6, 9)}-**`;
}

function DeliverersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Entregador[]>([]);
  const [loading, setLoading] = useState(true);
  const [veiculo, setVeiculo] = useState("all");
  const [nivel, setNivel] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [noteDialog, setNoteDialog] = useState<Entregador | null>(null);
  const [note, setNote] = useState("");
  const [imgDialog, setImgDialog] = useState<{ url: string; title: string } | null>(null);
  const [scoreDialog, setScoreDialog] = useState<Entregador | null>(null);
  const [scoreForm, setScoreForm] = useState({ evento: "", pontos: "5", descricao: "" });
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [veiculo, nivel, q]);

  async function load() {
    setLoading(true);
    const sb = supabase as any;
    const { data } = await sb.from("entregadores")
      .select("id, nome_completo, cpf, whatsapp, tipo_veiculo, status, created_at, cidade, selfie_url, reliability_score, reliability_level")
      .order("created_at", { ascending: false });
    setRows(data ?? []);

    const ids = (data ?? []).map((e: any) => e.id);
    if (ids.length) {
      const { data: ents } = await sb.from("entregas").select("entregador_id, status").in("entregador_id", ids).in("status", ["pago", "concluido", "entregue"]);
      const map: Record<string, number> = {};
      (ents ?? []).forEach((e: any) => { map[e.entregador_id] = (map[e.entregador_id] ?? 0) + 1; });
      setStats(map);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (veiculo !== "all" && r.tipo_veiculo !== veiculo) return false;
    if (nivel !== "all" && (r.reliability_level ?? "gold") !== nivel) return false;
    if (q && !`${r.nome_completo} ${r.cpf}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, veiculo, nivel, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  async function applyScore() {
    if (!scoreDialog) return;
    const pontos = parseInt(scoreForm.pontos, 10);
    if (!scoreForm.evento.trim() || Number.isNaN(pontos)) return toast.error("Preencha evento e pontos");
    const sb = supabase as any;
    const { error } = await sb.rpc("apply_reliability_event", {
      _entregador_id: scoreDialog.id,
      _evento: scoreForm.evento,
      _pontos: pontos,
      _descricao: scoreForm.descricao || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Evento aplicado");
    setScoreDialog(null);
    setScoreForm({ evento: "", pontos: "5", descricao: "" });
    load();
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
    const headers = ["nome","cpf_mascarado","veiculo","score","nivel","entregas","status","cadastro"];
    const csv = [headers.join(",")].concat(
      filtered.map((r) => [
        r.nome_completo, maskCPF(r.cpf), r.tipo_veiculo ?? "",
        r.reliability_score ?? "", r.reliability_level ?? "",
        stats[r.id] ?? 0, r.status, r.created_at,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "entregadores.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Entregadores" description={`${filtered.length} entregador(es) encontrado(s)`}
        action={<Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>} />

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={nivel} onValueChange={setNivel}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Nível" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="diamond">Diamond</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={veiculo} onValueChange={setVeiculo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Veículo" /></SelectTrigger>
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
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Nome / CPF</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Entregas</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nenhum entregador encontrado.</TableCell></TableRow>
            ) : paged.map((e) => {
              const vh = VEHICLE_ICONS[e.tipo_veiculo ?? ""] ?? { icon: Bike, label: e.tipo_veiculo ?? "—" };
              const VIcon = vh.icon;
              const lvl = LEVEL_STYLES[e.reliability_level ?? "gold"] ?? LEVEL_STYLES.gold;
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    {e.selfie_url ? (
                      <button onClick={() => setImgDialog({ url: e.selfie_url!, title: e.nome_completo })}>
                        <img src={e.selfie_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      </button>
                    ) : <div className="h-9 w-9 rounded-full bg-muted" />}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{e.nome_completo}</div>
                    <div className="font-mono text-xs text-muted-foreground">{maskCPF(e.cpf)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1"><VIcon className="h-3 w-3" />{vh.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">{e.reliability_score ?? 100}</span>
                      <Badge variant="outline" className={lvl.tone}>{lvl.label}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{stats[e.id] ?? 0}</TableCell>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <span className={`rounded px-2 py-0.5 text-xs ${e.status === "ativo" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{e.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Impersonar" onClick={() => impersonate(e)}><ArrowRightCircle className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Aplicar evento de score" onClick={() => setScoreDialog(e)}><Award className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Adicionar nota" onClick={() => setNoteDialog(e)}><NotebookPen className="h-4 w-4" /></Button>
                      {e.selfie_url && (
                        <Button size="icon" variant="ghost" title="Ver selfie" onClick={() => setImgDialog({ url: e.selfie_url!, title: e.nome_completo })}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {e.status === "ativo" ? (
                        <Button size="icon" variant="ghost" title="Suspender" onClick={() => changeStatus(e.id, "suspenso")}><Pause className="h-4 w-4" /></Button>
                      ) : (
                        <Button size="icon" variant="ghost" title="Reativar" onClick={() => changeStatus(e.id, "ativo")}><Play className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Página {page} de {totalPages} · {filtered.length} resultado(s)</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!noteDialog} onOpenChange={(o) => { if (!o) { setNoteDialog(null); setNote(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anotação sobre {noteDialog?.nome_completo}</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} />
          <DialogFooter><Button onClick={saveNote} disabled={!note.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scoreDialog} onOpenChange={(o) => { if (!o) { setScoreDialog(null); setScoreForm({ evento: "", pontos: "5", descricao: "" }); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar evento de score · {scoreDialog?.nome_completo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Evento</Label>
              <Select value={scoreForm.evento} onValueChange={(v) => {
                const preset: Record<string, string> = {
                  entrega_pontual: "5",
                  entrega_atrasada: "-5",
                  no_show: "-15",
                  reclamacao_cliente: "-10",
                  elogio_cliente: "10",
                  ajuste_manual: "0",
                };
                setScoreForm((f) => ({ ...f, evento: v, pontos: preset[v] ?? f.pontos }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrega_pontual">Entrega pontual (+5)</SelectItem>
                  <SelectItem value="elogio_cliente">Elogio do cliente (+10)</SelectItem>
                  <SelectItem value="entrega_atrasada">Entrega atrasada (-5)</SelectItem>
                  <SelectItem value="reclamacao_cliente">Reclamação do cliente (-10)</SelectItem>
                  <SelectItem value="no_show">No-show (-15)</SelectItem>
                  <SelectItem value="ajuste_manual">Ajuste manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pontos (±)</Label>
              <Input type="number" value={scoreForm.pontos} onChange={(e) => setScoreForm((f) => ({ ...f, pontos: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={scoreForm.descricao} onChange={(e) => setScoreForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Contexto / motivo..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={applyScore} disabled={!scoreForm.evento}>Aplicar</Button>
          </DialogFooter>
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
