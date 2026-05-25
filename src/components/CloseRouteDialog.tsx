import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X, AlertTriangle, CheckCircle2, ScanLine, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Oferta = {
  id: string; empresa_id: string; entregador_id: string | null;
  titulo: string; valor: number; valor_por_pacote: number | null;
  quantidade_pacotes: number | null; updated_at: string;
};

type Motivo = "address_not_visited" | "lost" | "damaged" | "could_not_deliver";

const SCORE: Record<Motivo, number> = {
  address_not_visited: -20,
  lost: -30,
  damaged: -10,
  could_not_deliver: 0,
};

const MOTIVO_INFO: Record<Motivo, { label: string; emoji: string; photoRequired: boolean; pkgIdRequired: boolean; cls: string }> = {
  address_not_visited: { label: "Endereço não visitado", emoji: "🔴", photoRequired: true, pkgIdRequired: false, cls: "border-red-300 hover:bg-red-50" },
  lost: { label: "Pacote perdido", emoji: "🔴", photoRequired: true, pkgIdRequired: true, cls: "border-red-300 hover:bg-red-50" },
  damaged: { label: "Pacote danificado", emoji: "🟠", photoRequired: true, pkgIdRequired: true, cls: "border-orange-300 hover:bg-orange-50" },
  could_not_deliver: { label: "Não foi possível entregar", emoji: "⚪", photoRequired: false, pkgIdRequired: false, cls: "border-muted hover:bg-muted/50" },
};

const SUB_MOTIVOS = [
  { v: "absent", label: "Destinatário ausente" },
  { v: "not_found", label: "Endereço não encontrado" },
  { v: "refused", label: "Destinatário recusou" },
];

type Occurrence = {
  numero: number;
  motivo: Motivo | null;
  sub_motivo: string | null;
  fotos: string[];
  package_id: string;
  package_id_scan_method: "manual" | "camera" | null;
};

