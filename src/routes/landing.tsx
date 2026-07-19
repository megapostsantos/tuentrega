import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Truck, Package, Send, RotateCcw, Gift, Wrench, Settings2, Sparkles,
  MapPin, Phone, Instagram, MessageCircle, ShieldCheck, Clock, Radar,
  Route as RouteIcon, Users, Zap, ArrowRight, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "BAG Envios & Variedades — Last Mile em Santos, SP" },
      { name: "description", content: "Entregas, retiradas, envios e devoluções em Santos-SP. Operadora last mile para e-commerces e ponto oficial do Mercado Livre." },
      { property: "og:title", content: "BAG Envios & Variedades" },
      { property: "og:description", content: "Fazemos entregas com agilidade, segurança e eficiência em Santos, SP." },
    ],
  }),
  component: LandingPage,
});

const NAVY = "#0D1B2A";
const YELLOW = "#FFB700";
const WA = "https://wa.me/5513991105065";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: NAVY, fontFamily: "Montserrat, system-ui, sans-serif" }} className="min-h-screen text-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/10 backdrop-blur" style={{ backgroundColor: `${NAVY}ee` }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <a href="#top" className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-white">BAG</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: YELLOW }}>
              envios & variedades
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="#entregador"
              className="hidden rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Seja Entregador
            </a>
            <a
              href={WA}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition hover:brightness-95"
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
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: `${YELLOW}22`, color: YELLOW }}
            >
              <MapPin className="h-3 w-3" /> Last Mile · Santos, SP
            </span>
            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
              FAZEMOS<br />ENTREGAS
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              Levamos seu pacote até o destino final com agilidade, segurança e eficiência.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#empresas"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold shadow-lg transition hover:brightness-95"
                style={{ backgroundColor: YELLOW, color: NAVY }}
              >
                Contratar a BAG <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#servicos"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Ver serviços
              </a>
            </div>
          </div>

          {/* Animated bag icon */}
          <div className="relative flex items-center justify-center">
            <div className="relative h-72 w-72 md:h-96 md:w-96">
              <span className="absolute inset-0 animate-ping rounded-full opacity-20" style={{ backgroundColor: YELLOW, animationDuration: "3s" }} />
              <span className="absolute inset-6 animate-ping rounded-full opacity-30" style={{ backgroundColor: YELLOW, animationDuration: "2.5s" }} />
              <span className="absolute inset-12 rounded-full" style={{ backgroundColor: `${YELLOW}20` }} />
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ animation: "bagFloat 4s ease-in-out infinite" }}
              >
                <Package className="h-40 w-40 md:h-56 md:w-56" style={{ color: YELLOW }} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes bagFloat {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-16px) rotate(2deg); }
          }
          @keyframes tickerScroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* TICKER */}
      <div className="overflow-hidden py-4" style={{ backgroundColor: YELLOW }}>
        <div className="flex whitespace-nowrap" style={{ animation: "tickerScroll 25s linear infinite" }}>
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex shrink-0 items-center gap-6 px-6 text-lg font-black uppercase tracking-wider" style={{ color: NAVY }}>
              {["Envie", "Retire", "Compre", "Rápido", "Confiável", "Sempre"].flatMap((w, i) => [
                <span key={`w-${k}-${i}`}>{w}</span>,
                <span key={`d-${k}-${i}`} className="opacity-60">·</span>,
              ])}
            </div>
          ))}
        </div>
      </div>

      {/* SERVIÇOS */}
      <section id="servicos" className="py-20" style={{ backgroundColor: "#0A1521" }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: YELLOW }}>Serviços</span>
            <h2 className="mt-2 text-4xl font-black text-white md:text-5xl">Tudo em um só lugar</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Truck, name: "Entregas", desc: "Last mile em Santos e região." },
              { icon: Package, name: "Retiradas", desc: "Buscamos onde estiver." },
              { icon: Send, name: "Envios", desc: "Nacionais e internacionais." },
              { icon: RotateCcw, name: "Devoluções", desc: "Processo simples e rápido." },
              { icon: Gift, name: "Presentes", desc: "Entregamos com carinho." },
              { icon: Sparkles, name: "Utilidades", desc: "Produtos do dia a dia." },
              { icon: Wrench, name: "Manutenções", desc: "Envio para reparos." },
              { icon: Settings2, name: "Personalizados", desc: "Sob demanda." },
            ].map((s) => (
              <div key={s.name} className="group rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/30 hover:bg-white/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:scale-110" style={{ backgroundColor: `${YELLOW}22` }}>
                  <s.icon className="h-6 w-6" style={{ color: YELLOW }} />
                </div>
                <div className="mt-4 text-lg font-bold text-white">{s.name}</div>
                <div className="mt-1 text-sm text-white/60">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMPRESAS */}
      <section id="empresas" className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: YELLOW }}>Para empresas</span>
            <h2 className="mt-3 text-4xl font-black text-white md:text-5xl">
              Sua operação de last mile com quem entende do negócio.
            </h2>
            <p className="mt-5 text-lg text-white/70">
              E-commerces e empresas podem contratar a BAG como operadora logística
              — ou licenciar nosso sistema de gestão e rodar suas próprias entregas.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: RouteIcon, title: "Gestão de rotas", desc: "Divisão inteligente e otimizada por bairro." },
              { icon: Radar, title: "Rastreamento em tempo real", desc: "Acompanhe cada entrega do início ao fim." },
              { icon: Users, title: "Equipe dedicada", desc: "Entregadores treinados e disponíveis." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${YELLOW}22` }}>
                  <b.icon className="h-6 w-6" style={{ color: YELLOW }} />
                </div>
                <div className="mt-4 text-xl font-bold text-white">{b.title}</div>
                <div className="mt-2 text-sm text-white/60">{b.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href={`${WA}?text=${encodeURIComponent("Olá, quero contratar a BAG para minha empresa")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold transition hover:brightness-95"
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

      {/* ENTREGADOR */}
      <section id="entregador" className="py-20" style={{ backgroundColor: YELLOW }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>Seja entregador</span>
            <h2 className="mt-3 text-5xl font-black md:text-6xl" style={{ color: NAVY }}>
              Trabalhe com a BAG.
            </h2>
            <p className="mt-5 text-lg font-medium" style={{ color: `${NAVY}cc` }}>
              Faça suas próprias rotas, no seu horário, com suporte completo.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: RouteIcon, title: "Rotas diárias", desc: "Escolha o volume que faz sentido para você." },
              { icon: Zap, title: "Pagamento rápido", desc: "Receba via PIX sem burocracia." },
              { icon: Users, title: "Suporte da equipe", desc: "Time comercial e operacional ao seu lado." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl p-6" style={{ backgroundColor: NAVY }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${YELLOW}22` }}>
                  <c.icon className="h-6 w-6" style={{ color: YELLOW }} />
                </div>
                <div className="mt-4 text-xl font-bold text-white">{c.title}</div>
                <div className="mt-2 text-sm text-white/70">{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg font-black text-white shadow-2xl transition hover:brightness-125"
              style={{ backgroundColor: NAVY }}
            >
              Quero me cadastrar <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* POR QUE A BAG */}
      <section className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: YELLOW }}>Por que a BAG</span>
            <h2 className="mt-2 text-4xl font-black text-white md:text-5xl">Feita para o last mile.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "01", icon: Zap, title: "Entregas Rápidas", desc: "Roteirização otimizada e equipe local para chegar mais rápido." },
              { n: "02", icon: ShieldCheck, title: "Segurança Garantida", desc: "Rastreamento em tempo real e prova de entrega em cada pacote." },
              { n: "03", icon: MapPin, title: "Cobertura Local", desc: "Base em Santos com atuação em toda a Baixada Santista." },
            ].map((c) => (
              <div key={c.n} className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8">
                <span
                  className="absolute -right-4 -top-6 text-8xl font-black leading-none opacity-10"
                  style={{ color: YELLOW }}
                >
                  {c.n}
                </span>
                <c.icon className="h-8 w-8" style={{ color: YELLOW }} />
                <div className="mt-4 text-2xl font-bold text-white">{c.title}</div>
                <div className="mt-2 text-white/60">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MERCADO LIVRE */}
      <section className="py-16" style={{ backgroundColor: "#0A1521" }}>
        <div className="mx-auto max-w-5xl px-4">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div className="grid gap-6 p-8 md:grid-cols-[auto_1fr_auto] md:items-center md:p-10">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black"
                style={{ backgroundColor: YELLOW, color: NAVY }}
              >
                ML
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: YELLOW }}>
                  Ponto oficial Mercado Livre
                </div>
                <h3 className="mt-2 text-2xl font-black text-white md:text-3xl">
                  Tudo do Mercado Livre você resolve aqui!
                </h3>
                <p className="mt-2 text-white/70">
                  Retiradas, devoluções e envios com facilidade em Santos.
                </p>
              </div>
              <a
                href={`${WA}?text=${encodeURIComponent("Olá, quero saber mais sobre o ponto Mercado Livre da BAG")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-bold transition hover:brightness-95"
                style={{ backgroundColor: YELLOW, color: NAVY }}
              >
                Saiba mais <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* LOCALIZAÇÃO */}
      <section className="py-20" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: YELLOW }}>Onde estamos</span>
            <h2 className="mt-2 text-4xl font-black text-white md:text-5xl">Venha nos visitar.</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <MapPin className="h-6 w-6 shrink-0" style={{ color: YELLOW }} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white/50">Endereço</div>
                    <div className="mt-1 font-semibold text-white">Rua Carvalho de Mendonça, 71</div>
                    <div className="text-white/70">Santos — SP</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Phone className="h-6 w-6 shrink-0" style={{ color: YELLOW }} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white/50">Telefone</div>
                    <div className="mt-1 font-semibold text-white">(13) 99110-5065</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Instagram className="h-6 w-6 shrink-0" style={{ color: YELLOW }} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white/50">Instagram</div>
                    <a
                      href="https://instagram.com/bag.envios"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block font-semibold text-white hover:underline"
                    >
                      @bag.envios
                    </a>
                  </div>
                </div>
                <a
                  href={WA}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold transition hover:brightness-95"
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
              className="group relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border border-white/10"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 30% 40%, ${YELLOW}15 0%, transparent 40%),
                  linear-gradient(135deg, #1a2a3f 0%, #0d1b2a 100%)
                `,
              }}
            >
              {/* stylized grid map */}
              <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d="M 0 200 Q 200 150 400 220 T 800 250" stroke={YELLOW} strokeWidth="2" fill="none" opacity="0.5" />
                <path d="M 100 0 L 150 400" stroke="white" strokeWidth="1" opacity="0.3" />
                <path d="M 300 0 L 250 400" stroke="white" strokeWidth="1" opacity="0.3" />
              </svg>

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <span className="absolute inset-0 animate-ping rounded-full" style={{ backgroundColor: `${YELLOW}66` }} />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-2xl" style={{ backgroundColor: YELLOW }}>
                    <MapPin className="h-8 w-8" style={{ color: NAVY }} strokeWidth={2.5} />
                  </div>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-white backdrop-blur transition group-hover:bg-white/20">
                  Abrir no Maps <ExternalLink className="h-4 w-4" />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8" style={{ backgroundColor: "#060E17" }}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 text-center md:grid-cols-3 md:text-left">
          <div className="flex items-baseline justify-center gap-2 md:justify-start">
            <span className="text-xl font-black text-white">BAG</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: YELLOW }}>
              envios & variedades
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-white/60">
            <span>Envie</span><span style={{ color: YELLOW }}>·</span>
            <span>Retire</span><span style={{ color: YELLOW }}>·</span>
            <span>Compre</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-white/70 md:justify-end">
            <Instagram className="h-4 w-4" style={{ color: YELLOW }} />
            <a href="https://instagram.com/bag.envios" target="_blank" rel="noreferrer" className="hover:text-white">
              @bag.envios
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
