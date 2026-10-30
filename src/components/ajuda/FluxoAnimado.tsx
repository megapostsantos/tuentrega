import { useEffect, useState, type ComponentType } from "react";

export type Etapa = { icone: ComponentType<{ className?: string }>; titulo: string; texto: string };

/** Infográfico: etapas ligadas por uma linha; a etapa ativa avança sozinha. Toque numa etapa para ver o detalhe. */
export function FluxoAnimado({ etapas, titulo }: { etapas: Etapa[]; titulo: string }) {
  const [ativa, setAtiva] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setAtiva((x) => (x + 1) % etapas.length), 2800);
    return () => clearInterval(t);
  }, [auto, etapas.length]);

  const pct = etapas.length > 1 ? (ativa / (etapas.length - 1)) * 100 : 100;
  const A = etapas[ativa];
  return (
    <div className="rounded-3xl border bg-card p-5">
      <h3 className="text-base font-bold">{titulo}</h3>
      <div className="relative mt-6 overflow-x-auto pb-2">
        <div className="relative mx-auto flex min-w-[520px] items-start justify-between px-4">
          <div className="absolute left-8 right-8 top-6 h-1 rounded-full bg-neutral-200" />
          <div className="absolute left-8 top-6 h-1 rounded-full bg-[#FFB700] transition-all duration-700" style={{ width: `calc((100% - 4rem) * ${pct / 100})` }} />
          {etapas.map((e, i) => {
            const Icon = e.icone;
            const on = i === ativa, feito = i < ativa;
            return (
              <button key={e.titulo} type="button" onClick={() => { setAuto(false); setAtiva(i); }} className="relative z-10 flex w-20 flex-col items-center gap-2 text-center">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 ${on ? "scale-110 border-[#FFB700] bg-[#FFB700] text-[#0B0B0D] shadow-lg" : feito ? "border-[#FFB700] bg-[#FFF4D6] text-[#0B0B0D]" : "border-neutral-300 bg-white text-neutral-500"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`text-[11px] font-semibold leading-tight ${on ? "text-foreground" : "text-muted-foreground"}`}>{e.titulo}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div key={ativa} className="mt-4 rounded-2xl bg-muted/60 p-4 animate-[ajuda-entra_.35s_ease-out]">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#B77F00]">Etapa {ativa + 1} de {etapas.length}</div>
        <div className="mt-1 font-bold">{A.titulo}</div>
        <p className="mt-1 text-sm text-muted-foreground">{A.texto}</p>
      </div>
      <button type="button" onClick={() => setAuto((a) => !a)} className="mt-3 text-xs font-medium text-muted-foreground underline underline-offset-4">
        {auto ? "Pausar animação" : "Continuar animação"}
      </button>
    </div>
  );
}
