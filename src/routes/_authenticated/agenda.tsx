import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

type Tipo = "pagamento" | "coleta" | "oferta" | "disponibilidade" | "outro";

const TIPO_COR: Record<Tipo, string> = {
  pagamento: "#7C3AED",
  coleta: "#2563EB",
  oferta: "#16A34A",
  disponibilidade: "#FFB700",
  outro: "#6B7280",
};

const TIPO_LABEL: Record<Tipo, string> = {
  pagamento: "Pagamento",
  coleta: "Coleta",
  oferta: "Oferta",
  disponibilidade: "Disponibilidade",
  outro: "Outro",
};

type AgendaEvent = {
  id: string;
  tipo: Tipo;
  titulo: string;
  descricao?: string | null;
  inicio: Date;
  fim?: Date | null;
  cor: string;
  source: "manual" | "oferta" | "pacote" | "pagamento";
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}
function toLocalInputValue(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function AgendaPage() {
  const { user, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (role === "entregador") {
    return (
      <div className="p-6">
        <PageHeader title="Agenda" description="Disponível apenas para empresa e operadores." />
        <EmptyModule icon={CalendarDays} title="Sem acesso" description="Este módulo está oculto para entregadores." />
      </div>
    );
  }
  return <AgendaContent userId={user!.id} isAdmin={role === "admin"} />;
}

function AgendaContent({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [view, setView] = useState<"semana" | "mes">("semana");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [openNew, setOpenNew] = useState(false);
  const [filters, setFilters] = useState<Record<Tipo, boolean>>({
    pagamento: true,
    coleta: true,
    oferta: true,
    disponibilidade: true,
    outro: true,
  });

  const range = useMemo(() => {
    if (view === "semana") {
      const start = startOfWeek(cursor);
      const end = addDays(start, 7);
      return { start, end };
    }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    return { start, end };
  }, [view, cursor]);

  const eventsQ = useQuery({
    queryKey: ["agenda-events", userId, isAdmin, range.start.toISOString(), range.end.toISOString()],
    queryFn: async (): Promise<AgendaEvent[]> => {
      const sb = supabase as any;
      const startIso = range.start.toISOString();
      const endIso = range.end.toISOString();
      const startDate = range.start.toISOString().slice(0, 10);
      const endDate = range.end.toISOString().slice(0, 10);

      const eventosQ = sb
        .from("eventos_agenda")
        .select("id, tipo, titulo, descricao, data_inicio, data_fim, cor")
        .gte("data_inicio", startIso)
        .lt("data_inicio", endIso);
      if (!isAdmin) eventosQ.eq("empresa_id", userId);

      const ofertasQ = sb
        .from("ofertas")
        .select("id, titulo, data_agendada, hora_inicio, hora_fim, status, endereco_coleta")
        .not("data_agendada", "is", null)
        .gte("data_agendada", startDate)
        .lt("data_agendada", endDate);
      if (!isAdmin) ofertasQ.eq("empresa_id", userId);

      const pacotesQ = sb
        .from("entregas_pacotes")
        .select("id, codigo_pacote, endereco_entrega, data_agendada, oferta_id")
        .not("data_agendada", "is", null)
        .gte("data_agendada", startDate)
        .lt("data_agendada", endDate);

      const pagamentosQ = sb
        .from("pagamentos")
        .select("id, valor_total, data_pagamento, entregador_id, empresa_id")
        .gte("data_pagamento", startIso)
        .lt("data_pagamento", endIso);
      if (!isAdmin) pagamentosQ.eq("empresa_id", userId);

      const [ev, of, pk, pg] = await Promise.all([eventosQ, ofertasQ, pacotesQ, pagamentosQ]);

      const out: AgendaEvent[] = [];

      for (const e of ev.data ?? []) {
        out.push({
          id: `ev-${e.id}`,
          tipo: e.tipo as Tipo,
          titulo: e.titulo,
          descricao: e.descricao,
          inicio: new Date(e.data_inicio),
          fim: e.data_fim ? new Date(e.data_fim) : null,
          cor: e.cor || TIPO_COR[e.tipo as Tipo] || "#6B7280",
          source: "manual",
        });
      }

      for (const o of of.data ?? []) {
        const [y, m, d] = String(o.data_agendada).split("-").map(Number);
        const [hh, mm] = String(o.hora_inicio ?? "08:00").split(":").map(Number);
        const inicio = new Date(y, m - 1, d, hh || 8, mm || 0);
        let fim: Date | null = null;
        if (o.hora_fim) {
          const [fh, fm] = String(o.hora_fim).split(":").map(Number);
          fim = new Date(y, m - 1, d, fh || (hh || 8) + 1, fm || 0);
        }
        out.push({
          id: `of-${o.id}`,
          tipo: "oferta",
          titulo: o.titulo || "Oferta programada",
          descricao: o.endereco_coleta ?? undefined,
          inicio,
          fim,
          cor: TIPO_COR.oferta,
          source: "oferta",
        });
      }

      for (const p of pk.data ?? []) {
        const [y, m, d] = String(p.data_agendada).split("-").map(Number);
        const inicio = new Date(y, m - 1, d, 9, 0);
        out.push({
          id: `pk-${p.id}`,
          tipo: "coleta",
          titulo: `Coleta ${p.codigo_rastreio ?? ""}`.trim(),
          descricao: p.endereco ?? undefined,
          inicio,
          fim: null,
          cor: TIPO_COR.coleta,
          source: "pacote",
        });
      }

      for (const p of pg.data ?? []) {
        const [y, m, d] = String(p.data_prevista).split("-").map(Number);
        const inicio = new Date(y, m - 1, d, 10, 0);
        out.push({
          id: `pg-${p.id}`,
          tipo: "pagamento",
          titulo: `Pagamento R$ ${Number(p.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          descricao: `Status: ${p.status ?? "—"}`,
          inicio,
          fim: null,
          cor: TIPO_COR.pagamento,
          source: "pagamento",
        });
      }

      return out.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    },
  });

  const visibleEvents = (eventsQ.data ?? []).filter((e) => filters[e.tipo]);

  const createMut = useMutation({
    mutationFn: async (payload: any) => {
      const sb = supabase as any;
      const { error } = await sb.from("eventos_agenda").insert({
        ...payload,
        empresa_id: isAdmin ? payload.empresa_id ?? userId : userId,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento criado");
      qc.invalidateQueries({ queryKey: ["agenda-events"] });
      setOpenNew(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar evento"),
  });

  const goPrev = () =>
    setCursor((c) =>
      view === "semana" ? addDays(c, -7) : new Date(c.getFullYear(), c.getMonth() - 1, 1),
    );
  const goNext = () =>
    setCursor((c) =>
      view === "semana" ? addDays(c, 7) : new Date(c.getFullYear(), c.getMonth() + 1, 1),
    );
  const goToday = () => setCursor(new Date());

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="Agenda"
        description="Ofertas, coletas, pagamentos e disponibilidade em um único calendário"
        action={
          <Button onClick={() => setOpenNew(true)} className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> Novo evento
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 text-sm font-medium">
            {view === "semana"
              ? `${fmtDate(range.start)} — ${fmtDate(addDays(range.start, 6))}`
              : cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v) => setView(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-3">
        {(Object.keys(TIPO_COR) as Tipo[]).map((t) => (
          <label key={t} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filters[t]}
              onCheckedChange={(v) => setFilters((f) => ({ ...f, [t]: !!v }))}
            />
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: TIPO_COR[t] }} />
            {TIPO_LABEL[t]}
          </label>
        ))}
      </div>

      {eventsQ.isLoading ? (
        <Skeleton className="h-[560px] rounded-2xl" />
      ) : view === "semana" ? (
        <WeekGrid start={range.start} events={visibleEvents} />
      ) : (
        <MonthGrid cursor={cursor} events={visibleEvents} />
      )}

      <NewEventDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onSubmit={(payload) => createMut.mutate(payload)}
        submitting={createMut.isPending}
        userId={userId}
      />
    </div>
  );
}

function WeekGrid({ start, events }: { start: Date; events: AgendaEvent[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6..22
  const ROW_H = 44;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className="grid min-w-[860px]" style={{ gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))" }}>
        <div className="border-b border-r border-border bg-muted/40 p-2 text-xs font-medium text-muted-foreground">
          Hora
        </div>
        {days.map((d) => {
          const isToday = sameDay(d, new Date());
          return (
            <div
              key={d.toISOString()}
              className={`border-b border-r border-border p-2 text-center text-xs font-medium ${isToday ? "bg-primary/10 text-primary" : "bg-muted/40"}`}
            >
              <div className="uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</div>
              <div className="text-sm font-bold">{d.getDate().toString().padStart(2, "0")}</div>
            </div>
          );
        })}

        {hours.map((h) => (
          <>
            <div
              key={`h-${h}`}
              className="border-b border-r border-border p-1 text-[10px] text-muted-foreground"
              style={{ height: ROW_H }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
            {days.map((d) => (
              <div
                key={`c-${d.toISOString()}-${h}`}
                className="relative border-b border-r border-border"
                style={{ height: ROW_H }}
              >
                {events
                  .filter((ev) => sameDay(ev.inicio, d) && ev.inicio.getHours() === h)
                  .map((ev) => {
                    const durMin = ev.fim
                      ? Math.max(30, (ev.fim.getTime() - ev.inicio.getTime()) / 60000)
                      : 45;
                    const top = (ev.inicio.getMinutes() / 60) * ROW_H;
                    const height = Math.min(ROW_H * 4, (durMin / 60) * ROW_H);
                    return (
                      <div
                        key={ev.id}
                        title={`${ev.titulo}${ev.descricao ? " — " + ev.descricao : ""}`}
                        className="absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-1 text-[10px] font-medium text-white shadow-sm"
                        style={{ top, height, background: ev.cor }}
                      >
                        <div className="truncate">{ev.titulo}</div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </>
        ))}
      </div>
    </div>
  );
}

function MonthGrid({ cursor, events }: { cursor: Date; events: AgendaEvent[] }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const monthIdx = cursor.getMonth();

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const inMonth = d.getMonth() === monthIdx;
          const isToday = sameDay(d, new Date());
          const dayEvs = events.filter((e) => sameDay(e.inicio, d));
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[96px] border-b border-r border-border p-1.5 text-xs ${inMonth ? "" : "bg-muted/30 text-muted-foreground"}`}
            >
              <div className={`mb-1 text-[11px] font-semibold ${isToday ? "text-primary" : ""}`}>
                {d.getDate().toString().padStart(2, "0")}
              </div>
              <div className="space-y-1">
                {dayEvs.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ background: ev.cor }}
                    title={ev.titulo}
                  >
                    {ev.titulo}
                  </div>
                ))}
                {dayEvs.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{dayEvs.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewEventDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: any) => void;
  submitting: boolean;
  userId: string;
}) {
  const [tipo, setTipo] = useState<Tipo>("outro");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [inicio, setInicio] = useState(() => toLocalInputValue(new Date()));
  const [fim, setFim] = useState("");
  const [valor, setValor] = useState("");
  const [entregadorId, setEntregadorId] = useState<string>("");

  const entregadoresQ = useQuery({
    queryKey: ["agenda-entregadores"],
    enabled: open && (tipo === "pagamento" || tipo === "disponibilidade"),
    queryFn: async () => {
      const sb = supabase as any;
      const { data } = await sb.from("entregadores").select("id, nome_completo").order("nome_completo").limit(500);
      return data ?? [];
    },
  });

  const submit = () => {
    if (!titulo.trim()) return toast.error("Informe um título");
    if (!inicio) return toast.error("Informe data e hora de início");
    const payload: any = {
      tipo,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      data_inicio: new Date(inicio).toISOString(),
      data_fim: fim ? new Date(fim).toISOString() : null,
      cor: TIPO_COR[tipo],
    };
    if (tipo === "pagamento") {
      payload.valor = valor ? Number(valor) : null;
      payload.entregador_id = entregadorId || null;
    }
    if (tipo === "disponibilidade") {
      payload.entregador_id = entregadorId || null;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Coleta ML - Santos" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Início</Label>
              <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
          {tipo === "pagamento" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div>
                <Label>Entregador</Label>
                <Select value={entregadorId} onValueChange={setEntregadorId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {(entregadoresQ.data ?? []).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {tipo === "disponibilidade" && (
            <div>
              <Label>Entregador</Label>
              <Select value={entregadorId} onValueChange={setEntregadorId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(entregadoresQ.data ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting} className="bg-primary text-primary-foreground">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
