import { createFileRoute } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/ofertas")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Marketplace de fretes" description="Ofertas por bairro, tipo e valor" />
      <EmptyModule icon={Store} title="Marketplace de ofertas" description="Empresas publicam, entregadores aceitam. Alertas via WhatsApp e prioridade para assinantes premium." />
    </div>
  ),
});
