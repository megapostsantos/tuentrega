import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, LogOut } from "lucide-react";
import { useImpersonation, clearImpersonation } from "@/lib/impersonation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const imp = useImpersonation();
  const navigate = useNavigate();

  if (!imp) return null;

  async function exit() {
    if (!imp) return;
    try {
      await (supabase as any)
        .from("admin_impersonations")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", imp.sessionId);
    } catch { /* noop */ }
    clearImpersonation();
    toast.success("Você voltou ao painel Admin");
    navigate({ to: "/admin/dashboard" });
  }

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-900 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">
        ⚠️ Você está visualizando como <strong>{imp.targetName}</strong> ({imp.targetType}).
        Pagamentos e aceites estão bloqueados.
      </span>
      <button
        onClick={exit}
        className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sair da visualização
      </button>
    </div>
  );
}
