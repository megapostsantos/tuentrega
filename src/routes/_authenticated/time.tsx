import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Lock, Unlock, Loader2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/time")({
  component: TimePage,
});

function TimePage() {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "dispatcher") {
    return (
      <div className="p-6">
        <PageHeader title="Meu Time" description="Apenas dispatchers." />
        <EmptyModule icon={UserCog} title="Acesso restrito" description="Esta área é exclusiva para dispatchers." />
      </div>
    );
  }
  return <TeamView userId={user!.id} />;
}

function TeamView({ userId }: { userId: string }) {
  const sb = supabase as any;
  const [dispRow, setDispRow] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [defaultRate, setDefaultRate] = useState("1.80");

  async function load() {
    setLoading(true);
    const { data: d } = await sb.from("dispatchers").select("id, empresa_id, valor_por_pacote").eq("entregador_id", userId).maybeSingle();
    setDispRow(d);
    if (!d) { setMembers([]); setLoading(false); return; }
    const { data: team } = await sb
      .from("dispatcher_team")
      .select("*")
      .eq("dispatcher_id", d.id)
      .order("created_at", { ascending: false });
    const ids = (team ?? []).map((t: any) => t.entregador_id);
    let ents: any[] = [];
    if (ids.length) {
      const { data } = await sb.from("entregadores").select("id, nome_completo, tipo_veiculo, reliability_score, reliability_level").in("id", ids);
      ents = data ?? [];
    }
    setMembers((team ?? []).map((t: any) => ({ ...t, entregador: ents.find((e) => e.id === t.entregador_id) })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = sb.channel(`team-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "dispatcher_team" }, load).subscribe();
    return () => { sb.removeChannel(ch); };
  }, [userId]);

  async function doSearch() {
    if (!search.trim()) { setSearchResults([]); return; }
    const { data } = await sb.from("entregadores").select("id, nome_completo, cpf, tipo_veiculo, reliability_level").or(`nome_completo.ilike.%${search}%,cpf.ilike.%${search}%`).limit(10);
    setSearchResults(data ?? []);
  }

  async function addMember(ent: any) {
    if (!dispRow) return;
    const { error } = await sb.from("dispatcher_team").insert({
      dispatcher_id: dispRow.id,
      entregador_id: ent.id,
      empresa_id: dispRow.empresa_id,
      valor_padrao_por_pacote: Number(defaultRate || 0),
    });
    if (error) return toast.error(error.message);
    toast.success("Entregador adicionado ao time");
    setAddOpen(false);
    setSearch("");
    setSearchResults([]);
    load();
  }

  async function updateRate(id: string, value: string) {
    await sb.from("dispatcher_team").update({ valor_padrao_por_pacote: Number(value || 0) }).eq("id", id);
  }

  async function remove(id: string) {
    if (!confirm("Remover este entregador do time?")) return;
    const { error } = await sb.from("dispatcher_team").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    load();
  }

  async function toggleExclusive(m: any) {
    const newVal = !m.exclusivo_aceito_dispatcher;
    const { error } = await sb.from("dispatcher_team").update({
      exclusivo: newVal && m.exclusivo_aceito_entregador,
      exclusivo_aceito_dispatcher: newVal,
    }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(newVal
      ? "Solicitação enviada. Aguardando aceite do entregador."
      : "Exclusividade desativada do seu lado.");
    load();
  }

  const activeToday = 0;
  const total = members.length;

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!dispRow) {
    return <div className="p-6"><EmptyModule icon={UserCog} title="Dispatcher não configurado" description="Sua empresa ainda não te ativou como dispatcher." /></div>;
  }

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="Meu Time" description={`${total} membro(s) · ${activeToday} ativo(s) hoje`} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 elev-1">
          <p className="text-xs text-muted-foreground">Total no time</p>
          <p className="mt-1 text-2xl font-bold">{total}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 elev-1">
          <p className="text-xs text-muted-foreground">Valor padrão recebido</p>
          <p className="mt-1 text-2xl font-bold">R$ {Number(dispRow.valor_por_pacote || 0).toFixed(2)}</p>
        </div>
      </div>

      <Button onClick={() => setAddOpen(true)} className="w-full"><UserPlus className="mr-2 h-4 w-4" />Adicionar entregador</Button>

      {members.length === 0 ? (
        <EmptyModule icon={UserCog} title="Nenhum entregador" description="Adicione entregadores para começar a montar seu time." />
      ) : (
        <ul className="space-y-3">
          {members.map((m) => {
            const e = m.entregador || {};
            const isExclusive = m.exclusivo && m.exclusivo_aceito_dispatcher && m.exclusivo_aceito_entregador;
            const pendingExclusive = m.exclusivo_aceito_dispatcher && !m.exclusivo_aceito_entregador;
            return (
              <li key={m.id} className="rounded-2xl border border-border bg-card p-4 elev-1">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {(e.nome_completo || "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.nome_completo || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{e.tipo_veiculo || "—"} · ⭐ {e.reliability_level || "—"} ({e.reliability_score ?? "—"})</p>
                    {isExclusive && <Badge className="mt-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">🔒 Exclusivo</Badge>}
                    {pendingExclusive && <Badge className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Aguardando aceite</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase">Valor/pacote</Label>
                    <Input
                      type="number" step="0.01" defaultValue={Number(m.valor_padrao_por_pacote || 0)}
                      onBlur={(e) => updateRate(m.id, e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => toggleExclusive(m)}>
                      {m.exclusivo_aceito_dispatcher ? <><Unlock className="mr-1 h-3 w-3" />Cancelar excl.</> : <><Lock className="mr-1 h-3 w-3" />Tornar exclusivo</>}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar ao time</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Buscar por nome ou CPF</Label>
              <div className="flex gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite o nome..." />
                <Button onClick={doSearch}>Buscar</Button>
              </div>
            </div>
            <div>
              <Label>Valor padrão por pacote (R$)</Label>
              <Input type="number" step="0.01" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} />
            </div>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {searchResults.map((r) => (
                <button key={r.id} onClick={() => addMember(r)} className="flex w-full items-center gap-3 rounded-lg border border-border p-2 text-left hover:bg-muted">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {(r.nome_completo || "?").split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.nome_completo}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{r.cpf} · {r.tipo_veiculo}</p>
                  </div>
                </button>
              ))}
              {search && searchResults.length === 0 && <p className="text-center text-xs text-muted-foreground">Nenhum resultado.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
