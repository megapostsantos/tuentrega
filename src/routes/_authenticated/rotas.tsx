import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, MapPin, CheckCircle2, AlertTriangle, Camera, Flag, Search, ListChecks,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyDestinatarioPacote } from "@/lib/whatsapp-notify";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { useLocationTracker } from "@/hooks/use-location-tracker";
import { LocationIndicator } from "@/components/LocationIndicator";
import { EmpresaRotas } from "@/components/EmpresaRotas";
import { recusarRotaAtribuida } from "@/lib/reofertar";

export const Route = createFileRoute("/_authenticated/rotas")({
  component: RotasPage,
});

function RotasPage() {
  const { user, role, loading, isImpersonating } = useAuth();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (role === "empresa") return <EmpresaRotas empresaId={user!.id} />;
  if (role === "admin" && !isImpersonating) return <EmpresaRotas empresaId={null} />;
  return <EntregadorRotas />;
}

type Pacote = {
  id: string;
  oferta_id: string;
  numero_pacote: number;
  ordem_otimizada: number | null;
  endereco_entrega: string | null;
  status: string;
};

type Oferta = {
  id: string;
  empresa_id: string;
  titulo: string;
  status: string;
  operacao_id?: string | null;
  quantidade_pacotes: number | null;
  valor_por_pacote?: number | null;
  valor?: number | null;
  data_trabalho?: string | null;
  hora_inicio?: string | null;
  endereco_coleta?: string | null;
};

async function ensurePackagesForOferta(oferta: Oferta) {
  if (!oferta.quantidade_pacotes || oferta.quantidade_pacotes <= 0) return;

  // If pacotes exist with the same operacao_id but no oferta_id, link them.
  if (oferta.operacao_id) {
    await supabase
      .from("entregas_pacotes")
      .update({ oferta_id: oferta.id } as any)
      .eq("operacao_id", oferta.operacao_id)
      .is("oferta_id", null);
  }

  const { count, error: countErr } = await supabase
    .from("entregas_pacotes")
    .select("id", { count: "exact", head: true })
    .eq("oferta_id", oferta.id);
  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return;

  const total = Math.max(1, Number(oferta.quantidade_pacotes));
  const rows = Array.from({ length: total }, (_, i) => ({
    oferta_id: oferta.id,
    operacao_id: oferta.operacao_id ?? null,
    numero_pacote: i + 1,
    endereco_entrega: null,
    status: "pending",
  }));

  const { error } = await supabase.from("entregas_pacotes").insert(rows as any);
  if (error) throw error;
}


// UI choices mapped to motivo + sub_motivo respecting the DB check constraint
const RADIO_CHOICES: Array<{ key: string; label: string; motivo: string; sub?: string }> = [
  { key: "ausente", label: "Cliente ausente", motivo: "could_not_deliver", sub: "ausente" },
  { key: "fechado", label: "Estabelecimento fechado", motivo: "could_not_deliver", sub: "estabelecimento_fechado" },
  { key: "endereco", label: "Endereço não encontrado", motivo: "address_not_visited" },
  { key: "recusou", label: "Cliente recusou", motivo: "could_not_deliver", sub: "recusou" },
  { key: "danificado", label: "Pacote danificado", motivo: "damaged" },
  { key: "outro", label: "Outro", motivo: "could_not_deliver", sub: "outro" },
];

const SCORE_MOTIVO: Record<string, number> = { address_not_visited: -20, lost: -30, damaged: -10, could_not_deliver: 0 };
const PAGE = 60;

