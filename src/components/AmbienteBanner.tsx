import { useEffect, useState } from "react";

/** Ambiente de teste (staging): aviso fixo para ninguém confundir com o sistema ao vivo. Identificado pelo endereço. */
export function ehAmbienteDeTeste(host: string): boolean {
  return /(^|[.-])(staging|homolog|teste|test)([.-]|$)/i.test(host);
}

export function AmbienteBanner() {
  const [teste, setTeste] = useState(false);
  useEffect(() => {
    if (!ehAmbienteDeTeste(window.location.hostname)) return;
    setTeste(true);
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
  if (!teste) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-red-600 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white">
      Ambiente de teste · dados fictícios · não é o sistema ao vivo
    </div>
  );
}
