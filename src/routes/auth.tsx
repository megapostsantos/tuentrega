import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Bike, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  ageFromBRDate, toISODate,
} from "@/lib/validators";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Role = "empresa" | "entregador";

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("weak") || m.includes("pwned")) return "Senha muito fraca ou já vazada. Use uma combinação única de letras, números e símbolos.";
  if (m.includes("already registered") || m.includes("user already")) return "Este e-mail já está cadastrado. Faça login.";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email") && m.includes("invalid")) return "E-mail inválido.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns segundos e tente novamente.";
  if (m.includes("database error")) return "Erro ao salvar cadastro. Verifique os dados e tente novamente.";
  return msg;
}

const SEGMENTOS = ["Mercado Livre Flex", "E-commerce", "Transportadora", "Distribuidora", "Loja própria", "Outro"];
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <LoginForm onSuccess={() => navigate({ to: "/dashboard" })} />
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

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Bem-vindo!");
    onSuccess();
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
      </form>
    </>
  );
}

function SignupSwitcher({ onSuccess }: { onSuccess: () => void }) {
  const [role, setRole] = useState<Role>("empresa");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="grid h-16 w-16 place-content-center rounded-full bg-primary/10 text-primary text-3xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">Conta criada com sucesso!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tudo pronto. Você já pode acessar a plataforma.</p>
        <Button onClick={onSuccess} className="mt-6 w-full bg-primary text-primary-foreground hover:opacity-90">
          Entrar no painel <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Crie sua conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha seu perfil para começar.</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <RoleCard active={role === "empresa"} onClick={() => setRole("empresa")} icon={Building2} label="Empresa" desc="Gerencio entregas" />
        <RoleCard active={role === "entregador"} onClick={() => setRole("entregador")} icon={Bike} label="Entregador PJ" desc="Quero entregar" />
      </div>

      {role === "empresa"
        ? <EmpresaForm onSuccess={() => setDone(true)} />
        : <EntregadorForm onSuccess={() => setDone(true)} />}
    </>
  );
}

