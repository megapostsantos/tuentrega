import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [{ title: "Esqueci minha senha — TuEntrega" }] }),
  component: EsqueciSenha,
});

function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/redefinir-senha` });
    setLoading(false);
    if (error && /limit|many|tent/i.test(error.message ?? "")) return toast.error("Muitas tentativas. Aguarde alguns minutos.");
    setEnviado(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
      <Link to="/"><Logo /></Link>
      {enviado ? (
        <div className="space-y-3">
          <MailCheck className="h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Se existir uma conta com <strong>{email}</strong>, enviamos um link para criar uma nova senha. Ele vale por 1 hora.
          </p>
          <p className="text-xs text-muted-foreground">Não chegou? Veja o spam. Se continuar sem acesso, fale com o suporte da TuEntrega.</p>
          <Button asChild variant="outline" className="w-full"><Link to="/auth">Voltar ao login</Link></Button>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <h1 className="text-xl font-bold">Esqueci minha senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
          </div>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}</Button>
          <Button asChild variant="ghost" className="w-full"><Link to="/auth">Voltar ao login</Link></Button>
        </form>
      )}
    </div>
  );
}
