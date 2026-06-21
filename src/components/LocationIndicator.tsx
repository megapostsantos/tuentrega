import { MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LocationTrackerState } from "@/hooks/use-location-tracker";

export function LocationIndicator({ state }: { state: LocationTrackerState }) {
  if (state.permissionDenied) {
    return (
      <div className="flex items-center justify-between gap-2 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-900 px-4 py-2 text-xs text-orange-800 dark:text-orange-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Permissão de localização negada. Ative nas configurações do navegador para compartilhar sua rota.</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-orange-300"
          onClick={() => {
            // Best-effort: open browser site settings page
            window.open("about:preferences#privacy", "_blank") ??
              alert("Abra as configurações do navegador e permita o acesso à localização para este site.");
          }}
        >
          Configurações
        </Button>
      </div>
    );
  }

  if (!state.active) return null;

  return (
    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-900 px-4 py-1.5 text-xs text-green-800 dark:text-green-200">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <MapPin className="h-3.5 w-3.5" />
      <span>Compartilhando localização</span>
    </div>
  );
}
