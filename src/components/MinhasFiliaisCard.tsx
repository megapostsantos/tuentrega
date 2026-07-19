import { useEffect, useState } from "react";
import { Plus, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Filial = {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  ativa: boolean;
  pendente_aprovacao: boolean;
};

export function MinhasFiliaisCard({ empresaId }: { empresaId: string }) {
  const [rows, setRows] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", cidade: "", estado: "", responsavel: "", whatsapp: "" });

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("filiais")
      .select("id, nome, cidade, estado, responsavel, whatsapp, ativa, pendente_aprovacao")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [empresaId]);

  async function solicitar() {
    if (!form.nome.trim()) return toast.error("Informe o nome da filial");
    setSaving(true);
    const { error } = await (supabase as any).from("filiais").insert({
      empresa_id: empresaId,
      nome: form.nome.trim(),
      cidade: form.cidade || null,
      estado: form.estado ? form.estado.toUpperCase() : null,
      responsavel: form.responsavel || null,
      whatsapp: form.whatsapp || null,
      ativa: false,
      pendente_aprovacao: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação enviada! Aguarde a aprovação do administrador.");
    setForm({ nome: "", cidade: "", estado: "", responsavel: "", whatsapp: "" });
    setShowForm(false);
    load();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" /> Minhas Filiais
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-3 w-3" /> Solicitar filial
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              A criação de filiais é aprovada pelo administrador. Preencha os dados e envie a solicitação.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label className="text-xs">Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
              <div><Label className="text-xs">Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
              <div><Label className="text-xs">Estado</Label><Input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
              <div className="sm:col-span-2"><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={solicitar} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enviar solicitação"}</Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-xs text-muted-foreground">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Você ainda não possui filiais cadastradas.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((f) => (
              <div key={f.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{f.nome}</div>
                  {f.pendente_aprovacao ? (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Aguardando aprovação</Badge>
                  ) : f.ativa ? (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px]">Ativa</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Inativa</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[f.cidade, f.estado].filter(Boolean).join("/") || "Localização não informada"}
                  {f.responsavel && ` · ${f.responsavel}`}
                  {f.whatsapp && ` · ${f.whatsapp}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
