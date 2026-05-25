import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Plus, Loader2, ArrowLeft, CheckCircle2, Clock, Play, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

type Previsao = {
  id: string;
  data_prevista: string;
  pacotes_estimados: number;
  rotas_estimadas: number;
  pacotes_por_rota: number;
  valor_por_pacote: number;
  veiculo_necessario: string | null;
  endereco_coleta: string | null;
  permite_cancelamento: boolean;
  cancelamento_ate: string | null;
  hora_abertura: string | null;
  status: string;
};

function AgendaPage() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "empresa") {
    return (
      <div className="p-6">
        <PageHeader title="Agenda de trabalho" description="Programe rotas previstas para a semana" />
        <EmptyModule icon={CalendarDays} title="Disponível para empresas" description="Apenas empresas podem programar previsões." />
      </div>
    );
  }
  return <EmpresaAgenda userId={user!.id} />;
}

function startOfWeek(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}
function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function dayLabel(d: Date) {
  const labels = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  return labels[(d.getDay() + 6) % 7];
}

function EmpresaAgenda({ userId }: { userId: string }) {
  const [mode, setMode] = useState<"week" | "create">("week");
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingList, setLoadingList] = useState(true);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  async function load() {
    setLoadingList(true);
    const from = ymd(days[0]); const to = ymd(days[6]);
    const sb = supabase as any;
    const { data: prevs } = await sb.from("agenda_previsoes")
      .select("*").eq("empresa_id", userId)
      .gte("data_prevista", from).lte("data_prevista", to)
      .order("data_prevista");
    setPrevisoes((prevs as Previsao[]) ?? []);

    const ids = (prevs ?? []).map((p: any) => p.id);
    if (ids.length) {
      const { data: ofs } = await sb.from("ofertas")
        .select("previsao_id, entregador_id").in("previsao_id", ids).not("entregador_id", "is", null);
      const map: Record<string, number> = {};
      (ofs ?? []).forEach((o: any) => { map[o.previsao_id] = (map[o.previsao_id] || 0) + 1; });
      setCounts(map);
    } else setCounts({});
    setLoadingList(false);
  }

  useEffect(() => { load(); }, [userId, weekStart]);

  if (mode === "create") {
    return <CreatePrevisao userId={userId} onCancel={() => setMode("week")} onDone={() => { setMode("week"); load(); }} />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Agenda de trabalho" description="Programe rotas previstas para a semana" />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setMode("create")}>
          <Plus className="mr-2 h-5 w-5" /> Programar rotas da semana
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>← Semana anterior</Button>
          <span className="text-sm font-medium">{ymd(days[0])} → {ymd(days[6])}</span>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>Próxima semana →</Button>
        </div>
      </div>

      {loadingList ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((d) => {
            const iso = ymd(d);
            const ps = previsoes.filter((p) => p.data_prevista === iso);
            return (
              <Card key={iso} className="min-h-32">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase">{dayLabel(d)} {d.getDate()}/{d.getMonth() + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {ps.length === 0 && <p className="text-muted-foreground">—</p>}
                  {ps.map((p) => {
                    const accepted = counts[p.id] || 0;
                    const today = ymd(new Date());
                    let badge: { icon: any; label: string; color: string } = { icon: CalendarDays, label: "Programada", color: "bg-slate-200 text-slate-700" };
                    if (p.status === "completed") badge = { icon: CheckCircle2, label: "Concluída", color: "bg-emerald-100 text-emerald-800" };
                    else if (p.status === "in_progress") badge = { icon: Play, label: "Em andamento", color: "bg-blue-100 text-blue-800" };
                    else if (p.data_prevista === today) badge = { icon: Clock, label: "Aberta", color: "bg-yellow-100 text-yellow-800" };
                    const Icon = badge.icon;
                    return (
                      <div key={p.id} className="rounded border p-2 space-y-1">
                        <Badge className={badge.color}><Icon className="mr-1 h-3 w-3" />{badge.label}</Badge>
                        <div className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /><strong>~{p.rotas_estimadas} rotas</strong></div>
                        <div>~{p.pacotes_estimados} pacotes</div>
                        <div>R$ {Number(p.valor_por_pacote).toFixed(2)}/pct</div>
                        <div className="text-primary font-medium">{accepted} entregador(es) aceitaram</div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreatePrevisao({ userId, onCancel, onDone }: { userId: string; onCancel: () => void; onDone: () => void }) {
  const dayNames = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [pacotes, setPacotes] = useState(500);
  const [pacotesPorRota, setPacotesPorRota] = useState(50);
  const [valorPct, setValorPct] = useState(1.8);
  const [veiculo, setVeiculo] = useState("");
  const [endereco, setEndereco] = useState("");
  const [permiteCancel, setPermiteCancel] = useState(true);
  const [cancelAte, setCancelAte] = useState("07:00");
  const [horaAbertura, setHoraAbertura] = useState("06:00");
  const [saving, setSaving] = useState(false);

  const rotasEstimadas = Math.max(1, Math.ceil(pacotes / Math.max(1, pacotesPorRota)));

  function toggleDay(i: number) {
    setSelectedDays(selectedDays.includes(i) ? selectedDays.filter((x) => x !== i) : [...selectedDays, i]);
  }

  async function save() {
    if (selectedDays.length === 0) { toast.error("Selecione ao menos um dia."); return; }
    setSaving(true);
    try {
      const wk = startOfWeek();
      const sb = supabase as any;
      for (const dayIdx of selectedDays) {
        const d = new Date(wk); d.setDate(d.getDate() + dayIdx);
        const { data: prev, error: prevErr } = await sb.from("agenda_previsoes").insert({
          empresa_id: userId,
          data_prevista: ymd(d),
          pacotes_estimados: pacotes,
          rotas_estimadas: rotasEstimadas,
          pacotes_por_rota: pacotesPorRota,
          valor_por_pacote: valorPct,
          veiculo_necessario: veiculo || null,
          endereco_coleta: endereco || null,
          permite_cancelamento: permiteCancel,
          cancelamento_ate: permiteCancel ? cancelAte : null,
          hora_abertura: horaAbertura,
          status: "scheduled",
        }).select("id").single();
        if (prevErr) throw prevErr;

        // criar placeholders de ofertas
        const valorRota = pacotesPorRota * valorPct;
        const ofRows = Array.from({ length: rotasEstimadas }, (_, i) => ({
          empresa_id: userId,
          titulo: `Rota prevista ${i + 1} - ${d.toLocaleDateString("pt-BR")}`,
          quantidade_pacotes: pacotesPorRota,
          valor: valorRota,
          valor_por_pacote: valorPct,
          status: "open",
          tipo_entrega: "package_delivery",
          veiculo_necessario: veiculo || null,
          endereco_coleta: endereco || null,
          data_trabalho: ymd(d),
          previsao_id: (prev as any).id,
          permite_cancelamento: permiteCancel,
          cancelamento_ate: permiteCancel ? cancelAte : null,
        }));
        const { error: ofErr } = await sb.from("ofertas").insert(ofRows);
        if (ofErr) throw ofErr;
      }
      toast.success(`${selectedDays.length} dia(s) programados com ${rotasEstimadas} rotas cada.`);
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
        <PageHeader title="Programar previsão" description="Crie ofertas placeholder para a semana" />
      </div>

      <Card>
        <CardHeader><CardTitle>Dias da semana</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {dayNames.map((d, i) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selectedDays.includes(i)} onCheckedChange={() => toggleDay(i)} />
                <span className="capitalize">{d}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Estimativas por dia</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Pacotes estimados por dia</Label>
              <Input type="number" min={1} value={pacotes} onChange={(e) => setPacotes(Number(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Aproximado, pode ser ajustado no dia da operação.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pacotes por rota</Label>
              <Input type="number" min={1} value={pacotesPorRota} onChange={(e) => setPacotesPorRota(Number(e.target.value) || 1)} />
              <p className="text-xs text-muted-foreground">Sistema calcula: <strong>~{rotasEstimadas} rotas por dia</strong></p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor por pacote (R$)</Label>
              <Input type="number" step="0.01" value={valorPct} onChange={(e) => setValorPct(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de veículo</Label>
              <Input value={veiculo} onChange={(e) => setVeiculo(e.target.value)} placeholder="moto, carro..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Endereço de coleta</Label>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Política de cancelamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <Switch checked={permiteCancel} onCheckedChange={setPermiteCancel} />
            <span>Permitir cancelamento do entregador</span>
          </label>
          {permiteCancel && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Cancelamento permitido até</Label>
                <Input type="time" value={cancelAte} onChange={(e) => setCancelAte(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora de início da operação</Label>
                <Input type="time" value={horaAbertura} onChange={(e) => setHoraAbertura(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : `Programar ${selectedDays.length} dia(s) × ${rotasEstimadas} rotas`}
        </Button>
      </div>
    </div>
  );
}