function EmpresaForm({ onSuccess }: { onSuccess: () => void }) {
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
    if (!data) return toast.error("CEP não encontrado");
    setF((p) => ({ ...p, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCNPJ(f.cnpj)) return toast.error("CNPJ inválido");
    if (f.password.length < 8) return toast.error("Senha precisa de no mínimo 8 caracteres");
    if (f.password !== f.password2) return toast.error("Senhas não conferem");

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          role: "empresa",
          full_name: f.responsavel,
          company_name: f.nome_fantasia || f.razao_social,
          phone: onlyDigits(f.whatsapp),
          razao_social: f.razao_social,
          cnpj: onlyDigits(f.cnpj),
          nome_fantasia: f.nome_fantasia,
          segmento: f.segmento,
          cep: onlyDigits(f.cep), rua: f.rua, numero: f.numero, complemento: f.complemento,
          bairro: f.bairro, cidade: f.cidade, estado: f.estado,
          whatsapp: onlyDigits(f.whatsapp), responsavel: f.responsavel,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Conta criada! Trial de 14 dias ativo.");
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <Field label="Razão social" required value={f.razao_social} onChange={(v) => set("razao_social", v)} />
      <Field label="CNPJ" required value={f.cnpj} onChange={(v) => set("cnpj", maskCNPJ(v))}
        error={f.cnpj && !isValidCNPJ(f.cnpj) ? "CNPJ inválido" : undefined} />
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
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Field label="CEP" required value={f.cep} onChange={(v) => set("cep", maskCEP(v))} onBlur={onCepBlur} />
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
      <Field label="WhatsApp" required value={f.whatsapp} onChange={(v) => set("whatsapp", maskPhone(v))} />
      <Field label="Nome do responsável" required value={f.responsavel} onChange={(v) => set("responsavel", v)} />
      <Field label="E-mail" type="email" required value={f.email} onChange={(v) => set("email", v)} />
      <Field label="Senha (mín. 8)" type="password" required value={f.password} onChange={(v) => set("password", v)} />
      <Field label="Confirme a senha" type="password" required value={f.password2} onChange={(v) => set("password2", v)} />
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta e iniciar trial"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Acesso imediato com 14 dias grátis.</p>
    </form>
  );
}

function EntregadorForm({ onSuccess }: { onSuccess: () => void }) {
  const [f, setF] = useState({
    nome_completo: "", cpf: "", data_nascimento: "", whatsapp: "", email: "",
    password: "", password2: "",
    tipo_veiculo: "", placa: "",
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
  const idade = ageFromBRDate(f.data_nascimento);
  const menorIdade = idade !== null && idade < 18;

  function toggle(list: string[], item: string, setter: (v: string[]) => void) {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function onCepBlur() {
    if (onlyDigits(f.cep).length !== 8) return;
    setCepLoading(true);
    const data = await fetchCEP(f.cep);
    setCepLoading(false);
    if (!data) return toast.error("CEP não encontrado");
    setF((p) => ({ ...p, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
  }

  async function uploadDoc(file: File, prefix: string): Promise<string | null> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("entregador-docs").upload(path, file, { upsert: false });
    if (error) { toast.error("Falha no upload: " + error.message); return null; }
    const { data } = supabase.storage.from("entregador-docs").getPublicUrl(path);
    return data.publicUrl;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidCPF(f.cpf)) return toast.error("CPF inválido");
    if (idade === null) return toast.error("Data de nascimento inválida (DD/MM/AAAA)");
    if (menorIdade) return toast.error("Você precisa ter pelo menos 18 anos para se cadastrar como entregador");
    if (f.password.length < 8) return toast.error("Senha precisa de no mínimo 8 caracteres");
    if (f.password !== f.password2) return toast.error("Senhas não conferem");
    if (!selfieFile) return toast.error("Envie sua selfie segurando um documento");
    if (!f.tipo_veiculo) return toast.error("Selecione o tipo de veículo");
    if (exigePlaca && !isValidPlaca(f.placa)) return toast.error("Placa inválida");
    if (onlyDigits(f.cep).length !== 8) return toast.error("CEP inválido");
    if (turnos.length === 0) return toast.error("Selecione ao menos um turno");
    if (temPlataforma === "") return toast.error("Informe se já é cadastrado em alguma plataforma");
    if (temPlataforma === "sim" && plataformas.length === 0) return toast.error("Selecione ao menos uma plataforma");
    if (temPlataforma === "sim" && !comprovanteFile) return toast.error("Envie o comprovante de cadastro na plataforma");
    if (!f.pix_tipo || !f.pix_chave) return toast.error("Informe sua chave PIX");

    setLoading(true);
    const selfieUrl = await uploadDoc(selfieFile, "selfies");
    if (!selfieUrl) { setLoading(false); return; }
    let comprovanteUrl: string | null = null;
    if (temPlataforma === "sim" && comprovanteFile) {
      comprovanteUrl = await uploadDoc(comprovanteFile, "plataformas");
      if (!comprovanteUrl) { setLoading(false); return; }
    }

    const { error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          role: "entregador",
          full_name: f.nome_completo,
          phone: onlyDigits(f.whatsapp),
          cpf: onlyDigits(f.cpf),
          data_nascimento: toISODate(f.data_nascimento),
          whatsapp: onlyDigits(f.whatsapp),
          tipo_veiculo: f.tipo_veiculo,
          placa: exigePlaca ? f.placa.toUpperCase() : null,
          selfie_url: selfieUrl,
          cep: onlyDigits(f.cep), rua: f.rua, numero: f.numero, complemento: f.complemento,
          bairro: f.bairro, cidade: f.cidade, estado: f.estado,
          turnos,
          plataformas: temPlataforma === "sim" ? plataformas : [],
          plataforma_comprovante_url: comprovanteUrl,
          pix_tipo: f.pix_tipo,
          pix_chave: f.pix_chave,
          banco: f.banco,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Conta criada com sucesso!");
    onSuccess();
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <Field label="Nome completo" required value={f.nome_completo} onChange={(v) => set("nome_completo", v)} />
      <Field label="CPF" required value={f.cpf} onChange={(v) => set("cpf", maskCPF(v))}
        error={f.cpf && !isValidCPF(f.cpf) ? "CPF inválido" : undefined} />
      <Field label="Data de nascimento (DD/MM/AAAA)" required value={f.data_nascimento}
        onChange={(v) => set("data_nascimento", maskDate(v))}
        error={menorIdade ? "Você precisa ter pelo menos 18 anos para se cadastrar como entregador" : undefined} />
      <Field label="WhatsApp" required value={f.whatsapp} onChange={(v) => set("whatsapp", maskPhone(v))} />
      <Field label="E-mail" type="email" required value={f.email} onChange={(v) => set("email", v)} />
      <Field label="Senha (mín. 8)" type="password" required value={f.password} onChange={(v) => set("password", v)} />
      <Field label="Confirme a senha" type="password" required value={f.password2} onChange={(v) => set("password2", v)} />

      <div className="space-y-1.5">
        <Label>Foto selfie <span className="text-destructive">*</span></Label>
        <Input type="file" accept="image/*" capture="user"
          onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} required />
        <p className="text-xs text-muted-foreground">Tire uma foto segurando um documento com o rosto visível.</p>
        {selfieFile && <p className="text-xs text-primary">✓ {selfieFile.name}</p>}
      </div>

      <div className="space-y-2">
        <Label>Tipo de veículo <span className="text-destructive">*</span></Label>
        <Select value={f.tipo_veiculo} onValueChange={(v) => set("tipo_veiculo", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {VEICULOS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {exigePlaca && (
        <Field label="Placa (AAA-0000 ou AAA0A00)" required value={f.placa}
          onChange={(v) => set("placa", maskPlaca(v))}
          error={f.placa && !isValidPlaca(f.placa) ? "Placa inválida" : undefined} />
      )}

      <div className="rounded-lg border p-3 space-y-3">
        <p className="text-sm font-medium">Endereço completo</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Field label="CEP" required value={f.cep} onChange={(v) => set("cep", maskCEP(v))} onBlur={onCepBlur} />
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
        <Label>Disponibilidade de turnos <span className="text-destructive">*</span></Label>
        <div className="space-y-2 rounded-lg border p-3">
          {TURNOS.map((t) => (
            <label key={t.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={turnos.includes(t.value)} onCheckedChange={() => toggle(turnos, t.value, setTurnos)} />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Já é cadastrado em alguma plataforma de entregas? <span className="text-destructive">*</span></Label>
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
              <Label>Comprovante de cadastro <span className="text-destructive">*</span></Label>
              <Input type="file" accept="image/*,application/pdf"
                onChange={(e) => setComprovanteFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">Print ou foto comprovando seu cadastro na plataforma.</p>
              {comprovanteFile && <p className="text-xs text-primary">✓ {comprovanteFile.name}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Tipo de chave PIX <span className="text-destructive">*</span></Label>
          <Select value={f.pix_tipo} onValueChange={(v) => set("pix_tipo", v)}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              {PIX_TIPOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Field label="Chave PIX" required value={f.pix_chave} onChange={(v) => set("pix_chave", v)} />
      </div>
      <Field label="Banco" required value={f.banco} onChange={(v) => set("banco", v)} />

      <Button type="submit" disabled={loading || menorIdade} className="w-full bg-primary text-primary-foreground hover:opacity-90">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Acesso imediato após o cadastro.</p>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", required, error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; error?: string; onBlur?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input type={type} required={required} value={value}
        onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        className={cn(error && "border-destructive")} />
      {error && <p className="text-xs text-destructive">{error}</p>}
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
