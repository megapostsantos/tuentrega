import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Empresas" description="Empresas cadastradas na plataforma" />
      <EmptyModule icon={Building2} title="Gestão de empresas" description="Listagem completa, assinatura e métricas por empresa." />
    </div>
  ),
});
