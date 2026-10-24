import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2, Merge, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type RotaAjuste = { id: string; nome: string; quantidade_pacotes: number; quantidade_paradas: number; valor_total: number; oferta_id: string | null };

const rpc = (fn: string, args: Record<string, unknown>) => (supabase as any).rpc(fn, args) as Promise<{ data: any; error: { message: string } | null }>;

const MOTIVOS = [
  "Pacotes devolvidos ao Mercado Livre",
  "Não foi possível liberar os pacotes",
  "Pacotes extraviados ou danificados",
  "Rota unida a outra",
  "Outro motivo",
];

export function EliminarRotaDialog({
  rota, onClose, onDone,
}: { rota: RotaAjuste | null; onClose: () => void; onDone: () => void }) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [busy, setBusy] = useState(false);

  async function confirmar() {
    if (!rota) return;
    setBusy(true);
    const { error } = await rpc("eliminar_rota", { _rota_id: rota.id, _motivo: motivo });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Rota eliminada.");
    onClose();
    onDone();
  }

  return (
    <Dialog open={!!rota} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar rota</DialogTitle>
          <DialogDescription>
            {rota?.nome} · {rota?.quantidade_pacotes} pacotes. A oferta é cancelada, o entregador é desvinculado e os pacotes pendentes ficam como cancelados. Rotas que já têm pacotes entregues não podem ser eliminadas.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={motivo} onValueChange={setMotivo} className="space-y-1">
          {MOTIVOS.map((m) => (
            <label key={m} htmlFor={`mot-${m}`} className="flex cursor-pointer items-center gap-2 rounded border p-2 hover:bg-accent">
              <RadioGroupItem id={`mot-${m}`} value={m} /><span className="text-sm">{m}</span>
            </label>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Voltar</Button>
          <Button variant="destructive" onClick={confirmar} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Eliminar rota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AjusteRotas({ rotas, onChanged }: { rotas: RotaAjuste[]; onChanged: () => void }) {
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [qtd, setQtd] = useState("");
  const [par, setPar] = useState("");
  const [nums, setNums] = useState("");
  const [busy, setBusy] = useState(false);

  const o = rotas.find((r) => r.id === origem);
  const sugestaoParadas = useMemo(() => {
    const n = parseInt(qtd, 10);
    if (!o || !n || !o.quantidade_pacotes) return "";
    return String(n >= o.quantidade_pacotes ? o.quantidade_paradas : Math.round((n * o.quantidade_paradas) / o.quantidade_pacotes));
  }, [o, qtd]);

  if (rotas.length < 2) return null;

  const numeros = nums.split(/[\s,;]+/).map((x) => parseInt(x, 10)).filter((x) => Number.isInteger(x) && x > 0);

  async function mover(tudo = false) {
    if (!origem || !destino) return toast.error("Escolha a rota de origem e a de destino.");
    if (origem === destino) return toast.error("Escolha rotas diferentes.");
    const n = tudo ? o!.quantidade_pacotes : parseInt(qtd, 10);
    if (!numeros.length && !(n > 0)) return toast.error("Informe quantos pacotes mover (ou os números deles).");
    setBusy(true);
    const { data, error } = await rpc("mover_pacotes", {
      _rota_origem: origem, _rota_destino: destino,
      _quantidade: numeros.length ? undefined : n,
      _numeros: numeros.length ? numeros : undefined,
      _paradas: tudo ? undefined : par === "" ? undefined : parseInt(par, 10),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${data.movidos} pacote(s) movido(s).`);
    setQtd(""); setPar(""); setNums("");
    onChanged();
  }

  async function unir() {
    if (!origem || !destino || origem === destino) return toast.error("Escolha a rota que será unida (origem) e a que a recebe (destino).");
    if (!confirm(`Unir "${o?.nome}" em "${rotas.find((r) => r.id === destino)?.nome}"? Todos os pacotes pendentes vão para o destino e a rota de origem é eliminada.`)) return;
    setBusy(true);
    const mv = await rpc("mover_pacotes", { _rota_origem: origem, _rota_destino: destino, _quantidade: o!.quantidade_pacotes });
    if (mv.error) { setBusy(false); return toast.error(mv.error.message); }
    const el = await rpc("eliminar_rota", { _rota_id: origem, _motivo: "Rota unida a outra" });
    setBusy(false);
    if (el.error) return toast.error(`Pacotes movidos, mas não foi possível eliminar a rota vazia: ${el.error.message}`);
    toast.success("Rotas unidas.");
    setOrigem(""); setQtd(""); setPar(""); setNums("");
    onChanged();
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center gap-2 font-medium"><ArrowRightLeft className="h-4 w-4" />Ajustar a divisão das rotas</div>
        <p className="text-xs text-muted-foreground">
          Passe pacotes de uma rota para outra (por exemplo, da zona 2 para a zona 1) ou una duas rotas em uma só. Os valores, as paradas e as ofertas acompanham.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">De (origem)</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={origem} onChange={(e) => setOrigem(e.target.value)}>
              <option value="">Escolher rota...</option>
              {rotas.map((r) => <option key={r.id} value={r.id}>{r.nome} ({r.quantidade_pacotes} pac.)</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Para (destino)</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">Escolher rota...</option>
              {rotas.filter((r) => r.id !== origem).map((r) => <option key={r.id} value={r.id}>{r.nome} ({r.quantidade_pacotes} pac.)</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Quantos pacotes</Label>
            <Input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} disabled={numeros.length > 0} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Paradas a mover (sugestão: {sugestaoParadas || "—"})</Label>
            <Input type="number" min={0} placeholder={sugestaoParadas} value={par} onChange={(e) => setPar(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ou pacotes específicos (números separados por vírgula) — útil quando a etiqueta veio trocada</Label>
          <Input placeholder="ex.: 12, 40, 41" value={nums} onChange={(e) => setNums(e.target.value)} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={busy || !origem || !destino} onClick={unir}>
            <Merge className="mr-1 h-4 w-4" />Unir rotas
          </Button>
          <Button disabled={busy || !origem || !destino} onClick={() => mover(false)}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-1 h-4 w-4" />}Mover pacotes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
