import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Camera } from "lucide-react";

export type Elemento =
  | { t: "texto"; texto: string }
  | { t: "titulo"; texto: string }
  | { t: "campo"; rotulo: string; valor?: string; destaque?: boolean; grande?: boolean }
  | { t: "botao"; texto: string; destaque?: boolean; claro?: boolean }
  | { t: "botoes"; itens: { texto: string; ativo?: boolean; destaque?: boolean }[] }
  | { t: "item"; titulo: string; sub?: string; badge?: string; tom?: "ok" | "alerta" | "erro"; destaque?: boolean }
  | { t: "progresso"; pct: number; rotulo?: string }
  | { t: "foto"; rotulo: string; destaque?: boolean }
  | { t: "abas"; itens: string[]; ativo: number }
  | { t: "mapa"; destaque?: boolean }
  | { t: "aviso"; texto: string; tom?: "ok" | "alerta" | "erro" };

export type PassoDemo = { titulo: string; texto: string; barra: string; elementos: Elemento[] };

const TOM = {
  ok: "bg-green-100 text-green-800",
  alerta: "bg-amber-100 text-amber-800",
  erro: "bg-red-100 text-red-800",
};

function Alvo({ on, children, className = "" }: { on?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className={on ? "rounded-lg ring-2 ring-[#FFB700] ring-offset-1 animate-[ajuda-pulso_1.4s_ease-in-out_infinite]" : ""}>{children}</div>
      {on && <span className="pointer-events-none absolute -bottom-3 right-2 text-xl animate-[ajuda-toque_1.4s_ease-in-out_infinite]" aria-hidden>👆</span>}
    </div>
  );
}