function EntregadorRotas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [problemPacote, setProblemPacote] = useState<Pacote | null>(null);
  const [filtro, setFiltro] = useState<"pending" | "not_delivered" | "delivered" | "all">("pending");
  const [busca, setBusca] = useState("");
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [limite, setLimite] = useState(PAGE);
  const [confirmBaixa, setConfirmBaixa] = useState<null | "pendentes" | "selecionados">(null);
  const [confirmFinalizar, setConfirmFinalizar] = useState(false);
  const [busy, setBusy] = useState(false);
  const trackerState = useLocationTracker(oferta?.status === "in_progress" ? oferta.id : null);
  const [recusando, setRecusando] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("indisponivel");

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: ofs } = await supabase
        .from("ofertas")
        .select("id, empresa_id, titulo, status, quantidade_pacotes, operacao_id, valor_por_pacote, valor, data_trabalho, hora_inicio, endereco_coleta")
        .eq("entregador_id", user.id)
        .in("status", ["in_progress", "accepted"])
        .order("updated_at", { ascending: false })
        .limit(1);
      let of = (ofs?.[0] as Oferta) ?? null;

      setOferta(of);

      if (of && of.status === "in_progress") {
        await ensurePackagesForOferta(of);

        const { data: pks } = await supabase
          .from("entregas_pacotes")
          .select("id, oferta_id, numero_pacote, ordem_otimizada, endereco_entrega, status")
          .eq("oferta_id", of.id);
        const list = ((pks as Pacote[]) ?? []).sort(
          (a, b) => (a.ordem_otimizada ?? a.numero_pacote) - (b.ordem_otimizada ?? b.numero_pacote),
        );
        setPacotes(list);
      } else {
        setPacotes([]);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao carregar rota.");
      setOferta(null);
      setPacotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const stats = useMemo(() => {
    const total = pacotes.length;
    const entregues = pacotes.filter((p) => p.status === "delivered").length;
    const problemas = pacotes.filter((p) => p.status === "not_delivered").length;
    const pendentes = total - entregues - problemas;
    const pct = total ? ((entregues + problemas) / total) * 100 : 0;
    return { total, entregues, problemas, pendentes, pct };
  }, [pacotes]);

  const progressColor =
    stats.pct < 34 ? "bg-red-500" : stats.pct < 67 ? "bg-amber-500" : "bg-green-500";

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return pacotes.filter((p) => {
      const st = p.status === "delivered" ? "delivered" : p.status === "not_delivered" ? "not_delivered" : "pending";
      if (filtro !== "all" && st !== filtro) return false;
      if (!t) return true;
      return String(p.numero_pacote).includes(t) || (p.endereco_entrega ?? "").toLowerCase().includes(t);
    });
  }, [pacotes, filtro, busca]);

  async function baixa(ids: string[] | "pendentes"): Promise<boolean> {
    if (!oferta) return false;
    const now = new Date().toISOString();
    let q = supabase.from("entregas_pacotes").update({ status: "delivered", entregue_em: now } as any).eq("oferta_id", oferta.id);
    q = ids === "pendentes" ? q.eq("status", "pending") : q.in("id", ids).eq("status", "pending");
    const { error } = await q;
    if (error) {
      toast.error(error.message || "Erro ao dar baixa.");
      return false;
    }
    setPacotes((prev) =>
      prev.map((x) => (x.status === "pending" && (ids === "pendentes" || ids.includes(x.id)) ? { ...x, status: "delivered" } : x)),
    );
    return true;
  }

  async function entregueUm(p: Pacote) {
    setPacotes((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "delivered" } : x)));
    const { error } = await supabase
      .from("entregas_pacotes").update({ status: "delivered", entregue_em: new Date().toISOString() } as any).eq("id", p.id);
    if (error) {
      toast.error("Erro ao marcar entrega.");
      load();
    } else {
      notifyDestinatarioPacote(p.id, "entregue").catch(() => {});
    }
  }

  async function executarBaixa(tipo: "pendentes" | "selecionados") {
    setBusy(true);
    const ok = await baixa(tipo === "pendentes" ? "pendentes" : [...selecionados]);
    setBusy(false);
    setConfirmBaixa(null);
    if (ok) {
      toast.success(tipo === "pendentes" ? "Baixa feita em todos os pendentes." : `Baixa feita em ${selecionados.size} pacote(s).`);
      setSelecionados(new Set());
      setSelecionando(false);
    }
  }

  async function finalizar(comBaixa: boolean) {
    if (!oferta || !user) return;
    setBusy(true);
    try {
      const sb = supabase as any;
      if (comBaixa && stats.pendentes > 0) {
        const ok = await baixa("pendentes");
        if (!ok) throw new Error("Não foi possível dar baixa nos pendentes.");
      }
      const { data: pks, error: pErr } = await sb.from("entregas_pacotes").select("status").eq("oferta_id", oferta.id);
      if (pErr) throw pErr;
      const total = (pks ?? []).length;
      const entregues = (pks ?? []).filter((x: any) => x.status === "delivered").length;
      const naoEntregues = total - entregues;

      const { error: e2 } = await sb.from("ofertas").update({
        status: "completed",
        pacotes_entregues: entregues,
        pacotes_nao_entregues: naoEntregues,
        closed_at: new Date().toISOString(),
      }).eq("id", oferta.id);
      if (e2) throw e2;

      const { data: occ } = await sb.from("entregas_ocorrencias").select("numero_pacote, motivo").eq("oferta_id", oferta.id);
      for (const o of occ ?? []) {
        const pts = SCORE_MOTIVO[o.motivo as string] ?? 0;
        if (!pts) continue;
        await sb.rpc("apply_reliability_event", {
          _entregador_id: user.id, _evento: o.motivo, _pontos: pts,
          _descricao: `Pacote ${o.numero_pacote} - ${o.motivo}`,
        });
      }
      const pct = total ? entregues / total : 0;
      if (pct === 1 || pct >= 0.95) {
        await sb.rpc("apply_reliability_event", {
          _entregador_id: user.id, _evento: "route_completed", _pontos: pct === 1 ? 10 : 5,
          _descricao: `Rota ${oferta.titulo} ${(pct * 100).toFixed(0)}% entregue`,
        });
      }

      await sb.from("entregas").upsert({
        oferta_id: oferta.id,
        empresa_id: oferta.empresa_id,
        entregador_id: user.id,
        valor: entregues * Number(oferta.valor_por_pacote ?? 0),
        status: "pendente",
      }, { onConflict: "oferta_id" });

      await sb.from("admin_notifications").insert({
        type: "route_closed",
        title: `Rota fechada: ${oferta.titulo}`,
        body: `✅ ${entregues} entregues / ❌ ${naoEntregues} não entregues`,
        link: `/ofertas`,
      });

      toast.success("Rota finalizada!");
      setConfirmFinalizar(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao finalizar a rota.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!oferta) {
    return (
      <div className="p-6">
        <PageHeader title="Rota em andamento" description="Acompanhe as paradas da sua rota ativa" />
        <EmptyModule icon={MapPin} title="Nenhuma rota em andamento" description="Aceite uma oferta e inicie a rota para ver as paradas aqui." />
      </div>
    );
  }

  if (oferta.status === "accepted") {
    const MOTIVOS: Array<[string, string]> = [
      ["indisponivel", "Estou indisponível nesse dia"],
      ["veiculo", "Meu veículo não atende"],
      ["valor", "Valor ou distância não compensam"],
      ["outro", "Outro motivo"],
    ];
    async function iniciar() {
      setBusy(true);
      const { error } = await supabase.from("ofertas").update({ status: "in_progress" }).eq("id", oferta!.id).eq("entregador_id", user!.id);
      setBusy(false);
      if (error) return toast.error(error.message);
      load();
    }
    async function recusar() {
      setBusy(true);
      try {
        await recusarRotaAtribuida({
          ofertaId: oferta!.id, empresaId: oferta!.empresa_id, entregadorId: user!.id,
          motivo: MOTIVOS.find((m) => m[0] === motivoRecusa)?.[1] ?? motivoRecusa,
        });
        toast.success("Rota recusada. Ela voltou para outros entregadores.");
        setRecusando(false);
        load();
      } catch (e: any) {
        toast.error(e?.message ?? "Não foi possível recusar.");
      } finally {
        setBusy(false);
      }
    }
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <PageHeader title="Rota atribuída a você" description="Confirme para iniciar ou recuse para a empresa oferecer a outro entregador" />
        <Card className="border-primary/40">
          <CardContent className="space-y-3 p-4">
            <div className="text-lg font-semibold">{oferta.titulo}</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>{oferta.quantidade_pacotes ?? 0} pacotes</span>
              <span>R$ {Number(oferta.valor ?? 0).toFixed(2)} no total</span>
              <span>{oferta.data_trabalho ? new Date(oferta.data_trabalho + "T12:00:00").toLocaleDateString("pt-BR") : "Data a combinar"}</span>
              <span>{oferta.hora_inicio ?? "Horário a combinar"}</span>
            </div>
            {oferta.endereco_coleta && (
              <div className="flex items-start gap-1 rounded-md bg-muted p-2 text-xs">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Coleta: {oferta.endereco_coleta}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={busy} onClick={iniciar}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Aceitar e iniciar rota
              </Button>
              <Button variant="outline" className="flex-1 border-red-300 text-red-600" disabled={busy} onClick={() => setRecusando(true)}>
                Recusar
              </Button>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={recusando} onOpenChange={setRecusando}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recusar esta rota?</AlertDialogTitle>
              <AlertDialogDescription>A empresa será avisada e a rota volta para outros entregadores. Ela não será oferecida a você de novo.</AlertDialogDescription>
            </AlertDialogHeader>
            <RadioGroup value={motivoRecusa} onValueChange={setMotivoRecusa} className="space-y-1">
              {MOTIVOS.map(([k, label]) => (
                <label key={k} htmlFor={`m-${k}`} className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-accent">
                  <RadioGroupItem id={`m-${k}`} value={k} /><span className="text-sm">{label}</span>
                </label>
              ))}
            </RadioGroup>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
              <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); recusar(); }}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recusar rota"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (trackerState.permissionDenied) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6">
        <Card className="max-w-md w-full border-red-300">
          <CardContent className="p-6 space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Localização obrigatória</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Para iniciar e operar a rota você precisa compartilhar sua localização em tempo real com a empresa.
              </p>
            </div>
            <ol className="text-left text-sm space-y-1 bg-muted/50 rounded-md p-3 list-decimal pl-5">
              <li>Toque no cadeado/ícone ao lado do endereço no navegador.</li>
              <li>Permita o acesso à <strong>Localização</strong> para este site.</li>
              <li>Volte aqui e toque em <strong>Tentar novamente</strong>.</li>
            </ol>
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    () => window.location.reload(),
                    () => toast.error("Permissão ainda negada. Ajuste nas configurações do navegador."),
                    { enableHighAccuracy: true, timeout: 10_000 },
                  );
                }
              }}
            >
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtros: Array<{ k: typeof filtro; label: string; n: number }> = [
    { k: "pending", label: "Pendentes", n: stats.pendentes },
    { k: "not_delivered", label: "Problemas", n: stats.problemas },
    { k: "delivered", label: "Entregues", n: stats.entregues },
    { k: "all", label: "Todos", n: stats.total },
  ];

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <LocationIndicator state={trackerState} />
        <div className="px-4 py-3 space-y-2">
          <div className="text-xs text-muted-foreground truncate">{oferta.titulo}</div>
          <div className="flex items-end justify-between">
            <div className="text-3xl font-bold tabular-nums">
              {stats.entregues} <span className="text-muted-foreground text-xl">/ {stats.total}</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">entregues</span>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>{stats.pendentes} pendentes</div>
              {stats.problemas > 0 && <div className="text-orange-600">{stats.problemas} com problema</div>}
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all ${progressColor}`} style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Registre só as exceções (com motivo e foto) e dê baixa nos demais de uma vez.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1 min-w-[200px] bg-green-600 hover:bg-green-700"
                disabled={stats.pendentes === 0 || busy}
                onClick={() => setConfirmBaixa("pendentes")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Dar baixa nos {stats.pendentes} pendentes
              </Button>
              <Button
                variant={selecionando ? "default" : "outline"}
                onClick={() => { setSelecionando((v) => !v); setSelecionados(new Set()); }}
              >
                <ListChecks className="mr-2 h-4 w-4" /> {selecionando ? "Cancelar seleção" : "Selecionar vários"}
              </Button>
            </div>
            {selecionando && (
              <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2 text-sm">
                <span>{selecionados.size} selecionado(s)</span>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setSelecionados(new Set(visiveis.filter((p) => p.status === "pending").map((p) => p.id)))}
                  >
                    Marcar visíveis
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={selecionados.size === 0}
                    onClick={() => setConfirmBaixa("selecionados")}>
                    Dar baixa
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar pelo número do pacote ou endereço"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setLimite(PAGE); }}
          />
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {filtros.map((f) => (
            <button
              key={f.k}
              onClick={() => { setFiltro(f.k); setLimite(PAGE); }}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
                filtro === f.k ? "bg-primary text-primary-foreground border-primary" : "bg-background"
              }`}
            >
              {f.label} ({f.n})
            </button>
          ))}
        </div>

        {visiveis.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pacote nesta lista.</p>
        )}

        {visiveis.slice(0, limite).map((p) => (
          <StopCard
            key={p.id}
            index={pacotes.indexOf(p) + 1}
            pacote={p}
            selecionando={selecionando}
            selecionado={selecionados.has(p.id)}
            onToggle={() =>
              setSelecionados((prev) => {
                const n = new Set(prev);
                n.has(p.id) ? n.delete(p.id) : n.add(p.id);
                return n;
              })
            }
            onDelivered={() => entregueUm(p)}
            onProblem={() => setProblemPacote(p)}
          />
        ))}
        {visiveis.length > limite && (
          <Button variant="outline" className="w-full" onClick={() => setLimite((l) => l + PAGE)}>
            Mostrar mais ({visiveis.length - limite})
          </Button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur">
        <Button size="lg" className="h-12 w-full text-base" onClick={() => setConfirmFinalizar(true)} disabled={busy}>
          <Flag className="mr-2 h-5 w-5" /> Finalizar rota
        </Button>
      </div>

      <ProblemSheet
        open={!!problemPacote}
        onClose={() => setProblemPacote(null)}
        pacote={problemPacote}
        oferta={oferta}
        onSaved={(updated) => {
          setPacotes((prev) => prev.map((x) => x.id === updated.id ? { ...x, status: "not_delivered" } : x));
          setProblemPacote(null);
        }}
      />

      <AlertDialog open={!!confirmBaixa} onOpenChange={(o) => !o && setConfirmBaixa(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar baixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmBaixa === "pendentes"
                ? `${stats.pendentes} pacote(s) pendentes serão marcados como entregues. Os pacotes com problema não são alterados.`
                : `${selecionados.size} pacote(s) serão marcados como entregues.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); executarBaixa(confirmBaixa!); }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar baixa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmFinalizar} onOpenChange={setConfirmFinalizar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar rota</AlertDialogTitle>
            <AlertDialogDescription>
              {stats.entregues} entregues · {stats.problemas} com problema · {stats.pendentes} pendentes.
              {stats.pendentes > 0 && " Os pendentes podem receber baixa como entregues agora, ou ficarão como não entregues."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {stats.pendentes > 0 && (
              <Button className="w-full bg-green-600 hover:bg-green-700" disabled={busy} onClick={() => finalizar(true)}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Dar baixa nos {stats.pendentes} e finalizar
              </Button>
            )}
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => finalizar(false)}>
              {stats.pendentes > 0 ? "Finalizar sem dar baixa" : "Finalizar"}
            </Button>
            <Button variant="ghost" className="w-full" disabled={busy} onClick={() => setConfirmFinalizar(false)}>Voltar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StopCard({
  index, pacote, onDelivered, onProblem, selecionando, selecionado, onToggle,
}: {
  index: number; pacote: Pacote; onDelivered: () => void; onProblem: () => void;
  selecionando: boolean; selecionado: boolean; onToggle: () => void;
}) {
  const s = pacote.status;
  const isDone = s === "delivered";
  const isProblem = s === "not_delivered";
  const bg = isDone ? "border-green-500/40 bg-green-50/50 dark:bg-green-950/20"
    : isProblem ? "border-orange-500/40 bg-orange-50/50 dark:bg-orange-950/20"
    : "";

  return (
    <Card className={bg}>
      <CardContent className="p-3 flex gap-3">
        {selecionando && !isDone && !isProblem && (
          <div className="flex items-center">
            <Checkbox checked={selecionado} onCheckedChange={onToggle} />
          </div>
        )}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
            ${isDone ? "bg-green-600 text-white"
              : isProblem ? "bg-orange-500 text-white"
              : "bg-muted text-foreground"}`}>
            {isDone ? <CheckCircle2 className="h-5 w-5" />
              : isProblem ? <AlertTriangle className="h-5 w-5" />
              : index}
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="text-xs text-muted-foreground">Parada {index} · Pacote #{pacote.numero_pacote}</div>
            <div className="text-sm font-medium leading-tight break-words">
              {pacote.endereco_entrega ?? "Sem endereço"}
            </div>
          </div>
          {!isDone && !isProblem && !selecionando && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={onDelivered}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Entreguei
              </Button>
              <Button size="sm" variant="outline" className="flex-1 border-orange-400 text-orange-600 hover:bg-orange-50" onClick={onProblem}>
                <AlertTriangle className="mr-1 h-4 w-4" /> Problema
              </Button>
            </div>
          )}
          {isDone && <div className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Entregue</div>}
          {isProblem && <div className="text-xs text-orange-700 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Com problema</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProblemSheet({
  open, onClose, pacote, oferta, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  pacote: Pacote | null;
  oferta: Oferta | null;
  onSaved: (p: Pacote) => void;
}) {
  const { user } = useAuth();
  const [choice, setChoice] = useState<string>("ausente");
  const [obs, setObs] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setChoice("ausente"); setObs(""); setFile(null); }
  }, [open]);

  async function uploadPhoto(): Promise<string | null> {
    if (!file || !user || !oferta) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${oferta.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("entregas-fotos").upload(path, file, {
      upsert: false, contentType: file.type,
    });
    if (error) {
      toast.error("Falha ao enviar foto.");
      return null;
    }
    return path;
  }

  async function handleSave() {
    if (!pacote || !oferta || !user) return;
    if (!file) { toast.error("Tire uma foto do local para comprovar."); return; }
    setSaving(true);
    try {
      const chosen = RADIO_CHOICES.find((c) => c.key === choice)!;
      let fotoPath: string | null = null;
      if (file) fotoPath = await uploadPhoto();

      const { error: occErr } = await supabase.from("entregas_ocorrencias").insert({
        oferta_id: oferta.id,
        entregador_id: user.id,
        empresa_id: oferta.empresa_id,
        numero_pacote: pacote.numero_pacote,
        tipo: chosen.motivo,
        motivo: chosen.motivo,
        sub_motivo: [chosen.sub, obs].filter(Boolean).join(" — ") || null,
        fotos_urls: fotoPath ? [fotoPath] : [],
      } as any);
      if (occErr) throw occErr;

      const { error: upErr } = await supabase
        .from("entregas_pacotes")
        .update({ status: "not_delivered" })
        .eq("id", pacote.id);
      if (upErr) throw upErr;

      notifyDestinatarioPacote(pacote.id, "tentativa_falha").catch(() => {});
      toast.success("Problema registrado.");
      onSaved(pacote);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar problema {pacote ? `· Pacote #${pacote.numero_pacote}` : ""}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo do problema</Label>
            <RadioGroup value={choice} onValueChange={setChoice} className="space-y-1">
              {RADIO_CHOICES.map((c) => (
                <label key={c.key} htmlFor={`r-${c.key}`} className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-accent">
                  <RadioGroupItem id={`r-${c.key}`} value={c.key} />
                  <span className="text-sm">{c.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observação</Label>
            <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Detalhes adicionais (opcional)" rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Foto do local (obrigatória)</Label>
            <label className="flex items-center gap-2 rounded border border-dashed p-3 cursor-pointer hover:bg-accent">
              <Camera className="h-4 w-4" />
              <span className="text-sm">{file ? file.name : "Tirar/escolher foto"}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSave} disabled={saving || !file}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            Registrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
