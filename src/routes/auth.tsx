import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Bike, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Role = "empresa" | "entregador";

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<Role>("empresa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          role,
          full_name: fullName,
          company_name: role === "empresa" ? companyName : null,
          phone,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    setTab("login");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-secondary text-secondary-foreground p-10">
        <Link to="/"><Logo /></Link>
        <div>
          <h2 className="text-4xl font-bold tracking-tight">
            Conecte sua empresa<br />a entregadores <span className="text-primary">prontos</span>.
          </h2>
          <p className="mt-4 max-w-md text-secondary-foreground/70">
            Pacotes, rotas, pagamentos PIX e agenda — tudo em uma plataforma mobile-first.
          </p>
        </div>
        <p className="text-sm text-secondary-foreground/60">
          © {new Date().getFullYear()} TuEntrega
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-between lg:hidden">
            <Link to="/"><Logo /></Link>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
              <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta TuEntrega.</p>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90">
                  {loading ? "Entrando..." : <>Entrar <ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <h1 className="text-2xl font-bold">Crie sua conta</h1>
              <p className="mt-1 text-sm text-muted-foreground">Escolha seu perfil para começar.</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <RoleCard
                  active={role === "empresa"}
                  onClick={() => setRole("empresa")}
                  icon={Building2}
                  label="Empresa"
                  desc="Gerencio entregas"
                />
                <RoleCard
                  active={role === "entregador"}
                  onClick={() => setRole("entregador")}
                  icon={Bike}
                  label="Entregador PJ"
                  desc="Quero entregar"
                />
              </div>

              <form onSubmit={handleSignup} className="mt-5 space-y-4">
                {role === "empresa" ? (
                  <div className="space-y-2">
                    <Label htmlFor="company">Nome da empresa</Label>
                    <Input id="company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Nome completo</Label>
                    <Input id="fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90">
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon: Icon, label, desc }: {
  active: boolean; onClick: () => void; icon: typeof Building2; label: string; desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
        active ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/40"
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
