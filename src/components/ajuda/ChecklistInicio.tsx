import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, X, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Item = { chave: string; titulo: string; to: string; feito: boolean };

const key = (uid: string) => `tu_checklist_fechado_${uid}`;

/** "Primeiros passos": some sozinho quando tudo foi feito (ou quando a pessoa dispensa). */
export function ChecklistInicio({ userId, tipo }: { userId?: string; tipo: "empresa" | "entregador" }) {
  const { isOperador } = useAuth();
  const [itens, setItens] = useState<Item[] | null>(null);
  const [fechado, setFechado] = useState(true);

  useEffect(() => {
    if (!userId) return;
    try { setFechado(localStorage.getItem(key(userId)) === "1"); } catch { setFechado(false); }
  }, [userId]);

  useEffect(() => {
    if (!userId || fechado) return;
    const sb = supabase as any;
    let vivo = true;
    (async () => {
      const conta = async (tabela: string, f: (q: any) => any) => {
        const { count } = await f(sb.from(tabela).select("id", { count: "exact", head: true }));
        return count ?? 0;
      };
      let lista: Item[] = [];
      if (tipo === "empresa") {
        const [{ data: emp }, ops, ofs, andamento, concl] = await Promise.all([
          sb.from("empresas").select("tms_valor_padrao_pacote").eq("id", userId).maybeSingle(),
          conta("operacoes", (q) => q.eq("empresa_id", userId)),
          conta("ofertas", (q) => q.eq("empresa_id", userId)),
          conta("ofertas", (q) => q.eq("empresa_id", userId).in("status", ["in_progress", "awaiting_return", "completed"])),
          conta("ofertas", (q) => q.eq("empresa_id", userId).eq("status", "completed")),
        ]);
        lista = [
          ...(isOperador ? [] : [{ chave: "valor", titulo: "Definir o valor padrão por pacote", to: "/equipe", feito: emp?.tms_valor_padrao_pacote != null }]),
          { chave: "op", titulo: "Criar a primeira operação (cole as zonas)", to: "/pacotes", feito: ops > 0 },
          { chave: "ofertas", titulo: "Atribuir ou publicar as rotas", to: "/pacotes", feito: ofs > 0 },
          { chave: "vivo", titulo: "Acompanhar uma rota em andamento", to: "/rotas", feito: andamento > 0 },
          { chave: "fim", titulo: "Concluir a primeira rota", to: "/rotas", feito: concl > 0 },
        ];
      } else {
        const [{ data: me }, aceitas, rodadas, concl] = await Promise.all([
          sb.from("entregadores").select("nome_completo, cpf, pix_chave, tipo_veiculo").eq("id", userId).maybeSingle(),
          conta("ofertas", (q) => q.eq("entregador_id", userId)),
          conta("ofertas", (q) => q.eq("entregador_id", userId).in("status", ["in_progress", "awaiting_return", "completed"])),
          conta("ofertas", (q) => q.eq("entregador_id", userId).eq("status", "completed")),
        ]);
        lista = [
          { chave: "perfil", titulo: "Completar o seu cadastro (CPF, PIX e veículo)", to: "/configuracoes", feito: !!(me?.cpf && me?.pix_chave && me?.tipo_veiculo) },
          { chave: "aceitar", titulo: "Aceitar a primeira oferta", to: "/ofertas", feito: aceitas > 0 },
          { chave: "rodar", titulo: "Iniciar e fazer uma rota", to: "/rotas", feito: rodadas > 0 },
          { chave: "receber", titulo: "Concluir a rota e ver os ganhos", to: "/ganhos", feito: concl > 0 },
        ];
      }
      if (vivo) setItens(lista);
    })();
    return () => { vivo = false; };
  }, [userId, tipo, fechado, isOperador]);

  if (fechado || !itens) return null;
  const feitos = itens.filter((i) => i.feito).length;
  if (feitos === itens.length) return null;
  const proximo = itens.find((i) => !i.feito)!;

  function dispensar() {
    try { localStorage.setItem(key(userId!), "1"); } catch { /* ignore */ }
    setFechado(true);
  }

  return (
    <div className="rounded-2xl border-2 border-primary/50 bg-primary/5 p-4 elev-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#B77F00]">Primeiros passos · {feitos}/{itens.length}</p>
          <p className="mt-0.5 text-sm font-semibold">Próximo: {proximo.titulo}</p>
        </div>
        <button type="button" aria-label="Dispensar" onClick={dispensar} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(feitos / itens.length) * 100}%` }} /></div>
      <ul className="mt-3 space-y-1.5">
        {itens.map((i) => (
          <li key={i.chave}>
            <Link to={i.to} className={`flex items-center gap-2 text-sm ${i.feito ? "text-muted-foreground line-through" : "font-medium"}`}>
              {i.feito ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />}{i.titulo}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/ajuda" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4"><BookOpen className="h-3.5 w-3.5" />Ver os guias animados</Link>
    </div>
  );
}
