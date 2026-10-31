import { useState } from "react";
import { toast } from "sonner";
import { Loader2, UserPlus, FileCheck2, Share2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/contato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultTipoOperacao?: "nex" | "distribuicao" | "ambos";
  title?: string;
};

const VEICULOS = [
  { value: "motoboy", label: "Moto" },
  { value: "carro", label: "Carro" },
  { value: "biker", label: "Bike" },
  { value: "moto_eletrica", label: "Moto elétrica" },
  { value: "caminhao", label: "Caminhão/Van" },
  { value: "walker", label: "A pé" },
];
const PIX = ["cpf", "cnpj", "email", "telefone", "aleatoria"];

export function RegisterEntregadorDialog({ open, onClose, onCreated, title = "Cadastrar parceiro" }: Props) {
  const [f, setF] = useState({ nome: "", cpf: "", whatsapp: "", email: "", veic: "", marca: "", modelo: "", placa: "", pixTipo: "", pixChave: "" });
  const [resid, setResid] = useState<File | null>(null);
  const [doc, setDoc] = useState<File | null>(null);
  const [docTipo, setDocTipo] = useState("documento_identidade");
  const [aceite, setAceite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feito, setFeito] = useState<null | { nome: string; email: string; whatsapp: string; codigo: string | null; empresa: string }>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  function fechar() {
    setF({ nome: "", cpf: "", whatsapp: "", email: "", veic: "", marca: "", modelo: "", placa: "", pixTipo: "", pixChave: "" });
    setResid(null); setDoc(null); setAceite(false); setFeito(null); onClose();
  }

  async function enviar(empresaId: string, entId: string, tipo: string, file: File) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${empresaId}/${entId}/${tipo}-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("entregador-docs").upload(path, file, { contentType: file.type });
    if (up.error) throw new Error(up.error.message);
    const ins = await supabase.from("entregador_documentos").insert({ entregador_id: entId, empresa_id: empresaId, tipo, path, nome_arquivo: file.name });
    if (ins.error) throw new Error(ins.error.message);
  }

  async function submit() {
    if (!f.nome.trim()) return toast.error("Informe o nome.");
    if (!f.whatsapp.trim() && !f.email.trim()) return toast.error("Informe telefone ou e-mail.");
    if ((resid || doc) && !aceite) return toast.error("Confirme a autorização de uso dos documentos.");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const { data, error } = await (supabase as any).rpc("cadastrar_entregador_gerenciado", {
        nome_completo: f.nome, cpf: f.cpf, whatsapp: f.whatsapp, email: f.email,
        tipo_veiculo: f.veic, marca_veiculo: f.marca, modelo_veiculo: f.modelo, placa: f.placa,
        pix_tipo: f.pixTipo, pix_chave: f.pixChave,
      });
      if (error) throw new Error(error.message);
      const id = data.id as string;
      if (resid) await enviar(user.id, id, "comprovante_residencia", resid);
      if (doc) await enviar(user.id, id, docTipo, doc);
      onCreated?.();
      const { data: emp } = await (supabase as any).from("empresas").select("nome_fantasia, razao_social").eq("id", user.id).maybeSingle();
      setFeito({ nome: f.nome.trim(), email: f.email.trim().toLowerCase(), whatsapp: f.whatsapp, codigo: data.codigo ?? null, empresa: emp?.nome_fantasia || emp?.razao_social || "" });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao cadastrar.");
    } finally { setSaving(false); }
  }

  function whats() {
    if (!feito) return;
    const link = `${SITE_URL}/auth`;
    const msg = `Olá ${feito.nome}! ${feito.empresa ? `A empresa ${feito.empresa} cadastrou` : "Te cadastrei"} você como parceiro(a) no TuEntrega. Para criar sua senha, abra ${link}, toque na aba "Convite" e use o e-mail ${feito.email} e o código ${feito.codigo}.`;
    const fone = feito.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${fone ? (fone.length <= 11 ? "55" + fone : fone) : ""}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  if (feito) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && fechar()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{feito.nome} cadastrado</DialogTitle>
            <DialogDescription>Já pode receber rotas. {feito.codigo ? "Para ele(a) assumir a conta, envie o convite:" : "Sem e-mail, você opera as rotas dele(a) pelo painel."}</DialogDescription>
          </DialogHeader>
          {feito.codigo && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <div>E-mail: <strong>{feito.email}</strong></div>
                <div>Código: <strong className="tracking-widest">{feito.codigo}</strong></div>
              </div>
              <Button className="w-full" onClick={whats}><Share2 className="mr-2 h-4 w-4" />Enviar convite pelo WhatsApp</Button>
              <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard?.writeText(`${SITE_URL}/auth — e-mail ${feito.email}, código ${feito.codigo}`); toast.success("Copiado"); }}>
                <Copy className="mr-2 h-4 w-4" />Copiar dados
              </Button>
            </div>
          )}
          <DialogFooter><Button onClick={fechar}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Cadastre agora e aloque as rotas. Com e-mail, a pessoa cria a própria senha depois e mantém todo o histórico. Sem e-mail, você opera as rotas por ela. Os documentos ficam visíveis só para a sua empresa.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1"><Label>Nome completo *</Label><Input value={f.nome} onChange={set("nome")} placeholder="Ex: Jefferson Silva" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Telefone / WhatsApp</Label><Input value={f.whatsapp} onChange={set("whatsapp")} placeholder="(13) 99999-9999" /></div>
            <div className="space-y-1"><Label>CPF</Label><Input value={f.cpf} onChange={set("cpf")} placeholder="000.000.000-00" /></div>
          </div>
          <div className="space-y-1"><Label>E-mail (para ele criar a senha depois)</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Veículo</Label>
              <Select value={f.veic} onValueChange={(v) => setF((s) => ({ ...s, veic: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{VEICULOS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Placa</Label><Input value={f.placa} onChange={(e) => setF((s) => ({ ...s, placa: e.target.value.toUpperCase() }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Marca</Label><Input value={f.marca} onChange={set("marca")} /></div>
            <div className="space-y-1"><Label>Modelo</Label><Input value={f.modelo} onChange={set("modelo")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo da chave PIX</Label>
              <Select value={f.pixTipo} onValueChange={(v) => setF((s) => ({ ...s, pixTipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{PIX.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Chave PIX</Label><Input value={f.pixChave} onChange={set("pixChave")} /></div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-medium"><FileCheck2 className="h-4 w-4" />Comprovação (recomendada)</div>
            <div className="space-y-1">
              <Label>Comprovante de residência</Label>
              <Input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setResid(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1">
              <Label>Documento com foto</Label>
              <Select value={docTipo} onValueChange={setDocTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="documento_identidade">RG</SelectItem>
                  <SelectItem value="cnh">CNH</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(!!v)} className="mt-0.5" />
              Declaro que a pessoa autorizou o uso e o armazenamento destes documentos e dados para fins de cadastro e segurança das entregas (LGPD).
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="mr-2 h-4 w-4" />{f.email.trim() ? "Cadastrar e enviar convite" : "Cadastrar"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
