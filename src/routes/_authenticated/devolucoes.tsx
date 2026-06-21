import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, RotateCcw, X, AlertTriangle, TrendingUp, DollarSign, PackageOpen, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { notifyDestinatarioPacote } from "@/lib/whatsapp-notify";

export const Route = createFileRoute("/_authenticated/devolucoes")({
  component: DevolucoesPage,
});

const PROBLEM_STATUSES = ["devolvido", "problema"];

type Pacote = {
  id: string;
  oferta_id: string;
  numero_pacote: number;
  endereco_entrega: string | null;
  destinatario_nome: string | null;
  destinatario_telefone: string | null;
  motivo_nao_entrega: string | null;
  tentativas: number | null;
  status: string;
  updated_at: string;
  instrucoes_especiais: string | null;
};

type OfertaInfo = {
  id: string;
  titulo: string | null;
  data_trabalho: string | null;
  operacao_id: string | null;
  valor_por_pacote: number | null;
};

type Operacao = {
  id: string | null;
  data_operacao: string | null;
  total_pacotes: number | null;
};

function DevolucoesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [ofertas, setOfertas] = useState<Record<string, OfertaInfo>>({});
  const [operacoes, setOperacoes] = useState<Record<string, Operacao>>({});
  const [openOps, setOpenOps] = useState<Array<{ id: string; data_operacao: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [reagPacote, setReagPacote] = useState<Pacote | null>(null);
  const [reagDate, setReagDate] = useState<Date | undefined>(undefined);
  const [reagObs, setReagObs] = useState("");
  const [reagNotify, setReagNotify] = useState(true);
  const [reagOpId, setReagOpId] = useState<string>("new");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  async function load() {
    if (!user?.id) return;
    setLoading(true);
    const sb = supabase as any;
    const { data: ofs } = await sb.from("ofertas")
      .select("id, titulo, data_trabalho, operacao_id, valor_por_pacote")
      .eq("empresa_id", user.id);
    const ofMap: Record<string, OfertaInfo> = {};
    (ofs ?? []).forEach((o: OfertaInfo) => (ofMap[o.id] = o));
    setOfertas(ofMap);

    const ofIds = Object.keys(ofMap);
    if (ofIds.length === 0) { setPacotes([]); setLoading(false); return; }

    const { data: pks } = await sb.from("entregas_pacotes")
      .select("id, oferta_id, numero_pacote, endereco_entrega, destinatario_nome, destinatario_telefone, motivo_nao_entrega, tentativas, status, updated_at, instrucoes_especiais")
      .in("oferta_id", ofIds)
      .in("status", PROBLEM_STATUSES)
      .order("updated_at", { ascending: false });
    setPacotes(pks ?? []);

    const opIds = Array.from(new Set((ofs ?? []).map((o: OfertaInfo) => o.operacao_id).filter(Boolean))) as string[];
    if (opIds.length) {
      const { data: ops } = await sb.from("operacoes")
        .select("id, data_operacao, total_pacotes")
        .in("id", opIds);
      const opMap: Record<string, Operacao> = {};
      (ops ?? []).forEach((o: Operacao) => o.id && (opMap[o.id] = o));
      setOperacoes(opMap);
    }

    const { data: futureOps } = await sb.from("operacoes")
      .select("id, data_operacao")
      .eq("empresa_id", user.id)
      .gte("data_operacao", new Date().toISOString().slice(0, 10))
      .order("data_operacao", { ascending: true });
    setOpenOps((futureOps ?? []) as any);

    setLoading(false);
  }

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const doMes = pacotes.filter((p) => new Date(p.updated_at) >= monthStart);
    const total = doMes.length;
    const successOn2 = doMes.filter((p) => (p.tentativas ?? 0) >= 2 && p.status === "entregue").length;
    const tried2 = doMes.filter((p) => (p.tentativas ?? 0) >= 2).length;
    const successRate = tried2 ? Math.round((successOn2 / tried2) * 100) : 0;
    const cost = doMes.reduce((sum, p) => {
      const of = ofertas[p.oferta_id];
      return sum + Number(of?.valor_por_pacote ?? 0);
    }, 0);
    return { total, successRate, cost };
  }, [pacotes, ofertas]);

  // Group by operação
  const grouped = useMemo(() => {
    const map: Record<string, { key: string; label: string; date: string | null; items: Pacote[] }> = {};
    for (const p of pacotes) {
      const of = ofertas[p.oferta_id];
      const opId = of?.operacao_id ?? `oferta:${p.oferta_id}`;
      const date = of?.operacao_id ? operacoes[of.operacao_id]?.data_operacao ?? of.data_trabalho : of?.data_trabalho ?? null;
      const label = of?.operacao_id
        ? `Operação · ${date ? format(new Date(date + "T00:00:00"), "dd/MM/yyyy") : "—"}`
        : (of?.titulo ?? "Oferta avulsa");
      if (!map[opId]) map[opId] = { key: opId, label, date, items: [] };
      map[opId].items.push(p);
    }
    return Object.values(map).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [pacotes, ofertas, operacoes]);

  function openReagendar(p: Pacote) {
    setReagPacote(p);
    setReagDate(new Date(Date.now() + 86400000));
    setReagObs("");
    setReagNotify(!!p.destinatario_telefone);
    setReagOpId("new");
  }

  async function confirmReagendar() {
    if (!reagPacote || !reagDate || !user?.id) return;
    setSaving(true);
    const sb = supabase as any;
    const oldOf = ofertas[reagPacote.oferta_id];
    const isoDate = reagDate.toISOString().slice(0, 10);
    let targetOfertaId: string | null = null;
    let targetOperacaoId: string | null = reagOpId !== "new" ? reagOpId : null;

    try {
      if (reagOpId !== "new") {
        // attach to existing op: find an open oferta in that op or create one
        const { data: existing } = await sb.from("ofertas")
          .select("id")
          .eq("empresa_id", user.id)
          .eq("operacao_id", reagOpId)
          .in("status", ["open", "accepted"])
          .limit(1).maybeSingle();
        if (existing?.id) targetOfertaId = existing.id;
      }
      if (!targetOfertaId) {
        const { data: created, error: ofErr } = await sb.from("ofertas").insert({
          empresa_id: user.id,
          titulo: `Reagendamento ${format(reagDate, "dd/MM/yyyy")}`,
          status: "open",
          tipo: "operacao",
          tipo_entrega: oldOf?.titulo ? "rota" : "rota",
          data_trabalho: isoDate,
          quantidade_pacotes: 1,
          quantidade_paradas: 1,
          valor_por_pacote: oldOf?.valor_por_pacote ?? null,
          valor: oldOf?.valor_por_pacote ?? 0,
          operacao_id: targetOperacaoId,
        }).select("id").single();
        if (ofErr) throw ofErr;
        targetOfertaId = created.id;
      }

      const newObs = [reagPacote.instrucoes_especiais, reagObs ? `[Reagendamento ${format(reagDate, "dd/MM/yyyy")}] ${reagObs}` : null]
        .filter(Boolean).join("\n");

      const { error: upErr } = await sb.from("entregas_pacotes").update({
        oferta_id: targetOfertaId,
        status: "pendente",
        instrucoes_especiais: newObs || null,
        motivo_nao_entrega: null,
      }).eq("id", reagPacote.id);
      if (upErr) throw upErr;

      if (reagNotify && reagPacote.destinatario_telefone) {
        await notifyDestinatarioPacote(reagPacote.id, "saiu_para_entrega").catch(() => {});
      }

      toast.success("Pacote reagendado");
      setReagPacote(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao reagendar");
    } finally {
      setSaving(false);
    }
  }

  async function cancelarPacote(p: Pacote) {
    if (!confirm(`Cancelar pacote #${p.numero_pacote}?`)) return;
    const sb = supabase as any;
    const { error } = await sb.from("entregas_pacotes").update({ status: "cancelado" }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pacote cancelado");
    load();
  }

  return (
    <div className="space-y-5 p-4">
      <PageHeader title="Devoluções" description="Pacotes com problema ou devolvidos" />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={PackageOpen} tone="bg-orange-500/15 text-orange-600" label="Devoluções no mês" value={String(stats.total)} />
        <StatCard icon={TrendingUp} tone="bg-emerald-500/15 text-emerald-600" label="Sucesso na 2ª tentativa" value={`${stats.successRate}%`} />
        <StatCard icon={DollarSign} tone="bg-violet-500/15 text-violet-600" label="Custo estimado" value={stats.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Carregando...</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2 opacity-50" />
          Nenhuma devolução pendente.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.key} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                <div className="font-semibold text-sm">{g.label}</div>
                <Badge variant="outline">{g.items.length} pacote(s)</Badge>
              </div>
              <ul className="divide-y">
                {g.items.map((p) => (
                  <li key={p.id} className="p-4 flex flex-wrap items-start gap-3 justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="font-mono">#{p.numero_pacote}</span>
                        <span className="truncate">{p.destinatario_nome ?? "Destinatário não informado"}</span>
                        <Badge variant="outline" className={p.status === "devolvido" ? "bg-red-500/10 text-red-600 border-red-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}>
                          {p.status === "devolvido" ? "Devolvido" : "Com problema"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{p.endereco_entrega ?? "—"}</div>
                      {p.motivo_nao_entrega && (
                        <div className="text-xs mt-1"><span className="text-muted-foreground">Motivo: </span>{p.motivo_nao_entrega}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.tentativas ?? 0} tentativa(s) · última em {format(new Date(p.updated_at), "dd/MM/yyyy HH:mm")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openReagendar(p)}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Reagendar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => cancelarPacote(p)}>
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!reagPacote} onOpenChange={(o) => !o && setReagPacote(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reagendar pacote #{reagPacote?.numero_pacote}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !reagDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reagDate ? format(reagDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={reagDate} onSelect={setReagDate} initialFocus className="p-3 pointer-events-auto" disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Adicionar à operação</Label>
              <Select value={reagOpId} onValueChange={setReagOpId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Criar nova oferta de reagendamento</SelectItem>
                  {openOps.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      Operação {format(new Date(op.data_operacao + "T00:00:00"), "dd/MM/yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação para o entregador</Label>
              <Textarea rows={3} value={reagObs} onChange={(e) => setReagObs(e.target.value)} placeholder="Ex: tentar após 14h, ligar antes..." />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={reagNotify} onCheckedChange={(v) => setReagNotify(!!v)} disabled={!reagPacote?.destinatario_telefone} />
              Notificar destinatário via WhatsApp
              {!reagPacote?.destinatario_telefone && <span className="text-xs text-muted-foreground">(sem telefone cadastrado)</span>}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReagPacote(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={confirmReagendar} disabled={!reagDate || saving}>{saving ? "Salvando..." : "Confirmar reagendamento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 elev-1">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}
