import { useEffect, useState } from "react";
import { Plus, Power, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Filial = {
  id: string;
  empresa_id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  ativa: boolean;
  pendente_aprovacao: boolean;
};

export function FiliaisAdminSection({ empresaId }: { empresaId: string }) {
  const [rows, setRows] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", cidade: "", estado: "", responsavel: "", whatsapp: "" });

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("filiais")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [empresaId]);

  async function addFilial() {
    if (!form.nome.trim()) return toast.error("Informe o nome da filial");
    setSaving(true);
    const { error } = await (supabase as any).from("filiais").insert({
      empresa_id: empresaId,
      nome: form.nome.trim(),
      cidade: form.cidade || null,
      estado: form.estado ? form.estado.toUpperCase() : null,
      responsavel: form.responsavel || null,
      whatsapp: form.whatsapp || null,
      ativa: true,
      pendente_aprovacao: false,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Filial adicionada");
    setForm({ nome: "", cidade: "", estado: "", responsavel: "", whatsapp: "" });
    setShowForm(false);
    load();
  }

  async function toggle(f: Filial) {
    const { error } = await (supabase as any).from("filiais").update({ ativa: !f.ativa }).eq("id", f.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function aprovar(f: Filial) {
    const { error } = await (supabase as any).from("filiais").update({ pendente_aprovacao: false, ativa: true }).eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Filial aprovada");
    load();
  }

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Filiais ({rows.length})</div>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-3 w-3" />Nova filial
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label className="text-xs">Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
            <div><Label className="text-xs">Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
            <div><Label className="text-xs">Estado</Label><Input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
            <div className="col-span-2"><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={addFilial} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Adicionar"}</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nenhuma filial cadastrada.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{f.nome}</span>
                  {f.pendente_aprovacao && <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Pendente</Badge>}
                  {!f.ativa && !f.pendente_aprovacao && <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[f.cidade, f.estado].filter(Boolean).join("/") || "—"} · {f.responsavel ?? "sem responsável"}
                </div>
              </div>
              <div className="flex gap-1">
                {f.pendente_aprovacao && (
                  <Button size="icon" variant="ghost" title="Aprovar" onClick={() => aprovar(f)}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                )}
                <Button size="icon" variant="ghost" title={f.ativa ? "Desativar" : "Ativar"} onClick={() => toggle(f)}>
                  <Power className={`h-4 w-4 ${f.ativa ? "text-success" : "text-muted-foreground"}`} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
