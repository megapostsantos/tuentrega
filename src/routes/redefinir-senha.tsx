import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  validateSearch: (s: Record<string, unknown>): { token?: string; error?: string } => ({
    token: typeof s.token === "string" ? s.token : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  head: () => ({ meta: [{ title: "Nova senha — TuEntrega" }] }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const { token, error } = Route.useSearch();
  const navigate = useNavigate();
  const [nova, setNova] = useState("");
  const [nova2, setNova2] = useState("");
  const [loading, setLoading] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (nova.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (nova !== nova2) return toast.error("As senhas não conferem.");
    setLoading(true);
    const { error: err } = await authClient.resetPassword({ newPassword: nova, token: token! });
    setLoading(false);
    if (err) return toast.error("Link inválido ou expirado. Peça um novo.");
    toast.success("Senha alterada! Entre com a nova senha.");
    navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-4">
      <Link to="/"><Logo /></Link>
      {!token || error ? (
        <div className="space-y-3">
          <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">Peça um novo link para redefinir a sua senha.</p>
          <Button asChild className="w-full"><Link to="/esqueci-senha">Pedir novo link</Link></Button>
        </div>
      ) : (
        <form onSubmit={salvar} className="space-y-4">
          <h1 className="text-xl font-bold">Crie uma nova senha</h1>
          <div className="space-y-2"><Label>Nova senha</Label><Input type="password" required value={nova} onChange={(e) => setNova(e.target.value)} /></div>
          <div className="space-y-2"><Label>Repita a nova senha</Label><Input type="password" required value={nova2} onChange={(e) => setNova2(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}</Button>
        </form>
      )}
    </div>
  );
}
