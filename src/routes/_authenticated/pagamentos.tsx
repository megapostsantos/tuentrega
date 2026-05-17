import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";

export const Route = createFileRoute("/_authenticated/pagamentos")({
  component: () => (
    <div className="p-6">
      <PageHeader title="Pagamentos PIX" description="Pagamento direto empresa → entregador" />
      <EmptyModule icon={Wallet} title="Painel PIX" description="Histórico, comprovantes e pagamentos pendentes." />
    </div>
  ),
});
