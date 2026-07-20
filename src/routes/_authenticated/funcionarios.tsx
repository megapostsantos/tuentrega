import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/funcionarios")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Funcionários" description="Equipe interna da BAG Envios" />
      <EmptyModule icon={Users} title="Gestão de funcionários" description="Cadastro e permissões da equipe interna." />
    </div>
  ),
});
