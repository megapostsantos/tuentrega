import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users, Loader2, ShieldOff, RotateCcw, Star, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/entregadores")({
  component: EntregadoresPage,
});

type Ent = {
  id: string; nome_completo: string; whatsapp: string | null; tipo_veiculo: string | null;
  status: string; reliability_score: number | null; reliability_level: string | null;
  suspended_at: string | null; suspension_reason: string | null;
};

const LEVELS: Record<string, { label: string; color: string; stars: number }> = {
  diamond: { label: "Diamond", color: "bg-cyan-100 text-cyan-800", stars: 5 },
  gold: { label: "Gold", color: "bg-yellow-100 text-yellow-800", stars: 4 },
  silver: { label: "Silver", color: "bg-slate-200 text-slate-700", stars: 3 },
  bronze: { label: "Bronze", color: "bg-orange-100 text-orange-800", stars: 2 },
  at_risk: { label: "Em risco", color: "bg-red-100 text-red-800", stars: 1 },
  suspended: { label: "Suspenso", color: "bg-destructive text-destructive-foreground", stars: 0 },
};

function EntregadoresPage() {
  const { role, loading } = useAuth();
  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "empresa" && role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader title="Entregadores" description="Gerencie sua rede de entregadores PJ" />
        <EmptyModule icon={Users} title="Acesso restrito" description="Apenas empresa ou admin." />
      </div>
    );
  }
  return <ListaEntregadores />;
}

