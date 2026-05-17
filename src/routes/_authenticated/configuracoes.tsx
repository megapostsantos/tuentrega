import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setFullName(data.full_name ?? "");
        setCompanyName(data.company_name ?? "");
        setPhone(data.phone ?? "");
      }
    });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, company_name: companyName, phone,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  return (
    <div className="p-6">
      <PageHeader title="Configurações" description="Atualize seu perfil" />
      <form onSubmit={save} className="max-w-md space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fn">Nome completo</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cn">Empresa</Label>
          <Input id="cn" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ph">WhatsApp</Label>
          <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:opacity-90">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
