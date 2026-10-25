import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { EmpresaRotas } from "@/components/EmpresaRotas";
import { EntregadorRotas } from "@/components/rotas/EntregadorRotas";

export const Route = createFileRoute("/_authenticated/rotas")({
  component: RotasPage,
});

function RotasPage() {
  const { user, role, loading, isImpersonating } = useAuth();
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (role === "empresa") return <EmpresaRotas empresaId={user!.id} />;
  if (role === "admin" && !isImpersonating) return <EmpresaRotas empresaId={null} />;
  return <EntregadorRotas />;
}
