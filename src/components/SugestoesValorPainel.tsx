import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

type Sug = { id: string; autor_nome: string | null; alvo_tipo: string; titulo: string | null; quantidade_pacotes: number; valor_por_pacote: number; motivo: string | null };
const brl = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Sugestões de valor pendentes. Dono e supervisor decidem; funcionário só acompanha as suas. */
export function SugestoesValorPainel() {
  const { isOperador } = useAuth();
  const [lista, setLista] = useState<Sug[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    const { data } = await (supabase as any).from("sugestoes_valor").select("*").eq("status", "pendente").order("criado_em", { ascending: false }).limit(20);
    setLista((data as Sug[]) ?? []);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  if (lista.length === 0) return null;
  async function decidir(s: Sug, aprovar: boolean) {
    setBusy(s.id);
    const { error } = await (supabase as any).rpc("decidir_sugestao_valor", { id: s.id, aprovar });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(aprovar ? "Valor aprovado e aplicado." : "Sugestão recusada.");
    carregar();
  }
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <div className="text-sm font-semibold">{isOperador ? "Suas sugestões de valor aguardando aprovação" : "Sugestões de valor para aprovar"}</div>
      <div className="mt-2 space-y-2">
        {lista.map((s) => (
          <div key={s.id} className="rounded-xl border bg-card p-3 text-sm">
            <div className="font-medium">{s.titulo ?? (s.alvo_tipo === "rota" ? "Rota" : "Vaga")} <span className="text-xs font-normal text-muted-foreground">· {s.quantidade_pacotes} pacotes</span></div>
            <div className="text-xs text-muted-foreground">{s.autor_nome ?? "Funcionário"} sugere <strong className="text-foreground">{brl(s.valor_por_pacote)}</strong> por pacote{s.motivo ? ` — ${s.motivo}` : ""}</div>
            {!isOperador && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" disabled={busy === s.id} onClick={() => decidir(s, true)}><Check className="mr-1 h-4 w-4" />Aprovar {brl(s.quantidade_pacotes * s.valor_por_pacote)}</Button>
                <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => decidir(s, false)}><X className="mr-1 h-4 w-4" />Recusar</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
