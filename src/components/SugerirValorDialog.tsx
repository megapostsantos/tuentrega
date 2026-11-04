import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type AlvoSugestao = { tipo: "oferta" | "rota"; id: string; titulo: string };

/** Funcionário usa o valor padrão. Se precisar de outro, sugere aqui e o supervisor (ou dono) aprova. */
export function SugerirValorDialog({ alvo, onClose }: { alvo: AlvoSugestao | null; onClose: () => void }) {
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValor(""); setMotivo(""); }, [alvo]);
  async function enviar() {
    if (!alvo) return;
    const v = Number(valor.replace(",", "."));
    if (!(v > 0)) return toast.error("Informe o valor por pacote.");
    setSaving(true);
    const { error } = await (supabase as any).rpc("sugerir_valor", { alvo_tipo: alvo.tipo, alvo_id: alvo.id, valor_por_pacote: v, motivo });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Sugestão enviada para aprovação.");
    onClose();
  }
  return (
    <Dialog open={!!alvo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sugerir outro valor</DialogTitle>
          <DialogDescription>{alvo?.titulo}. Enquanto o supervisor não aprovar, vale o valor padrão da empresa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Valor por pacote (R$)</Label><Input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex: 2,20" autoFocus /></div>
          <div className="space-y-1"><Label>Por quê? (opcional)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: região de difícil acesso" /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar sugestão"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
