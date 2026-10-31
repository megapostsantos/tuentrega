import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Camera, Loader2, ScanLine } from "lucide-react";
import { LeitorCodigo } from "@/components/rotas/LeitorCodigo";
import { supabase } from "@/integrations/supabase/client";
import { notifyDestinatarioPacote } from "@/lib/whatsapp-notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type PacoteIns = { id: string; numero_pacote: number; status: string };
type OfertaIns = { id: string; empresa_id: string };

const MOTIVOS = [
  { key: "ausente", label: "Cliente ausente", motivo: "could_not_deliver", sub: "ausente", foto: "Tire uma foto da fachada ou do local, mostrando o número do imóvel." },
  { key: "fechado", label: "Estabelecimento fechado", motivo: "could_not_deliver", sub: "estabelecimento_fechado", foto: "Tire uma foto da porta ou fachada fechada, com o número e o horário de funcionamento, se houver." },
  { key: "recusou", label: "Cliente recusou o pacote", motivo: "could_not_deliver", sub: "recusou", foto: "Tire uma foto do local e do pacote com a etiqueta visível." },
  { key: "endereco", label: "Endereço não encontrado", motivo: "address_not_visited", sub: "endereco_nao_encontrado", foto: "Tire uma foto do local mais próximo que você alcançou (de preferência com a placa da rua)." },
  { key: "danificado", label: "Pacote avariado", motivo: "damaged", sub: "avariado", foto: "Tire uma foto do pacote avariado, com a etiqueta (ID) legível." },
  { key: "outro", label: "Outro motivo", motivo: "could_not_deliver", sub: "outro", foto: "Tire uma foto do local ou do pacote que comprove o que aconteceu." },
];

export function InsucessoSheet({
  open, onClose, pacote, pendentes, oferta, entregadorId, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  pacote: PacoteIns | null;
  pendentes: PacoteIns[];
  oferta: OfertaIns | null;
  entregadorId: string;
  onSaved: (p: { id: string; codigo: string }) => void;
}) {
  const [choice, setChoice] = useState("ausente");
  const [codigo, setCodigo] = useState("");
  const [obs, setObs] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [lendo, setLendo] = useState(false);

  useEffect(() => {
    if (open) { setChoice("ausente"); setCodigo(""); setObs(""); setFile(null); }
  }, [open]);

  const m = MOTIVOS.find((x) => x.key === choice)!;
  const alvo = pacote ?? pendentes.slice().sort((a, b) => a.numero_pacote - b.numero_pacote)[0] ?? null;
  const id = codigo.trim().toUpperCase();
  const pronto = id.length >= 4 && !!file && !!alvo;

  async function salvar() {
    if (!oferta || !alvo) return toast.error("Não há pacote pendente para registrar.");
    if (id.length < 4) return toast.error("Digite o ID do pacote, como está na etiqueta.");
    if (!file) return toast.error("Tire a foto exigida para comprovar.");
    setSaving(true);
    try {
      const sb = supabase as any;
      const { data: dup } = await sb.from("entregas_ocorrencias").select("id").eq("oferta_id", oferta.id).eq("package_id", id).limit(1);
      if (dup?.length) throw new Error("Este ID de pacote já foi registrado nesta rota.");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${entregadorId}/${oferta.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("entregas-fotos").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw new Error("Falha ao enviar a foto. Verifique a internet e tente de novo.");

      const { error: oErr } = await sb.from("entregas_ocorrencias").insert({
        oferta_id: oferta.id,
        entregador_id: entregadorId,
        empresa_id: oferta.empresa_id,
        numero_pacote: alvo.numero_pacote,
        package_id: id,
        package_id_scan_method: "manual",
        tipo: m.motivo,
        motivo: m.motivo,
        sub_motivo: [m.sub, obs.trim()].filter(Boolean).join(" — "),
        fotos_urls: [path],
      });
      if (oErr) throw oErr;

      const { error: pErr } = await sb.from("entregas_pacotes")
        .update({ status: "not_delivered", codigo_pacote: id, motivo_nao_entrega: m.label })
        .eq("id", alvo.id);
      if (pErr) throw pErr;

      notifyDestinatarioPacote(alvo.id, "tentativa_falha").catch(() => {});
      toast.success(`Insucesso registrado para o pacote ${id}.`);
      onSaved({ id: alvo.id, codigo: id });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar insucesso{pacote ? ` · Pacote #${pacote.numero_pacote}` : ""}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pid">ID do pacote (da etiqueta)</Label>
            <div className="flex gap-2">
              <Input id="pid" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 45802123456" autoCapitalize="characters" />
              <Button type="button" variant="outline" className="shrink-0" onClick={() => setLendo(true)}>
                <ScanLine className="mr-1 h-4 w-4" />Ler etiqueta
              </Button>
            </div>
            <LeitorCodigo open={lendo} onClose={() => setLendo(false)} onCodigo={(c) => { setCodigo(c.toUpperCase()); toast.success(`ID lido: ${c}`); }} />
          </div>

          <div className="space-y-2">
            <Label>O que aconteceu?</Label>
            <RadioGroup value={choice} onValueChange={setChoice} className="space-y-1">
              {MOTIVOS.map((c) => (
                <label key={c.key} htmlFor={`ins-${c.key}`} className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-accent">
                  <RadioGroupItem id={`ins-${c.key}`} value={c.key} />
                  <span className="text-sm">{c.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Foto obrigatória</Label>
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">{m.foto}</p>
            <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed p-3 hover:bg-accent">
              <Camera className="h-4 w-4" />
              <span className="text-sm">{file ? file.name : "Tirar foto"}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Detalhes que ajudem a empresa" />
          </div>
          {!pacote && !alvo && <p className="text-sm text-red-600">Não há mais pacotes pendentes nesta rota.</p>}
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={salvar} disabled={saving || !pronto}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}Registrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
