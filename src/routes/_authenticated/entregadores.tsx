import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/entregadores")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Entregadores" description="Gerencie sua rede de entregadores PJ" />
      <EmptyModule icon={Users} title="Lista de entregadores" description="Cadastros, status, histórico e desempenho." />
    </div>
  ),
});
