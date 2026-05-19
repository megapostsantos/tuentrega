import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({ component: NotificationsPage });

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const sb = supabase as any;

    // Generate live system notifications (idempotent — only insert if new)
    const since24 = new Date(Date.now() - 86400000).toISOString();
    const trialSoon = new Date(Date.now() + 3 * 86400000).toISOString();
    const [empNew, entNew, trialExp, ntFiscal] = await Promise.all([
      sb.from("empresas").select("id, razao_social, created_at").gte("created_at", since24),
      sb.from("entregadores").select("id, nome_completo, created_at").gte("created_at", since24),
      sb.from("empresas").select("id, razao_social, trial_ends_at").lte("trial_ends_at", trialSoon).gte("trial_ends_at", new Date().toISOString()),
      sb.from("entregas").select("id, empresa_id, entregador_id, created_at").eq("exige_nota_fiscal", true).is("nota_fiscal_url", null),
    ]);

    const toInsert: any[] = [];
    (empNew.data ?? []).forEach((e: any) => toInsert.push({
      type: "empresa_new", title: `Nova empresa cadastrada`, body: e.razao_social, link: `/admin/companies`,
    }));
    (entNew.data ?? []).forEach((e: any) => toInsert.push({
      type: "entregador_new", title: `Novo entregador cadastrado`, body: e.nome_completo, link: `/admin/deliverers`,
    }));
    (trialExp.data ?? []).forEach((e: any) => toInsert.push({
      type: "trial_expiring", title: `Trial expira em 3 dias`, body: e.razao_social, link: `/admin/companies`,
    }));
    (ntFiscal.data ?? []).forEach(() => toInsert.push({
      type: "nf_pending", title: `Nota fiscal pendente`, body: `Há entrega aguardando NF do entregador`, link: `/admin/deliverers`,
    }));

    // dedupe by (type, body) against existing
    const { data: existing } = await sb.from("admin_notifications").select("type, body");
    const seen = new Set((existing ?? []).map((r: any) => `${r.type}|${r.body}`));
    const fresh = toInsert.filter((r) => !seen.has(`${r.type}|${r.body}`));
    if (fresh.length) await sb.from("admin_notifications").insert(fresh);

    const { data } = await sb.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setItems(data ?? []);
    setLoading(false);
  }

  async function markRead(id: string) {
    const sb = supabase as any;
    await sb.from("admin_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  async function markAll() {
    const sb = supabase as any;
    await sb.from("admin_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    toast.success("Todas marcadas como lidas");
    refresh();
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Notificações" description="Alertas do sistema em tempo real"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
            <Button variant="outline" onClick={markAll}><Check className="mr-2 h-4 w-4" />Marcar todas</Button>
          </div>
        } />

      <div className="rounded-xl border bg-card divide-y">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>
        ) : items.map((n) => (
          <div key={n.id} className={`flex items-start gap-3 p-4 ${!n.read_at ? "bg-primary/5" : ""}`}>
            <div className={`mt-1 h-2 w-2 rounded-full ${!n.read_at ? "bg-primary" : "bg-muted-foreground/30"}`} />
            <Bell className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
            </div>
            {!n.read_at && (
              <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
