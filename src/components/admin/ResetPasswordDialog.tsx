import { SITE_URL } from "@/lib/contato";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ResetPasswordDialog({
  alvo, onClose,
}: { alvo: { id: string; nome: string; whatsapp?: string | null } | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [senha, setSenha] = useState<string | null>(null);

  useEffect(() => { setSenha(null); setLoading(false); }, [alvo?.id]);

  async function redefinir() {
    if (!alvo) return;
    setLoading(true);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin",
      body: JSON.stringify({ userId: alvo.id }),
    });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(j.error ?? "Não foi possível redefinir a senha.");
    setSenha(j.senha);
  }

  const msg = senha
    ? `Olá ${alvo?.nome.split(" ")[0]}! Sua senha da TuEntrega foi redefinida.\nSenha provisória: ${senha}\nAcesse ${SITE_URL}/auth — você vai criar uma nova senha no primeiro acesso.`
    : "";
  const fone = (alvo?.whatsapp ?? "").replace(/\D/g, "");

  return (
    <Dialog open={!!alvo} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>{alvo?.nome}</DialogDescription>
        </DialogHeader>
        {!senha ? (
          <p className="text-sm text-muted-foreground">
            Será gerada uma senha provisória e todas as sessões abertas dessa conta serão encerradas. No primeiro acesso a pessoa será obrigada a criar uma nova senha.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground">Senha provisória (mostrada só agora)</div>
              <div className="mt-1 select-all font-mono text-2xl font-bold tracking-wider">{senha}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(senha); toast.success("Senha copiada"); }}>
                <Copy className="mr-1 h-4 w-4" />Copiar
              </Button>
              <Button size="sm" onClick={() => window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, "_blank")}>
                <MessageCircle className="mr-1 h-4 w-4" />Enviar por WhatsApp
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{senha ? "Fechar" : "Cancelar"}</Button>
          {!senha && (
            <Button onClick={redefinir} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Gerar senha provisória
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
