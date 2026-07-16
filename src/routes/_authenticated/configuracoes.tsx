import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, KeyRound, Camera, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchCEP, isValidCNPJ, maskCEP, maskCNPJ, maskPhone, maskPlaca, onlyDigits } from "@/lib/validators";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Settings,
});

function Settings() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta");
    navigate({ to: "/auth" });
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user) return <div className="p-6 text-muted-foreground">Faça login.</div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Meu perfil" description="Atualize seus dados cadastrais" />
      {role === "empresa" && <EmpresaProfile />}
      {role === "entregador" && <EntregadorProfile />}
      {role === "admin" && <AdminBasic />}
      <PasswordChange />
      <Button
        variant="outline"
        onClick={logout}
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sair da conta
      </Button>
    </div>
  );
}

/* ============ helpers ============ */

function completion(values: Array<unknown>): number {
  const filled = values.filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return Math.round((filled / values.length) * 100);
}

function emptyClass(v: unknown) {
  const empty = v === null || v === undefined || String(v).trim() === "" || (Array.isArray(v) && v.length === 0);
  return empty ? "border-primary/70 focus-visible:ring-primary" : "";
}

function EmptyHint({ v }: { v: unknown }) {
  const empty = v === null || v === undefined || String(v).trim() === "" || (Array.isArray(v) && v.length === 0);
  if (!empty) return null;
  return <p className="text-xs text-primary">Complete este campo</p>;
}

function CompletionCard({ pct }: { pct: number }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Seu perfil está {pct}% completo</span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2 [&>div]:bg-primary" />
      </CardContent>
    </Card>
  );
}

/* ============ EMPRESA ============ */

type EmpresaRow = {
  id: string; razao_social: string; cnpj: string; nome_fantasia: string | null;
  segmento: string | null; cep: string | null; rua: string | null; numero: string | null;
  complemento: string | null; bairro: string | null; cidade: string | null; estado: string | null;
  whatsapp: string | null; responsavel: string | null;
};

