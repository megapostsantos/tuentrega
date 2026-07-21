import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Share2, UserPlus, Check } from "lucide-react";
import { inviteEntregador } from "@/lib/entregadores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultTipoOperacao?: "nex" | "distribuicao" | "ambos";
  title?: string;
};

const VEICULOS = [
  { value: "moto", label: "Moto" },
  { value: "carro", label: "Carro" },
  { value: "bike", label: "Bike" },
  { value: "van", label: "Van" },
  { value: "a_pe", label: "A pé" },
];

export function RegisterEntregadorDialog({
  open,
  onClose,
  onCreated,
  defaultTipoOperacao = "ambos",
  title = "Cadastrar Entregador",
}: Props) {
  const invite = useServerFn(inviteEntregador);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tipoVeiculo, setTipoVeiculo] = useState<string>("");
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipoOp, setTipoOp] = useState<"nex" | "distribuicao" | "ambos">(defaultTipoOperacao);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<null | { nome: string; email: string; whatsapp: string }>(null);

  function reset() {
    setNome(""); setEmail(""); setWhatsapp(""); setTipoVeiculo("");
    setModelo(""); setPlaca(""); setTipoOp(defaultTipoOperacao); setDone(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit() {
    if (!nome.trim() || !email.trim()) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const redirect =
        typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;
      await invite({
        data: {
          nome_completo: nome.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.trim() || null,
          tipo_veiculo: (tipoVeiculo || null) as any,
          modelo_veiculo: modelo.trim() || null,
          placa: placa.trim() || null,
          tipo_operacao: tipoOp,
          redirect_to: redirect,
        },
      });
      toast.success(`Entregador cadastrado! Convite enviado para ${email}`);
      setDone({ nome: nome.trim(), email: email.trim(), whatsapp: whatsapp.trim() });
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao cadastrar entregador.");
    } finally {
      setSaving(false);
    }
  }

  function shareWhats() {
    if (!done) return;
    const msg = `Olá ${done.nome}! Você foi cadastrado na BAG Envios. Em breve chegará um email com seu acesso. Qualquer dúvida, fale comigo aqui!`;
    const phone = done.whatsapp.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {done
              ? "Convite enviado com sucesso. Você pode avisar por WhatsApp também."
              : "O entregador receberá um email para criar a senha e acessar o sistema."}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-medium">
                <Check className="h-4 w-4" /> {done.nome} cadastrado.
              </div>
              <p className="mt-1 text-xs">Convite enviado para {done.email}.</p>
            </div>
            <Button className="w-full" onClick={shareWhats}>
              <Share2 className="h-4 w-4 mr-2" /> Avisar pelo WhatsApp
            </Button>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
              <Button variant="secondary" onClick={reset}>
                <UserPlus className="h-4 w-4 mr-2" /> Cadastrar outro
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Nome completo *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="entregador@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone / WhatsApp</Label>
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(13) 99999-9999"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo de veículo</Label>
                  <Select value={tipoVeiculo} onValueChange={setTipoVeiculo}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {VEICULOS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tipo de operação</Label>
                  <Select value={tipoOp} onValueChange={(v) => setTipoOp(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambos">Ambos (NEX + Distribuição)</SelectItem>
                      <SelectItem value="distribuicao">Distribuição</SelectItem>
                      <SelectItem value="nex">NEX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Modelo do veículo</Label>
                  <Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex: Honda CG 160" />
                </div>
                <div className="space-y-1">
                  <Label>Placa</Label>
                  <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC1D23" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><UserPlus className="h-4 w-4 mr-2" /> Cadastrar e enviar convite</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
