import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Truck, Package, Send, RotateCcw, Gift, Wrench, Settings2, Sparkles,
  MapPin, Phone, Instagram, MessageCircle, Clock, Users, Route as RouteIcon,
  Radar, DollarSign, LayoutDashboard, ArrowRight, ExternalLink, CheckCircle2,
  BarChart3, UserCheck, CreditCard,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "BAG Envios & Variedades — Last Mile na Baixada Santista" },
      { name: "description", content: "Especialistas em last mile em Santos e região. Entregas, retiradas, envios e devoluções para pessoas e empresas. Ponto oficial Mercado Livre." },
      { property: "og:title", content: "BAG Envios & Variedades" },
      { property: "og:description", content: "Levamos seu pacote do ponto de origem até a porta do destinatário com agilidade, segurança e eficiência em Santos, SP." },
    ],
  }),
  component: LandingPage,
});

const NAVY = "#0D1B2A";
const NAVY_2 = "#132639";
const NAVY_DEEP = "#060E17";
const YELLOW = "#FFB700";
const WA = "https://wa.me/5513991105065";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{ backgroundColor: NAVY, fontFamily: "Montserrat, system-ui, sans-serif" }}
      className="min-h-screen text-white font-bold"
    >
      {/* NAV */}
      <nav
        className="sticky top-0 z-50 border-b border-white/10 backdrop-blur"
        style={{ backgroundColor: `${NAVY}ee` }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <a href="#top" className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-white">BAG</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: YELLOW }}
            >
              envios & variedades
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="#entregador"
              className="hidden rounded-full border border-white/30 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Seja Entregador
            </a>
            <a
              href={WA}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition hover:brightness-95"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Falar pelo WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center md:py-28">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
            style={{ backgroundColor: `${YELLOW}22`, color: YELLOW }}
          >
            <MapPin className="h-3 w-3" /> Santos · Baixada Santista
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight text-white md:text-7xl">
            Especialistas em <span style={{ color: YELLOW }}>Last Mile</span> na Baixada Santista
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium text-white/75 md:text-xl">
            A BAG Envios é uma empresa de entregas focada na última milha — levamos seu pacote
            do ponto de origem até a porta do destinatário com agilidade, segurança e eficiência.
            Atendemos Santos e região.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="#empresas"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-black shadow-lg transition hover:brightness-95"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              Quero contratar <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#servicos"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-bold text-white transition hover:bg-white/10"
            >
              Ver nossos serviços
            </a>
          </div>
        </div>

        <style>{`
          @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        `}</style>
      </section>

      {/* TICKER */}
      <div className="overflow-hidden py-4" style={{ backgroundColor: YELLOW }}>
        <div className="flex whitespace-nowrap" style={{ animation: "tickerScroll 25s linear infinite" }}>
          {Array.from({ length: 2 }).map((_, k) => (
            <div
              key={k}
              className="flex shrink-0 items-center gap-6 px-6 text-lg font-black uppercase tracking-wider"
              style={{ color: NAVY }}
            >
              {["Entregas", "Retiradas", "Envios", "Devoluções", "Last Mile", "Santos", "SP"].flatMap((w, i) => [
                <span key={`w-${k}-${i}`}>{w}</span>,
                <span key={`d-${k}-${i}`} className="opacity-60">·</span>,
              ])}
            </div>
          ))}
        </div>
      </div>

      {/* SERVIÇOS */}
      <section id="servicos" className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: YELLOW }}>
              Serviços
            </span>
            <h2 className="mt-2 text-4xl font-black text-white md:text-5xl">
              O que a BAG faz por você
            </h2>
            <p className="mt-4 text-base font-medium text-white/70 md:text-lg">
              Para pessoas físicas, lojas e empresas que precisam de entregas
              pontuais na região de Santos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Truck, name: "Entregas", desc: "Buscamos e entregamos seu pacote no destino final com rapidez." },
              { icon: Package, name: "Retiradas", desc: "Receba seus pedidos aqui na BAG — seu pacote fica guardado com segurança." },
              { icon: Send, name: "Envios", desc: "Envie encomendas para qualquer destino com praticidade e rastreamento." },
              { icon: RotateCcw, name: "Devoluções", desc: "Devolver ficou fácil — cuidamos de todo o processo reverso por você." },
              { icon: Gift, name: "Presentes", desc: "Embalamos e entregamos seus presentes com cuidado especial." },
              { icon: Sparkles, name: "Utilidades", desc: "Produtos do dia a dia disponíveis aqui na nossa loja." },
              { icon: Wrench, name: "Manutenções", desc: "Assistência técnica com profissionais de confiança." },
              { icon: Settings2, name: "Personalizados", desc: "Canecas, camisetas e produtos com a sua marca ou mensagem." },
            ].map((s) => (
              <div
                key={s.name}
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/10"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:scale-110"
                  style={{ backgroundColor: `${YELLOW}22` }}
                >
                  <s.icon className="h-6 w-6" style={{ color: YELLOW }} />
                </div>
                <div className="mt-4 text-lg font-black text-white">{s.name}</div>
                <div className="mt-1 text-sm font-medium text-white/60">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMPRESAS CONTRATANTES */}
      <section id="empresas" className="py-20" style={{ backgroundColor: NAVY_2 }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: YELLOW }}>
              Para empresas
            </span>
            <h2 className="mt-3 text-4xl font-black text-white md:text-5xl">
              Você tem uma empresa e precisa fazer entregas todo dia?
            </h2>
            <p className="mt-5 text-lg font-medium text-white/75">
              Farmácias, lojas, e-commerces, restaurantes — qualquer negócio que
              precisa despachar mercadorias regularmente pode contratar a BAG Envios.
              Cadastre sua empresa, solicite entregas pelo painel e nós cuidamos do resto.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: LayoutDashboard, title: "Painel completo", desc: "Solicite entregas direto pelo painel, sem precisar ligar." },
              { icon: Radar, title: "Rastreio em tempo real", desc: "Acompanhe cada entrega em tempo real." },
              { icon: CreditCard, title: "Pagamento flexível", desc: "Pague por entrega ou feche um plano mensal." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${YELLOW}22` }}
                >
                  <b.icon className="h-6 w-6" style={{ color: YELLOW }} />
                </div>
                <div className="mt-4 text-xl font-black text-white">{b.title}</div>
                <div className="mt-2 text-sm font-medium text-white/70">{b.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href={`${WA}?text=${encodeURIComponent("Olá, quero contratar a BAG Envios para minha empresa")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-black transition hover:brightness-95"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              <MessageCircle className="h-4 w-4" /> Falar com comercial
            </a>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-bold text-white transition hover:bg-white/10"
            >
              Cadastrar minha empresa
            </button>
          </div>
        </div>
      </section>

      {/* SAAS - EMPRESAS DE LAST MILE */}
      <section className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              Sistema de Gestão
            </span>
            <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">
              Você também opera entregas? Use o sistema da BAG.
            </h2>
            <p className="mt-5 text-lg font-medium text-white/75">
              Oferecemos nosso sistema de gestão logística para outras empresas de last mile.
              Gerencie seus entregadores, crie e distribua rotas, controle pagamentos e tenha
              visibilidade total da sua operação — tudo em um só lugar.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
            {[
              { icon: UserCheck, title: "Entregadores parceiros", desc: "Cadastro e gestão de entregadores parceiros." },
              { icon: RouteIcon, title: "Rotas otimizadas", desc: "Criação e otimização de rotas de entrega." },
              { icon: DollarSign, title: "Financeiro integrado", desc: "Controle financeiro e pagamento dos entregadores." },
              { icon: BarChart3, title: "Painel em tempo real", desc: "Painel em tempo real com rastreamento de rotas." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${YELLOW}22` }}
                >
                  <f.icon className="h-6 w-6" style={{ color: YELLOW }} />
                </div>
                <div>
                  <div className="text-lg font-black text-white">{f.title}</div>
                  <div className="mt-1 text-sm font-medium text-white/70">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <a
              href={`${WA}?text=${encodeURIComponent("Olá, quero conhecer o sistema de gestão da BAG Envios")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-black transition hover:brightness-95"
              style={{ backgroundColor: YELLOW, color: NAVY }}
            >
              Quero conhecer o sistema <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* MERCADO LIVRE */}
      <section className="py-16" style={{ backgroundColor: NAVY_2 }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="grid gap-6 p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:p-10">
              <div
                className="flex h-20 w-32 items-center justify-center rounded-2xl text-sm font-black"
                style={{ backgroundColor: YELLOW, color: NAVY }}
              >
                Mercado Livre
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider" style={{ color: YELLOW }}>
                  Ponto oficial
                </div>
                <h3 className="mt-2 text-2xl font-black text-white md:text-3xl">
                  Ponto oficial Mercado Livre em Santos
                </h3>
                <p className="mt-2 text-sm font-medium text-white/70 md:text-base">
                  Retire, devolva e envie seus pedidos do Mercado Livre aqui na BAG Envios.
                  Sem complicação, sem fila, com atendimento presencial de qualidade.
                </p>
              </div>
              <a
                href={`${WA}?text=${encodeURIComponent("Olá, quero saber como funciona o ponto Mercado Livre da BAG")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-black transition hover:brightness-95"
                style={{ backgroundColor: YELLOW, color: NAVY }}
              >
                Como funciona <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ENTREGADOR */}
      <section id="entregador" className="py-20" style={{ backgroundColor: YELLOW }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: NAVY }}>
              Seja entregador
            </span>
            <h2 className="mt-3 text-5xl font-black md:text-6xl" style={{ color: NAVY }}>
              Trabalhe com a BAG Envios.
            </h2>
            <p className="mt-5 text-lg font-semibold" style={{ color: `${NAVY}cc` }}>
              Somos uma plataforma que conecta entregadores a empresas que precisam de
              rotas diárias. Cadastre-se, escolha suas rotas e receba pelo seu trabalho
              de forma rápida e transparente.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: RouteIcon, title: "Rotas na sua região", desc: "Rotas diárias disponíveis na sua região." },
              { icon: DollarSign, title: "Pagamento transparente", desc: "Pagamento rápido e transparente pelo app." },
              { icon: Users, title: "Suporte próximo", desc: "Suporte da equipe BAG em cada etapa." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl p-6" style={{ backgroundColor: NAVY }}>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${YELLOW}22` }}
                >
                  <c.icon className="h-6 w-6" style={{ color: YELLOW }} />
                </div>
                <div className="mt-4 text-xl font-black text-white">{c.title}</div>
                <div className="mt-2 text-sm font-medium text-white/70">{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg font-black text-white shadow-2xl transition hover:brightness-125"
              style={{ backgroundColor: NAVY }}
            >
              Quero me cadastrar como entregador <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* LOCALIZAÇÃO */}
      <section className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: YELLOW }}>
              Onde estamos
            </span>
            <h2 className="mt-2 text-4xl font-black text-white md:text-5xl">
              Venha nos visitar
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="space-y-6">
                <InfoRow icon={MapPin} label="Endereço">
                  <div className="font-black text-white">Rua Carvalho de Mendonça, 71</div>
                  <div className="font-medium text-white/70">Santos — SP</div>
                </InfoRow>
                <InfoRow icon={Phone} label="Telefone">
                  <div className="font-black text-white">(13) 99110-5065</div>
                </InfoRow>
                <InfoRow icon={Instagram} label="Instagram">
                  <a
                    href="https://instagram.com/bag.envios"
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-white hover:underline"
                  >
                    @bag.envios
                  </a>
                </InfoRow>
                <InfoRow icon={Clock} label="Horário">
                  <div className="font-black text-white">Seg a Sex: 8h–18h</div>
                  <div className="font-medium text-white/70">Sáb: 8h–13h</div>
                </InfoRow>
                <a
                  href={WA}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-black transition hover:brightness-95"
                  style={{ backgroundColor: YELLOW, color: NAVY }}
                >
                  <MessageCircle className="h-4 w-4" /> Falar pelo WhatsApp
                </a>
              </div>
            </div>

            <a
              href="https://maps.google.com/?q=Rua+Carvalho+de+Mendonça+71+Santos+SP"
              target="_blank"
              rel="noreferrer"
              className="group relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-3xl border border-white/10"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 30% 40%, ${YELLOW}15 0%, transparent 40%),
                  linear-gradient(135deg, #1a2a3f 0%, #0d1b2a 100%)
                `,
              }}
            >
              <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d="M 0 220 Q 200 160 400 240 T 800 260" stroke={YELLOW} strokeWidth="2" fill="none" opacity="0.5" />
                <path d="M 120 0 L 170 400" stroke="white" strokeWidth="1" opacity="0.3" />
                <path d="M 320 0 L 270 400" stroke="white" strokeWidth="1" opacity="0.3" />
              </svg>

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <span className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: `${YELLOW}66` }} />
                  <div
                    className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl"
                    style={{ backgroundColor: YELLOW }}
                  >
                    <MapPin className="h-8 w-8" style={{ color: NAVY }} strokeWidth={2.5} />
                  </div>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-black text-white backdrop-blur transition group-hover:bg-white/20">
                  Abrir no Google Maps <ExternalLink className="h-4 w-4" />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8" style={{ backgroundColor: NAVY_DEEP }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 text-center md:grid-cols-3 md:text-left">
          <div className="flex items-baseline justify-center gap-2 md:justify-start">
            <span className="text-xl font-black text-white">BAG</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: YELLOW }}
            >
              envios & variedades
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-white/60">
            <span>Envie</span><span style={{ color: YELLOW }}>·</span>
            <span>Retire</span><span style={{ color: YELLOW }}>·</span>
            <span>Compre</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-medium text-white/70 md:justify-end">
            <a
              href="https://instagram.com/bag.envios"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-white"
            >
              <Instagram className="h-4 w-4" style={{ color: YELLOW }} />
              @bag.envios
            </a>
            <span style={{ color: YELLOW }}>·</span>
            <span>(13) 99110-5065</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <Icon className="h-6 w-6 shrink-0" style={{ color: YELLOW }} />
      <div>
        <div className="text-xs font-black uppercase tracking-wider text-white/50">{label}</div>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
