import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  rota: { id: string; titulo: string; entregadorNome?: string | null } | null;
  total: number;
  entreguesAtuais: number;
  insucessosAtuais: number;
  onClose: () => void;
  onDone: () => void;
};

/** Gestor encerra a rota do motorista no fim do dia, com base no sistema do marketplace. */
export function FecharRotaGestorDialog({ rota, total, entreguesAtuais, insucessosAtuais, onClose, onDone }: Props) {
  const [ent, setEnt] = useState(0);
  const [ins, setIns] = useState(0);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (rota) { setEnt(entreguesAtuais); setIns(insucessosAtuais); setObs(""); }
  }, [rota?.id, entreguesAtuais, insucessosAtuais]);

  if (!rota) return null;
  const pend = total - ent - ins;
  const invalido = ent < entreguesAtuais || ins < insucessosAtuais || pend < 0;

  async function enviar() {
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("fechar_rota_gestor", {
      _oferta_id: rota!.id, _entregues: ent, _insucessos: ins, _observacao: obs,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(data?.concluida ? "Rota concluída. Valor liberado ao entregador." : "Rota encerrada. Aguardando devolução dos pacotes para conferir com o motorista.");
    onDone();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar rota pelo gestor</DialogTitle>
          <DialogDescription>
            {rota.titulo}{rota.entregadorNome ? ` · ${rota.entregadorNome}` : ""}. Informe como a rota está no sistema do marketplace. Os pacotes sem baixa ficam para conferir com o motorista no dia seguinte.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Entregues</Label><Input type="number" min={entreguesAtuais} value={ent} onChange={(e) => setEnt(Math.max(0, Number(e.target.value) || 0))} /></div>
          <div className="space-y-1"><Label>Insucessos</Label><Input type="number" min={insucessosAtuais} value={ins} onChange={(e) => setIns(Math.max(0, Number(e.target.value) || 0))} /></div>
          <div className="space-y-1"><Label>Sem baixa</Label><Input disabled value={Math.max(0, pend)} /></div>
        </div>
        <p className={`text-xs ${invalido ? "text-red-600" : "text-muted-foreground"}`}>
          Total da rota: {total}. {pend < 0 ? "Entregues + insucessos passam do total." : `${pend} pacote(s) ficam sem baixa e voltam para a empresa.`}
        </p>
        <div className="space-y-1">
          <Label>Observação (opcional)</Label>
          <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: motorista sem sinal, conferir amanhã" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} disabled={busy || invalido}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Encerrar rota</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
