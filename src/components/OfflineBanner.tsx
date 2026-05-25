import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div className="sticky top-0 z-50 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
      📡 Sem conexão. Verifique sua internet.
    </div>
  );
}