function Tela({ passo }: { passo: PassoDemo }) {
  return (
    <div className="flex h-full flex-col bg-white text-[#111] animate-[ajuda-entra_.35s_ease-out]">
      <div className="flex items-center gap-2 bg-[#0B0B0D] px-3 py-2 text-white">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#FFB700] text-[9px] font-black text-[#0B0B0D]">TE</span>
        <span className="truncate text-[11px] font-semibold">{passo.barra}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden p-3 text-[11px]">
        {passo.elementos.map((e, i) => {
          switch (e.t) {
            case "titulo": return <div key={i} className="text-sm font-bold">{e.texto}</div>;
            case "texto": return <p key={i} className="text-[10px] leading-snug text-neutral-500">{e.texto}</p>;
            case "campo":
              return (
                <Alvo key={i} on={e.destaque}>
                  <div className="text-[9px] font-medium text-neutral-500">{e.rotulo}</div>
                  <div className={`rounded-md border bg-white px-2 py-1.5 ${e.grande ? "h-20 whitespace-pre-line text-[10px] leading-snug" : ""}`}>{e.valor ?? " "}</div>
                </Alvo>
              );
            case "botao":
              return (
                <Alvo key={i} on={e.destaque}>
                  <div className={`rounded-full px-3 py-2 text-center text-[11px] font-bold ${e.claro ? "border bg-white" : "bg-[#FFB700] text-[#0B0B0D]"}`}>{e.texto}</div>
                </Alvo>
              );
            case "botoes":
              return (
                <div key={i} className="flex flex-wrap gap-1.5">
                  {e.itens.map((b, j) => (
                    <Alvo key={j} on={b.destaque}>
                      <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${b.ativo ? "border-[#FFB700] bg-[#FFB700] text-[#0B0B0D]" : "bg-white"}`}>{b.texto}</div>
                    </Alvo>
                  ))}
                </div>
              );
            case "item":
              return (
                <Alvo key={i} on={e.destaque}>
                  <div className="flex items-center justify-between gap-2 rounded-lg border bg-white px-2.5 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{e.titulo}</div>
                      {e.sub && <div className="truncate text-[10px] text-neutral-500">{e.sub}</div>}
                    </div>
                    {e.badge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${TOM[e.tom ?? "ok"]}`}>{e.badge}</span>}
                  </div>
                </Alvo>
              );
            case "progresso":
              return (
                <div key={i}>
                  {e.rotulo && <div className="mb-1 flex justify-between text-[10px] text-neutral-500"><span>{e.rotulo}</span><span>{e.pct}%</span></div>}
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200"><div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${e.pct}%` }} /></div>
                </div>
              );
            case "foto":
              return (
                <Alvo key={i} on={e.destaque}>
                  <div className="flex h-16 items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-neutral-50 text-neutral-500"><Camera className="h-5 w-5" />{e.rotulo}</div>
                </Alvo>
              );
            case "abas":
              return (
                <div key={i} className="flex gap-1 rounded-lg bg-neutral-100 p-1">
                  {e.itens.map((a, j) => <div key={j} className={`flex-1 rounded-md py-1 text-center text-[10px] font-semibold ${j === e.ativo ? "bg-white shadow" : "text-neutral-500"}`}>{a}</div>)}
                </div>
              );
            case "mapa":
              return (
                <Alvo key={i} on={e.destaque}>
                  <svg viewBox="0 0 200 90" className="h-24 w-full rounded-lg border bg-[#EAF0E6]">
                    <path d="M10 70 Q50 20 90 45 T180 20" stroke="#7C8" strokeWidth="1" fill="none" opacity=".5" />
                    <path d="M10 70 Q50 20 90 45 T180 20" stroke="#2563eb" strokeWidth="3" fill="none" strokeDasharray="300" className="animate-[ajuda-rastro_3s_ease-in-out_infinite]" />
                    <circle cx="10" cy="70" r="5" fill="#16a34a" /><text x="10" y="73" fontSize="6" fill="#fff" textAnchor="middle">S</text>
                    <circle cx="180" cy="20" r="6" fill="#FFB700" stroke="#0B0B0D" />
                  </svg>
                </Alvo>
              );
            case "aviso":
              return <div key={i} className={`rounded-lg px-2.5 py-2 text-[10px] font-medium ${TOM[e.tom ?? "alerta"]}`}>{e.texto}</div>;
          }
        })}
      </div>
    </div>
  );
}

export function PhoneDemo({ passos, autoPlay = true }: { passos: PassoDemo[]; autoPlay?: boolean }) {
  const [i, setI] = useState(0);
  const [rodando, setRodando] = useState(autoPlay);
  const reduz = useRef(false);

  useEffect(() => {
    reduz.current = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz.current) setRodando(false);
  }, []);
  useEffect(() => { setI(0); }, [passos]);
  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => setI((x) => (x + 1) % passos.length), 4200);
    return () => clearInterval(t);
  }, [rodando, passos.length]);

  const p = passos[i];
  return (
    <div className="grid items-center gap-5 md:grid-cols-[260px_1fr]">

      <div className="mx-auto w-[250px] rounded-[28px] border-[6px] border-neutral-900 bg-neutral-900 shadow-xl">
        <div className="h-[400px] overflow-hidden rounded-[20px] bg-white">
          <Tela key={i} passo={p} />
        </div>
      </div>
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#B77F00]">Passo {i + 1} de {passos.length}</div>
        <h3 className="text-lg font-bold leading-tight">{p.titulo}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Passo anterior" onClick={() => { setRodando(false); setI((x) => (x - 1 + passos.length) % passos.length); }} className="flex h-9 w-9 items-center justify-center rounded-full border hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label={rodando ? "Pausar" : "Reproduzir"} onClick={() => setRodando((r) => !r)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFB700] text-[#0B0B0D]">{rodando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
          <button type="button" aria-label="Próximo passo" onClick={() => { setRodando(false); setI((x) => (x + 1) % passos.length); }} className="flex h-9 w-9 items-center justify-center rounded-full border hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
          <div className="ml-2 flex gap-1.5">
            {passos.map((_, j) => (
              <button key={j} type="button" aria-label={`Ir para o passo ${j + 1}`} onClick={() => { setRodando(false); setI(j); }} className={`h-2 rounded-full transition-all ${j === i ? "w-6 bg-[#FFB700]" : "w-2 bg-neutral-300"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
