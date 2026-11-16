import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Resumo = { operacoes: number; rotas_publicadas: number; mantidas_nao_pagas: number };

/** Limpa só o histórico de rotas (operações, rotas, ofertas e pacotes). Pagamentos, financeiro, parceiros e equipe ficam. */
export function LimparHistoricoDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [ate, setAte] = useState<"antes_de_hoje" | "tudo">("antes_de_hoje");
  const [naoPagas, setNaoPagas] = useState(false);
  const [r, setR] = useState<Resumo | null>(null);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setR(null);
    (supabase as any).rpc("limpar_historico_rotas", { _simular: true, _ate: ate, _incluir_nao_pagas: naoPagas }).then(({ data }: any) => setR(data ?? null));
  }, [open, ate, naoPagas]);

  async function limpar() {
    setBusy(true);
    const { error } = await (supabase as any).rpc("limpar_historico_rotas", { _ate: ate, _incluir_nao_pagas: naoPagas, _confirmar: "LIMPAR" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Histórico de rotas limpo.");
    setTexto(""); onDone(); onClose();
  }

  const nada = !!r && r.operacoes === 0 && r.rotas_publicadas === 0;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Limpar histórico de rotas</DialogTitle>
          <DialogDescription>Apaga operações, rotas e pacotes antigos. Pagamentos, financeiro, entregadores e equipe <strong>não</strong> são apagados. Rotas em andamento nunca saem.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {([["antes_de_hoje", "Dias anteriores (recomendado)"], ["tudo", "Tudo, inclusive hoje"]] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2"><input type="radio" name="ate" checked={ate === v} onChange={() => setAte(v)} />{l}</label>
          ))}
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox className="mt-0.5" checked={naoPagas} onCheckedChange={(v) => setNaoPagas(!!v)} />
            Apagar também as rotas concluídas que ainda não foram pagas (elas saem de "a pagar" — pague antes)
          </label>
          <div className="rounded-md bg-muted p-3">
            {!r ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <div><strong>{r.operacoes}</strong> operação(ões) e <strong>{r.rotas_publicadas}</strong> rota(s) publicada(s) serão apagadas.</div>
                {r.mantidas_nao_pagas > 0 && <div className="mt-1 text-xs text-amber-700">{r.mantidas_nao_pagas} rota(s) concluída(s) sem pagamento foram mantidas.</div>}
              </>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Para confirmar, digite LIMPAR</label>
            <Input value={texto} onChange={(e) => setTexto(e.target.value.toUpperCase())} placeholder="LIMPAR" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={busy || texto !== "LIMPAR" || nada} onClick={limpar}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}Limpar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
