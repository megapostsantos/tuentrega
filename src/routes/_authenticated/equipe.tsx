import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Share2, UserPlus, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { whatsappLink } from "@/lib/contato";

export const Route = createFileRoute("/_authenticated/equipe")({ component: EquipePage });

type Membro = { user_id: string; nome: string | null; email: string | null; ativo: boolean; codigo_convite: string | null };

function EquipePage() {
  const { user, role, isOperador, loading } = useAuth();
  const sb = supabase as any;
  const [membros, setMembros] = useState<Membro[]>([]);
  const [vp, setVp] = useState("");
  const [salvandoVp, setSalvandoVp] = useState(false);
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", email: "", whatsapp: "" });
  const [criando, setCriando] = useState(false);
  const [feito, setFeito] = useState<null | { nome: string; email: string; whatsapp: string; codigo: string }>(null);

  async function load() {
    const { data } = await sb.from("equipe_empresa").select("user_id, nome, email, ativo, codigo_convite").order("criado_em", { ascending: false });
    setMembros((data as Membro[]) ?? []);
    const { data: e } = await sb.from("empresas").select("tms_valor_padrao_pacote").eq("id", user?.id).maybeSingle();
    if (e?.tms_valor_padrao_pacote != null) setVp(String(e.tms_valor_padrao_pacote));
  }
  useEffect(() => { if (user?.id && role === "empresa" && !isOperador) load(); /* eslint-disable-next-line */ }, [user?.id, role, isOperador]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "empresa" || isOperador) return <div className="p-6 text-muted-foreground">Somente o dono da empresa acessa a equipe.</div>;

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
    const { data, error } = await sb.rpc("cadastrar_membro_equipe", { nome_completo: f.nome, email: f.email, whatsapp: f.whatsapp });
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
    const msg = `Olá ${feito.nome}! Você foi cadastrado(a) na equipe da empresa no TuEntrega. Para criar sua senha, abra ${window.location.origin}/auth, toque em "Convite" e use o e-mail ${feito.email} e o código ${feito.codigo}.`;
    const fone = feito.whatsapp.replace(/\D/g, "");
    window.open(fone ? `https://wa.me/${fone.length <= 11 ? "55" + fone : fone}?text=${encodeURIComponent(msg)}` : whatsappLink(msg).replace(/phone=\d+/, "phone="), "_blank");
  }

  function fechar() { setNovo(false); setFeito(null); setF({ nome: "", email: "", whatsapp: "" }); }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title="Equipe" description="Funcionários que operam o dia a dia sem ver valores" />

      <Card>
        <CardHeader><CardTitle className="text-base">Valor padrão por pacote</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            É o valor usado automaticamente quando um funcionário cria operações e ofertas. Ele não vê nem altera esse valor.
          </p>
          <div className="flex max-w-xs gap-2">
            <Input inputMode="decimal" placeholder="Ex.: 2,50" value={vp} onChange={(e) => setVp(e.target.value)} />
            <Button onClick={salvarVp} disabled={salvandoVp}>{salvandoVp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Funcionários</CardTitle>
          <Button size="sm" onClick={() => setNovo(true)}><UserPlus className="mr-1 h-4 w-4" />Adicionar</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            O funcionário pode: criar operações, alocar parceiros, acompanhar rotas, encerrar rotas e conferir devoluções. Não vê valores, pagamentos nem dados de PIX, e não apaga nada.
          </p>
          {membros.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>}
          {membros.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                {m.codigo_convite && <div className="text-xs text-amber-700">Convite pendente · código {m.codigo_convite}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={m.ativo ? "secondary" : "outline"}>{m.ativo ? "Ativo" : "Desativado"}</Badge>
                <Button size="sm" variant="outline" onClick={() => alternar(m)}>{m.ativo ? "Desativar" : "Reativar"}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

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
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/auth — aba Convite — e-mail ${feito.email}, código ${feito.codigo}`); toast.success("Copiado"); }}>
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
                <div className="space-y-1"><Label>WhatsApp (opcional)</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="(13) 99999-9999" /></div>
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
