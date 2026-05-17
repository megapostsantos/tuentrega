import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/metricas")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Métricas" description="MRR, entregas, churn e crescimento" />
      <EmptyModule icon={BarChart3} title="Analytics da plataforma" description="Visualize MRR, volume de entregas e indicadores chave." />
    </div>
  ),
});
