import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Loader2, Camera, Eraser, CheckCircle2, ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";

type Pacote = {
  id: string;
  oferta_id: string;
  numero_pacote: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  pacote: Pacote | null;
  entregadorId: string | undefined;
  onConfirmed: (pacoteId: string) => void;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function ProofOfDeliverySheet({ open, onClose, pacote, entregadorId, onConfirmed }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nome, setNome] = useState("");
  const [obs, setObs] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 320, h: 180 });

  useEffect(() => {
    if (open) {
      setStep(1); setNome(""); setObs("");
      setSignatureData(null); setPhoto(null); setPhotoPreview(null);
    }
  }, [open]);

  useEffect(() => {
    if (step !== 2) return;
    const el = canvasWrapRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.max(280, el.clientWidth - 2);
      setCanvasSize({ w, h: Math.round(w * 0.55) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  function clearSignature() {
    sigRef.current?.clear();
    setSignatureData(null);
  }

  function confirmSignature() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Assine antes de continuar.");
      return;
    }
    const dataUrl = sigRef.current.getCanvas().toDataURL("image/png");
    setSignatureData(dataUrl);
    setStep(3);
  }

  async function uploadFile(path: string, blob: Blob, contentType: string) {
    const { error } = await supabase.storage
      .from("provas-entrega")
      .upload(path, blob, { upsert: true, contentType });
    if (error) throw error;
    return path;
  }

  async function handleConfirm() {
    if (!pacote || !entregadorId) return;
    if (!nome.trim()) { setStep(1); toast.error("Informe o nome do recebedor."); return; }
    if (!signatureData) { setStep(2); toast.error("Assinatura obrigatória."); return; }
    if (!photo) { toast.error("Tire uma foto do pacote."); return; }

    setSaving(true);
    try {
      const base = `${entregadorId}/${pacote.oferta_id}/${pacote.id}`;
      const ts = Date.now();
      const sigBlob = dataUrlToBlob(signatureData);
      const sigPath = await uploadFile(`${base}/assinatura-${ts}.png`, sigBlob, "image/png");
      const photoExt = photo.name.split(".").pop() || "jpg";
      const photoPath = await uploadFile(`${base}/foto-${ts}.${photoExt}`, photo, photo.type || "image/jpeg");

      const { error } = await supabase
        .from("entregas_pacotes")
        .update({
          status: "delivered",
          assinatura_url: sigPath,
          foto_pod_url: photoPath,
          nome_recebedor: nome.trim(),
          observacao_entrega: obs.trim() || null,
          entregue_em: new Date().toISOString(),
        } as any)
        .eq("id", pacote.id);
      if (error) throw error;

      toast.success(`Pacote #${pacote.numero_pacote} entregue.`);
      onConfirmed(pacote.id);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao registrar entrega.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && !saving && onClose()}>
      <SheetContent side="bottom" className="max-h-[95vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} className="p-1 -ml-1">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            Prova de Entrega {pacote ? `· Pacote #${pacote.numero_pacote}` : ""}
            <span className="ml-auto text-xs font-normal text-muted-foreground">Etapa {step}/3</span>
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome de quem recebeu *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obs">Observação</Label>
                <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={3} placeholder="Deixado com porteiro, vizinho, etc. (opcional)" />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label>Assinatura do recebedor *</Label>
              <div ref={canvasWrapRef} className="rounded border bg-white touch-none">
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#111"
                  canvasProps={{
                    width: canvasSize.w,
                    height: canvasSize.h,
                    style: { width: "100%", height: canvasSize.h, display: "block" },
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={clearSignature}>
                  <Eraser className="mr-1 h-4 w-4" /> Limpar
                </Button>
                <Button className="flex-1" onClick={confirmSignature}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label>Foto do pacote *</Label>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Prévia" className="w-full rounded border" />
                  <button
                    onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded border border-dashed p-8 cursor-pointer hover:bg-accent">
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">Tirar foto do pacote</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                </label>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
          {step === 1 && (
            <Button className="flex-1" onClick={() => { if (!nome.trim()) { toast.error("Informe o nome."); return; } setStep(2); }}>
              Continuar
            </Button>
          )}
          {step === 3 && (
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleConfirm} disabled={saving || !photo}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Confirmar entrega
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
