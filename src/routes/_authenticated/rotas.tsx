import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, MapPin, CheckCircle2, AlertTriangle, Camera, Flag,
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { ProofOfDeliverySheet } from "@/components/ProofOfDeliverySheet";
import { useLocationTracker } from "@/hooks/use-location-tracker";
import { LocationIndicator } from "@/components/LocationIndicator";

export const Route = createFileRoute("/_authenticated/rotas")({
  component: RotasPage,
});

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
};

async function ensurePackagesForOferta(oferta: Oferta) {
  if (!oferta.quantidade_pacotes || oferta.quantidade_pacotes <= 0) return;

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
  { key: "endereco", label: "Endereço não encontrado", motivo: "address_not_visited" },
  { key: "recusou", label: "Cliente recusou", motivo: "could_not_deliver", sub: "recusou" },
  { key: "danificado", label: "Pacote danificado", motivo: "damaged" },
  { key: "outro", label: "Outro", motivo: "could_not_deliver", sub: "outro" },
];

function RotasPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [problemPacote, setProblemPacote] = useState<Pacote | null>(null);
  const [podPacote, setPodPacote] = useState<Pacote | null>(null);
  const trackerState = useLocationTracker(oferta?.id ?? null);

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: ofs } = await supabase
        .from("ofertas")
        .select("id, empresa_id, titulo, status, quantidade_pacotes, operacao_id")
        .eq("entregador_id", user.id)
        .in("status", ["in_progress", "accepted"])
        .order("updated_at", { ascending: false })
        .limit(1);
      let of = (ofs?.[0] as Oferta) ?? null;

      if (of?.status === "accepted") {
        const { error: startErr } = await supabase
          .from("ofertas")
          .update({ status: "in_progress" })
          .eq("id", of.id)
          .eq("entregador_id", user.id);
        if (!startErr) of = { ...of, status: "in_progress" };
      }

      setOferta(of);

      if (of) {
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
    const concluidas = entregues + problemas;
    const pct = total ? (concluidas / total) * 100 : 0;
    return { total, entregues, problemas, concluidas, pct };
  }, [pacotes]);

  const allDone = stats.total > 0 && stats.concluidas === stats.total;

  const progressColor =
    stats.pct < 34 ? "bg-red-500" : stats.pct < 67 ? "bg-amber-500" : "bg-green-500";

  async function markDelivered(p: Pacote) {
    setPacotes((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "delivered" } : x));
    const { error } = await supabase.from("entregas_pacotes").update({ status: "delivered" }).eq("id", p.id);
    if (error) {
      toast.error("Erro ao marcar entrega.");
      load();
    } else {
      toast.success(`Pacote #${p.numero_pacote} entregue.`);
    }
  }

  async function finalizarRota() {
    if (!oferta) return;
    const { error } = await supabase
      .from("ofertas")
      .update({
        status: "completed",
        pacotes_entregues: stats.entregues,
        pacotes_nao_entregues: stats.problemas,
        closed_at: new Date().toISOString(),
      } as any)
      .eq("id", oferta.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Rota finalizada!");
      load();
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

  return (
    <div className="pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <LocationIndicator state={trackerState} />
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs text-muted-foreground truncate">{oferta.titulo}</div>
              <div className="text-3xl font-bold tabular-nums">
                {stats.entregues} <span className="text-muted-foreground text-xl">/ {stats.total}</span>
              </div>
              <div className="text-xs text-muted-foreground">entregues{stats.problemas > 0 ? ` · ${stats.problemas} com problema` : ""}</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full transition-all ${progressColor}`} style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {pacotes.map((p, i) => (
          <StopCard
            key={p.id}
            index={i + 1}
            pacote={p}
            onDelivered={() => setPodPacote(p)}
            onProblem={() => setProblemPacote(p)}
          />
        ))}

        {allDone && (
          <Button
            size="lg"
            className="w-full h-14 text-base bg-green-600 hover:bg-green-700 mt-4"
            onClick={finalizarRota}
          >
            <Flag className="mr-2 h-5 w-5" /> Finalizar Rota
          </Button>
        )}
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

      <ProofOfDeliverySheet
        open={!!podPacote}
        onClose={() => setPodPacote(null)}
        pacote={podPacote}
        entregadorId={user?.id}
        onConfirmed={(id) => {
          setPacotes((prev) => prev.map((x) => x.id === id ? { ...x, status: "delivered" } : x));
          setPodPacote(null);
        }}
      />
    </div>
  );
}

function StopCard({
  index, pacote, onDelivered, onProblem,
}: {
  index: number; pacote: Pacote; onDelivered: () => void; onProblem: () => void;
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
          {!isDone && !isProblem && (
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
            <Label>Foto (opcional)</Label>
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
          <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
            Registrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
