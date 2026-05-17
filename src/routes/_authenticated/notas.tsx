import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/notas")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Notas fiscais" description="Envie sua NF até o dia 10 para evitar suspensão" />
      <EmptyModule icon={FileText} title="Controle de NF" description="Upload mensal e bloqueio automático em caso de atraso." />
    </div>
  ),
});
