import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Audiencia = "publica" | "cla" | "equipe";

const KEY = "tu_audiencia";
export function audienciaSalva(): Audiencia {
  try { const v = localStorage.getItem(KEY); return v === "cla" || v === "equipe" ? v : "publica"; } catch { return "publica"; }
}
export const ROTULO_AUDIENCIA: Record<Audiencia, string> = { publica: "Público", cla: "Meu clã", equipe: "Equipe interna" };

/** Quem pode ver a vaga: todos, só o clã da empresa (parceiros vinculados e adicionados) ou só a equipe interna. */
export function AudienciaSelect({ value, onChange, compact = false }: { value: Audiencia; onChange: (v: Audiencia) => void; compact?: boolean }) {
  const [n, setN] = useState<{ cla: number; equipe: number } | null>(null);
  useEffect(() => {
    const sb = supabase as any;
    Promise.all([
      sb.from("cla_empresa").select("entregador_id", { count: "exact", head: true }),
      sb.from("equipe_empresa").select("user_id", { count: "exact", head: true }).eq("entregador", true).eq("ativo", true),
    ]).then(([c, e]: any[]) => setN({ cla: c?.count ?? 0, equipe: e?.count ?? 0 }));
  }, []);
  const pick = (v: Audiencia) => { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } onChange(v); };
  const opcoes: { v: Audiencia; icone: string; t: string; d: string; n?: number }[] = [
    { v: "publica", icone: "🌍", t: "Público", d: "Todos os entregadores aprovados" },
    { v: "cla", icone: "👥", t: "Meu clã", d: "Só os parceiros do seu clã (vinculados e os que você adicionar)", n: n?.cla },
    { v: "equipe", icone: "🏠", t: "Equipe interna", d: "Só funcionários que também fazem rotas", n: n?.equipe },
  ];
  return (
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-3"}`}>
      {opcoes.map((o) => (
        <button key={o.v} type="button" onClick={() => pick(o.v)}
          className={`rounded-lg border-2 p-2.5 text-left transition ${value === o.v ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-semibold">{o.icone} {o.t}</span>
            {o.n !== undefined && <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold">{o.n}</span>}
          </div>
          {!compact && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{o.d}</p>}
          {value === o.v && o.n === 0 && <p className="mt-1 text-[11px] font-medium text-red-600">Ninguém nesse grupo ainda: ninguém verá a vaga.</p>}
        </button>
      ))}
    </div>
  );
}
