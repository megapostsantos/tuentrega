import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Bike, ArrowRight, ArrowLeft, Loader2, Check, Mail } from "lucide-react";

import { toast } from "sonner";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  maskCPF, maskCNPJ, maskCEP, maskPhone, maskDate, maskPlaca,
  isValidCPF, isValidCNPJ, isValidPlaca, onlyDigits, fetchCEP,
  toISODate,
} from "@/lib/validators";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Role = "empresa" | "entregador";

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  
  if (m.includes("already registered") || m.includes("user already")) return "Este e-mail já está cadastrado. Faça login.";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email") && (m.includes("invalid") || m.includes("required"))) return "Informe um e-mail válido para criar sua conta.";
  if (m.includes("password") && (m.includes("short") || m.includes("characters") || m.includes("required"))) return "Informe uma senha com pelo menos 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns segundos e tente novamente.";
  if (m.includes("database error")) return "Erro ao salvar cadastro. Verifique os dados e tente novamente.";
  return msg;
}

async function createAccount(
  role: Role,
  email: string,
  password: string,
  name: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  const su = await signUp.email({ email, password, name });
  if (su.error) {
    const msg = su.error.message ?? "";
    if (!/already|exist|cadastrad/i.test(msg)) return translateAuthError(msg || "Erro desconhecido");
    const si = await signIn.email({ email, password });
    if (si.error) return "Este e-mail já está cadastrado. Faça login.";
  }
  const res = await fetch("/api/db/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ role, data }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    return j?.error ?? "Não foi possível concluir o cadastro";
  }
  return null;
}

const SEGMENTOS = ["Last Mile", "E-commerce", "Transportadora", "Distribuidora", "Loja própria", "Outro"];
const VEICULOS = [
  { value: "walker", label: "A pé" },
  { value: "biker", label: "Bicicleta" },
  { value: "moto_eletrica", label: "Moto elétrica" },
  { value: "motoboy", label: "Moto" },
  { value: "carro", label: "Carro" },
  { value: "caminhao", label: "Caminhão" },
];
const VEICULOS_COM_PLACA = ["moto_eletrica", "motoboy", "carro", "caminhao"];
const PIX_TIPOS = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Aleatória" },
];
const TURNOS = [
  { value: "manha", label: "Manhã (06h às 12h)" },
  { value: "tarde", label: "Tarde (12h às 18h)" },
  { value: "noite", label: "Noite (18h às 00h)" },
];
const PLATAFORMAS = ["Mercado Livre", "iFood", "Rappi", "Loggi", "Shopee", "Lalamove", "Outra"];

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const { data: sessionData } = useSession();

  useEffect(() => {
    if (sessionData?.session) navigate({ to: "/dashboard" });
  }, [sessionData, navigate]);

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
        <p className="text-sm text-secondary-foreground/60">© {new Date().getFullYear()} TuEntrega</p>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-between lg:hidden">
            <Link to="/"><Logo /></Link>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              <TabsTrigger value="convite">Convite</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <LoginForm onSuccess={() => navigate({ to: "/dashboard" })} />
            </TabsContent>

            <TabsContent value="convite" className="mt-6">
              <ConviteForm onSuccess={() => navigate({ to: "/dashboard" })} />
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <SignupSwitcher onSuccess={() => navigate({ to: "/dashboard" })} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ConviteForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/db/claim-invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, codigo, senha }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(j?.error ?? "Não foi possível validar o convite."); return; }
      const si = await signIn.email({ email, password: senha });
      if (si.error) { toast.error("Conta criada. Entre na aba Entrar com sua senha."); return; }
      onSuccess();
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? String(e)));
    } finally { setLoading(false); }
  }
  return (
    <>
      <h1 className="text-2xl font-bold">Tenho um convite</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use o e-mail e o código que a empresa te enviou e crie sua senha. Seu histórico já está esperando por você.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2"><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label>Código do convite</Label><Input required value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} className="tracking-widest" /></div>
        <div className="space-y-2"><Label>Crie uma senha</Label><Input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
        <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ativar minha conta <ArrowRight className="ml-1 h-4 w-4" /></>}
        </Button>
      </form>
    </>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      setLoading(false);
      if (result.error) {
        toast.error(translateAuthError(result.error.message ?? "Erro desconhecido"));
        return;
      }
      onSuccess();
    } catch (e: any) {
      setLoading(false);
      toast.error("Erro: " + (e?.message ?? String(e)));
    }
  }
  return (
    <>
      <h1 className="text-2xl font-bold">Bem-vindo de volta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Acesse sua conta TuEntrega.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Senha</Label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar <ArrowRight className="ml-1 h-4 w-4" /></>}
        </Button>
        <div className="text-center">
          <Link to="/esqueci-senha" className="text-sm text-primary underline">Esqueci minha senha</Link>
        </div>
      </form>
    </>
  );
}

