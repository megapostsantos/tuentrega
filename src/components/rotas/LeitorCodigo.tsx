import { useEffect, useRef, useState } from "react";
import * as zxingPkg from "@zxing/library";
import type { BrowserMultiFormatReader as ReaderT, DecodeHintType as HintT } from "@zxing/library";
import { Camera, ImageUp, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { extrairIdPacote } from "@/lib/codigo-pacote";

const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = zxingPkg;

function hints() {
  const h = new Map<HintT, unknown>();
  h.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.DATA_MATRIX, BarcodeFormat.ITF, BarcodeFormat.PDF_417,
  ]);
  h.set(DecodeHintType.TRY_HARDER, true);
  return h;
}

function feedback() {
  try { (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(120); } catch { /* ignore */ }
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.1; o.start(); o.stop(ctx.currentTime + 0.15);
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 250);
  } catch { /* ignore */ }
}

/** Abre a câmera e lê QR code ou código de barras da etiqueta. Devolve o ID já limpo. */
export function LeitorCodigo({ open, onClose, onCodigo }: { open: boolean; onClose: () => void; onCodigo: (id: string, bruto: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<ReaderT | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [lendoFoto, setLendoFoto] = useState(false);

  function parar() {
    try { readerRef.current?.reset(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; readerRef.current = null; setAtivo(false);
  }

  function achou(texto: string) {
    const id = extrairIdPacote(texto);
    if (!id) return;
    feedback();
    parar();
    onCodigo(id, texto);
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setErro(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este aparelho não permite abrir a câmera aqui. Use a opção de foto da etiqueta.");
        let stream: MediaStream | null = null;
        for (const c of [{ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } }, { video: true }] as MediaStreamConstraints[]) {
          try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch { /* tenta o próximo */ }
        }
        if (!stream) throw new Error("Não foi possível abrir a câmera. Permita o acesso à câmera ou fotografe a etiqueta.");
        if (cancelado) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream; await v.play();
        const reader = new BrowserMultiFormatReader(hints());
        readerRef.current = reader;
        reader.decodeFromStream(stream, v, (r) => { if (r) achou(r.getText()); });
        setAtivo(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível abrir a câmera");
      }
    })();
    return () => { cancelado = true; parar(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function lerFoto(file: File) {
    setLendoFoto(true); setErro(null);
    const url = URL.createObjectURL(file);
    try {
      const r = await new BrowserMultiFormatReader(hints()).decodeFromImageUrl(url);
      achou(r.getText());
    } catch {
      setErro("Não consegui ler o código nessa foto. Aproxime, deixe a etiqueta bem iluminada e tente de novo.");
    } finally { URL.revokeObjectURL(url); setLendoFoto(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ler etiqueta do pacote</DialogTitle>
          <DialogDescription>Aponte a câmera para o QR code ou o código de barras da etiqueta.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
          {ativo && <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80 shadow-[0_0_8px_red]" />}
          {!ativo && !erro && <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {erro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-4 text-center text-sm text-white">
              <Camera className="h-7 w-7" />{erro}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
            {lendoFoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}Fotografar a etiqueta
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) lerFoto(f); }} />
          </label>
          <Button variant="ghost" onClick={onClose}>Digitar manualmente</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ScanLine };