function ListaEntregadores() {
  const [list, setList] = useState<Ent[]>([]);
  const [load, setLoad] = useState(true);
  const [detail, setDetail] = useState<Ent | null>(null);
  const [dispatcherTarget, setDispatcherTarget] = useState<Ent | null>(null);
  const [dispatcherIds, setDispatcherIds] = useState<Set<string>>(new Set());

  async function fetchList() {
    setLoad(true);
    const { data } = await (supabase as any).from("entregadores").select("*").order("nome_completo");
    setList((data as Ent[]) ?? []);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: dispData } = await (supabase as any)
        .from("dispatchers").select("entregador_id").eq("empresa_id", user.id).eq("status", "ativo");
      setDispatcherIds(new Set((dispData ?? []).map((d: any) => d.entregador_id)));
    }
    setLoad(false);
  }
  useEffect(() => { fetchList(); }, []);

  async function suspendManually(id: string) {
    const reason = prompt("Motivo da suspensão:");
    if (!reason) return;
    const { error } = await (supabase as any).from("entregadores")
      .update({ suspended_at: new Date().toISOString(), suspension_reason: reason, status: "suspenso" })
      .eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Suspenso."); fetchList(); }
  }

  async function resetScore(id: string) {
    const reason = prompt("Motivo da redefinição:");
    if (!reason) return;
    const sb = supabase as any;
    await sb.from("confiabilidade_score").upsert({ entregador_id: id, score: 100, nivel: "gold" });
    await sb.from("entregadores").update({
      reliability_score: 100, reliability_level: "gold",
      suspended_at: null, suspension_reason: null, status: "ativo",
    }).eq("id", id);
    await sb.from("confiabilidade_historico").insert({ entregador_id: id, evento: "reset", pontos: 0, descricao: reason });
    toast.success("Score redefinido.");
    fetchList();
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Entregadores" description="Score de confiabilidade e gestão" />
      <EntregadoresStats />

      <Card>
        <CardHeader><CardTitle>Lista de entregadores</CardTitle></CardHeader>
        <CardContent>
          {load ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum entregador.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((e) => {
                    const lvl = LEVELS[e.reliability_level || "gold"] || LEVELS.gold;
                    return (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetail(e)}>
                        <TableCell className="font-medium">{e.nome_completo}</TableCell>
                        <TableCell>{e.tipo_veiculo ?? "—"}</TableCell>
                        <TableCell><strong>{e.reliability_score ?? 100}</strong></TableCell>
                        <TableCell>
                          <Badge className={lvl.color}>
                            {"★".repeat(lvl.stars)}{"☆".repeat(5 - lvl.stars)} {lvl.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {e.suspended_at ? <Badge variant="destructive">Suspenso</Badge> : <Badge variant="outline">{e.status}</Badge>}
                        </TableCell>
                        <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                          {dispatcherIds.has(e.id) ? (
                            <Badge variant="outline" className="mr-1">Dispatcher</Badge>
                          ) : (
                            <Button variant="outline" size="sm" className="mr-1" onClick={() => setDispatcherTarget(e)}>
                              <UserCog className="h-3.5 w-3.5 mr-1" /> Tornar Dispatcher
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => suspendManually(e.id)}>
                            <ShieldOff className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => resetScore(e.id)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ScoreHistoryDialog ent={detail} onClose={() => setDetail(null)} />
      <DispatcherDialog
        ent={dispatcherTarget}
        onClose={() => setDispatcherTarget(null)}
        onDone={() => { setDispatcherTarget(null); fetchList(); }}
      />
    </div>
  );
}

function DispatcherDialog({ ent, onClose, onDone }: { ent: Ent | null; onClose: () => void; onDone: () => void }) {
  const [valor, setValor] = useState("2.00");
  const [plataformas, setPlataformas] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ent) { setValor("2.00"); setPlataformas(new Set()); }
  }, [ent]);

  if (!ent) return null;

  const ALL_PLATS = ["Last Mile", "iFood", "Shopee", "Lalamove", "Todas"];

  function togglePlat(p: string) {
    setPlataformas((prev) => {
      const next = new Set(prev);
      if (p === "Todas") return next.has("Todas") ? new Set() : new Set(ALL_PLATS);
      if (next.has(p)) next.delete(p); else next.add(p);
      next.delete("Todas");
      return next;
    });
  }

  async function confirm() {
    const target = ent;
    if (!target) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!Number(valor) || Number(valor) <= 0) { toast.error("Defina um valor por pacote válido."); return; }
    if (plataformas.size === 0) { toast.error("Selecione ao menos uma plataforma."); return; }
    setSaving(true);
    const sb = supabase as any;

    // 1. Add dispatcher role
    const { error: roleErr } = await sb.from("user_roles")
      .upsert({ user_id: target.id, role: "dispatcher" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    if (roleErr && !roleErr.message?.includes("duplicate")) {
      setSaving(false); toast.error("Falha ao adicionar role: " + roleErr.message); return;
    }

    const { error: dErr } = await sb.from("dispatchers").upsert({
      entregador_id: target.id,
      empresa_id: user.id,
      valor_por_pacote: Number(valor),
      plataformas: Array.from(plataformas),
      status: "ativo",
    }, { onConflict: "entregador_id,empresa_id" });
    setSaving(false);
    if (dErr) { toast.error(dErr.message); return; }
    toast.success(`${target.nome_completo} agora é Dispatcher!`);
    onDone();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tornar {ent.nome_completo} Dispatcher?</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor por pacote que você paga a ele (R$)</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="ex: 2,00" />
            <p className="text-xs text-muted-foreground">Quanto a empresa paga ao dispatcher por pacote.</p>
          </div>
          <div className="space-y-2">
            <Label>Plataformas que ele gerencia</Label>
            <div className="space-y-2">
              {ALL_PLATS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={plataformas.has(p)} onCheckedChange={() => togglePlat(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirm} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ScoreHistoryDialog({ ent, onClose }: { ent: Ent | null; onClose: () => void }) {
  const [hist, setHist] = useState<any[]>([]);
  useEffect(() => {
    if (!ent) return;
    (async () => {
      const { data } = await (supabase as any).from("confiabilidade_historico")
        .select("*").eq("entregador_id", ent.id).order("created_at", { ascending: false }).limit(50);
      setHist(data ?? []);
    })();
  }, [ent]);

  if (!ent) return null;
  const lvl = LEVELS[ent.reliability_level || "gold"] || LEVELS.gold;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{ent.nome_completo}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{ent.reliability_score ?? 100}</span>
              <Badge className={lvl.color}>{lvl.label}</Badge>
            </div>
            {ent.suspension_reason && <p className="mt-2 text-sm text-destructive">Motivo: {ent.suspension_reason}</p>}
          </div>

          <div>
            <h4 className="mb-2 font-medium text-sm">Histórico recente</h4>
            {hist.length === 0 ? <p className="text-sm text-muted-foreground">Sem eventos.</p> : (
              <ul className="space-y-1 text-sm max-h-64 overflow-y-auto">
                {hist.map((h) => (
                  <li key={h.id} className="flex items-center justify-between border-b pb-1">
                    <span>
                      <span className={`font-semibold ${h.pontos >= 0 ? "text-emerald-700" : "text-destructive"}`}>
                        {h.pontos > 0 ? "+" : ""}{h.pontos}
                      </span>{" "}
                      {h.descricao || h.evento}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