function SignupSwitcher({ onSuccess }: { onSuccess: () => void }) {
  const [role, setRole] = useState<Role | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <>
        <h1 className="text-2xl font-bold">Como você quer usar a TuEntrega?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha o perfil que melhor descreve você.</p>

        <div className="mt-6 space-y-3">
          <BigRoleCard
            active={role === "entregador"}
            onClick={() => setRole("entregador")}
            icon={Bike}
            title="Sou Entregador"
            desc="Quero fazer rotas, receber ofertas e ganhar por entrega"
            variant="yellow"
          />
          <BigRoleCard
            active={role === "empresa"}
            onClick={() => setRole("empresa")}
            icon={Building2}
            title="Sou Empresa"
            desc="Quero gerenciar minhas entregas e contratar entregadores"
            variant="navy"
          />
        </div>

        <Button
          type="button"
          onClick={() => role && setConfirmed(true)}
          disabled={!role}
          className="mt-6 w-full bg-primary text-primary-foreground hover:opacity-90"
        >
          Continuar <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crie sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Perfil: <strong className="text-foreground">{role === "empresa" ? "Empresa" : "Entregador"}</strong>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmed(false)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Trocar
        </Button>
      </div>

      {role === "empresa"
        ? <EmpresaForm onSuccess={onSuccess} />
        : <EntregadorForm onSuccess={onSuccess} />}
    </>
  );
}

function BigRoleCard({
  active, onClick, icon: Icon, title, desc, variant,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Bike;
  title: string;
  desc: string;
  variant: "yellow" | "navy";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full rounded-2xl border-2 p-5 text-left transition-all press-scale",
        active
          ? "border-[#FFB700] shadow-lg ring-4 ring-[#FFB700]/20"
          : "border-border hover:border-[#FFB700]/60",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "grid h-14 w-14 shrink-0 place-content-center rounded-xl",
            variant === "yellow"
              ? "bg-[#FFB700] text-[#0D1B2A]"
              : "bg-[#0D1B2A] text-[#FFB700] border-2 border-[#FFB700]",
          )}
        >
          <Icon className="h-7 w-7" strokeWidth={2.5} />
        </div>
        <div className="flex-1 pt-1">
          <div className="text-base font-bold">{title}</div>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{desc}</p>
        </div>
        {active && (
          <div className="absolute right-4 top-4 grid h-6 w-6 place-content-center rounded-full bg-[#FFB700] text-[#0D1B2A]">
            <Check className="h-4 w-4" strokeWidth={3} />
          </div>
        )}
      </div>
    </button>
  );
}

/* ---------------- Stepper ---------------- */

