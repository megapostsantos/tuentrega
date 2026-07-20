import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Truck, ShieldOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteMotoristaNex } from "@/lib/nex.functions";

export const Route = createFileRoute("/_authenticated/nex/motoristas")({
  component: MotoristasNexPage,
});

type Motorista = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tipo_veiculo: string | null;
  modelo_veiculo: string | null;
  placa: string | null;
  ativo: boolean;
};

function MotoristasNexPage() {
  const { role, loading } = useAuth();
  const [list, setList] = useState<Motorista[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState(false);

  async function refresh() {
    setBusy(true);
    const { data } = await (supabase as any)
      .from("motoristas_nex")
      .select("*")
      .order("nome");
    setList((data as Motorista[]) ?? []);
    setBusy(false);
  }
  useEffect(() => {
    if (role === "admin" || role === "empresa") refresh();
  }, [role]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "admin" && role !== "empresa") {
    return (
      <div className="p-6">
        <PageHeader title="Motoristas NEX" description="Controle de motoristas NEX" />
        <EmptyModule icon={Truck} title="Acesso restrito" description="Apenas admin ou empresa." />
      </div>
    );
  }

  async function toggleAtivo(m: Motorista) {
    const { error } = await (supabase as any)
      .from("motoristas_nex")
      .update({ ativo: !m.ativo })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else {
      toast.success(m.ativo ? "Motorista desativado" : "Motorista ativado");
      refresh();
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Motoristas NEX" description="Controle de motoristas do serviço NEX Mercado Livre" />
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Cadastrar motorista
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Motoristas cadastrados</CardTitle></CardHeader>
        <CardContent>
          {busy ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum motorista cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell>{m.placa ?? "—"}</TableCell>
                      <TableCell>
                        {m.tipo_veiculo ?? "—"}
                        {m.modelo_veiculo ? ` · ${m.modelo_veiculo}` : ""}
                      </TableCell>
                      <TableCell className="text-xs">
                        {m.email ?? "—"}<br />{m.telefone ?? ""}
                      </TableCell>
                      <TableCell>
                        {m.ativo ? <Badge className="bg-emerald-100 text-emerald-800">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toggleAtivo(m)}>
                          {m.ativo ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CadastrarMotoristaDialog open={open} onClose={() => setOpen(false)} onDone={() => { setOpen(false); refresh(); }} />
    </div>
  );
}

function CadastrarMotoristaDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const invite = useServerFn(inviteMotoristaNex);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState<string>("moto");
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(""); setEmail(""); setTelefone(""); setTipo("moto"); setModelo(""); setPlaca("");
    }
  }, [open]);

  async function submit() {
    if (!nome.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("motoristas_nex").insert({
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      tipo_veiculo: tipo,
      modelo_veiculo: modelo.trim() || null,
      placa: placa.trim() || null,
    });
    if (error) { setSaving(false); toast.error(error.message); return; }

    if (email.trim()) {
      try {
        await invite({ data: { email: email.trim() } });
        toast.success("Motorista cadastrado e convite enviado por email.");
      } catch (err: any) {
        toast.warning(`Motorista cadastrado, mas convite falhou: ${err?.message ?? "erro"}`);
      }
    } else {
      toast.success("Motorista cadastrado.");
    }
    setSaving(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cadastrar motorista NEX</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Email (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo de veículo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Modelo</Label>
              <Input value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Placa</Label>
            <Input value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