export function CloseRouteDialog({ oferta, onClose, onClosed }: {
  oferta: Oferta; onClose: () => void; onClosed: () => void;
}) {
  const total = oferta.quantidade_pacotes ?? 0;
  const valorPorPacote = oferta.valor_por_pacote ?? (total ? oferta.valor / total : 0);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [delivered, setDelivered] = useState<number>(total);
  const [notDelivered, setNotDelivered] = useState<number>(0);
  const [occ, setOcc] = useState<Occurrence[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentScore, setCurrentScore] = useState<number>(100);
  const [newScore, setNewScore] = useState<number>(100);

  useEffect(() => {
    if (!oferta.entregador_id) return;
    (supabase as any).from("entregadores").select("reliability_score")
      .eq("id", oferta.entregador_id).maybeSingle()
      .then(({ data }: any) => setCurrentScore(data?.reliability_score ?? 100));
  }, [oferta.entregador_id]);

  function goStep2() {
    if (delivered + notDelivered !== total) {
      toast.error(`⚠️ O total deve ser igual a ${total} pacotes`);
      return;
    }
    if (notDelivered === 0) {
      setOcc([]);
      goStep3([], delivered);
      return;
    }
    const arr: Occurrence[] = Array.from({ length: notDelivered }, (_, i) => ({
      numero: i + 1, motivo: null, sub_motivo: null, fotos: [],
      package_id: "", package_id_scan_method: null,
    }));
    setOcc(arr);
    setStep(2);
  }

  function goStep3(occList = occ, deliveredN = delivered) {
    let impact = 0;
    for (const o of occList) if (o.motivo) impact += SCORE[o.motivo];
    const pct = total ? deliveredN / total : 0;
    if (pct === 1) impact += 10;
    else if (pct >= 0.95) impact += 5;
    setNewScore(currentScore + impact);
    setStep(3);
  }

  async function confirmClose() {
    setSubmitting(true);
    try {
      const sb = supabase as any;
      if (occ.length > 0) {
        const rows = occ.map((o) => ({
          oferta_id: oferta.id,
          entregador_id: oferta.entregador_id,
          empresa_id: oferta.empresa_id,
          numero_pacote: o.numero,
          motivo: o.motivo,
          sub_motivo: o.sub_motivo,
          fotos_urls: o.fotos,
          score_impact: o.motivo ? SCORE[o.motivo] : 0,
          package_id: o.package_id.trim() || null,
          package_id_scan_method: o.package_id_scan_method,
        }));
        const { error } = await sb.from("entregas_ocorrencias").insert(rows);
        if (error) throw error;
      }

      const { error: e2 } = await sb.from("ofertas").update({
        status: "completed",
        pacotes_entregues: delivered,
        pacotes_nao_entregues: notDelivered,
        closed_at: new Date().toISOString(),
      }).eq("id", oferta.id);
      if (e2) throw e2;

      for (const o of occ) {
        if (!o.motivo) continue;
        await sb.rpc("apply_reliability_event", {
          _entregador_id: oferta.entregador_id,
          _evento: o.motivo,
          _pontos: SCORE[o.motivo],
          _descricao: `Pacote ${o.numero} - ${MOTIVO_INFO[o.motivo].label}`,
        });
      }
      const pct = total ? delivered / total : 0;
      if (pct === 1) {
        await sb.rpc("apply_reliability_event", {
          _entregador_id: oferta.entregador_id, _evento: "route_completed",
          _pontos: 10, _descricao: `Rota ${oferta.titulo} 100% entregue`,
        });
      } else if (pct >= 0.95) {
        await sb.rpc("apply_reliability_event", {
          _entregador_id: oferta.entregador_id, _evento: "route_completed",
          _pontos: 5, _descricao: `Rota ${oferta.titulo} ${(pct * 100).toFixed(0)}% entregue`,
        });
      }

      await sb.from("entregas").upsert({
        oferta_id: oferta.id,
        empresa_id: oferta.empresa_id,
        entregador_id: oferta.entregador_id,
        valor: delivered * valorPorPacote,
        status: "pendente",
      }, { onConflict: "oferta_id" });

      await sb.from("admin_notifications").insert({
        type: "route_closed",
        title: `Rota fechada: ${oferta.titulo}`,
        body: `✅ ${delivered} entregues / ❌ ${notDelivered} não entregues`,
        link: `/ofertas`,
      });

      setStep(4);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao fechar rota");
    } finally {
      setSubmitting(false);
    }
  }

  const valorAReceber = delivered * valorPorPacote;
  const startedAt = new Date(oferta.updated_at);

  return (
    <Dialog open onOpenChange={(v) => !v && (step === 4 ? onClosed() : onClose())}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fechar rota — passo {step} de 4</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="font-medium">{oferta.titulo}</p>
              <p className="text-xs text-muted-foreground">
                Total: <strong>{total}</strong> pacotes · Iniciada às {startedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-base">✅ Pacotes entregues</Label>
              <Input type="number" min={0} max={total} className="h-14 text-2xl font-bold"
                value={delivered}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                  setDelivered(v); setNotDelivered(total - v);
                }} />
            </div>
            <div className="space-y-2">
              <Label className="text-base">❌ Pacotes não entregues</Label>
              <Input type="number" min={0} max={total} className="h-14 text-2xl font-bold"
                value={notDelivered}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                  setNotDelivered(v); setDelivered(total - v);
                }} />
            </div>
            {delivered + notDelivered !== total && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                ⚠️ O total deve ser igual a {total} pacotes
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={goStep2}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <Step2
            occurrences={occ}
            setOccurrences={setOcc}
            ofertaId={oferta.id}
            onBack={() => setStep(1)}
            onNext={() => {
              for (const o of occ) {
                if (!o.motivo) return toast.error(`Selecione um motivo para o pacote ${o.numero}`);
                if (MOTIVO_INFO[o.motivo].photoRequired && o.fotos.length === 0) {
                  return toast.error(`Foto obrigatória para o pacote ${o.numero}`);
                }
                if (MOTIVO_INFO[o.motivo].pkgIdRequired && !o.package_id.trim()) {
                  return toast.error(`ID do pacote obrigatório para o pacote ${o.numero}`);
                }
              }
              goStep3();
            }}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-primary/30 bg-muted/30 p-4 text-sm">
              <p className="mb-3 font-bold">{oferta.titulo}</p>
              <p>✅ Entregues: <strong>{delivered} pacotes</strong></p>
              <p>❌ Não entregues: <strong>{notDelivered}</strong></p>
              {occ.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium">Motivos:</p>
                  <ul className="ml-4 list-disc text-xs">
                    {summarize(occ).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                  <p className="mt-2 text-xs">📸 {occ.reduce((n, o) => n + o.fotos.length, 0)} fotos anexadas</p>
                </div>
              )}
              <div className="mt-4 border-t pt-3">
                <p>💰 Você vai receber:</p>
                <p className="text-2xl font-bold text-primary">R$ {valorAReceber.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{delivered} × R$ {valorPorPacote.toFixed(2)}</p>
              </div>
              <div className="mt-3 border-t pt-3 text-xs">
                <p>Impacto no score: <strong className={newScore - currentScore < 0 ? "text-destructive" : "text-emerald-700"}>{newScore - currentScore >= 0 ? "+" : ""}{newScore - currentScore} pontos</strong></p>
                <p>Novo score: <strong>{newScore}</strong> ({levelLabel(newScore)})</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(notDelivered > 0 ? 2 : 1)} className="flex-1">Editar</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={confirmClose} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fechar rota"}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
            <h3 className="text-xl font-bold">Rota fechada com sucesso!</h3>
            <div className="rounded-lg bg-muted/40 p-4 text-sm">
              <p>Entregues: <strong>{delivered} pacotes</strong></p>
              <p>Não entregues: <strong>{notDelivered} pacotes</strong></p>
              <p className="mt-3 text-2xl font-bold text-primary">💰 R$ {valorAReceber.toFixed(2)} a receber</p>
              <p className="mt-2 text-xs text-muted-foreground">A empresa será notificada para processar seu pagamento.</p>
            </div>
            <Button className="w-full bg-primary text-primary-foreground" onClick={onClosed}>Voltar para o início</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function summarize(occ: Occurrence[]): string[] {
  const map = new Map<string, number>();
  for (const o of occ) {
    if (!o.motivo) continue;
    const key = MOTIVO_INFO[o.motivo].label + (o.sub_motivo ? ` (${SUB_MOTIVOS.find((s) => s.v === o.sub_motivo)?.label ?? o.sub_motivo})` : "");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([k, n]) => `${n}× ${k}`);
}

function levelLabel(score: number): string {
  if (score >= 90) return "Diamond ⭐⭐⭐⭐⭐";
  if (score >= 75) return "Gold ⭐⭐⭐⭐";
  if (score >= 60) return "Silver ⭐⭐⭐";
  if (score >= 40) return "Bronze ⭐⭐";
  if (score >= 0) return "Em risco ⚠️";
  return "Suspenso ❌";
}

/* ------------------------------------------------------------ */
/* Step 2                                                        */
/* ------------------------------------------------------------ */
function Step2({
  occurrences, setOccurrences, ofertaId, onBack, onNext,
}: {
  occurrences: Occurrence[];
  setOccurrences: (o: Occurrence[]) => void;
  ofertaId: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const [cameraFor, setCameraFor] = useState<number | null>(null);
  const [scannerFor, setScannerFor] = useState<number | null>(null);
  const [confirmDanger, setConfirmDanger] = useState<{ idx: number; motivo: Motivo } | null>(null);

  function update(idx: number, patch: Partial<Occurrence>) {
    setOccurrences(occurrences.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }

  function selectMotivo(idx: number, m: Motivo) {
    if (m === "address_not_visited") { setConfirmDanger({ idx, motivo: m }); return; }
    update(idx, { motivo: m, sub_motivo: null });
  }

  return (
    <>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {occurrences.map((o, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-3">
            <p className="font-semibold">Pacote {o.numero} — O que aconteceu?</p>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(MOTIVO_INFO) as Motivo[]).map((m) => {
                const info = MOTIVO_INFO[m];
                const selected = o.motivo === m;
                return (
                  <button
                    key={m} type="button"
                    onClick={() => selectMotivo(i, m)}
                    className={`flex items-center justify-between rounded-md border-2 px-3 py-2 text-sm text-left transition ${
                      selected ? "border-primary bg-primary/5" : info.cls
                    }`}
                  >
                    <span>{info.emoji} {info.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {SCORE[m] === 0 ? "sem impacto" : `${SCORE[m]} pts`}
                    </span>
                  </button>
                );
              })}
            </div>

            {o.motivo === "could_not_deliver" && (
              <div className="grid grid-cols-3 gap-2">
                {SUB_MOTIVOS.map((s) => (
                  <button key={s.v} type="button"
                    onClick={() => update(i, { sub_motivo: s.v })}
                    className={`rounded-md border px-2 py-1 text-xs ${o.sub_motivo === s.v ? "border-primary bg-primary/5" : ""}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {o.motivo && (
              <div className="space-y-2 rounded-md border border-dashed p-2">
                <Label className="text-sm font-medium">
                  ID do pacote {MOTIVO_INFO[o.motivo].pkgIdRequired && <span className="text-destructive">*</span>}
                </Label>
                <p className="text-[11px] text-muted-foreground">Escaneie o código de barras ou digite manualmente</p>
                <Input
                  inputMode="numeric"
                  placeholder="Digite o ID do pacote"
                  value={o.package_id}
                  onChange={(e) => update(i, { package_id: e.target.value, package_id_scan_method: e.target.value ? "manual" : null })}
                />
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setScannerFor(i)}>
                  <ScanLine className="mr-1 h-4 w-4" /> 📷 Escanear código de barras
                </Button>
              </div>
            )}

            {o.motivo && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {o.fotos.map((p, j) => (
                    <PhotoThumb key={j} path={p} onRemove={() => update(i, { fotos: o.fotos.filter((_, k) => k !== j) })} />
                  ))}
                </div>
                {o.fotos.length < 3 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setCameraFor(i)}>
                    <Camera className="mr-1 h-4 w-4" />
                    Tirar foto {MOTIVO_INFO[o.motivo].photoRequired ? "(obrigatória)" : "(opcional)"}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onBack} className="flex-1">Voltar</Button>
        <Button className="flex-1 bg-primary text-primary-foreground" onClick={onNext}>Revisar</Button>
      </div>

      {cameraFor !== null && (
        <CameraCapture
          ofertaId={ofertaId}
          packageNumber={occurrences[cameraFor].numero}
          onCancel={() => setCameraFor(null)}
          onCapture={(path) => {
            const idx = cameraFor;
            setOccurrences(occurrences.map((o, i) => i === idx ? { ...o, fotos: [...o.fotos, path] } : o));
            setCameraFor(null);
          }}
        />
      )}

      {scannerFor !== null && (
        <BarcodeScanner
          onCancel={() => setScannerFor(null)}
          onDetected={(code) => {
            const idx = scannerFor;
            setOccurrences(occurrences.map((o, i) => i === idx ? { ...o, package_id: code, package_id_scan_method: "camera" } : o));
            setScannerFor(null);
          }}
        />
      )}

      {confirmDanger && (
        <Dialog open onOpenChange={() => setConfirmDanger(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Atenção!</DialogTitle></DialogHeader>
            <p className="text-sm">
              "Endereço não visitado" vai deduzir <strong>20 pontos</strong> do seu score de confiabilidade.
              Tem certeza que o endereço não foi visitado?
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDanger(null)}>Mudar motivo</Button>
              <Button className="flex-1 bg-destructive text-destructive-foreground"
                onClick={() => {
                  update(confirmDanger.idx, { motivo: confirmDanger.motivo, sub_motivo: null });
                  setConfirmDanger(null);
                }}>
                Sim, confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function PhotoThumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("entregas-fotos").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  return (
    <div className="relative h-16 w-16 overflow-hidden rounded border">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-muted" />}
      <button type="button" onClick={onRemove}
        className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Camera helpers — robust fallback chain                        */
/* ------------------------------------------------------------ */
async function tryGetCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: { facingMode: { ideal: "user" } } },
    { video: true },
  ];
  let lastErr: any = null;
  for (const c of attempts) {
    try { return await navigator.mediaDevices.getUserMedia(c); }
    catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("Câmera indisponível");
}

function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function compressImage(source: HTMLCanvasElement | Blob): Promise<Blob> {
  // Source can be a canvas (camera) or a File/Blob (gallery)
  let canvas: HTMLCanvasElement;
  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    const url = URL.createObjectURL(source);
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
    const maxW = 1280;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
  }
  let q = 0.85;
  let b: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    b = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
    if (!b || b.size <= 1_000_000) break;
    q -= 0.12;
  }
  if (!b) throw new Error("Falha ao processar imagem");
  return b;
}

/* ------------------------------------------------------------ */
/* Camera — fullscreen with fallback                             */
/* ------------------------------------------------------------ */
function CameraCapture({ ofertaId, packageNumber, onCancel, onCapture }: {
  ofertaId: string; packageNumber: number;
  onCancel: () => void; onCapture: (path: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);

  async function start() {
    setError(null); setPermDenied(false);
    try {
      const s = await tryGetCamera();
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") setPermDenied(true);
      setError(e?.message ?? "Não foi possível abrir a câmera");
    }
  }

  useEffect(() => {
    start();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function snap() {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const maxW = 1280;
    const scale = Math.min(1, maxW / v.videoWidth);
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    try {
      const b = await compressImage(c);
      setBlob(b); setPreview(URL.createObjectURL(b));
    } catch (e: any) { toast.error(e.message); }
  }

  async function fromGallery() {
    const f = await pickImageFile();
    if (!f) return;
    try {
      const b = await compressImage(f);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setBlob(b); setPreview(URL.createObjectURL(b));
    } catch (e: any) { toast.error(e.message); }
  }

  async function upload() {
    if (!blob) return;
    setUploading(true);
    const path = `${ofertaId}/${packageNumber}/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("entregas-fotos").upload(path, blob, { contentType: "image/jpeg" });
    setUploading(false);
    if (error) return toast.error(error.message);
    onCapture(path);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-3">
        <p className="text-sm font-medium">Foto do pacote {packageNumber}</p>
        <button onClick={onCancel} className="rounded-full bg-white/10 p-2"><X className="h-5 w-5" /></button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {!preview && !error && (
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        )}
        {preview && (
          <img src={preview} alt="preview" className="h-full w-full object-contain" />
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
            <p className="text-base font-medium">Não foi possível abrir a câmera.</p>
            {permDenied && (
              <div className="rounded-md bg-white/10 p-3 text-left text-xs">
                <p className="font-semibold">Permissão da câmera negada. Para habilitar:</p>
                <ol className="ml-4 list-decimal space-y-1 pt-1">
                  <li>Toque no ícone de cadeado na barra de endereço</li>
                  <li>Permita o acesso à câmera</li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
            )}
            <p className="text-sm text-white/80">Escolha uma opção:</p>
            <div className="flex w-full max-w-xs flex-col gap-2">
              <Button onClick={fromGallery} className="bg-primary text-primary-foreground">
                <ImageIcon className="mr-1 h-4 w-4" /> Abrir galeria
              </Button>
              <Button variant="outline" onClick={start} className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <RefreshCw className="mr-1 h-4 w-4" /> Tentar câmera novamente
              </Button>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!preview && !error && (
        <div className="flex items-center justify-around p-6">
          <button onClick={fromGallery} className="rounded-full bg-white/10 p-3" aria-label="Galeria">
            <ImageIcon className="h-6 w-6" />
          </button>
          <button onClick={snap} aria-label="Capturar"
            className="h-20 w-20 rounded-full border-4 border-white bg-white/20 active:scale-95 transition">
            <span className="block h-full w-full rounded-full bg-white" />
          </button>
          <div className="w-12" />
        </div>
      )}

      {preview && (
        <div className="flex gap-3 p-4">
          <Button variant="outline" className="flex-1 border-white/30 bg-transparent text-white hover:bg-white/10"
            onClick={() => { setPreview(null); setBlob(null); start(); }}>
            Tirar de novo
          </Button>
          <Button className="flex-1 bg-primary text-primary-foreground" onClick={upload} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Usar foto"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Barcode Scanner (ZXing)                                       */
/* ------------------------------------------------------------ */
function BarcodeScanner({ onCancel, onDetected }: {
  onCancel: () => void; onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [hint, setHint] = useState(false);

  async function start() {
    setError(null); setPermDenied(false); setHint(false);
    try {
      const stream = await tryGetCamera();
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.QR_CODE,
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;
      reader.decodeFromVideoElement(videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          try { (navigator as any).vibrate?.(200); } catch {}
          try {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AC) {
              const ctx = new AC();
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.frequency.value = 880; g.gain.value = 0.1;
              o.start(); o.stop(ctx.currentTime + 0.15);
            }
          } catch {}
          toast.success(`✅ Código lido: ${code}`);
          reader.reset();
          streamRef.current?.getTracks().forEach((t) => t.stop());
          onDetected(code);
        }
        // ignore NotFoundException — emitted continuously while scanning
      });

      setTimeout(() => setHint(true), 10_000);
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") setPermDenied(true);
      setError(e?.message ?? "Não foi possível abrir a câmera");
    }
  }

  useEffect(() => {
    start();
    return () => {
      try { readerRef.current?.reset(); } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [manual, setManual] = useState("");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-3">
        <p className="text-sm font-medium">Escanear código</p>
        <button onClick={onCancel} className="rounded-full bg-white/10 p-2"><X className="h-5 w-5" /></button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {!error && (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
            {/* Targeting frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-56 w-72 rounded-lg border-2 border-white/70">
                <div className="absolute inset-x-0 top-1/2 h-0.5 animate-pulse bg-primary shadow-[0_0_12px_2px_hsl(var(--primary))]" />
              </div>
            </div>
            <p className="absolute bottom-24 left-0 right-0 text-center text-sm">Aponte para o código de barras</p>
            {hint && (
              <div className="absolute bottom-32 left-1/2 w-72 -translate-x-1/2 rounded-md bg-black/70 p-3 text-center text-xs">
                Com dificuldade? Digite o código manualmente abaixo.
                <div className="mt-2 flex gap-1">
                  <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="ID do pacote"
                    className="h-8 bg-white text-black" inputMode="numeric" />
                  <Button size="sm" className="bg-primary text-primary-foreground"
                    onClick={() => manual.trim() && onDetected(manual.trim())}>OK</Button>
                </div>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
            <p className="text-base font-medium">Não foi possível abrir a câmera.</p>
            {permDenied && (
              <div className="rounded-md bg-white/10 p-3 text-left text-xs">
                <p className="font-semibold">Permissão negada. Para habilitar:</p>
                <ol className="ml-4 list-decimal space-y-1 pt-1">
                  <li>Toque no ícone de cadeado na barra de endereço</li>
                  <li>Permita o acesso à câmera</li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
            )}
            <div className="flex w-full max-w-xs flex-col gap-2">
              <div className="flex gap-1">
                <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Digite o ID"
                  className="h-9 bg-white text-black" inputMode="numeric" />
                <Button className="bg-primary text-primary-foreground"
                  onClick={() => manual.trim() && onDetected(manual.trim())}>Usar</Button>
              </div>
              <Button variant="outline" onClick={start} className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <RefreshCw className="mr-1 h-4 w-4" /> Tentar câmera novamente
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <Button variant="outline" className="w-full border-white/30 bg-transparent text-white hover:bg-white/10" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
