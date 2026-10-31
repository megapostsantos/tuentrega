import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Wallet, CheckCircle2, Clock, Hourglass, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyModule } from "@/components/EmptyModule";
import { Badge } from "@/components/ui/badge";
import { AntecipacaoEntregador } from "@/components/pagamentos/AntecipacaoEntregador";

export const Route = createFileRoute("/_authenticated/financas")({ component: FinancasPage });

type Rota = {
  id: string; titulo: string; valor: number | null; status: string; payment_status: string | null; closed_at: string | null;
  quantidade_pacotes: number | null; pacotes_entregues: number | null;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PAGO = ["paid", "pago"];
const nomeRota = (t: string) => (t.includes("·") ? t.split("·").slice(1).join("·").trim() : t);

function FinancasPage() {
  const { user, role, loading } = useAuth();
  const [rotas, setRotas] = useState<Rota[] | null>(null);
  const [periodo, setPeriodo] = useState<"mes" | "tudo">("mes");

  useEffect(() => {
    if (!user?.id || role !== "entregador") return;
    (async () => {
      const { data } = await (supabase as any).from("ofertas")
        .select("id, titulo, valor, status, payment_status, closed_at, quantidade_pacotes, pacotes_entregues")
        .eq("entregador_id", user.id).in("status", ["completed", "awaiting_return"]).order("closed_at", { ascending: false, nullsFirst: true });
      setRotas((data as Rota[]) ?? []);
    })();
  }, [user?.id, role]);

  const inicioMes = useMemo(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }, []);
  const visiveis = (rotas ?? []).filter((r) => periodo === "tudo" || r.status === "awaiting_return" || (r.closed_at && new Date(r.closed_at) >= inicioMes));
  const concluidas = visiveis.filter((r) => r.status === "completed");
  const aReceber = concluidas.filter((r) => !PAGO.includes(String(r.payment_status))).reduce((s, r) => s + Number(r.valor || 0), 0);
  const recebido = concluidas.filter((r) => PAGO.includes(String(r.payment_status))).reduce((s, r) => s + Number(r.valor || 0), 0);
  const aguardando = visiveis.filter((r) => r.status === "awaiting_return");
  const entregues = concluidas.reduce((s, r) => s + Number(r.pacotes_entregues || 0), 0);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (role !== "entregador") return <div className="p-6"><EmptyModule icon={Wallet} title="Área do entregador" description="Esta tela mostra os ganhos de quem faz as rotas." /></div>;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title="Finanças" description="Quanto você tem a receber e o que já recebeu" />

      <div className="rounded-3xl bg-[#0B0B0D] p-5 text-white">
        <p className="text-xs uppercase tracking-wide text-white/60">A receber</p>
        <p className="mt-1 text-4xl font-black tracking-tight text-[#FFB700]">{brl(aReceber)}</p>
        <p className="mt-2 text-xs text-white/60">Das rotas concluídas que a empresa ainda não pagou.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/10 p-2"><p className="text-lg font-bold">{brl(recebido)}</p><p className="text-[10px] text-white/60">Recebido</p></div>
          <div className="rounded-2xl bg-white/10 p-2"><p className="text-lg font-bold">{concluidas.length}</p><p className="text-[10px] text-white/60">Rotas concluídas</p></div>
          <div className="rounded-2xl bg-white/10 p-2"><p className="text-lg font-bold">{entregues}</p><p className="text-[10px] text-white/60">Pacotes entregues</p></div>
        </div>
      </div>

      {aguardando.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold"><Hourglass className="h-4 w-4" />Aguardando devolução ({aguardando.length})</div>
          <p className="mt-1 text-xs">O valor dessas rotas é liberado quando a empresa confirmar o recebimento dos pacotes que voltaram: {aguardando.map((r) => nomeRota(r.titulo)).join(", ")}.</p>
        </div>
      )}

      <AntecipacaoEntregador userId={user!.id} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Histórico de rotas</h2>
          <div className="flex gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
            {(["mes", "tudo"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPeriodo(p)} className={`rounded-full px-3 py-1 ${periodo === p ? "bg-background shadow" : "text-muted-foreground"}`}>{p === "mes" ? "Este mês" : "Tudo"}</button>
            ))}
          </div>
        </div>
        {!rotas ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : concluidas.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhuma rota concluída {periodo === "mes" ? "neste mês" : "ainda"}. <Link to="/ofertas" className="font-semibold text-primary underline">Ver ofertas</Link>
          </div>
        ) : concluidas.map((r) => {
          const pago = PAGO.includes(String(r.payment_status));
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{nomeRota(r.titulo)}</div>
                <div className="text-xs text-muted-foreground">
                  {r.closed_at ? new Date(r.closed_at).toLocaleDateString("pt-BR") : "—"} · {r.pacotes_entregues ?? 0}/{r.quantidade_pacotes ?? 0} entregues
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-base font-bold">{brl(Number(r.valor || 0))}</div>
                <Badge className={pago ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                  {pago ? <><CheckCircle2 className="mr-1 h-3 w-3" />Pago</> : <><Clock className="mr-1 h-3 w-3" />A receber</>}
                </Badge>
              </div>
            </div>
          );
        })}
        <p className="flex items-start gap-1.5 pt-1 text-[11px] text-muted-foreground"><HelpCircle className="mt-0.5 h-3 w-3 shrink-0" />O pagamento é feito pela empresa por PIX, para a chave do seu cadastro. Mantenha a chave sempre correta em Configurações.</p>
      </section>
    </div>
  );
}
