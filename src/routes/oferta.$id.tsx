import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Package, Calendar, Clock, FileText, Loader2 } from "lucide-react";
import { getOfertaPublic } from "@/lib/ofertas-public.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/oferta/$id")({
  head: () => ({
    meta: [
      { title: "Oferta de entrega — BAG Envios" },
      { name: "description", content: "Confira os detalhes da oferta de entrega e aceite pelo app BAG Envios." },
      { property: "og:title", content: "Oferta de entrega — BAG Envios" },
      { property: "og:description", content: "Confira os detalhes da oferta de entrega e aceite pelo app BAG Envios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfertaPublicPage,
});

const brl = (n: number | null | undefined) =>
  `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;

function OfertaPublicPage() {
  const { id } = useParams({ from: "/oferta/$id" });
  const fetchOferta = useServerFn(getOfertaPublic);
  const { data, isLoading } = useQuery({
    queryKey: ["public-oferta", id],
    queryFn: () => fetchOferta({ data: { id } }),
  });

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/"><Logo /></Link>
          <Link to="/auth"><Button size="sm" className="bg-[#FFB700] text-[#0D1B2A] hover:bg-[#FFB700]/90">Entrar</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !data ? (
          <Card className="bg-white text-foreground">
            <CardContent className="p-8 text-center">
              <h1 className="text-xl font-semibold mb-2">Oferta não encontrada</h1>
              <p className="text-muted-foreground mb-4">Ela pode ter sido removida ou o link está incorreto.</p>
              <Link to="/"><Button>Voltar ao início</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white text-foreground">
            <CardContent className="p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#FFB700] text-[#0D1B2A] hover:bg-[#FFB700]">Oferta de entrega</Badge>
                  {data.exige_nota_fiscal && <Badge variant="outline">Exige NF</Badge>}
                </div>
                <h1 className="text-2xl font-bold">{data.titulo}</h1>
                {data.empresa_nome && <p className="text-sm text-muted-foreground mt-1">por {data.empresa_nome}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {data.data_trabalho && (
                  <InfoRow icon={Calendar} label="Data" value={new Date(data.data_trabalho).toLocaleDateString("pt-BR")} />
                )}
                {(data.hora_inicio || data.hora_fim) && (
                  <InfoRow icon={Clock} label="Horário" value={`${data.hora_inicio?.slice(0,5) ?? ""}${data.hora_fim ? ` - ${data.hora_fim.slice(0,5)}` : ""}`} />
                )}
                {data.bairro && <InfoRow icon={MapPin} label="Região" value={data.bairro} />}
                {data.quantidade_pacotes != null && (
                  <InfoRow icon={Package} label="Pacotes" value={String(data.quantidade_pacotes)} />
                )}
              </div>

              <div className="rounded-lg bg-[#0D1B2A]/5 border p-4">
                <div className="text-sm text-muted-foreground">Valor total</div>
                <div className="text-3xl font-bold text-[#0D1B2A]">{brl(data.valor)}</div>
                {data.valor_por_pacote ? (
                  <div className="text-sm text-muted-foreground mt-1">{brl(data.valor_por_pacote)} por pacote</div>
                ) : null}
              </div>

              {data.descricao && (
                <div>
                  <div className="text-sm font-medium mb-1 flex items-center gap-1"><FileText className="h-4 w-4" /> Descrição</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.descricao}</p>
                </div>
              )}

              <div className="pt-2 border-t space-y-2">
                <Link to="/auth" className="block">
                  <Button className="w-full bg-[#FFB700] text-[#0D1B2A] hover:bg-[#FFB700]/90">Entrar para aceitar</Button>
                </Link>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">Cadastrar-se como entregador</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-3">
      <Icon className="h-4 w-4 text-[#0D1B2A] mt-0.5" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
