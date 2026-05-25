import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Store, Plus, FileText, MapPin, Loader2, Clock, Package, Copy,
  Bike, Car, Truck, Footprints, Zap, Bike as Motorcycle, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CloseRouteDialog } from "@/components/CloseRouteDialog";

export const Route = createFileRoute("/_authenticated/ofertas")({
  validateSearch: (s: Record<string, unknown>) => ({ close: typeof s.close === "string" ? s.close : undefined }),
  component: OfertasPage,
});

type Oferta = {
  id: string;
  empresa_id: string;
  entregador_id: string | null;
  titulo: string;
  descricao: string | null;
  bairro: string | null;
  valor: number;
  valor_por_pacote: number | null;
  exige_nota_fiscal: boolean;
  status: string;
  tipo_entrega: string | null;
  veiculo_necessario: string | null;
  quantidade_pacotes: number | null;
  endereco_coleta: string | null;
  prazo_pagamento: string | null;
  prazo_pagamento_data: string | null;
  data_trabalho: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  expira_em: string | null;
  created_at: string;
  updated_at: string;
  pacotes_entregues: number | null;
  pacotes_nao_entregues: number | null;
  closed_at: string | null;
};

const VEHICLES = [
  { v: "andante", label: "A pé", icon: Footprints },
  { v: "bike", label: "Bike", icon: Bike },
  { v: "moto_eletrica", label: "Moto elétrica", icon: Zap },
  { v: "moto", label: "Motoboy", icon: Motorcycle },
  { v: "carro", label: "Carro", icon: Car },
  { v: "caminhao", label: "Caminhão", icon: Truck },
] as const;

const VEHICLE_MAP = Object.fromEntries(VEHICLES.map((v) => [v.v, v]));

const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberta", cls: "bg-yellow-500/15 text-yellow-700" },
  accepted: { label: "Aceita", cls: "bg-green-500/15 text-green-700" },
  in_progress: { label: "Em andamento", cls: "bg-blue-500/15 text-blue-700" },
  completed: { label: "Concluída", cls: "bg-emerald-500/15 text-emerald-700" },
  cancelled: { label: "Cancelada", cls: "bg-red-500/15 text-red-700" },
};

function fmtMoney(n: number | null | undefined) {
  return `R$ ${Number(n ?? 0).toFixed(2)}`;
}

function timeLeft(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expirada";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d restantes`;
  if (h > 0) return `${h}h ${m}m restantes`;
  return `${m}m restantes`;
}

