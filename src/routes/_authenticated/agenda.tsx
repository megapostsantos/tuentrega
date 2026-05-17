import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Agenda de trabalho" description="Empresas abrem vagas, entregadores reservam dias" />
      <EmptyModule icon={CalendarDays} title="Calendário semanal" description="Visualize vagas abertas e reserve dias com antecedência." />
    </div>
  ),
});