function EmpresaProfile() {
  const { user } = useAuth();
  const [f, setF] = useState<EmpresaRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("empresas").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setF(data as EmpresaRow);
      else setF({
        id: user.id, razao_social: "", cnpj: "", nome_fantasia: "", segmento: "",
        cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
        whatsapp: "", responsavel: "",
      });
    });
  }, [user]);

  const pct = useMemo(() => {
    if (!f) return 0;
    return completion([
      f.razao_social, f.nome_fantasia, f.segmento, f.cep, f.rua, f.numero,
      f.bairro, f.cidade, f.estado, f.whatsapp, f.responsavel,
    ]);
  }, [f]);

  async function lookupCep(cep: string) {
    if (!f) return;
    if (onlyDigits(cep).length !== 8) return;
    setCepLoading(true);
    const r = await fetchCEP(cep);
    setCepLoading(false);
    if (r) setF({ ...f, rua: r.logradouro, bairro: r.bairro, cidade: r.localidade, estado: r.uf });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    setSaving(true);
    const { error } = await supabase.from("empresas").update({
      razao_social: f.razao_social,
      nome_fantasia: f.nome_fantasia,
      segmento: f.segmento,
      cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento,
      bairro: f.bairro, cidade: f.cidade, estado: f.estado,
      whatsapp: f.whatsapp, responsavel: f.responsavel,
    }).eq("id", f.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  if (!f) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  const up = (k: keyof EmpresaRow, v: string) => setF({ ...f, [k]: v });

  return (
    <>
      <CompletionCard pct={pct} />
      <Card>
        <CardHeader><CardTitle>Dados da empresa</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail"><Input value={user?.email ?? ""} disabled /></Field>
            <Field label="CNPJ"><Input value={f.cnpj} disabled /></Field>

            <Field label="Razão social">
              <Input value={f.razao_social} onChange={(e) => up("razao_social", e.target.value)} className={emptyClass(f.razao_social)} />
              <EmptyHint v={f.razao_social} />
            </Field>
            <Field label="Nome fantasia">
              <Input value={f.nome_fantasia ?? ""} onChange={(e) => up("nome_fantasia", e.target.value)} className={emptyClass(f.nome_fantasia)} />
              <EmptyHint v={f.nome_fantasia} />
            </Field>

            <Field label="Segmento">
              <Input value={f.segmento ?? ""} onChange={(e) => up("segmento", e.target.value)} className={emptyClass(f.segmento)} />
              <EmptyHint v={f.segmento} />
            </Field>
            <Field label="Responsável">
              <Input value={f.responsavel ?? ""} onChange={(e) => up("responsavel", e.target.value)} className={emptyClass(f.responsavel)} />
              <EmptyHint v={f.responsavel} />
            </Field>

            <Field label="WhatsApp">
              <Input value={f.whatsapp ?? ""} onChange={(e) => up("whatsapp", maskPhone(e.target.value))} className={emptyClass(f.whatsapp)} />
              <EmptyHint v={f.whatsapp} />
            </Field>
            <Field label="CEP">
              <div className="relative">
                <Input value={f.cep ?? ""} onChange={(e) => { const v = maskCEP(e.target.value); up("cep", v); lookupCep(v); }} className={emptyClass(f.cep)} />
                {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <EmptyHint v={f.cep} />
            </Field>

            <Field label="Rua" className="sm:col-span-2">
              <Input value={f.rua ?? ""} onChange={(e) => up("rua", e.target.value)} className={emptyClass(f.rua)} />
              <EmptyHint v={f.rua} />
            </Field>
            <Field label="Número">
              <Input value={f.numero ?? ""} onChange={(e) => up("numero", e.target.value)} className={emptyClass(f.numero)} />
              <EmptyHint v={f.numero} />
            </Field>
            <Field label="Complemento">
              <Input value={f.complemento ?? ""} onChange={(e) => up("complemento", e.target.value)} />
            </Field>
            <Field label="Bairro">
              <Input value={f.bairro ?? ""} onChange={(e) => up("bairro", e.target.value)} className={emptyClass(f.bairro)} />
              <EmptyHint v={f.bairro} />
            </Field>
            <Field label="Cidade">
              <Input value={f.cidade ?? ""} onChange={(e) => up("cidade", e.target.value)} className={emptyClass(f.cidade)} />
              <EmptyHint v={f.cidade} />
            </Field>
            <Field label="Estado">
              <Input value={f.estado ?? ""} maxLength={2} onChange={(e) => up("estado", e.target.value.toUpperCase())} className={emptyClass(f.estado)} />
              <EmptyHint v={f.estado} />
            </Field>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <TmsSettings empresaId={f.id} />
    </>
  );
}

function TmsSettings({ empresaId }: { empresaId: string }) {
  const [s, setS] = useState<{
    tms_valor_padrao_pacote: number | null;
    tms_pacotes_por_rota: number | null;
    tms_metodo_padrao: string | null;
    tms_mostrar_margem: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("empresas")
      .select("tms_valor_padrao_pacote, tms_pacotes_por_rota, tms_metodo_padrao, tms_mostrar_margem")
      .eq("id", empresaId)
      .maybeSingle()
      .then(({ data }) => setS((data as any) ?? {
        tms_valor_padrao_pacote: null, tms_pacotes_por_rota: null,
        tms_metodo_padrao: "packages", tms_mostrar_margem: true,
      }));
  }, [empresaId]);

  async function save() {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("empresas").update(s).eq("id", empresaId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações TMS salvas");
  }

  if (!s) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Configurações TMS</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Pacotes por rota (padrão)</Label>
            <Input type="number" min={1} value={s.tms_pacotes_por_rota ?? ""}
              onChange={(e) => setS({ ...s, tms_pacotes_por_rota: e.target.value === "" ? null : Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground">Tamanho de rota preferido</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Método de divisão padrão</Label>
            <Select value={s.tms_metodo_padrao ?? "packages"} onValueChange={(v) => setS({ ...s, tms_metodo_padrao: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="packages">Por pacotes</SelectItem>
                <SelectItem value="stops">Por paradas</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox checked={s.tms_mostrar_margem} onCheckedChange={(v) => setS({ ...s, tms_mostrar_margem: Boolean(v) })} />
            <Label className="text-sm">Mostrar margem da empresa nas telas</Label>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar configurações TMS"}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ============ ENTREGADOR ============ */

type EntregadorRow = {
  id: string; nome_completo: string; cpf: string; whatsapp: string | null;
  tipo_veiculo: string | null; placa: string | null;
  pix_tipo: string | null; pix_chave: string | null; banco: string | null;
  data_nascimento: string | null; selfie_url: string | null;
  cep: string | null; rua: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; estado: string | null;
  turnos: string[]; plataformas: string[]; plataforma_comprovante_url: string | null;
  tipo_pessoa: "pf" | "pj" | null; cnpj: string | null;
};

const TURNOS = ["manha", "tarde", "noite", "madrugada"] as const;
const TURNO_LABEL: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite", madrugada: "Madrugada" };
const PLATAFORMAS = ["iFood", "Rappi", "Uber", "Loggi", "99", "Mercado Livre", "Shopee", "Amazon"];
const VEICULOS = [
  { v: "andante", label: "A pé" },
  { v: "bike", label: "Bike" },
  { v: "moto_eletrica", label: "Moto elétrica" },
  { v: "motoboy", label: "Motoboy" },
  { v: "carro", label: "Carro" },
  { v: "caminhao", label: "Caminhão" },
];
const PIX_TIPOS = ["cpf", "cnpj", "email", "telefone", "aleatoria"];

function EntregadorProfile() {
  const { user } = useAuth();
  const [f, setF] = useState<EntregadorRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [compPreview, setCompPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("entregadores").select("*").eq("id", user.id).maybeSingle().then(async ({ data }) => {
      const row = (data as EntregadorRow) ?? {
        id: user.id, nome_completo: "", cpf: "", whatsapp: "", tipo_veiculo: null, placa: "",
        pix_tipo: null, pix_chave: "", banco: "", data_nascimento: null, selfie_url: null,
        cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
        turnos: [], plataformas: [], plataforma_comprovante_url: null,
        tipo_pessoa: null, cnpj: null,
      };
      setF(row);
      if (row.selfie_url) {
        const { data: s } = await supabase.storage.from("entregador-docs").createSignedUrl(row.selfie_url, 3600);
        setSelfiePreview(s?.signedUrl ?? null);
      }
      if (row.plataforma_comprovante_url) {
        const { data: s } = await supabase.storage.from("entregador-docs").createSignedUrl(row.plataforma_comprovante_url, 3600);
        setCompPreview(s?.signedUrl ?? null);
      }
    });
  }, [user]);

  const pct = useMemo(() => {
    if (!f) return 0;
    return completion([
      f.nome_completo, f.whatsapp, f.tipo_veiculo, f.pix_tipo, f.pix_chave, f.banco,
      f.cep, f.rua, f.numero, f.bairro, f.cidade, f.estado,
      f.turnos, f.plataformas, f.selfie_url,
    ]);
  }, [f]);

  async function lookupCep(cep: string) {
    if (!f || onlyDigits(cep).length !== 8) return;
    setCepLoading(true);
    const r = await fetchCEP(cep);
    setCepLoading(false);
    if (r) setF({ ...f, rua: r.logradouro, bairro: r.bairro, cidade: r.localidade, estado: r.uf });
  }

  async function uploadFile(file: File, prefix: string): Promise<string | null> {
    if (!user) return null;
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("entregador-docs").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return path;
  }

  async function onSelfie(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !f) return;
    const path = await uploadFile(file, "selfie");
    if (path) {
      setF({ ...f, selfie_url: path });
      const { data: s } = await supabase.storage.from("entregador-docs").createSignedUrl(path, 3600);
      setSelfiePreview(s?.signedUrl ?? null);
      toast.success("Foto enviada");
    }
  }

  async function onComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !f) return;
    const path = await uploadFile(file, "plataformas");
    if (path) {
      setF({ ...f, plataforma_comprovante_url: path });
      const { data: s } = await supabase.storage.from("entregador-docs").createSignedUrl(path, 3600);
      setCompPreview(s?.signedUrl ?? null);
      toast.success("Comprovante enviado");
    }
  }

  function toggleArr(key: "turnos" | "plataformas", v: string) {
    if (!f) return;
    const arr = f[key];
    setF({ ...f, [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    if (f.tipo_pessoa === "pj") {
      if (!f.cnpj || !isValidCNPJ(f.cnpj)) {
        return toast.error("Informe um CNPJ válido para conta PJ.");
      }
    }
    setSaving(true);
    const { error } = await supabase.from("entregadores").update({
      nome_completo: f.nome_completo,
      whatsapp: f.whatsapp,
      tipo_veiculo: f.tipo_veiculo as never,
      placa: f.placa,
      pix_tipo: f.pix_tipo as never, pix_chave: f.pix_chave, banco: f.banco,
      selfie_url: f.selfie_url, plataforma_comprovante_url: f.plataforma_comprovante_url,
      cep: f.cep, rua: f.rua, numero: f.numero, complemento: f.complemento,
      bairro: f.bairro, cidade: f.cidade, estado: f.estado,
      turnos: f.turnos, plataformas: f.plataformas,
      tipo_pessoa: f.tipo_pessoa ?? null,
      cnpj: f.tipo_pessoa === "pj" ? (f.cnpj ?? null) : null,
    } as never).eq("id", f.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  if (!f) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  const up = <K extends keyof EntregadorRow>(k: K, v: EntregadorRow[K]) => setF({ ...f, [k]: v });
  const needsPlaca = f.tipo_veiculo && !["andante", "bike"].includes(f.tipo_veiculo);

  return (
    <>
      <CompletionCard pct={pct} />

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/30 bg-muted">
              {selfiePreview ? (
                <img src={selfiePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Camera className="h-7 w-7" />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="font-medium">{f.nome_completo || "Sem nome"}</p>
            <Label htmlFor="selfie" className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted">
              <Upload className="h-4 w-4" /> Alterar foto
            </Label>
            <input id="selfie" type="file" accept="image/*" className="hidden" onChange={onSelfie} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="E-mail"><Input value={user?.email ?? ""} disabled /></Field>
            <Field label="CPF"><Input value={f.cpf} disabled /></Field>

            <Field label="Nome completo">
              <Input value={f.nome_completo} onChange={(e) => up("nome_completo", e.target.value)} className={emptyClass(f.nome_completo)} />
              <EmptyHint v={f.nome_completo} />
            </Field>
            <Field label="Data de nascimento">
              <Input value={f.data_nascimento ?? ""} disabled />
            </Field>



            <Field label="WhatsApp">
              <Input value={f.whatsapp ?? ""} onChange={(e) => up("whatsapp", maskPhone(e.target.value))} className={emptyClass(f.whatsapp)} />
              <EmptyHint v={f.whatsapp} />
            </Field>
            <Field label="Tipo de veículo">
              <Select value={f.tipo_veiculo ?? ""} onValueChange={(v) => up("tipo_veiculo", v)}>
                <SelectTrigger className={emptyClass(f.tipo_veiculo)}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {VEICULOS.map((v) => <SelectItem key={v.v} value={v.v}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <EmptyHint v={f.tipo_veiculo} />
            </Field>

            {needsPlaca && (
              <Field label="Placa">
                <Input value={f.placa ?? ""} onChange={(e) => up("placa", maskPlaca(e.target.value))} className={emptyClass(f.placa)} />
                <EmptyHint v={f.placa} />
              </Field>
            )}

            <Field label="CEP">
              <div className="relative">
                <Input value={f.cep ?? ""} onChange={(e) => { const v = maskCEP(e.target.value); up("cep", v); lookupCep(v); }} className={emptyClass(f.cep)} />
                {cepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <EmptyHint v={f.cep} />
            </Field>

            <Field label="Rua" className="sm:col-span-2">
              <Input value={f.rua ?? ""} onChange={(e) => up("rua", e.target.value)} className={emptyClass(f.rua)} />
              <EmptyHint v={f.rua} />
            </Field>
            <Field label="Número">
              <Input value={f.numero ?? ""} onChange={(e) => up("numero", e.target.value)} className={emptyClass(f.numero)} />
              <EmptyHint v={f.numero} />
            </Field>
            <Field label="Complemento">
              <Input value={f.complemento ?? ""} onChange={(e) => up("complemento", e.target.value)} />
            </Field>
            <Field label="Bairro">
              <Input value={f.bairro ?? ""} onChange={(e) => up("bairro", e.target.value)} className={emptyClass(f.bairro)} />
              <EmptyHint v={f.bairro} />
            </Field>
            <Field label="Cidade">
              <Input value={f.cidade ?? ""} onChange={(e) => up("cidade", e.target.value)} className={emptyClass(f.cidade)} />
              <EmptyHint v={f.cidade} />
            </Field>
            <Field label="Estado">
              <Input value={f.estado ?? ""} maxLength={2} onChange={(e) => up("estado", e.target.value.toUpperCase())} className={emptyClass(f.estado)} />
              <EmptyHint v={f.estado} />
            </Field>

            <Field label="Turnos disponíveis" className="sm:col-span-2">
              <div className={`flex flex-wrap gap-3 rounded-md border p-3 ${f.turnos.length === 0 ? "border-primary/70" : ""}`}>
                {TURNOS.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={f.turnos.includes(t)} onCheckedChange={() => toggleArr("turnos", t)} />
                    {TURNO_LABEL[t]}
                  </label>
                ))}
              </div>
              <EmptyHint v={f.turnos} />
            </Field>

            <Field label="Plataformas cadastradas" className="sm:col-span-2">
              <div className={`flex flex-wrap gap-3 rounded-md border p-3 ${f.plataformas.length === 0 ? "border-primary/70" : ""}`}>
                {PLATAFORMAS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={f.plataformas.includes(p)} onCheckedChange={() => toggleArr("plataformas", p)} />
                    {p}
                  </label>
                ))}
              </div>
              <EmptyHint v={f.plataformas} />
              <div className="mt-2">
                <Label htmlFor="comp" className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> {compPreview ? "Trocar comprovante" : "Enviar comprovante"}
                </Label>
                <input id="comp" type="file" accept="image/*,application/pdf" className="hidden" onChange={onComprovante} />
                {compPreview && <a href={compPreview} target="_blank" rel="noreferrer" className="ml-3 text-xs text-primary underline">ver comprovante</a>}
              </div>
            </Field>

            <Field label="Tipo de chave PIX">
              <Select value={f.pix_tipo ?? ""} onValueChange={(v) => up("pix_tipo", v)}>
                <SelectTrigger className={emptyClass(f.pix_tipo)}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PIX_TIPOS.map((p) => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
              <EmptyHint v={f.pix_tipo} />
            </Field>
            <Field label="Chave PIX">
              <Input value={f.pix_chave ?? ""} onChange={(e) => up("pix_chave", e.target.value)} className={emptyClass(f.pix_chave)} />
              <EmptyHint v={f.pix_chave} />
            </Field>
            <Field label="Banco" className="sm:col-span-2">
              <Input value={f.banco ?? ""} onChange={(e) => up("banco", e.target.value)} className={emptyClass(f.banco)} />
              <EmptyHint v={f.banco} />
            </Field>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

/* ============ ADMIN basic ============ */

function AdminBasic() {
  const { user } = useAuth();
  return (
    <Card>
      <CardHeader><CardTitle>Conta administrador</CardTitle></CardHeader>
      <CardContent>
        <Field label="E-mail"><Input value={user?.email ?? ""} disabled /></Field>
      </CardContent>
    </Card>
  );
}

/* ============ PASSWORD ============ */

function PasswordChange() {
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nw.length < 6) return toast.error("Nova senha precisa de no mínimo 6 caracteres");
    if (nw !== cf) return toast.error("Confirmação não confere");
    if (!user?.email) return;
    setBusy(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: user.email, password: cur });
    if (signErr) { setBusy(false); return toast.error("Senha atual incorreta"); }
    const { error } = await supabase.auth.updateUser({ password: nw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    setCur(""); setNw(""); setCf("");
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Alterar senha</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
          <Field label="Senha atual"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
          <Field label="Nova senha"><Input type="password" value={nw} onChange={(e) => setNw(e.target.value)} /></Field>
          <Field label="Confirmar nova senha"><Input type="password" value={cf} onChange={(e) => setCf(e.target.value)} /></Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:opacity-90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ============ field ============ */

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
