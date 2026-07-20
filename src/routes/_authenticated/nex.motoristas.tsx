import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/nex/motoristas")({
  component: MotoristasNexPage,
});

type Row = { id: string; nome_completo: string | null; telefone: string | null; placa: string | null; tipo_veiculo: string | null };

function MotoristasNexPage() {
  const { role, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (role !== "admin" && role !== "empresa" && role !== "dispatcher") return;
    (async () => {
      const { data } = await (supabase as any)
        .from("entregadores")
        .select("id,nome_completo,telefone,placa,tipo_veiculo")
        .order("nome_completo");
      setRows((data as Row[]) ?? []);
      setBusy(false);
    })();
  }, [role]);

  if (loading || busy) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "admin" && role !== "empresa" && role !== "dispatcher") {
    return (
      <div className="p-6">
        <PageHeader title="Motoristas NEX" description="Entregadores habilitados ao serviço NEX" />
        <EmptyModule icon={UserCheck} title="Acesso restrito" description="Apenas admin, empresa ou operador." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Motoristas NEX" description="Motoristas NEX são os entregadores cadastrados na plataforma" />
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">Nenhum entregador cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome_completo ?? "—"}</TableCell>
                      <TableCell>{r.telefone ?? "—"}</TableCell>
                      <TableCell>{r.tipo_veiculo ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.placa ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
