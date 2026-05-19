import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/plans")({ component: PlansPage });

type Plan = {
  id: string; name: string; price_cents: number; trial_days: number; features: string[];
};

function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const sb = supabase as any;
    const { data: ps } = await sb.from("plans").select("*").order("price_cents");
    setPlans(ps ?? []);
    const { data: emp } = await sb.from("empresas").select("plano").eq("status", "ativo");
    const map: Record<string, number> = {};
    (emp ?? []).forEach((e: any) => { map[e.plano] = (map[e.plano] ?? 0) + 1; });
    setCounts(map);
    setLoading(false);
  }

  function update(id: string, patch: Partial<Plan>) {
    setPlans((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function save(p: Plan) {
    setSaving(p.id);
    const sb = supabase as any;
    const { error } = await sb.from("plans").update({
      name: p.name, price_cents: p.price_cents, trial_days: p.trial_days, features: p.features,
    }).eq("id", p.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    await sb.from("admin_logs").insert({ admin_id: user?.id, action: "plan_update", target: p.id, details: p });
    toast.success(`Plano ${p.name} salvo`);
  }

  if (loading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Planos" description="Preços e funcionalidades dos planos da plataforma" />
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <Input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} className="text-lg font-bold border-0 bg-transparent p-0 focus-visible:ring-0" />
                <p className="text-xs uppercase text-muted-foreground">{p.id}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {counts[p.id] ?? 0} ativas
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Preço (R$ / mês)</Label>
                <Input type="number" min={0} step="0.01"
                  value={(p.price_cents / 100).toFixed(2)}
                  onChange={(e) => update(p.id, { price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div>
                <Label className="text-xs">Dias de trial</Label>
                <Input type="number" min={0} value={p.trial_days}
                  onChange={(e) => update(p.id, { trial_days: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-xs">Funcionalidades</Label>
              <div className="mt-2 space-y-2">
                {(p.features ?? []).map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={f} onChange={(e) => {
                      const fs = [...p.features]; fs[i] = e.target.value; update(p.id, { features: fs });
                    }} />
                    <Button size="icon" variant="ghost" onClick={() => {
                      update(p.id, { features: p.features.filter((_, j) => j !== i) });
                    }}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => update(p.id, { features: [...(p.features ?? []), ""] })}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>
            </div>

            <Button className="mt-4 w-full" onClick={() => save(p)} disabled={saving === p.id}>
              {saving === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
