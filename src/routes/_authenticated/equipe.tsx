import { EmailConviteDialog } from "@/components/EmailConviteDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Share2, UserPlus, Copy, Briefcase, Bike, ChevronRight, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { whatsappLink, SITE_URL } from "@/lib/contato";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterEntregadorDialog } from "@/components/RegisterEntregadorDialog";

export const Route = createFileRoute("/_authenticated/equipe")({ component: EquipePage });

type Membro = { user_id: string; nome: string | null; email: string | null; ativo: boolean; codigo_convite: string | null; entregador: boolean; cargo?: string };

function EquipePage() {
  const { user, role, isEquipe: isOperador, loading } = useAuth();
  const sb = supabase as any;
  const [membros, setMembros] = useState<Membro[]>([]);
  const [vp, setVp] = useState("");
  const [salvandoVp, setSalvandoVp] = useState(false);
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", email: "", whatsapp: "", entregador: false, cargo: "funcionario" });
  const [criando, setCriando] = useState(false);
  const [empresaNome, setEmpresaNome] = useState("");
  const [aprovar, setAprovar] = useState(true);
  const [parceiros, setParceiros] = useState<{ id: string; nome: string; email: string | null; whatsapp: string | null; codigo: string | null }[]>([]);
  const [novoParceiro, setNovoParceiro] = useState(false);
  const [emailAlvo, setEmailAlvo] = useState<null | { id: string; nome: string; email: string | null }>(null);
  const [feito, setFeito] = useState<null | { nome: string; email: string; whatsapp: string; codigo: string }>(null);

  async function load() {
    const { data } = await sb.from("equipe_empresa").select("user_id, nome, email, ativo, codigo_convite, entregador, cargo").order("criado_em", { ascending: false });
    setMembros((data as Membro[]) ?? []);
    const { data: e } = await sb.from("empresas").select("tms_valor_padrao_pacote, nome_fantasia, razao_social, aprovar_candidatos").eq("id", user?.id).maybeSingle();
    if (e?.tms_valor_padrao_pacote != null) setVp(String(e.tms_valor_padrao_pacote));
    setEmpresaNome(e?.nome_fantasia || e?.razao_social || "");
    setAprovar(e?.aprovar_candidatos !== false);
    const { data: ger } = await sb.from("entregadores_gerenciados").select("entregador_id, codigo_convite");
    const ids = ((ger as any[]) ?? []).map((g) => g.entregador_id);
    if (ids.length) {
      const { data: ents } = await sb.from("entregadores").select("id, nome_completo, email, whatsapp").in("id", ids);
      setParceiros(((ger as any[]) ?? []).map((g) => {
        const en = ((ents as any[]) ?? []).find((x) => x.id === g.entregador_id);
        return { id: g.entregador_id, nome: en?.nome_completo ?? "Parceiro", email: en?.email ?? null, whatsapp: en?.whatsapp ?? null, codigo: g.codigo_convite ?? null };
      }));
    } else setParceiros([]);
  }
  useEffect(() => { if (user?.id && role === "empresa" && !isOperador) load(); /* eslint-disable-next-line */ }, [user?.id, role, isOperador]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "empresa" || isOperador) return <div className="p-6 text-muted-foreground">Somente o dono da empresa acessa a equipe.</div>;

  async function mudarAprovacao(v: boolean) {
    setAprovar(v);
    const { error } = await sb.from("empresas").update({ aprovar_candidatos: v }).eq("id", user!.id);
    if (error) { setAprovar(!v); return toast.error(error.message); }
    toast.success(v ? "Agora você aprova cada entregador antes de confirmar a rota." : "Agora a rota é do primeiro entregador que aceitar.");
  }

  async function salvarVp() {
    const n = Number(vp.replace(",", "."));
    if (!(n >= 0)) return toast.error("Informe um valor válido.");
    setSalvandoVp(true);
    const { error } = await sb.from("empresas").update({ tms_valor_padrao_pacote: n }).eq("id", user!.id);
    setSalvandoVp(false);
    if (error) return toast.error(error.message);
    toast.success("Valor padrão salvo.");
  }

  async function criar() {
    if (!f.nome.trim() || !f.email.trim()) return toast.error("Informe nome e e-mail.");
    setCriando(true);
    const { data, error } = await sb.rpc("cadastrar_membro_equipe", { nome_completo: f.nome, email: f.email, whatsapp: f.whatsapp, tambem_entregador: f.entregador, cargo: f.cargo });
    setCriando(false);
    if (error) return toast.error(error.message);
    setFeito({ nome: f.nome.trim(), email: f.email.trim().toLowerCase(), whatsapp: f.whatsapp, codigo: data.codigo });
    load();
  }

  async function alternar(m: Membro) {
    const { error } = await sb.from("equipe_empresa").update({ ativo: !m.ativo }).eq("user_id", m.user_id);
    if (error) return toast.error(error.message);
    toast.success(m.ativo ? "Acesso desativado." : "Acesso reativado.");
    load();
  }

  function whats() {
    if (!feito) return;
    const msg = `Olá ${feito.nome}! ${empresaNome ? `A empresa ${empresaNome} convidou você` : "Você foi convidado(a)"} para a equipe no TuEntrega. Para criar sua senha, abra ${SITE_URL}/auth, toque em "Convite" e use o e-mail ${feito.email} e o código ${feito.codigo}.`;
    const fone = feito.whatsapp.replace(/\D/g, "");
    window.open(fone ? `https://wa.me/${fone.length <= 11 ? "55" + fone : fone}?text=${encodeURIComponent(msg)}` : whatsappLink(msg).replace(/phone=\d+/, "phone="), "_blank");
  }

  function reenviar(nome: string, email: string | null, codigo: string | null, whatsapp: string | null, tipo: "equipe" | "parceiro") {
    if (!email || !codigo) return toast.error("Sem e-mail ou código para este convite.");
    const msg = `Olá ${nome}! ${empresaNome ? `A empresa ${empresaNome} convidou você` : "Você foi convidado(a)"} ${tipo === "equipe" ? "para a equipe" : "como parceiro(a)"} no TuEntrega.${tipo === "equipe" ? "" : " Ao ativar, você fica vinculado(a) a essa empresa e vê as ofertas dela."} Para criar sua senha, abra ${SITE_URL}/auth, toque em "Convite" e use o e-mail ${email} e o código ${codigo}.`;
    const fone = (whatsapp ?? "").replace(/\D/g, "");
    window.open(fone ? `https://wa.me/${fone.length <= 11 ? "55" + fone : fone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  async function removerMembro(m: Membro) {
    if (!confirm(`Apagar ${m.nome}? A conta de funcionário dele é removida de vez. Não dá para desfazer.`)) return;
    const { error } = await sb.rpc("remover_membro_equipe", { user_id: m.user_id });
    if (error) return toast.error(error.message);
    toast.success("Funcionário removido."); load();
  }
  async function removerParceiro(p: { id: string; nome: string; codigo: string | null }) {
    if (!confirm(p.codigo ? `Apagar o cadastro de ${p.nome}? Tudo some. Não dá para desfazer.` : `Remover ${p.nome} da sua empresa?`)) return;
    const { error } = await sb.rpc("remover_parceiro", { entregador_id: p.id });
    if (error) return toast.error(error.message);
    toast.success("Parceiro removido."); load();
  }
  function fechar() { setNovo(false); setFeito(null); setF({ nome: "", email: "", whatsapp: "", entregador: false, cargo: "funcionario" }); }

  async function mudarCargo(m: Membro, cargo: string) {
    const { error } = await sb.from("equipe_empresa").update({ cargo }).eq("user_id", m.user_id);
    if (error) return toast.error(error.message);
    toast.success(cargo === "supervisor" ? `${m.nome} agora é supervisor.` : `${m.nome} agora é funcionário.`);
    load();
  }

  async function alternarEntregador(m: Membro) {
    const { error } = await sb.rpc("definir_membro_entregador", { _user_id: m.user_id, _ativo: !m.entregador });
    if (error) return toast.error(error.message);
    toast.success(m.entregador ? "Perfil de entregador desligado." : "Agora ele também pode atuar como entregador.");
    load();
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title="Equipe e acessos" description="Convide funcionários e parceiros e controle quem acessa a sua empresa" />

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setNovo(true)} className="flex items-start gap-3 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Briefcase className="h-5 w-5" /></span>
          <span>
            <span className="block font-bold">Convidar funcionário</span>
            <span className="block text-xs text-muted-foreground">Opera o dia a dia (operações, rotas, devoluções) sem ver valores nem apagar nada.</span>
            <span className="mt-2 inline-flex items-center text-xs font-semibold text-primary">Adicionar <ChevronRight className="h-3.5 w-3.5" /></span>
          </span>
        </button>
        <button type="button" onClick={() => setNovoParceiro(true)} className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Bike className="h-5 w-5" /></span>
          <span>
            <span className="block font-bold">Cadastrar parceiro entregador</span>
            <span className="block text-xs text-muted-foreground">Quem faz as rotas. Com e-mail, ele ativa a conta, mantém o histórico e fica <strong>vinculado só à sua empresa</strong> (não vê as ofertas das outras). Sem e-mail, você opera por ele.</span>
            <span className="mt-2 inline-flex items-center text-xs font-semibold text-primary">Cadastrar <ChevronRight className="h-3.5 w-3.5" /></span>
          </span>
        </button>
      </div>

      <Tabs defaultValue="funcionarios">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="funcionarios">Funcionários ({membros.length})</TabsTrigger>
          <TabsTrigger value="parceiros">Parceiros sem app ({parceiros.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="funcionarios" className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            O funcionário cria a senha em <strong>{SITE_URL.replace("https://", "")}/auth</strong>, aba <strong>Convite</strong>, com o e-mail e o código. Não recebeu? Use <strong>Reenviar</strong>.
          </p>
          {membros.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum funcionário ainda.
              <div className="mt-3"><Button size="sm" onClick={() => setNovo(true)}><UserPlus className="mr-1 h-4 w-4" />Convidar o primeiro</Button></div>
            </div>
          )}
          {membros.map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold">{m.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {m.codigo_convite
                  ? <Badge className="bg-amber-100 text-amber-800">Convite pendente · {m.codigo_convite}</Badge>
                  : <Badge variant={m.ativo ? "secondary" : "outline"}>{m.ativo ? "Ativo" : "Desativado"}</Badge>}
                <Badge className={m.cargo === "supervisor" ? "bg-primary/20 text-foreground hover:bg-primary/20" : ""} variant={m.cargo === "supervisor" ? "default" : "outline"}>{m.cargo === "supervisor" ? "Supervisor" : "Funcionário"}</Badge>
                {m.entregador && <Badge variant="outline"><Bike className="mr-1 h-3 w-3" />Também entregador</Badge>}
                <Button size="sm" variant="outline" onClick={() => mudarCargo(m, m.cargo === "supervisor" ? "funcionario" : "supervisor")}>{m.cargo === "supervisor" ? "Tornar funcionário" : "Tornar supervisor"}</Button>
                <Button size="sm" variant="outline" onClick={() => alternarEntregador(m)}>{m.entregador ? "Desligar entregador" : "Habilitar entregador"}</Button>
                {m.codigo_convite && <Button size="sm" variant="outline" onClick={() => reenviar(m.nome ?? "", m.email, m.codigo_convite, null, "equipe")}><Send className="mr-1 h-3.5 w-3.5" />Reenviar</Button>}
                {m.codigo_convite && <Button size="sm" variant="outline" onClick={() => setEmailAlvo({ id: m.user_id, nome: m.nome ?? "", email: m.email })}>Editar e-mail</Button>}
                <Button size="sm" variant="outline" onClick={() => alternar(m)}>{m.ativo ? "Desativar" : "Reativar"}</Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => removerMembro(m)}><Trash2 className="mr-1 h-3.5 w-3.5" />Apagar</Button>
              </div>
            </div>
          ))}
          <div className="rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <strong>Funcionário:</strong> cria operações, bipa e conta pacotes, aloca parceiros, acompanha e encerra rotas, confere devoluções. Usa sempre o valor padrão por pacote e não vê valores, pagamentos nem PIX; pode <em>sugerir</em> outro valor. <strong>Supervisor:</strong> faz tudo isso e também define valores, aprova as sugestões e dá baixa nos pagamentos. <strong>Só o dono</strong> mexe nos dados da empresa, na equipe e apaga registros.
          </div>
        </TabsContent>

        <TabsContent value="parceiros" className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">Parceiros que você cadastrou. Quem tem e-mail e ainda não ativou a conta aparece como convite pendente. Para ver todos os parceiros, abra <Link to="/entregadores" className="font-semibold text-primary underline">Entregadores</Link>.</p>
          {parceiros.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum parceiro cadastrado por você ainda.</div>}
          {parceiros.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{p.email ?? p.whatsapp ?? "Sem contato"}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {p.codigo
                  ? <><Badge className="bg-amber-100 text-amber-800">Convite pendente · {p.codigo}</Badge><Button size="sm" variant="outline" onClick={() => reenviar(p.nome, p.email, p.codigo, p.whatsapp, "parceiro")}><Send className="mr-1 h-3.5 w-3.5" />Reenviar</Button><Button size="sm" variant="outline" onClick={() => setEmailAlvo({ id: p.id, nome: p.nome, email: p.email })}>Editar e-mail</Button></>
                  : <Badge variant="secondary">Sem app (você opera)</Badge>}
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => removerParceiro(p)}><Trash2 className="mr-1 h-3.5 w-3.5" />{p.codigo ? "Apagar" : "Remover"}</Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <EmailConviteDialog alvo={emailAlvo} onClose={() => setEmailAlvo(null)} onSaved={() => { setEmailAlvo(null); load(); }} />

      <Card>
        <CardHeader><CardTitle className="text-base">Quem faz as suas rotas</CardTitle></CardHeader>
        <CardContent className="flex items-start justify-between gap-4">
          <div className="text-sm">
            <div className="font-semibold">Aprovar entregadores antes de confirmar a rota</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {aprovar
                ? "Quando um entregador quer uma rota publicada, ele vira candidato e você escolhe quem faz (aprovar ou recusar)."
                : "A rota fica com o primeiro entregador que aceitar, sem passar por você."}
            </p>
          </div>
          <Switch checked={aprovar} onCheckedChange={mudarAprovacao} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valor padrão por pacote</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            É o valor usado automaticamente quando um funcionário cria operações, ofertas e previsões. Ele não vê nem altera esse valor.
          </p>
          <div className="flex max-w-xs gap-2">
            <Input inputMode="decimal" placeholder="Ex.: 2,50" value={vp} onChange={(e) => setVp(e.target.value)} />
            <Button onClick={salvarVp} disabled={salvandoVp}>{salvandoVp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </div>
        </CardContent>
      </Card>

      <RegisterEntregadorDialog open={novoParceiro} onClose={() => setNovoParceiro(false)} onCreated={load} />

      <Dialog open={novo} onOpenChange={(v) => !v && fechar()}>
        <DialogContent className="max-w-md">
          {feito ? (
            <>
              <DialogHeader>
                <DialogTitle>{feito.nome} cadastrado(a)</DialogTitle>
                <DialogDescription>Envie o convite para ele(a) criar a própria senha.</DialogDescription>
              </DialogHeader>
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <div>E-mail: <strong>{feito.email}</strong></div>
                <div>Código: <strong className="tracking-widest">{feito.codigo}</strong></div>
              </div>
              <Button onClick={whats}><Share2 className="mr-2 h-4 w-4" />Enviar pelo WhatsApp</Button>
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(`${SITE_URL}/auth — aba Convite — e-mail ${feito.email}, código ${feito.codigo}`); toast.success("Copiado"); }}>
                <Copy className="mr-2 h-4 w-4" />Copiar dados
              </Button>
              <DialogFooter><Button onClick={fechar}>Fechar</Button></DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Adicionar funcionário</DialogTitle>
                <DialogDescription>Ele cria a senha pela aba Convite, com o e-mail e um código.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
                <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([["funcionario", "Funcionário", "Opera o dia a dia: bipa, aloca, conta e fecha rotas. Usa o valor padrão por pacote."], ["supervisor", "Supervisor", "Tudo do funcionário + define valores, aprova sugestões e dá baixa em pagamentos."]] as const).map(([v, t, d]) => (
                      <button key={v} type="button" onClick={() => setF({ ...f, cargo: v })} className={`rounded-lg border p-2 text-left text-xs ${f.cargo === v ? "border-primary bg-primary/10" : "border-border"}`}>
                        <div className="font-semibold">{t}</div><div className="mt-0.5 text-muted-foreground">{d}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1"><Label>WhatsApp (opcional)</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="(13) 99999-9999" /></div>
                <label className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs">
                  <input type="checkbox" className="mt-0.5" checked={f.entregador} onChange={(e) => setF({ ...f, entregador: e.target.checked })} />
                  <span><strong>Também faz rotas como entregador.</strong> Ele ganha um botão para alternar entre <em>Gestão</em> e <em>Entregador</em> na mesma conta.</span>
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={fechar}>Cancelar</Button>
                <Button onClick={criar} disabled={criando}>{criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cadastrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
