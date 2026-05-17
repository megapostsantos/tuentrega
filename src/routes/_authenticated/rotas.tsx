import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/rotas")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Planejador de rotas" description="Ordem otimizada de paradas com navegação integrada" />
      <EmptyModule icon={Map} title="Rotas otimizadas" description="Veja todas as entregas do dia em um mapa e siga a ordem mais eficiente." />
    </div>
  ),
});
