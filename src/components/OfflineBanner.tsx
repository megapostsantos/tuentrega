import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const wasOffline = useRef(!online);

  useEffect(() => {
    const up = () => {
      setOnline(true);
      if (wasOffline.current) {
        toast.success("Conexão restaurada");
        wasOffline.current = false;
      }
    };
    const down = () => {
      setOnline(false);
      wasOffline.current = true;
    };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div className="sticky top-[60px] z-40 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
      <WifiOff className="h-4 w-4" />
      Sem conexão. Verifique sua internet.
    </div>
  );
}
