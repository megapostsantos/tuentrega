import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Check, X, Building2, Bike, Link2, ShieldAlert, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { setImpersonation } from "@/lib/impersonation";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/cadastros")({ component: CadastrosPage });

type Cad = {
  id: string; name: string; email: string; criado_em: string; status: "pendente" | "aprovado" | "recusado"; tipo: string; motivo: string | null;
  empresa: string | null; cnpj: string | null; empresa_whatsapp: string | null; cpf: string | null; tipo_veiculo: string | null; ent_whatsapp: string | null;
  vinculado_a: string | null; pre_cadastrado: boolean;
};

const ABAS = [["pendente", "Pendentes"], ["aprovado", "Aprovados"], ["recusado", "Recusados"]] as const;

function CadastrosPage() {
  const { realUserId } = useAuth();
  const navigate = useNavigate();
  const [lista, setLista] = useState<Cad[] | null>(null);
  const [aba, setAba] = useState<"pendente" | "aprovado" | "recusado">("pendente");
  const [busca, setBusca] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function carregar() {
    const r = await fetch("/api/admin/cadastros", { credentials: "same-origin" });
    if (!r.ok) return toast.error("Sem permissão (entre como admin).");
    setLista(await r.json());
  }
  useEffect(() => { carregar(); }, []);

  async function apagar(c: Cad) {
    const aviso = c.tipo === "empresa"
      ? `Apagar a empresa ${c.empresa || c.name} de vez? Isso remove também a equipe, as rotas, ofertas, pacotes e o histórico dela. Não dá para desfazer.`
      : `Apagar ${c.name} de vez? A conta, os documentos e o histórico dessa pessoa somem. Não dá para desfazer.`;
    if (!confirm(aviso)) return;
    if (prompt('Para confirmar, digite APAGAR') !== "APAGAR") return toast.info("Nada foi apagado.");
    setBusy(c.id);
    const r = await fetch("/api/admin/cadastros/excluir", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: c.id, confirmar: "APAGAR" }) });
    setBusy(null);
    if (!r.ok) return toast.error((await r.json().catch(() => ({})))?.error ?? "Falha ao apagar");
    toast.success(`${c.name} foi apagado.`);
    carregar();
  }

  async function verComo(c: Cad) {
    if (!realUserId || (c.tipo !== "empresa" && c.tipo !== "entregador")) return;
    const res = await fetch("/api/admin/impersonate", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: c.id, targetType: c.tipo }) }).catch(() => null);
    const sessionId = res?.ok ? (await res.json()).id : crypto.randomUUID();
    setImpersonation({ targetUserId: c.id, targetType: c.tipo, targetName: c.empresa || c.name, sessionId, adminId: realUserId });
    toast.success(`Visualizando como ${c.empresa || c.name}`);
    navigate({ to: "/dashboard" });
  }

  async function decidir(c: Cad, aprovar: boolean) {
    let motivo: string | null = null;
    if (!aprovar) {
      motivo = prompt(`Motivo para ${c.status === "aprovado" ? "bloquear" : "recusar"} ${c.name} (aparece para a pessoa):`);
      if (motivo === null) return;
    }
    setBusy(c.id);
    const r = await fetch("/api/admin/cadastros/decidir", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: c.id, aprovar, motivo }) });
    setBusy(null);
    if (!r.ok) return toast.error((await r.json().catch(() => ({})))?.error ?? "Falha");
    toast.success(aprovar ? `${c.name} aprovado.` : `${c.name} ${c.status === "aprovado" ? "bloqueado" : "recusado"}.`);
    carregar();
  }

  const contagem = useMemo(() => Object.fromEntries(ABAS.map(([k]) => [k, (lista ?? []).filter((c) => c.status === k).length])), [lista]);
  const visiveis = (lista ?? []).filter((c) => c.status === aba && (!busca.trim() || `${c.name} ${c.email} ${c.empresa ?? ""} ${c.cnpj ?? ""} ${c.cpf ?? ""}`.toLowerCase().includes(busca.trim().toLowerCase())));

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader title="Cadastros" description="Aprove manualmente quem se cadastra na plataforma" />
      <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs">
        <strong>Como funciona:</strong> quem se cadastra por conta própria fica <em>pendente</em> e não acessa nada até você aprovar. Parceiros e funcionários <em>convidados por uma empresa</em> entram direto e ficam <strong>vinculados a ela</strong> (só veem as ofertas dela).
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
          {ABAS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setAba(k)} className={`rounded-full px-3 py-1.5 ${aba === k ? "bg-background shadow" : "text-muted-foreground"}`}>
              {l} ({contagem[k] ?? 0})
            </button>
          ))}
        </div>
        <Input className="h-9 max-w-xs" placeholder="Buscar nome, e-mail, CNPJ, CPF…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {!lista ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : visiveis.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{aba === "pendente" ? "Nenhum cadastro aguardando aprovação. 🎉" : "Nada por aqui."}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visiveis.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      {c.tipo === "empresa" ? <Building2 className="h-4 w-4" /> : c.tipo === "entregador" ? <Bike className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}
                      <span className="truncate">{c.empresa || c.name}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{c.name} · {c.email}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{c.tipo === "incompleto" ? "cadastro incompleto" : c.tipo}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {c.cnpj && <span>CNPJ: {c.cnpj}</span>}
                  {c.cpf && <span>CPF: {c.cpf}</span>}
                  {c.tipo_veiculo && <span>Veículo: {c.tipo_veiculo}</span>}
                  {(c.empresa_whatsapp || c.ent_whatsapp) && <span>WhatsApp: {c.empresa_whatsapp || c.ent_whatsapp}</span>}
                  <span>Cadastro: {new Date(c.criado_em).toLocaleDateString("pt-BR")}</span>
                </div>
                {c.vinculado_a && <div className="flex items-center gap-1 text-xs text-emerald-700"><Link2 className="h-3.5 w-3.5" />Vinculado a {c.vinculado_a}</div>}
                {c.pre_cadastrado && !c.vinculado_a && <div className="text-xs text-amber-700">Pré-cadastrado por uma empresa (ainda não ativou a conta)</div>}
                {c.motivo && c.status !== "aprovado" && <div className="rounded bg-red-50 p-2 text-xs text-red-800">Motivo: {c.motivo}</div>}
                <div className="flex justify-end gap-2 pt-1">
                  {(c.tipo === "empresa" || c.tipo === "entregador") && <Button size="sm" variant="outline" onClick={() => verComo(c)}><Eye className="mr-1 h-4 w-4" />Ver perfil</Button>}
                  <Button size="sm" variant="outline" className="text-red-600" disabled={busy === c.id} onClick={() => apagar(c)}><Trash2 className="mr-1 h-4 w-4" />Apagar</Button>
                  {c.status !== "aprovado" && <Button size="sm" disabled={busy === c.id} onClick={() => decidir(c, true)}><Check className="mr-1 h-4 w-4" />Aprovar</Button>}
                  {c.status !== "recusado" && <Button size="sm" variant="outline" className="text-red-600" disabled={busy === c.id} onClick={() => decidir(c, false)}><X className="mr-1 h-4 w-4" />{c.status === "aprovado" ? "Bloquear" : "Recusar"}</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
