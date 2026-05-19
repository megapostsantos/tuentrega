import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

type Settings = {
  deliverer_subscription_cents: number;
  trial_days: number;
  fiscal_note_deadline_day: number;
  whatsapp_template_payment: string;
  whatsapp_template_new_offer: string;
  whatsapp_template_suspension: string;
};

function SettingsPage() {
  const { user } = useAuth();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: user?.email ?? "" });
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    (async () => {
      const sb = supabase as any;
      const { data } = await sb.from("admin_settings").select("*").eq("id", 1).maybeSingle();
      if (data) setS(data);
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        setProfile({ full_name: p?.full_name ?? "", email: user.email ?? "" });
      }
    })();
  }, [user]);

  async function saveSettings() {
    if (!s) return;
    setSaving(true);
    const sb = supabase as any;
    const { error } = await sb.from("admin_settings").update(s).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    await sb.from("admin_logs").insert({ admin_id: user?.id, action: "settings_update", details: s });
    toast.success("Configurações salvas");
  }

  async function saveProfile() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: profile.full_name }).eq("id", user.id);
    if (error) return toast.error(error.message);
    if (newPassword) {
      const { error: pErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pErr) return toast.error(pErr.message);
      setNewPassword("");
    }
    toast.success("Perfil atualizado");
  }

  if (!s) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Configurações" description="Perfil do admin, templates e ajustes da plataforma" />

      <section className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">Perfil do Admin</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nome</Label>
            <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={profile.email} disabled />
          </div>
          <div className="sm:col-span-2">
            <Label>Nova senha (deixe em branco para manter)</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
        </div>
        <Button className="mt-4" onClick={saveProfile}><Save className="mr-2 h-4 w-4" />Salvar perfil</Button>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">Templates de WhatsApp</h3>
        <div className="mt-4 space-y-4">
          <div>
            <Label>Pagamento confirmado</Label>
            <Textarea rows={3} value={s.whatsapp_template_payment}
              onChange={(e) => setS({ ...s, whatsapp_template_payment: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">Variáveis: {"{nome}, {valor}"}</p>
          </div>
          <div>
            <Label>Nova oferta</Label>
            <Textarea rows={3} value={s.whatsapp_template_new_offer}
              onChange={(e) => setS({ ...s, whatsapp_template_new_offer: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">Variáveis: {"{titulo}, {valor}, {bairro}"}</p>
          </div>
          <div>
            <Label>Aviso de suspensão</Label>
            <Textarea rows={3} value={s.whatsapp_template_suspension}
              onChange={(e) => setS({ ...s, whatsapp_template_suspension: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">Variáveis: {"{nome}"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">Configurações gerais</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Assinatura do entregador (R$)</Label>
            <Input type="number" step="0.01" value={(s.deliverer_subscription_cents / 100).toFixed(2)}
              onChange={(e) => setS({ ...s, deliverer_subscription_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
          </div>
          <div>
            <Label>Dias de trial</Label>
            <Input type="number" min={0} value={s.trial_days}
              onChange={(e) => setS({ ...s, trial_days: parseInt(e.target.value || "0", 10) })} />
          </div>
          <div>
            <Label>Dia limite da nota fiscal</Label>
            <Input type="number" min={1} max={31} value={s.fiscal_note_deadline_day}
              onChange={(e) => setS({ ...s, fiscal_note_deadline_day: parseInt(e.target.value || "10", 10) })} />
          </div>
        </div>
      </section>

      <Button onClick={saveSettings} disabled={saving} size="lg">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Salvar todas as configurações
      </Button>
    </div>
  );
}
