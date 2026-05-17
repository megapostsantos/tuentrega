import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, Plus, FileText, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/ofertas")({
  component: OfertasPage,
});

interface Oferta {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  bairro: string | null;
  valor: number;
  exige_nota_fiscal: boolean;
  status: string;
  created_at: string;
}

function OfertasPage() {
  const { role, user } = useAuth();
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    let q = supabase.from("ofertas").select("*").order("created_at", { ascending: false });
    if (role === "empresa" && user) q = q.eq("empresa_id", user.id);
    const { data } = await q;
    setOfertas((data ?? []) as Oferta[]);
    setLoading(false);
  }

  useEffect(() => { if (role) load(); /* eslint-disable-next-line */ }, [role, user?.id]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Marketplace de fretes" description={role === "empresa" ? "Publique ofertas para entregadores" : "Ofertas disponíveis perto de você"} />
        {role === "empresa" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:opacity-90"><Plus className="mr-1 h-4 w-4" /> Nova oferta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar oferta</DialogTitle></DialogHeader>
              <NewOfertaForm onCreated={() => { setOpen(false); load(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> :
        ofertas.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Store className="mx-auto mb-3 h-10 w-10" />
            Nenhuma oferta {role === "empresa" ? "criada ainda" : "disponível agora"}
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ofertas.map((o) => (
              <Card key={o.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{o.titulo}</CardTitle>
                    <p className="text-lg font-bold text-primary">R$ {Number(o.valor).toFixed(2)}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {o.descricao && <p className="text-sm text-muted-foreground">{o.descricao}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    {o.bairro && <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {o.bairro}</Badge>}
                    {o.exige_nota_fiscal && (
                      <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20">
                        <FileText className="h-3 w-3" /> Exige nota fiscal
                      </Badge>
                    )}
                  </div>
                  {o.exige_nota_fiscal && role === "entregador" && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                      ⚠️ Esta oferta exige nota fiscal para pagamento
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
}

function NewOfertaForm({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({ titulo: "", descricao: "", bairro: "", valor: "", exige_nota: false });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("ofertas").insert({
      empresa_id: user.id,
      titulo: f.titulo,
      descricao: f.descricao || null,
      bairro: f.bairro || null,
      valor: Number(f.valor) || 0,
      exige_nota_fiscal: f.exige_nota,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Oferta criada");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input required value={f.titulo} onChange={(e) => setF((p) => ({ ...p, titulo: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={f.descricao} onChange={(e) => setF((p) => ({ ...p, descricao: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Bairro</Label>
          <Input value={f.bairro} onChange={(e) => setF((p) => ({ ...p, bairro: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" required value={f.valor} onChange={(e) => setF((p) => ({ ...p, valor: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Exigir nota fiscal para pagamento</p>
          <p className="text-xs text-muted-foreground">Entregador deve enviar NF antes de receber</p>
        </div>
        <Switch checked={f.exige_nota} onCheckedChange={(v) => setF((p) => ({ ...p, exige_nota: v }))} />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:opacity-90">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar oferta"}
      </Button>
    </form>
  );
}
