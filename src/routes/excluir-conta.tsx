import { CONTATO_WHATSAPP, CONTATO_TELEFONE } from "@/lib/contato";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/excluir-conta")({
  head: () => ({ meta: [{ title: "Excluir conta — TuEntrega" }] }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { data, isPending } = useSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await authClient.deleteUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message || "Não foi possível excluir a conta. Verifique a senha.");
    toast.success("Conta excluída.");
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Link to="/"><Logo /></Link>
      <h1 className="mt-8 text-2xl font-bold">Excluir minha conta</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta ação é permanente: sua conta e os dados vinculados a ela serão removidos e não poderão ser recuperados.
        Algumas informações podem ser mantidas pelo prazo exigido por lei (veja a{" "}
        <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>).
      </p>

      {isPending ? (
        <Loader2 className="mt-8 h-5 w-5 animate-spin" />
      ) : !data?.user ? (
        <div className="mt-8 space-y-3 text-sm">
          <p>Entre na sua conta para solicitar a exclusão.</p>
          <Button asChild className="bg-primary text-primary-foreground"><Link to="/auth">Entrar</Link></Button>
          <p className="text-muted-foreground">
            Sem acesso à conta? Fale com a gente pelo WhatsApp <a className="text-primary underline" href={CONTATO_WHATSAPP}>{CONTATO_TELEFONE}</a>.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <p className="text-sm">Conta: <strong>{data.user.email}</strong></p>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Digite EXCLUIR para confirmar</Label>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button
            type="submit"
            variant="destructive"
            disabled={loading || confirm !== "EXCLUIR" || !password}
            className="w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir minha conta definitivamente"}
          </Button>
        </form>
      )}
    </div>
  );
}
