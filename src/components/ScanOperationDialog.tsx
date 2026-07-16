import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as zxingPkg from "@zxing/library";
import type { BrowserMultiFormatReader as BrowserMultiFormatReaderType, DecodeHintType as DecodeHintTypeT } from "@zxing/library";
const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = zxingPkg;
import { ScanLine, X, Trash2, ArrowLeft, ArrowRight, Loader2, CheckCircle2, ClipboardPaste, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  empresaId: string;
  onClose: () => void;
  onCreated: (operacaoId: string) => void;
};

type PkgRow = { code: string; endereco: string };

async function tryGetCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
    { video: { facingMode: { ideal: "user" } } },
    { video: true },
  ];
  let lastErr: unknown = null;
  for (const c of attempts) {
    try { return await navigator.mediaDevices.getUserMedia(c); } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("Câmera indisponível");
}

function beep() {
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.1;
    o.start(); o.stop(ctx.currentTime + 0.15);
    setTimeout(() => { try { ctx.close(); } catch { /* noop */ } }, 200);
  } catch { /* noop */ }
}

export function ScanOperationDialog({ open, empresaId, onClose, onCreated }: Props) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [tipoServico, setTipoServico] = useState<"flex" | "nex">("flex");
  const [nxCode, setNxCode] = useState("");
  const [sacaQr, setSacaQr] = useState("");
  const [pkgs, setPkgs] = useState<PkgRow[]>([]);
  const [valorPorPacote, setValorPorPacote] = useState<number>(1.8);
  const [dataOperacao, setDataOperacao] = useState<string>(new Date().toISOString().slice(0, 10));
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep(0); setTipoServico("flex"); setNxCode(""); setSacaQr("");
    setPkgs([]); setValorPorPacote(1.8);
    setDataOperacao(new Date().toISOString().slice(0, 10));
    setPasteOpen(false); setPasteText(""); setSubmitting(false);
  }

  function handleClose() { reset(); onClose(); }

  function addCode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    setPkgs((prev) => {
      if (prev.some((p) => p.code === code)) {
        toast.warning(`Já adicionado: ${code}`);
        return prev;
      }
      beep();
      toast.success(`✅ ${code}`);
      return [...prev, { code, endereco: "" }];
    });
  }

  function removeCode(code: string) {
    setPkgs((prev) => prev.filter((p) => p.code !== code));
  }

  function applyBulkAddresses() {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    setPkgs((prev) => prev.map((p, i) => ({ ...p, endereco: lines[i] ?? p.endereco })));
    setPasteOpen(false); setPasteText("");
    toast.success(`${Math.min(lines.length, pkgs.length)} endereços distribuídos`);
  }

  async function createOperation() {
    if (submitting) return;
    if (pkgs.length === 0) return;
    if (!(valorPorPacote > 0)) { toast.error("Informe um valor por pacote válido"); return; }
    if (tipoServico === "nex" && (!nxCode.trim() || !sacaQr.trim())) {
      toast.error("Informe o código NX e o QR code da saca");
      return;
    }
    setSubmitting(true);
    try {
      const total = pkgs.length;
      const valorTotal = total * valorPorPacote;
      const tituloBase = tipoServico === "nex" ? "Operação Nex" : "Operação Scanner";

      const { data: op, error: opErr } = await supabase.from("operacoes").insert({
        empresa_id: empresaId,
        data_operacao: dataOperacao,
        total_pacotes_sistema: total,
        total_pacotes_contados: total,
        total_paradas: total,
        valor_por_pacote: valorPorPacote,
        metodo_divisao: "manual",
        status: "draft",
        tipo_servico: tipoServico,
        nx_code: tipoServico === "nex" ? nxCode.trim() : null,
        saca_qr_code: tipoServico === "nex" ? sacaQr.trim() : null,
      } as any).select("id").single();
      if (opErr || !op) throw opErr ?? new Error("Falha ao criar operação");

      const { data: ofe, error: ofeErr } = await supabase.from("ofertas").insert({
        empresa_id: empresaId,
        titulo: `${tituloBase} - ${new Date(dataOperacao).toLocaleDateString("pt-BR")}`,
        valor: valorTotal,
        valor_por_pacote: valorPorPacote,
        quantidade_pacotes: total,
        quantidade_paradas: total,
        data_trabalho: dataOperacao,
        operacao_id: op.id,
        status: "draft",
        tipo: "public",
        tipo_servico: tipoServico,
      } as any).select("id").single();
      if (ofeErr || !ofe) throw ofeErr ?? new Error("Falha ao criar oferta");

      const { error: rotaErr } = await supabase.from("rotas_operacao").insert({
        operacao_id: op.id,
        empresa_id: empresaId,
        nome: tipoServico === "nex" ? `Saca ${nxCode.trim()}` : "Rota Scanner",
        quantidade_pacotes: total,
        quantidade_paradas: total,
        valor_total: valorTotal,
        oferta_id: ofe.id,
        status: "draft",
      });
      if (rotaErr) throw rotaErr;

      const rows = pkgs.map((p, i) => ({
        oferta_id: ofe.id,
        operacao_id: op.id,
        numero_pacote: i + 1,
        codigo_pacote: p.code,
        nx_code: tipoServico === "nex" ? p.code : null,
        endereco_entrega: p.endereco || null,
        status: "pending",
      }));
      const { error: pkgErr } = await supabase.from("entregas_pacotes").insert(rows as any);
      if (pkgErr) throw pkgErr;

      toast.success("Operação criada com sucesso!");
      const id = op.id;
      reset();
      onCreated(id);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erro ao criar operação";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const valorTotal = pkgs.length * valorPorPacote;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Nova Operação por Scanner
            <span className="ml-auto text-xs font-normal text-muted-foreground">Etapa {step} de 3</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {step === 1 && (
            <Step1Scanner
              pkgs={pkgs}
              onScan={addCode}
              onRemove={removeCode}
              onNext={() => setStep(2)}
              onCancel={handleClose}
            />
          )}

          {step === 2 && (
            <Step2Addresses
              pkgs={pkgs}
              setPkgs={setPkgs}
              valorPorPacote={valorPorPacote}
              setValorPorPacote={setValorPorPacote}
              dataOperacao={dataOperacao}
              setDataOperacao={setDataOperacao}
              onOpenPaste={() => setPasteOpen(true)}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <Step3Confirm
              total={pkgs.length}
              valorPorPacote={valorPorPacote}
              valorTotal={valorTotal}
              dataOperacao={dataOperacao}
              submitting={submitting}
              onBack={() => setStep(2)}
              onConfirm={createOperation}
            />
          )}
        </div>

        {/* Paste bulk addresses sub-dialog */}
        <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Colar lista de endereços</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Cole um endereço por linha. Eles serão distribuídos na ordem dos pacotes ({pkgs.length} no total).
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={10}
              placeholder={"Rua A, 123, Bairro, Cidade\nRua B, 456, Bairro, Cidade\n..."}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPasteOpen(false)}>Cancelar</Button>
              <Button onClick={applyBulkAddresses} disabled={!pasteText.trim()}>Distribuir</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

/* -------- Step 1 -------- */
function Step1Scanner({
  pkgs, onScan, onRemove, onNext, onCancel,
}: {
  pkgs: PkgRow[]; onScan: (code: string) => void; onRemove: (code: string) => void;
  onNext: () => void; onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReaderType | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  async function start() {
    setError(null);
    try {
      const stream = await tryGetCamera();
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const hints = new Map<DecodeHintTypeT, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX, BarcodeFormat.ITF,
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;
      reader.decodeFromStream(stream, videoRef.current, (result) => {
        if (!result) return;
        const code = result.getText();
        const now = Date.now();
        if (code === lastCodeRef.current.code && now - lastCodeRef.current.at < 1500) return;
        lastCodeRef.current = { code, at: now };
        try { (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(120); } catch { /* noop */ }
        onScan(code);
      });
      setActive(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível abrir a câmera";
      setError(msg);
      setActive(false);
    }
  }

  function stop() {
    try { readerRef.current?.reset(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    readerRef.current = null;
    setActive(false);
  }

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border bg-black aspect-video">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        {!active && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center text-white">
            <Camera className="h-8 w-8" />
            <p className="text-sm">{error}</p>
            <Button size="sm" variant="secondary" onClick={start}>Tentar novamente</Button>
          </div>
        )}
        {active && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-3/4 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ou digite o código manualmente"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && manual.trim()) { onScan(manual.trim()); setManual(""); }
          }}
        />
        <Button
          variant="outline"
          onClick={() => { if (manual.trim()) { onScan(manual.trim()); setManual(""); } }}
        >
          Adicionar
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">{pkgs.length} pacote{pkgs.length === 1 ? "" : "s"}</span>
        </div>
        {pkgs.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Aponte a câmera para o código do pacote.</p>
        ) : (
          <ul className="max-h-60 divide-y overflow-y-auto">
            {pkgs.map((p) => (
              <li key={p.code} className="flex items-center justify-between gap-2 px-3 py-2">
                <code className="truncate text-sm">{p.code}</code>
                <Button size="sm" variant="ghost" onClick={() => onRemove(p.code)} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onCancel}><X className="mr-1 h-4 w-4" />Cancelar</Button>
        <Button onClick={onNext} disabled={pkgs.length === 0}>
          Continuar <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* -------- Step 2 -------- */
function Step2Addresses({
  pkgs, setPkgs, valorPorPacote, setValorPorPacote, dataOperacao, setDataOperacao,
  onOpenPaste, onBack, onNext,
}: {
  pkgs: PkgRow[]; setPkgs: (rows: PkgRow[]) => void;
  valorPorPacote: number; setValorPorPacote: (n: number) => void;
  dataOperacao: string; setDataOperacao: (s: string) => void;
  onOpenPaste: () => void; onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="vp">Valor por pacote (R$)</Label>
          <Input
            id="vp" type="number" step="0.01" min={0}
            value={valorPorPacote}
            onChange={(e) => setValorPorPacote(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="dt">Data da operação</Label>
          <Input id="dt" type="date" value={dataOperacao} onChange={(e) => setDataOperacao(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{pkgs.length} pacotes</span>
        <Button variant="outline" size="sm" onClick={onOpenPaste}>
          <ClipboardPaste className="mr-1 h-4 w-4" />Colar lista de endereços
        </Button>
      </div>

      <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {pkgs.map((p, i) => (
          <li key={p.code} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">#{i + 1}</span>
                <code className="text-xs text-muted-foreground">{p.code}</code>
              </div>
            </div>
            <Input
              placeholder="Ex: Rua X, 123, Bairro, Cidade"
              value={p.endereco}
              onChange={(e) => {
                const next = [...pkgs];
                next[i] = { ...next[i], endereco: e.target.value };
                setPkgs(next);
              }}
            />
          </li>
        ))}
      </ul>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
        <Button onClick={onNext} disabled={!(valorPorPacote > 0) || !dataOperacao}>
          Revisar <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* -------- Step 3 -------- */
function Step3Confirm({
  total, valorPorPacote, valorTotal, dataOperacao, submitting, onBack, onConfirm,
}: {
  total: number; valorPorPacote: number; valorTotal: number; dataOperacao: string;
  submitting: boolean; onBack: () => void; onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-base font-semibold">Resumo da operação</h3>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Data</dt>
          <dd className="text-right font-medium">{new Date(dataOperacao).toLocaleDateString("pt-BR")}</dd>
          <dt className="text-muted-foreground">Pacotes</dt>
          <dd className="text-right font-medium">{total}</dd>
          <dt className="text-muted-foreground">Valor por pacote</dt>
          <dd className="text-right font-medium">R$ {valorPorPacote.toFixed(2)}</dd>
          <dt className="text-muted-foreground">Valor total estimado</dt>
          <dd className="text-right text-lg font-bold text-primary">R$ {valorTotal.toFixed(2)}</dd>
        </dl>
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="mr-1 h-4 w-4" />Voltar
        </Button>
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" />Criando...</>
            : <><CheckCircle2 className="mr-1 h-4 w-4" />Criar Operação</>}
        </Button>
      </div>
    </div>
  );
}