function OfertasPage() {
  const { role, user, loading: authLoading } = useAuth();
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  async function load() {
    setLoading(true);
    // Auto-expire stale open offers (best-effort)
    if (role === "empresa" && user) {
      await supabase
        .from("ofertas")
        .update({ status: "cancelled" })
        .eq("empresa_id", user.id)
        .eq("status", "open")
        .lt("expira_em", new Date().toISOString());
    }
    let q = supabase.from("ofertas").select("*").order("created_at", { ascending: false });
    if (role === "empresa" && user) q = q.eq("empresa_id", user.id);
    const { data, error } = await q;
    console.log("[ofertas] role=", role, "rows=", data?.length, "error=", error?.message, data);
    if (error) toast.error(error.message);
    setOfertas((data ?? []) as Oferta[]);
    setLoading(false);
  }


  useEffect(() => {
    if (!role) return;
    load();
    const ch = supabase
      .channel("ofertas-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, () => load())
      .subscribe();
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id]);

  void tick;

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (role === "empresa") {
    return <EmpresaView ofertas={ofertas} loading={loading} open={open} setOpen={setOpen} reload={load} />;
  }
  if (role === "entregador") {
    return <EntregadorView ofertas={ofertas} loading={loading} reload={load} />;
  }
  return <div className="p-6 text-muted-foreground">Faça login para ver ofertas.</div>;
}

/* ===========================  EMPRESA  =========================== */

function EmpresaView({
  ofertas, loading, open, setOpen, reload,
}: {
  ofertas: Oferta[]; loading: boolean; open: boolean; setOpen: (b: boolean) => void; reload: () => void;
}) {
  const [selected, setSelected] = useState<Oferta | null>(null);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Minhas ofertas" description="Crie ofertas e acompanhe seus entregadores" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:opacity-90">
              <Plus className="mr-1 h-4 w-4" /> Nova oferta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>Criar oferta</DialogTitle></DialogHeader>
            <NewOfertaForm onCreated={() => { setOpen(false); reload(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : ofertas.length === 0 ? (
        <Card><CardContent className="space-y-3 py-12 text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Você ainda não tem ofertas</p>
          <p className="text-sm text-muted-foreground">Crie sua primeira oferta e encontre entregadores na sua região</p>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-1 h-4 w-4" /> Criar oferta
          </Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {ofertas.map((o) => (
            <OfertaCard key={o.id} o={o} onDetails={() => setSelected(o)} role="empresa" reload={reload} />
          ))}
        </div>
      )}

      {selected && <DetailsDialog o={selected} onClose={() => setSelected(null)} role="empresa" reload={reload} />}
    </div>
  );
}

function NewOfertaForm({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({
    titulo: "", tipo_entrega: "pacotes", veiculo_necessario: "moto",
    bairro: "", quantidade_pacotes: "", descricao: "", endereco_coleta: "",
    valor: "", prazo_pagamento: "hoje", prazo_pagamento_data: "",
    exige_nota_fiscal: false,
    data_trabalho: "", hora_inicio: "", hora_fim: "",
    expira_em: "",
  });
  const [loading, setLoading] = useState(false);

  const perPkg = useMemo(() => {
    const v = Number(f.valor) || 0;
    const q = Number(f.quantidade_pacotes) || 0;
    if (f.tipo_entrega !== "pacotes" || !q) return null;
    return v / q;
  }, [f.valor, f.quantidade_pacotes, f.tipo_entrega]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { error } = await supabase.from("ofertas").insert({
      empresa_id: user.id,
      titulo: f.titulo || "Oferta sem título",
      descricao: f.descricao || null,
      bairro: f.bairro || null,
      valor: Number(f.valor) || 0,
      valor_por_pacote: perPkg,
      exige_nota_fiscal: f.exige_nota_fiscal,
      tipo_entrega: f.tipo_entrega,
      veiculo_necessario: f.veiculo_necessario,
      quantidade_pacotes: f.tipo_entrega === "pacotes" ? Number(f.quantidade_pacotes) || null : null,
      endereco_coleta: f.endereco_coleta || null,
      prazo_pagamento: f.prazo_pagamento,
      prazo_pagamento_data: f.prazo_pagamento === "custom" && f.prazo_pagamento_data ? f.prazo_pagamento_data : null,
      data_trabalho: f.data_trabalho || null,
      hora_inicio: f.hora_inicio || null,
      hora_fim: f.hora_fim || null,
      expira_em: f.expira_em ? new Date(f.expira_em).toISOString() : null,
      status: "open",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Oferta publicada com sucesso!");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título da oferta</Label>
        <Input placeholder="Ex: Gonzaga - Sábado pela manhã" value={f.titulo} onChange={(e) => setF((p) => ({ ...p, titulo: e.target.value }))} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de entrega</Label>
          <Select value={f.tipo_entrega} onValueChange={(v) => setF((p) => ({ ...p, tipo_entrega: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pacotes">Distribuição de pacotes</SelectItem>
              <SelectItem value="esporadico">Frete esporádico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Veículo necessário</Label>
          <Select value={f.veiculo_necessario} onValueChange={(v) => setF((p) => ({ ...p, veiculo_necessario: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VEHICLES.map(({ v, label, icon: Icon }) => (
                <SelectItem key={v} value={v}>
                  <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Bairro / região</Label>
          <Input value={f.bairro} onChange={(e) => setF((p) => ({ ...p, bairro: e.target.value }))} />
        </div>
        {f.tipo_entrega === "pacotes" && (
          <div className="space-y-2">
            <Label>Quantidade de pacotes</Label>
            <Input type="number" min={0} value={f.quantidade_pacotes} onChange={(e) => setF((p) => ({ ...p, quantidade_pacotes: e.target.value }))} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea rows={3} placeholder="Detalhes da entrega, ponto de partida, horário..." value={f.descricao} onChange={(e) => setF((p) => ({ ...p, descricao: e.target.value }))} />
      </div>

      <div className="space-y-2">
        <Label>Endereço de coleta</Label>
        <Input value={f.endereco_coleta} onChange={(e) => setF((p) => ({ ...p, endereco_coleta: e.target.value }))} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Valor total (R$)</Label>
          <Input type="number" step="0.01" value={f.valor} onChange={(e) => setF((p) => ({ ...p, valor: e.target.value }))} />
          {perPkg !== null && (
            <p className="text-xs text-muted-foreground">Por pacote: {fmtMoney(perPkg)}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Prazo de pagamento</Label>
          <Select value={f.prazo_pagamento} onValueChange={(v) => setF((p) => ({ ...p, prazo_pagamento: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje (mesmo dia)</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="custom">Data personalizada</SelectItem>
            </SelectContent>
          </Select>
          {f.prazo_pagamento === "custom" && (
            <Input type="date" value={f.prazo_pagamento_data} onChange={(e) => setF((p) => ({ ...p, prazo_pagamento_data: e.target.value }))} />
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Data do trabalho</Label>
          <Input type="date" value={f.data_trabalho} onChange={(e) => setF((p) => ({ ...p, data_trabalho: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Hora início</Label>
          <Input type="time" value={f.hora_inicio} onChange={(e) => setF((p) => ({ ...p, hora_inicio: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Hora fim</Label>
          <Input type="time" value={f.hora_fim} onChange={(e) => setF((p) => ({ ...p, hora_fim: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Oferta expira em</Label>
        <Input type="datetime-local" value={f.expira_em} onChange={(e) => setF((p) => ({ ...p, expira_em: e.target.value }))} />
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Exige nota fiscal</p>
            <p className="text-xs text-muted-foreground">Entregador deve enviar NF antes de receber</p>
          </div>
          <Switch checked={f.exige_nota_fiscal} onCheckedChange={(v) => setF((p) => ({ ...p, exige_nota_fiscal: v }))} />
        </div>
        {f.exige_nota_fiscal && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            ⚠️ O entregador será avisado que precisa enviar nota fiscal para receber.
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar oferta"}
      </Button>
    </form>
  );
}

/* ===========================  ENTREGADOR  =========================== */

function EntregadorView({
  ofertas, loading, reload,
}: { ofertas: Oferta[]; loading: boolean; reload: () => void }) {
  const { user } = useAuth();
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [bairro, setBairro] = useState("");
  const [vmin, setVmin] = useState("");
  const [vmax, setVmax] = useState("");
  const [selected, setSelected] = useState<Oferta | null>(null);
  const [myVehicle, setMyVehicle] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("entregadores").select("tipo_veiculo").eq("id", user.id).maybeSingle()
      .then(({ data }) => setMyVehicle(data?.tipo_veiculo ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  void myVehicle;


  const available = useMemo(() => {
    return ofertas.filter((o) => {
      if (o.status !== "open") return false;
      if (o.expira_em && new Date(o.expira_em).getTime() < Date.now()) return false;
      if (vehicleFilter !== "all" && o.veiculo_necessario && o.veiculo_necessario !== vehicleFilter) return false;
      if (bairro && !(o.bairro ?? "").toLowerCase().includes(bairro.toLowerCase())) return false;
      if (vmin && Number(o.valor) < Number(vmin)) return false;
      if (vmax && Number(o.valor) > Number(vmax)) return false;
      return true;
    });
  }, [ofertas, vehicleFilter, bairro, vmin, vmax]);

  const mine = useMemo(
    () => ofertas.filter((o) => o.entregador_id === user?.id && o.status !== "open"),
    [ofertas, user?.id],
  );

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Ofertas" description="Encontre fretes na sua região" />

      <Tabs defaultValue="available">
        <TabsList>
          <TabsTrigger value="available">Disponíveis ({available.length})</TabsTrigger>
          <TabsTrigger value="mine">Minhas ({mine.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-4">
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger><SelectValue placeholder="Veículo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os veículos</SelectItem>
                {VEHICLES.map(({ v, label }) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            <Input placeholder="Valor mín" type="number" value={vmin} onChange={(e) => setVmin(e.target.value)} />
            <Input placeholder="Valor máx" type="number" value={vmax} onChange={(e) => setVmax(e.target.value)} />
          </CardContent></Card>

          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : available.length === 0 ? (
            <Card><CardContent className="space-y-2 py-12 text-center">
              <Store className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Nenhuma oferta disponível agora</p>
              <p className="text-sm text-muted-foreground">Novas ofertas aparecem aqui em tempo real</p>
              {myVehicle && <p className="text-xs text-muted-foreground">Confira se seu veículo ({VEHICLE_MAP[myVehicle]?.label ?? myVehicle}) bate com as ofertas da sua região</p>}
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((o) => (
                <OfertaCard key={o.id} o={o} onDetails={() => setSelected(o)} role="entregador" reload={reload} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-3">
          {mine.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Você ainda não aceitou nenhuma oferta
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mine.map((o) => (
                <OfertaCard key={o.id} o={o} onDetails={() => setSelected(o)} role="entregador" reload={reload} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selected && <DetailsDialog o={selected} onClose={() => setSelected(null)} role="entregador" reload={reload} />}
    </div>
  );
}

/* ===========================  CARDS / DETAILS  =========================== */

function OfertaCard({
  o, onDetails, role, reload,
}: { o: Oferta; onDetails: () => void; role: "empresa" | "entregador"; reload: () => void }) {
  const VIcon = o.veiculo_necessario && VEHICLE_MAP[o.veiculo_necessario]?.icon;
  const st = STATUS[o.status] ?? STATUS.open;
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!confirm("Cancelar esta oferta?")) return;
    setBusy(true);
    const { error } = await supabase.from("ofertas").update({ status: "cancelled" }).eq("id", o.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Oferta cancelada");
    reload();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{o.titulo}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {o.data_trabalho ? new Date(o.data_trabalho).toLocaleDateString("pt-BR") : "Sem data"}
              {o.hora_inicio && ` · ${o.hora_inicio.slice(0, 5)}`}
              {o.hora_fim && ` - ${o.hora_fim.slice(0, 5)}`}
            </p>
          </div>
          <p className="text-xl font-bold text-primary">{fmtMoney(o.valor)}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={st.cls}>{st.label}</Badge>
          {VIcon && <Badge variant="outline" className="gap-1"><VIcon className="h-3 w-3" /> {VEHICLE_MAP[o.veiculo_necessario!].label}</Badge>}
          {o.bairro && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {o.bairro}</Badge>}
          {o.quantidade_pacotes ? (
            <Badge variant="outline" className="gap-1"><Package className="h-3 w-3" /> {o.quantidade_pacotes} pacotes</Badge>
          ) : null}
          {o.exige_nota_fiscal && (
            <Badge className="gap-1 bg-amber-500/15 text-amber-700"><FileText className="h-3 w-3" /> Exige NF</Badge>
          )}
        </div>
        {o.expira_em && o.status === "open" && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {timeLeft(o.expira_em)}</p>
        )}
        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={onDetails} className="flex-1">Ver detalhes</Button>
          {role === "empresa" && o.status === "open" && (
            <Button size="sm" variant="ghost" onClick={cancel} disabled={busy} className="text-destructive">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsDialog({
  o, onClose, role, reload,
}: { o: Oferta; onClose: () => void; role: "empresa" | "entregador"; reload: () => void }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deliverer, setDeliverer] = useState<{
    nome_completo: string; whatsapp: string | null; tipo_veiculo: string | null;
    pix_chave: string | null; pix_tipo: string | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (role === "empresa" && o.entregador_id) {
      supabase.from("entregadores")
        .select("nome_completo,whatsapp,tipo_veiculo,pix_chave,pix_tipo")
        .eq("id", o.entregador_id).maybeSingle()
        .then(({ data }) => setDeliverer(data));
    }
  }, [role, o.entregador_id]);

  async function accept() {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase
      .from("ofertas")
      .update({ status: "accepted", entregador_id: user.id })
      .eq("id", o.id)
      .eq("status", "open");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("🎉 Oferta aceita! Veja suas entregas ativas");
    onClose();
    reload();
    navigate({ to: "/rotas" });
  }

  async function changeStatus(status: string) {
    setBusy(true);
    const { error } = await supabase.from("ofertas").update({ status }).eq("id", o.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    reload();
  }

  async function markPaid() {
    setBusy(true);
    const { error } = await supabase.from("ofertas").update({ status: "completed" }).eq("id", o.id);
    // Also try to update related entrega if exists
    await supabase.from("entregas").update({ data_pagamento: new Date().toISOString() }).eq("oferta_id", o.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pagamento marcado");
    reload();
  }

  async function uploadNF(file: File) {
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const path = `${user.id}/${o.id}-${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("notas-fiscais").upload(path, file);
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    // create or update entrega record
    await supabase.from("entregas").upsert({
      oferta_id: o.id, empresa_id: o.empresa_id, entregador_id: user.id,
      valor: o.valor, exige_nota_fiscal: true, nota_fiscal_url: up.data.path, status: "concluida",
    }, { onConflict: "oferta_id" } as never);
    setUploading(false);
    toast.success("Nota fiscal enviada");
    reload();
  }

  const copyPix = () => {
    if (!deliverer?.pix_chave) return;
    navigator.clipboard.writeText(deliverer.pix_chave);
    toast.success("Chave PIX copiada");
  };

  const VIcon = o.veiculo_necessario && VEHICLE_MAP[o.veiculo_necessario]?.icon;
  const st = STATUS[o.status] ?? STATUS.open;
  const expired = o.expira_em && new Date(o.expira_em).getTime() < Date.now();

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{o.titulo}</span>
            <Badge className={st.cls}>{st.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-2xl font-bold text-primary">{fmtMoney(o.valor)}</p>
            {o.valor_por_pacote && <p className="text-xs text-muted-foreground">Por pacote: {fmtMoney(o.valor_por_pacote)}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {o.bairro && <Info label="Bairro" value={o.bairro} />}
            {VIcon && <Info label="Veículo" value={<span className="flex items-center gap-1"><VIcon className="h-4 w-4" /> {VEHICLE_MAP[o.veiculo_necessario!].label}</span>} />}
            {o.quantidade_pacotes ? <Info label="Pacotes" value={String(o.quantidade_pacotes)} /> : null}
            {o.data_trabalho && <Info label="Data" value={new Date(o.data_trabalho).toLocaleDateString("pt-BR")} />}
            {o.hora_inicio && <Info label="Início" value={o.hora_inicio.slice(0, 5)} />}
            {o.hora_fim && <Info label="Fim" value={o.hora_fim.slice(0, 5)} />}
            {o.prazo_pagamento && <Info label="Pagamento" value={prazoLabel(o.prazo_pagamento, o.prazo_pagamento_data)} />}
            {o.expira_em && <Info label="Expira" value={new Date(o.expira_em).toLocaleString("pt-BR")} />}
          </div>

          {o.endereco_coleta && (
            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">Endereço de coleta</p>
              <p className="mt-1">{o.endereco_coleta}</p>
            </div>
          )}

          {o.descricao && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Descrição</p>
              <p className="mt-1 whitespace-pre-wrap">{o.descricao}</p>
            </div>
          )}

          {o.exige_nota_fiscal && (
            <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              ⚠️ Esta oferta exige nota fiscal para pagamento
            </p>
          )}

          {/* EMPRESA: deliverer info + payment */}
          {role === "empresa" && o.entregador_id && deliverer && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-semibold">Entregador</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Nome" value={deliverer.nome_completo} />
                {deliverer.tipo_veiculo && <Info label="Veículo" value={VEHICLE_MAP[deliverer.tipo_veiculo]?.label ?? deliverer.tipo_veiculo} />}
              </div>
              {deliverer.whatsapp && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={`https://wa.me/${deliverer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    Abrir WhatsApp
                  </a>
                </Button>
              )}
              {deliverer.pix_chave && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Chave PIX ({deliverer.pix_tipo})</p>
                  <div className="flex gap-2">
                    <Input readOnly value={deliverer.pix_chave} className="text-xs" />
                    <Button type="button" size="icon" variant="outline" onClick={copyPix}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
              {o.exige_nota_fiscal && o.status !== "completed" && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs">⏳ Aguardando nota fiscal</p>
              )}
              <Button
                onClick={markPaid}
                disabled={busy || o.status !== "completed"}
                className="w-full bg-primary text-primary-foreground hover:opacity-90"
              >
                Marcar como pago
              </Button>
            </div>
          )}

          {/* ENTREGADOR: actions */}
          {role === "entregador" && (
            <div className="space-y-2">
              {o.status === "open" && !expired && (
                <>
                  {!confirming ? (
                    <Button className="w-full bg-primary text-primary-foreground hover:opacity-90" onClick={() => setConfirming(true)}>
                      Aceitar oferta
                    </Button>
                  ) : (
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-sm font-medium">Aceitar esta oferta?</p>
                      <p className="text-xs text-muted-foreground">
                        {o.bairro} · {fmtMoney(o.valor)} {o.exige_nota_fiscal && "· exige NF"}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>Cancelar</Button>
                        <Button className="flex-1 bg-primary text-primary-foreground hover:opacity-90" disabled={busy} onClick={accept}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {o.status === "accepted" && (
                <Button className="w-full" onClick={() => changeStatus("in_progress")} disabled={busy}>
                  Iniciar entrega
                </Button>
              )}
              {o.status === "in_progress" && (
                <Button className="w-full bg-primary text-primary-foreground hover:opacity-90" onClick={() => changeStatus("completed")} disabled={busy}>
                  Concluir entrega
                </Button>
              )}
              {o.status === "completed" && o.exige_nota_fiscal && (
                <div className="space-y-1 rounded-lg border p-3">
                  <Label className="text-xs">Envie sua nota fiscal para receber o pagamento</Label>
                  <Input type="file" accept="application/pdf,image/*" disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadNF(e.target.files[0])} />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function prazoLabel(p: string, d: string | null) {
  if (p === "hoje") return "Hoje";
  if (p === "semana") return "Esta semana";
  if (p === "mes") return "Este mês";
  if (p === "custom" && d) return new Date(d).toLocaleDateString("pt-BR");
  return p;
}
