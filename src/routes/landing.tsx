import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Package,
  PackageOpen,
  Send,
  Undo2,
  Gift,
  ShoppingBag,
  Wrench,
  Sparkles,
  MessageCircle,
  MapPin,
  Phone,
  Instagram,
  Clock,
  CheckCircle2,
  Users,
  Route as RouteIcon,
  Wallet,
  Activity,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "BAG Envios & Variedades — Last Mile na Baixada Santista" },
      {
        name: "description",
        content:
          "Especialistas em entregas last mile em Santos e região. Contrate entregas, use nosso sistema de gestão ou seja um entregador BAG.",
      },
      { property: "og:title", content: "BAG Envios & Variedades" },
      {
        property: "og:description",
        content:
          "Entregas, retiradas, envios e devoluções na Baixada Santista.",
      },
    ],
  }),
  component: LandingPage,
});

const NAVY = "#0D1B2A";
const NAVY_LIGHT = "#152A42";
const YELLOW = "#FFB700";
const DARK = "#060E17";
const WA = "https://wa.me/5513991105065";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen font-[Montserrat] text-white"
      style={{ backgroundColor: NAVY, fontFamily: "Montserrat, sans-serif" }}
    >
      {/* 1. NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur"
        style={{ backgroundColor: `${NAVY}ee` }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md font-black"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              B
            </div>
            <div className="hidden text-sm font-bold leading-tight sm:block">
              BAG Envios
              <div className="text-[10px] font-medium text-white/60">
                & Variedades
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="rounded-md border border-white/30 px-3 py-2 text-xs font-bold hover:bg-white/10 md:px-4 md:text-sm"
            >
              Seja Entregador
            </button>
            <a
              href={WA}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold md:px-4 md:text-sm"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Falar pelo WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </nav>

      {/* 2. HERO */}
      <section className="px-4 pt-32 pb-20 md:px-8 md:pt-40 md:pb-28">
        <div className="mx-auto max-w-5xl text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold"
            style={{ borderColor: YELLOW, color: YELLOW }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            LAST MILE · SANTOS · SP
          </div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
            Especialistas em{" "}
            <span style={{ color: YELLOW }}>Last Mile</span> na Baixada
            Santista
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base text-white/70 md:text-lg">
            A BAG Envios é uma empresa de entregas focada na última milha —
            levamos seu pacote do ponto de origem até a porta do destinatário
            com agilidade, segurança e eficiência. Atendemos Santos e região.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#empresas"
              className="flex w-full items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-black sm:w-auto"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              Quero contratar
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#servicos"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-white/30 px-6 py-3.5 text-sm font-black hover:bg-white/10 sm:w-auto"
            >
              Ver nossos serviços
            </a>
          </div>
        </div>
      </section>

      {/* 3. TICKER */}
      <div
        className="overflow-hidden border-y py-4"
        style={{ backgroundColor: YELLOW, borderColor: `${NAVY}22` }}
      >
        <div className="ticker flex whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 items-center gap-8 pr-8 text-lg font-black md:text-xl"
              style={{ color: NAVY }}
            >
              <span>ENTREGAS</span>
              <span>·</span>
              <span>RETIRADAS</span>
              <span>·</span>
              <span>ENVIOS</span>
              <span>·</span>
              <span>DEVOLUÇÕES</span>
              <span>·</span>
              <span>LAST MILE</span>
              <span>·</span>
              <span>SANTOS</span>
              <span>·</span>
              <span>SP</span>
              <span>·</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .ticker { animation: ticker 30s linear infinite; }
        `}</style>
      </div>

      {/* 4. SERVIÇOS */}
      <section id="servicos" className="px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-black md:text-5xl">
              O que a BAG faz por você
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70">
              Para pessoas físicas, lojas e empresas que precisam de entregas
              pontuais na região de Santos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                icon: Package,
                name: "Entregas",
                desc: "Buscamos e entregamos seu pacote no destino final com rapidez",
              },
              {
                icon: PackageOpen,
                name: "Retiradas",
                desc: "Receba seus pedidos aqui na BAG — seu pacote fica guardado com segurança",
              },
              {
                icon: Send,
                name: "Envios",
                desc: "Envie encomendas para qualquer destino com praticidade e rastreamento",
              },
              {
                icon: Undo2,
                name: "Devoluções",
                desc: "Devolver ficou fácil — cuidamos de todo o processo reverso por você",
              },
              {
                icon: Gift,
                name: "Presentes",
                desc: "Embalamos e entregamos seus presentes com cuidado especial",
              },
              {
                icon: ShoppingBag,
                name: "Utilidades",
                desc: "Produtos do dia a dia disponíveis aqui na nossa loja",
              },
              {
                icon: Wrench,
                name: "Manutenções",
                desc: "Assistência técnica com profissionais de confiança",
              },
              {
                icon: Sparkles,
                name: "Personalizados",
                desc: "Canecas, camisetas e produtos com a sua marca ou mensagem",
              },
            ].map((s) => (
              <div
                key={s.name}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[color:var(--y)] hover:bg-white/[0.06]"
                style={{ ["--y" as string]: YELLOW }}
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${YELLOW}22`, color: YELLOW }}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black">{s.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/60">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. EMPRESAS CONTRATANTES */}
      <section
        id="empresas"
        className="px-4 py-20 md:px-8 md:py-28"
        style={{ backgroundColor: NAVY_LIGHT }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <div
              className="mb-4 inline-block rounded-full px-3 py-1 text-[11px] font-black"
              style={{ backgroundColor: `${YELLOW}22`, color: YELLOW }}
            >
              PARA EMPRESAS CONTRATANTES
            </div>
            <h2 className="text-3xl font-black leading-tight md:text-5xl">
              Você tem uma empresa e precisa fazer entregas todo dia?
            </h2>
            <p className="mt-5 text-white/70 md:text-lg">
              Farmácias, lojas, e-commerces, restaurantes — qualquer negócio
              que precisa despachar mercadorias regularmente pode contratar a
              BAG Envios. Cadastre sua empresa, solicite entregas pelo painel
              e nós cuidamos do resto.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              "Solicite entregas direto pelo painel, sem precisar ligar",
              "Acompanhe cada entrega em tempo real",
              "Pague por entrega ou feche um plano mensal",
            ].map((b) => (
              <div
                key={b}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
              >
                <CheckCircle2
                  className="mb-4 h-6 w-6"
                  style={{ color: YELLOW }}
                />
                <p className="text-sm font-bold leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={`${WA}?text=${encodeURIComponent("Olá, quero contratar a BAG Envios para minha empresa")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-md px-6 py-3.5 text-sm font-black"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              <MessageCircle className="h-4 w-4" />
              Falar com comercial
            </a>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="rounded-md border border-white/30 px-6 py-3.5 text-sm font-black hover:bg-white/10"
            >
              Cadastrar minha empresa
            </button>
          </div>
        </div>
      </section>

      {/* 6. SAAS LAST MILE */}
      <section className="px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <div
              className="mb-4 inline-block rounded-full px-3 py-1 text-[11px] font-black"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              SISTEMA DE GESTÃO
            </div>
            <h2 className="text-3xl font-black leading-tight md:text-5xl">
              Você também opera entregas? Use o sistema da BAG.
            </h2>
            <p className="mt-5 text-white/70 md:text-lg">
              Oferecemos nosso sistema de gestão logística para outras
              empresas de last mile. Gerencie seus entregadores, crie e
              distribua rotas, controle pagamentos e tenha visibilidade total
              da sua operação — tudo em um só lugar.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                icon: Users,
                text: "Cadastro e gestão de entregadores parceiros",
              },
              { icon: Route, text: "Criação e otimização de rotas de entrega" },
              {
                icon: Wallet,
                text: "Controle financeiro e pagamento dos entregadores",
              },
              {
                icon: Activity,
                text: "Painel em tempo real com rastreamento de rotas",
              },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${YELLOW}22`, color: YELLOW }}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <a
              href={`${WA}?text=${encodeURIComponent("Olá, quero conhecer o sistema de gestão da BAG Envios")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-black"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              Quero conhecer o sistema
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 7. MERCADO LIVRE */}
      <section
        className="px-4 py-16 md:px-8 md:py-20"
        style={{ backgroundColor: NAVY_LIGHT }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
            <div
              className="mb-6 inline-block rounded-md px-3 py-1.5 text-xs font-black"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              Mercado Livre
            </div>
            <h2 className="text-2xl font-black md:text-4xl">
              Ponto oficial Mercado Livre em Santos
            </h2>
            <p className="mt-4 max-w-2xl text-white/70">
              Retire, devolva e envie seus pedidos do Mercado Livre aqui na
              BAG Envios. Sem complicação, sem fila, com atendimento
              presencial de qualidade.
            </p>
            <a
              href={`${WA}?text=${encodeURIComponent("Olá, como funciona o ponto Mercado Livre da BAG?")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/30 px-5 py-3 text-sm font-black hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              Como funciona
            </a>
          </div>
        </div>
      </section>

      {/* 8. SEJA ENTREGADOR */}
      <section
        id="entregador"
        className="px-4 py-20 md:px-8 md:py-28"
        style={{ backgroundColor: YELLOW, color: NAVY }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <h2 className="text-3xl font-black leading-tight md:text-5xl">
              Trabalhe com a BAG Envios.
            </h2>
            <p className="mt-5 text-base font-medium md:text-lg">
              Somos uma plataforma que conecta entregadores a empresas que
              precisam de rotas diárias. Cadastre-se, escolha suas rotas e
              receba pelo seu trabalho de forma rápida e transparente.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              "Rotas diárias disponíveis na sua região",
              "Pagamento rápido e transparente pelo app",
              "Suporte da equipe BAG em cada etapa",
            ].map((v) => (
              <div
                key={v}
                className="rounded-xl p-6"
                style={{ backgroundColor: NAVY, color: "white" }}
              >
                <CheckCircle2
                  className="mb-4 h-6 w-6"
                  style={{ color: YELLOW }}
                />
                <p className="text-sm font-bold leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="mt-10 inline-flex items-center gap-2 rounded-md px-8 py-4 text-base font-black text-white"
            style={{ backgroundColor: NAVY }}
          >
            Quero me cadastrar como entregador
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* 9. LOCALIZAÇÃO */}
      <section className="px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-black md:text-5xl">
              Venha nos visitar
            </h2>
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: YELLOW }} />
                <div>
                  <div className="text-xs font-bold uppercase text-white/50">
                    Endereço
                  </div>
                  <div className="text-sm font-bold">
                    Rua Carvalho de Mendonça, 71 — Santos, SP
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0" style={{ color: YELLOW }} />
                <div>
                  <div className="text-xs font-bold uppercase text-white/50">
                    Telefone
                  </div>
                  <div className="text-sm font-bold">(13) 99110-5065</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Instagram className="mt-0.5 h-5 w-5 shrink-0" style={{ color: YELLOW }} />
                <div>
                  <div className="text-xs font-bold uppercase text-white/50">
                    Instagram
                  </div>
                  <div className="text-sm font-bold">@bag.envios</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: YELLOW }} />
                <div>
                  <div className="text-xs font-bold uppercase text-white/50">
                    Horário
                  </div>
                  <div className="text-sm font-bold">
                    Seg a Sex: 8h–18h · Sáb: 8h–13h
                  </div>
                </div>
              </div>
            </div>
            <a
              href={WA}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3.5 text-sm font-black"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              <MessageCircle className="h-4 w-4" />
              Falar pelo WhatsApp
            </a>
          </div>

          <div className="relative h-80 overflow-hidden rounded-2xl border border-white/10 md:h-96">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,183,0,0.08) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,183,0,0.08) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
                backgroundColor: NAVY_LIGHT,
              }}
            />
            <div className="absolute left-1/4 top-1/3 h-1 w-1/2 rounded-full bg-white/10" />
            <div className="absolute left-1/3 top-2/3 h-1 w-1/3 rounded-full bg-white/10" />
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <div className="relative">
                <div
                  className="absolute inset-0 animate-ping rounded-full"
                  style={{ backgroundColor: `${YELLOW}55` }}
                />
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
                  style={{ backgroundColor: YELLOW }}
                >
                  <MapPin className="h-7 w-7" style={{ color: NAVY }} />
                </div>
              </div>
              <div
                className="mt-3 rounded-md px-3 py-1.5 text-xs font-black shadow-lg"
                style={{ backgroundColor: NAVY, color: "white" }}
              >
                BAG Envios · Santos
              </div>
            </div>
            <a
              href="https://maps.google.com/?q=Rua+Carvalho+de+Mendonça+71+Santos+SP"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-4 right-4 rounded-md bg-white/95 px-4 py-2 text-xs font-black shadow-lg"
              style={{ color: NAVY }}
            >
              Abrir no Google Maps →
            </a>
          </div>
        </div>
      </section>

      {/* 10. RODAPÉ */}
      <footer
        className="px-4 py-10 md:px-8"
        style={{ backgroundColor: DARK }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md font-black"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              B
            </div>
            <div className="text-sm font-bold leading-tight">
              BAG Envios
              <div className="text-[10px] font-medium text-white/60">
                & Variedades
              </div>
            </div>
          </div>
          <div
            className="text-xs font-black tracking-widest"
            style={{ color: YELLOW }}
          >
            ENVIE · RETIRE · COMPRE
          </div>
          <div className="text-xs font-bold text-white/70">
            @bag.envios · (13) 99110-5065
          </div>
        </div>
      </footer>
    </div>
  );
}
