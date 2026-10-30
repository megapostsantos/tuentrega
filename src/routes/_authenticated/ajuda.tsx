import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Users, Zap, Map as MapIcon, Camera, RotateCcw, Wallet, CheckCircle2, Bike, Share2, ExternalLink, BookOpen, ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneDemo } from "@/components/ajuda/PhoneDemo";
import { FluxoAnimado, type Etapa } from "@/components/ajuda/FluxoAnimado";
import { GUIAS, type Guia, type Perfil } from "@/lib/ajuda-conteudo";
import { whatsappLink, SITE_URL } from "@/lib/contato";

export const Route = createFileRoute("/_authenticated/ajuda")({
  validateSearch: (s: Record<string, unknown>): { guia?: string } => (typeof s.guia === "string" ? { guia: s.guia } : {}),
  component: AjudaPage,
});

const FLUXO_EMPRESA: Etapa[] = [
  { icone: ClipboardList, titulo: "Operação", texto: "Informe os pacotes do dia e cole as zonas do marketplace. Cada zona vira uma rota." },
  { icone: Users, titulo: "Parceiros", texto: "Escolha quem leva cada rota ou publique no mercado de ofertas." },
  { icone: MapIcon, titulo: "Ao vivo", texto: "Acompanhe no mapa quem anda, quem parou e o progresso de cada zona." },
  { icone: Camera, titulo: "Baixa", texto: "Insucessos chegam com ID do pacote e foto. Se o motorista não deu baixa, você encerra pelo gestor." },
  { icone: RotateCcw, titulo: "Devolução", texto: "Confira os pacotes que voltaram. Só então a rota fecha." },
  { icone: Wallet, titulo: "Pagamento", texto: "Com a rota concluída, o valor do entregador fica a pagar (e a antecipação, se você liberar)." },
];

const FLUXO_ENTREGADOR: Etapa[] = [
  { icone: Zap, titulo: "Ofertas", texto: "Veja as rotas de hoje e dos próximos dias, agrupadas por data." },
  { icone: CheckCircle2, titulo: "Aceitar", texto: "Aceite a rota que combina com você. Se a empresa atribuir, responda em até 2 horas." },
  { icone: Bike, titulo: "Rodar", texto: "Inicie a rota com o app aberto. A empresa acompanha o seu caminho." },
  { icone: Camera, titulo: "Baixa", texto: "Marque o que entregou. Insucesso: ID do pacote, motivo e a foto certa." },
  { icone: RotateCcw, titulo: "Devolver", texto: "Devolva à empresa os pacotes que não foram entregues." },
  { icone: Wallet, titulo: "Receber", texto: "Rota concluída: o valor aparece em Meus ganhos." },
];

function perfilAtual(role: string | null, isOperador: boolean): Perfil[] {
  if (role === "entregador") return ["entregador"];
  if (isOperador) return ["funcionario"];
  if (role === "empresa") return ["dono", "funcionario"];
  return ["dono", "funcionario", "entregador"]; // admin / dispatcher: vê tudo
}

function AjudaPage() {
  const { role, isOperador } = useAuth();
  const { guia } = Route.useSearch();
  const perfis = perfilAtual(role, isOperador);
  const lista = useMemo(() => GUIAS.filter((g) => g.perfis.some((p) => perfis.includes(p))), [role, isOperador]); // eslint-disable-line
  const [aberto, setAberto] = useState<string | null>(guia ?? null);
  useEffect(() => { if (guia) setAberto(guia); }, [guia]);

  const g = lista.find((x) => x.id === aberto) ?? null;
  const ehEntregador = role === "entregador";

  function compartilhar(x: Guia) {
    const url = `${SITE_URL}/ajuda?guia=${x.id}`;
    window.open(whatsappLink(`Guia TuEntrega — ${x.titulo}: ${url}`).replace(/phone=\d+&/, ""), "_blank");
  }

  if (g) {
    return (
      <div className="space-y-5 p-4 sm:p-6">
        <Button variant="ghost" size="sm" onClick={() => setAberto(null)}><ChevronLeft className="mr-1 h-4 w-4" />Todos os guias</Button>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{g.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{g.resumo} · {g.tempo}</p>
        </div>
        <div className="rounded-3xl border bg-card p-4 sm:p-6">
          <PhoneDemo passos={g.passos} />
        </div>
        {g.dicas && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-1 font-semibold">💡 Dicas</div>
            <ul className="list-disc space-y-1 pl-5">{g.dicas.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {g.tela && <Button asChild><Link to={g.tela}><ExternalLink className="mr-2 h-4 w-4" />Abrir esta tela</Link></Button>}
          <Button variant="outline" onClick={() => compartilhar(g)}><Share2 className="mr-2 h-4 w-4" />Enviar por WhatsApp</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="Central de ajuda" description="Guias animados, passo a passo, para cada tarefa" />
      <FluxoAnimado
        titulo={ehEntregador ? "Como funciona, do aceite ao pagamento" : "Como funciona o dia, do pacote ao pagamento"}
        etapas={ehEntregador ? FLUXO_ENTREGADOR : FLUXO_EMPRESA}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {lista.map((x) => (
          <button key={x.id} type="button" onClick={() => setAberto(x.id)} className="rounded-2xl border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15"><BookOpen className="h-4 w-4" /></div>
              <Badge variant="secondary">{x.tempo}</Badge>
            </div>
            <div className="mt-3 font-semibold leading-tight">{x.titulo}</div>
            <p className="mt-1 text-sm text-muted-foreground">{x.resumo}</p>
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Ficou com dúvida? <a className="underline" href={whatsappLink("Olá! Tenho uma dúvida sobre o TuEntrega.")} target="_blank" rel="noreferrer">Fale pelo WhatsApp</a>.
      </p>
    </div>
  );
}