function Stepper({ steps, current, onJump }: {
  steps: string[]; current: number; onJump: (i: number) => void;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const isActive = i === current;
          const isDone = i < current;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <button type="button" onClick={() => onJump(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && !isActive && "bg-primary/10 text-primary",
                  !isActive && !isDone && "bg-muted text-muted-foreground hover:bg-muted/70",
                )}>
                <span className={cn(
                  "grid h-5 w-5 place-content-center rounded-full text-[10px]",
                  isActive ? "bg-primary-foreground/20" : isDone ? "bg-primary text-primary-foreground" : "bg-background",
                )}>
                  {isDone ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < steps.length - 1 && <div className={cn("h-px flex-1", i < current ? "bg-primary" : "bg-border")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepNav({ step, total, onBack, onNext, onSubmit, loading }: {
  step: number; total: number;
  onBack: () => void; onNext: () => void; onSubmit: () => void; loading: boolean;
}) {
  const isLast = step === total - 1;
  return (
    <div className="flex gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onBack} disabled={step === 0} className="flex-1">
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>
      {isLast ? (
        <Button type="button" onClick={onSubmit} disabled={loading}
          className="flex-1 bg-primary text-primary-foreground hover:opacity-90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} className="flex-1 bg-primary text-primary-foreground hover:opacity-90">
          Avançar <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/* ---------------- Empresa ---------------- */

function EmpresaForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState(0);
  const STEPS = ["Empresa", "Endereço", "Acesso"];
  const [f, setF] = useState({
    razao_social: "", cnpj: "", nome_fantasia: "", segmento: "",
    cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
    whatsapp: "", responsavel: "", email: "", password: "", password2: "",
  });
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onCepBlur() {
    if (onlyDigits(f.cep).length !== 8) return;
    setCepLoading(true);
    const data = await fetchCEP(f.cep);
    setCepLoading(false);
    if (!data) return;
    setF((p) => ({ ...p, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
  }

  async function submit() {
    if (!f.email || !f.password) return toast.error("Informe e-mail e senha.");
    if (f.password !== f.password2) return toast.error("As senhas não conferem.");
    setLoading(true);
    const err = await createAccount("empresa", f.email, f.password, f.responsavel || f.razao_social || f.email, {
      razao_social: f.razao_social, cnpj: onlyDigits(f.cnpj), nome_fantasia: f.nome_fantasia, segmento: f.segmento,
      cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento, bairro: f.bairro,
      cidade: f.cidade, estado: f.estado, whatsapp: f.whatsapp, responsavel: f.responsavel,
    });
    setLoading(false);
    if (err) return toast.error(err);
    toast.success("Conta criada! Acesse seu painel.");
    onSuccess();
  }

  return (
    <div className="mt-2">
      <Stepper steps={STEPS} current={step} onJump={setStep} />
      <div className="mt-5 space-y-3">
        {step === 0 && (
          <>
            <Field label="Razão social" value={f.razao_social} onChange={(v) => set("razao_social", v)} />
            <Field label="CNPJ" value={f.cnpj} onChange={(v) => set("cnpj", maskCNPJ(v))}
              valid={f.cnpj ? isValidCNPJ(f.cnpj) : undefined} />
            <Field label="Nome fantasia" value={f.nome_fantasia} onChange={(v) => set("nome_fantasia", v)} />
            <div className="space-y-2">
              <Label>Segmento</Label>
              <Select value={f.segmento} onValueChange={(v) => set("segmento", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                <SelectContent>
                  {SEGMENTOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Field label="CEP" value={f.cep} onChange={(v) => set("cep", maskCEP(v))} onBlur={onCepBlur} />
              </div>
              <div className="flex items-end pb-1">{cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}</div>
            </div>
            <Field label="Rua" value={f.rua} onChange={(v) => set("rua", v)} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Número" value={f.numero} onChange={(v) => set("numero", v)} />
              <Field label="Complemento" value={f.complemento} onChange={(v) => set("complemento", v)} />
            </div>
            <Field label="Bairro" value={f.bairro} onChange={(v) => set("bairro", v)} />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Field label="Cidade" value={f.cidade} onChange={(v) => set("cidade", v)} /></div>
              <Field label="UF" value={f.estado} onChange={(v) => set("estado", v.toUpperCase().slice(0, 2))} />
            </div>
            <Field label="WhatsApp" value={f.whatsapp} onChange={(v) => set("whatsapp", maskPhone(v))} />
            <Field label="Nome do responsável" value={f.responsavel} onChange={(v) => set("responsavel", v)} />
          </>
        )}

        {step === 2 && (
          <>
            <Field label="E-mail" type="email" value={f.email} onChange={(v) => set("email", v)} />
            <Field label="Senha" type="password" value={f.password} onChange={(v) => set("password", v)} />
            <Field label="Confirme a senha" type="password" value={f.password2} onChange={(v) => set("password2", v)}
              valid={f.password2 ? f.password === f.password2 : undefined} />
            <p className="text-xs text-muted-foreground">
              Os campos que ficarem em branco podem ser preenchidos depois no seu painel.
            </p>
          </>
        )}

        <StepNav step={step} total={STEPS.length}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          onSubmit={submit} loading={loading} />
        {step === STEPS.length - 1 && (
          <p className="text-center text-xs text-muted-foreground">Acesso imediato com 14 dias grátis.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Entregador ---------------- */

function EntregadorForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState(0);
  const STEPS = ["Pessoal", "Veículo & Endereço", "Plataformas & PIX"];
  const [f, setF] = useState({
    nome_completo: "", cpf: "", cnpj: "", data_nascimento: "", whatsapp: "", email: "",
    password: "", password2: "",
    tipo_veiculo: "", marca_veiculo: "", modelo_veiculo: "", placa: "",
    cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
    pix_tipo: "", pix_chave: "", banco: "",
  });
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [turnos, setTurnos] = useState<string[]>([]);
  const [temPlataforma, setTemPlataforma] = useState<"sim" | "nao" | "">("");
  const [plataformas, setPlataformas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((p) => ({ ...p, [k]: v }));

  const exigePlaca = VEICULOS_COM_PLACA.includes(f.tipo_veiculo);

  function toggle(list: string[], item: string, setter: (v: string[]) => void) {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function onCepBlur() {
    if (onlyDigits(f.cep).length !== 8) return;
    setCepLoading(true);
    const data = await fetchCEP(f.cep);
    setCepLoading(false);
    if (!data) return;
    setF((p) => ({ ...p, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
  }

  async function uploadDoc(file: File, userId: string, prefix: string): Promise<string | null> {
    const ext = file.name.split(".").pop() || "jpg";
    // File upload no longer uses Supabase storage — skipping for now
    console.log("uploadDoc not implemented for", prefix, file.name);
    return null;
  }

  async function submit() {
    if (!f.email || !f.password) return toast.error("Informe e-mail e senha.");
    if (f.password !== f.password2) return toast.error("As senhas não conferem.");
    setLoading(true);
    const err = await createAccount("entregador", f.email, f.password, f.nome_completo || f.email, {
      nome_completo: f.nome_completo, cpf: onlyDigits(f.cpf), cnpj: onlyDigits(f.cnpj),
      data_nascimento: f.data_nascimento ? toISODate(f.data_nascimento) : null,
      whatsapp: f.whatsapp, tipo_veiculo: f.tipo_veiculo, marca_veiculo: f.marca_veiculo, modelo_veiculo: f.modelo_veiculo, placa: f.placa,
      cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento, bairro: f.bairro,
      cidade: f.cidade, estado: f.estado, pix_tipo: f.pix_tipo, pix_chave: f.pix_chave, banco: f.banco,
      turnos, plataformas,
    });
    setLoading(false);
    if (err) return toast.error(err);
    toast.success("Conta criada! Acesse seu painel.");
    onSuccess();
  }

  return (
    <div className="mt-2">
      <Stepper steps={STEPS} current={step} onJump={setStep} />
      <div className="mt-5 space-y-3">
        {step === 0 && (
          <>
            <Field label="Nome completo" value={f.nome_completo} onChange={(v) => set("nome_completo", v)} />
            <Field label="CPF" value={f.cpf} onChange={(v) => set("cpf", maskCPF(v))}
              valid={f.cpf ? isValidCPF(f.cpf) : undefined} />
            <Field label="CNPJ (opcional — para emissão de nota fiscal)" value={f.cnpj}
              onChange={(v) => set("cnpj", maskCNPJ(v))} />
            <Field label="Data de nascimento (DD/MM/AAAA)" value={f.data_nascimento}
              onChange={(v) => set("data_nascimento", maskDate(v))} />
            <Field label="WhatsApp" value={f.whatsapp} onChange={(v) => set("whatsapp", maskPhone(v))} />
            <Field label="E-mail" type="email" value={f.email} onChange={(v) => set("email", v)} />
            <Field label="Senha" type="password" value={f.password} onChange={(v) => set("password", v)} />
            <Field label="Confirme a senha" type="password" value={f.password2} onChange={(v) => set("password2", v)}
              valid={f.password2 ? f.password === f.password2 : undefined} />

            <div className="space-y-1.5">
              <Label>Foto selfie</Label>
              <Input type="file" accept="image/*" capture="user"
                onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">Opcional — você pode adicionar depois no seu perfil.</p>
              {selfieFile && <p className="text-xs text-primary">✓ {selfieFile.name}</p>}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>Tipo de veículo</Label>
              <Select value={f.tipo_veiculo} onValueChange={(v) => set("tipo_veiculo", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {VEICULOS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {f.tipo_veiculo && f.tipo_veiculo !== "walker" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Marca do veículo" value={f.marca_veiculo} onChange={(v) => set("marca_veiculo", v)} />
                <Field label="Modelo do veículo" value={f.modelo_veiculo} onChange={(v) => set("modelo_veiculo", v)} />
              </div>
            )}

            {exigePlaca && (
              <Field label="Placa (AAA-0000 ou AAA0A00)" value={f.placa}
                onChange={(v) => set("placa", maskPlaca(v))}
                valid={f.placa ? isValidPlaca(f.placa) : undefined} />
            )}

            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-sm font-medium">Endereço completo</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label="CEP" value={f.cep} onChange={(v) => set("cep", maskCEP(v))} onBlur={onCepBlur} />
                </div>
                <div className="flex items-end pb-1">{cepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}</div>
              </div>
              <Field label="Rua" value={f.rua} onChange={(v) => set("rua", v)} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Número" value={f.numero} onChange={(v) => set("numero", v)} />
                <Field label="Complemento" value={f.complemento} onChange={(v) => set("complemento", v)} />
              </div>
              <Field label="Bairro" value={f.bairro} onChange={(v) => set("bairro", v)} />
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><Field label="Cidade" value={f.cidade} onChange={(v) => set("cidade", v)} /></div>
                <Field label="UF" value={f.estado} onChange={(v) => set("estado", v.toUpperCase().slice(0, 2))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Disponibilidade de turnos</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {TURNOS.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={turnos.includes(t.value)} onCheckedChange={() => toggle(turnos, t.value, setTurnos)} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>Já é cadastrado em alguma plataforma de entregas?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTemPlataforma("sim")}
                  className={cn("rounded-md border px-3 py-2 text-sm", temPlataforma === "sim" ? "border-primary bg-primary/5" : "border-border")}>
                  Sim
                </button>
                <button type="button" onClick={() => { setTemPlataforma("nao"); setPlataformas([]); setComprovanteFile(null); }}
                  className={cn("rounded-md border px-3 py-2 text-sm", temPlataforma === "nao" ? "border-primary bg-primary/5" : "border-border")}>
                  Não
                </button>
              </div>
              {temPlataforma === "sim" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {PLATAFORMAS.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={plataformas.includes(p)} onCheckedChange={() => toggle(plataformas, p, setPlataformas)} />
                        {p}
                      </label>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Comprovante de cadastro</Label>
                    <Input type="file" accept="image/*,application/pdf"
                      onChange={(e) => setComprovanteFile(e.target.files?.[0] ?? null)} />
                    <p className="text-xs text-muted-foreground">Opcional — você pode adicionar depois no seu perfil.</p>
                    {comprovanteFile && <p className="text-xs text-primary">✓ {comprovanteFile.name}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Tipo de chave PIX</Label>
                <Select value={f.pix_tipo} onValueChange={(v) => set("pix_tipo", v)}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {PIX_TIPOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Chave PIX" value={f.pix_chave} onChange={(v) => set("pix_chave", v)} />
            </div>
            <Field label="Banco" value={f.banco} onChange={(v) => set("banco", v)} />
            <p className="text-xs text-muted-foreground">
              Você pode deixar campos em branco e completar depois no painel.
            </p>
          </>
        )}

        <StepNav step={step} total={STEPS.length}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          onSubmit={submit} loading={loading} />
        {step === STEPS.length - 1 && (
          <p className="text-center text-xs text-muted-foreground">Acesso imediato após o cadastro.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Shared ---------------- */

function Field({ label, value, onChange, type = "text", valid, onBlur }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; valid?: boolean; onBlur?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        className={cn(
          valid === true && "border-emerald-500 focus-visible:ring-emerald-500/40",
          valid === false && "border-destructive focus-visible:ring-destructive/40",
        )} />
    </div>
  );
}

function RoleCard({ active, onClick, icon: Icon, label, desc }: {
  active: boolean; onClick: () => void; icon: typeof Building2; label: string; desc: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
        active ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/40"
      )}>
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
