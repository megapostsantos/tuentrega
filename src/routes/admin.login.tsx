import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/login")({ component: AdminLoginPage });

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", data.session.user.id).eq("role", "admin").maybeSingle();
      if (r) navigate({ to: "/admin/dashboard" });
    })();
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
      if (!r) {
        await supabase.auth.signOut();
        throw new Error("Esta conta não tem permissão de administrador.");
      }
      toast.success("Bem-vindo, Admin!");
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error((err as Error).message || "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4 text-secondary-foreground">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-card-foreground shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
            <ShieldCheck className="h-3 w-3" /> Admin
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Acesso administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesso restrito ao time TuEntrega.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-primary">← Voltar ao login normal</Link>
        </div>
      </div>
    </div>
  );
}
