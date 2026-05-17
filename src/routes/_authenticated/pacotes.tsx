import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/pacotes")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Pacotes (TMS)" description="Importe pacotes em lote e divida por bairro automaticamente" />
      <EmptyModule icon={Package} title="Gestão de pacotes" description="Importação CSV/Excel, divisão por bairro, publicação de oferta e rastreamento em tempo real." />
    </div>
  ),
});
