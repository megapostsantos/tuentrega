import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Define ou corrige o e-mail de quem ainda não ativou o convite. */
export function EmailConviteDialog({ alvo, onClose, onSaved }: {
  alvo: { id: string; nome: string; email: string | null } | null;
  onClose: () => void;
  onSaved: (id: string, email: string, codigo: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setEmail(alvo?.email && !alvo.email.endsWith("@sem-acesso.tuentrega.local") ? alvo.email : ""); }, [alvo]);
  async function salvar() {
    if (!alvo) return;
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("atualizar_email_convite", { user_id: alvo.id, email });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("E-mail salvo.");
    onSaved(alvo.id, data.email, data.codigo ?? null);
  }
  return (
    <Dialog open={!!alvo} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>E-mail de {alvo?.nome}</DialogTitle>
          <DialogDescription>É com este e-mail e o código do convite que a pessoa cria a senha. Só dá para trocar enquanto ela não ativou a conta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1"><Label>E-mail</Label><Input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com" /></div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !email.includes("@")}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar e continuar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
