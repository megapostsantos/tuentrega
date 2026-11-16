import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchCEP, maskCEP, onlyDigits } from "@/lib/validators";

type Ficha = { codigo: string; cep: string; endereco: string; numero: string; bairro: string; cidade: string; uf: string; confianca: string };
export type ParadaDaFoto = { code: string; cep: string; endereco: string };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Reduz a foto (lado maior 1000px, JPEG) antes de enviar: menos dados, menos custo. */
async function reduzir(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8).split(",")[1];
}

/** Foto da etiqueta → ficha para conferir → vira uma parada (código + CEP + endereço). */
export function FotoEtiquetaDialog({ open, onClose, onAdd, jaTem }: { open: boolean; onClose: () => void; onAdd: (p: ParadaDaFoto) => void; jaTem: (codigo: string) => boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [f, setF] = useState<Ficha | null>(null);
  const [conf, setConf] = useState<null | { ok: boolean; msg: string }>(null);
  const [feitas, setFeitas] = useState(0);
  const set = (k: keyof Ficha) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => (s ? { ...s, [k]: e.target.value } : s));

  async function conferirCep(ficha: Ficha) {
    if (onlyDigits(ficha.cep).length !== 8) { setConf({ ok: false, msg: "CEP não lido: digite o CEP de 8 números." }); return; }
    const r = await fetchCEP(ficha.cep);
    if (!r) { setConf({ ok: false, msg: "Não consegui conferir este CEP (sem internet ou CEP que não existe). Confira os números." }); return; }
    const bate = !ficha.cidade || semAcento(r.localidade) === semAcento(ficha.cidade);
    setF((s) => (s ? { ...s, endereco: s.endereco || r.logradouro || "", bairro: s.bairro || r.bairro || "", cidade: s.cidade || r.localidade, uf: s.uf || r.uf } : s));
    setConf(bate ? { ok: true, msg: `CEP confere: ${r.logradouro ? r.logradouro + ", " : ""}${r.localidade}/${r.uf}` } : { ok: false, msg: `Atenção: o CEP é de ${r.localidade}/${r.uf}, mas a etiqueta diz ${ficha.cidade}. Confira.` });
  }

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setLendo(true); setF(null); setConf(null);
    try {
      const image = await reduzir(file);
      const r = await fetch("/api/ai/ler-etiqueta", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ image, mediaType: "image/jpeg" }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error ?? "Falha na leitura");
      setF(j as Ficha);
      await conferirCep(j as Ficha);
    } catch (err: any) {
      toast.error(err?.message ?? "Não consegui ler a etiqueta.");
    } finally { setLendo(false); }
  }

  function adicionar() {
    if (!f) return;
    const cep = onlyDigits(f.cep);
    if (cep.length !== 8) return toast.error("Digite o CEP de 8 números.");
    const codigo = f.codigo.trim() || `E${Date.now().toString(36).toUpperCase()}`;
    if (jaTem(codigo)) return toast.warning(`Já adicionado: ${codigo}`);
    const rua = [f.endereco.trim(), f.numero.trim()].filter(Boolean).join(", ");
    const endereco = [rua, f.bairro.trim()].filter(Boolean).join(" - ");
    onAdd({ code: codigo, cep, endereco });
    setFeitas((n) => n + 1); setF(null); setConf(null);
    toast.success(`✅ Parada adicionada${f.codigo ? `: ${f.codigo}` : ""}`);
  }

  function fechar() { setF(null); setConf(null); setFeitas(0); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foto da etiqueta</DialogTitle>
          <DialogDescription>Fotografe a etiqueta com o endereço. O app lê o código e o CEP, você confere e adiciona a parada.{feitas > 0 ? ` ${feitas} adicionada(s) agora.` : ""}</DialogDescription>
        </DialogHeader>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={aoEscolher} />
        {!f && (
          <Button size="lg" onClick={() => inputRef.current?.click()} disabled={lendo}>
            {lendo ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Lendo a etiqueta…</> : <><Camera className="mr-2 h-5 w-5" />Tirar foto da etiqueta</>}
          </Button>
        )}
        {f && (
          <div className="space-y-3">
            {conf && (
              <div className={`flex items-start gap-2 rounded-md p-2 text-xs ${conf.ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}>
                {conf.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{conf.msg}</span>
              </div>
            )}
            {f.confianca === "baixa" && <p className="text-xs text-amber-700">A etiqueta estava difícil de ler. Confira cada campo antes de adicionar.</p>}
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <div className="space-y-1"><Label htmlFor="et-cod">Código do pacote</Label><Input id="et-cod" value={f.codigo} onChange={set("codigo")} /></div>
              <div className="space-y-1"><Label htmlFor="et-cep">CEP</Label><Input id="et-cep" inputMode="numeric" value={maskCEP(f.cep)} onChange={(e) => setF((s) => (s ? { ...s, cep: onlyDigits(e.target.value).slice(0, 8) } : s))} onBlur={() => f && conferirCep(f)} /></div>
            </div>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div className="space-y-1"><Label htmlFor="et-rua">Rua</Label><Input id="et-rua" value={f.endereco} onChange={set("endereco")} /></div>
              <div className="space-y-1"><Label htmlFor="et-num">Nº</Label><Input id="et-num" value={f.numero} onChange={set("numero")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label htmlFor="et-bairro">Bairro</Label><Input id="et-bairro" value={f.bairro} onChange={set("bairro")} /></div>
              <div className="space-y-1"><Label htmlFor="et-cid">Cidade</Label><Input id="et-cid" value={f.cidade} onChange={set("cidade")} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setF(null); setConf(null); }}><RotateCcw className="mr-1 h-4 w-4" />Ler outra</Button>
              <Button className="flex-1" onClick={adicionar}>Adicionar parada</Button>
            </div>
          </div>
        )}
        <Button variant="ghost" onClick={fechar}>Concluir</Button>
      </DialogContent>
    </Dialog>
  );
}
