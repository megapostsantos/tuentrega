import { createFileRoute, Link } from "@tanstack/react-router";
import bagLogo from "@/assets/bag-logo-transparent.png.asset.json";
import {
  Truck,
  Package,
  Send,
  RotateCcw,
  Gift,
  Wrench,
  Sparkles,
  Briefcase,
  MessageCircle,
  MapPin,
  Phone,
  Instagram,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BAG Envios & Variedades — Last Mile em Santos/SP" },
      {
        name: "description",
        content:
          "Entregas, retiradas, envios e devoluções em Santos. Ponto oficial Mercado Livre. Last Mile com agilidade, segurança e eficiência.",
      },
      { property: "og:title", content: "BAG Envios & Variedades" },
      {
        property: "og:description",
        content:
          "Last Mile em Santos/SP. Envie, retire, compre — rápido, confiável, sempre.",
      },
    ],
  }),
  component: Landing,
});

const NAVY = "#0D1B2A";
const YELLOW = "#FFB700";
const WHATSAPP = "https://wa.me/5513991105065";
const MAPS =
  "https://www.google.com/maps/search/?api=1&query=Rua+Carvalho+de+Mendonça+71+Santos+SP";

const heading = { fontFamily: "'Montserrat', system-ui, sans-serif", fontWeight: 900 };
const body = { fontFamily: "'Montserrat', system-ui, sans-serif" };

function Landing() {
  return (
    <div className="min-h-screen bg-white text-[#0D1B2A]" style={body}>
      {/* NAV */}
      <nav
        className="fixed top-0 inset-x-0 z-50 border-b border-white/10"
        style={{ background: NAVY }}
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2 text-white">
            <img
              src={bagLogo.url}
              alt="BAG Envios"
              className="w-9 h-9 rounded-lg object-cover border border-yellow-500/30"
            />
            <span className="tracking-tight text-sm sm:text-base" style={heading}>
              BAG <span style={{ color: YELLOW }}>envios</span>
              <span className="hidden sm:inline text-white/70 font-medium"> & variedades</span>
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-transform hover:scale-105"
              style={{ background: YELLOW, color: NAVY, ...heading }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2.8} />
              Falar pelo WhatsApp
            </a>
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-full text-sm border-2 border-white/30 text-white hover:border-white hover:bg-white/5 transition-colors"
              style={heading}
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center px-4 py-2 rounded-full text-sm transition-transform hover:scale-105"
              style={{ background: YELLOW, color: NAVY, ...heading }}
            >
              <span className="hidden sm:inline">Criar conta</span>
              <span className="sm:hidden">Acessar</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="top" className="pt-24 pb-16 px-5 relative overflow-hidden" style={{ background: NAVY }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(${YELLOW} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }} />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center relative">
          <div className="text-white space-y-8">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest"
              style={{ background: `${YELLOW}22`, color: YELLOW, ...heading }}
            >
              Santos · São Paulo
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl leading-[0.9] uppercase" style={heading}>
              Fazemos entregas
              <br />
              <span style={{ color: YELLOW }}>Last Mile</span>
            </h1>
            <p className="text-lg text-white/70 max-w-lg leading-relaxed">
              Levamos seu pacote até o destino final com agilidade, segurança e
              eficiência.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base uppercase tracking-wide transition-transform hover:scale-[1.03]"
                style={{ background: YELLOW, color: NAVY, ...heading }}
              >
                <MessageCircle className="w-5 h-5" strokeWidth={2.8} />
                Falar pelo WhatsApp
              </a>
              <a
                href="#servicos"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-base uppercase tracking-wide border-2 border-white/25 text-white hover:border-white transition-colors"
                style={heading}
              >
                Ver serviços <ArrowRight className="w-5 h-5" />
              </a>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-lg">
              {[
                { v: "8+", l: "Serviços" },
                { v: "Mercado Livre", l: "Parceiro" },
                { v: "100%", l: "Compromisso" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl md:text-3xl" style={{ color: YELLOW, ...heading }}>{s.v}</p>
                  <p className="text-xs uppercase tracking-widest text-white/60 mt-1" style={heading}>
                    {s.l}
                  </p>
                </div>
              ))}
            </div>

          </div>

          {/* Floating logo illustration */}
          <div className="relative hidden lg:flex justify-center">
            <div className="relative w-[380px] h-[380px] animate-[float_5s_ease-in-out_infinite]">
              <div
                className="absolute inset-0 rounded-[3rem] blur-3xl opacity-30"
                style={{ background: YELLOW }}
              />
              <img
                src={bagLogo.url}
                alt="BAG Envios — envios & variedades"
                className="relative w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}`}</style>
      </section>

      {/* TICKER */}
      <div className="overflow-hidden py-4 border-y-4" style={{ background: YELLOW, borderColor: NAVY }}>
        <div className="flex whitespace-nowrap animate-[ticker_25s_linear_infinite]">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="mx-8 text-lg uppercase tracking-widest"
              style={{ color: NAVY, ...heading }}
            >
              ENVIE · RETIRE · COMPRE · RÁPIDO · CONFIÁVEL · SEMPRE ·
            </span>
          ))}
        </div>
        <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </div>

      {/* SERVIÇOS */}
      <section id="servicos" className="py-20 px-5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <span className="text-sm uppercase tracking-widest" style={{ color: YELLOW, ...heading }}>
              O que fazemos
            </span>
            <h2 className="text-4xl md:text-5xl uppercase" style={heading}>
              Nossos <span style={{ color: YELLOW }}>serviços</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Truck, t: "Entregas", d: "Rota rápida até o destino final." },
              { icon: Package, t: "Retiradas", d: "Buscamos no endereço indicado." },
              { icon: Send, t: "Envios", d: "Despache seu pacote com facilidade." },
              { icon: RotateCcw, t: "Devoluções", d: "Ponto oficial de devolução Mercado Livre." },
              { icon: Gift, t: "Presentes", d: "Embale e envie com carinho." },
              { icon: Sparkles, t: "Utilidades", d: "Variedades para o dia a dia." },
              { icon: Wrench, t: "Manutenções", d: "Pequenos reparos rápidos." },
              { icon: Briefcase, t: "Personalizados", d: "Serviços sob medida." },
            ].map((s) => (
              <div
                key={s.t}
                className="group p-6 rounded-3xl border-2 transition-all hover:-translate-y-1"
                style={{ borderColor: `${NAVY}10`, background: "white" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors"
                  style={{ background: `${YELLOW}20` }}
                >
                  <s.icon className="w-6 h-6" style={{ color: NAVY }} strokeWidth={2.4} />
                </div>
                <h3 className="text-lg uppercase mb-1.5" style={heading}>{s.t}</h3>
                <p className="text-sm text-[#0D1B2A]/60 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUE A BAG */}
      <section className="py-20 px-5 relative overflow-hidden" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto text-white">
          <div className="text-center mb-14 space-y-3">
            <span className="text-sm uppercase tracking-widest" style={{ color: YELLOW, ...heading }}>
              Por que a BAG
            </span>
            <h2 className="text-4xl md:text-5xl uppercase" style={heading}>
              Feitos para <span style={{ color: YELLOW }}>entregar</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", icon: Zap, t: "Entregas Rápidas", d: "Rotas otimizadas para chegar no menor tempo possível na sua região." },
              { n: "02", icon: ShieldCheck, t: "Segurança Garantida", d: "Cada pacote é rastreado e manuseado com todo cuidado do início ao fim." },
              { n: "03", icon: Globe2, t: "Cobertura Local", d: "Conhecemos Santos como poucos — atendemos toda a cidade e região." },
            ].map((c) => (
              <div
                key={c.n}
                className="relative p-8 rounded-3xl border border-white/10 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span
                  className="absolute -top-4 -right-2 text-[8rem] leading-none opacity-15 select-none"
                  style={{ color: YELLOW, ...heading }}
                >
                  {c.n}
                </span>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 relative"
                  style={{ background: `${YELLOW}22` }}
                >
                  <c.icon className="w-6 h-6" style={{ color: YELLOW }} strokeWidth={2.4} />
                </div>
                <h3 className="text-xl uppercase mb-2 relative" style={heading}>{c.t}</h3>
                <p className="text-white/70 text-sm leading-relaxed relative">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LAST MILE */}
      <section className="py-20 px-5" style={{ background: YELLOW }}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6" style={{ color: NAVY }}>
            <span className="text-sm uppercase tracking-widest" style={heading}>Last Mile</span>
            <h2 className="text-4xl md:text-5xl uppercase leading-[0.95]" style={heading}>
              Last Mile é o que nos <span className="underline decoration-4 underline-offset-4">move.</span>
            </h2>
            <p className="text-lg leading-relaxed max-w-lg" style={{ color: `${NAVY}cc` }}>
              A última etapa da entrega é a mais importante — e a que a gente
              faz melhor. Rota curta, cliente feliz, marca fortalecida.
            </p>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full uppercase tracking-wide text-white transition-transform hover:scale-[1.03]"
              style={{ background: NAVY, ...heading }}
            >
              Solicitar entrega <ArrowRight className="w-5 h-5" />
            </a>
          </div>
          <div
            className="rounded-3xl p-8 md:p-10 space-y-4"
            style={{ background: NAVY }}
          >
            {[
              { t: "Mais Eficiência", d: "Rotas planejadas para reduzir tempo e custo." },
              { t: "Clientes Satisfeitos", d: "Entrega no prazo, comunicação clara." },
              { t: "Resultados que Impulsionam", d: "Sua operação escala com a gente." },
            ].map((it, i) => (
              <div
                key={it.t}
                className="p-5 rounded-2xl border border-white/10 flex items-start gap-4"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <span
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: YELLOW, color: NAVY, ...heading }}
                >
                  0{i + 1}
                </span>
                <div>
                  <h4 className="text-white uppercase mb-1" style={heading}>{it.t}</h4>
                  <p className="text-white/60 text-sm">{it.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MERCADO LIVRE */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div
            className="relative rounded-[2.5rem] p-8 md:p-12 overflow-hidden border-2"
            style={{ background: NAVY, borderColor: `${YELLOW}44` }}
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30" style={{ background: YELLOW }} />
            <div className="relative flex flex-col md:flex-row gap-8 items-center">
              <div
                className="shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-3xl flex items-center justify-center p-3"
                style={{ background: YELLOW }}
              >
                <img
                  src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/6.6.100/mercadolibre/logo__large_plus.png"
                  alt="Mercado Livre"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 text-white space-y-4 text-center md:text-left">
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest"
                  style={{ background: `${YELLOW}22`, color: YELLOW, ...heading }}
                >
                  Ponto Oficial Mercado Livre
                </span>
                <h3 className="text-3xl md:text-4xl uppercase" style={heading}>
                  Tudo do <span style={{ color: YELLOW }}>Mercado Livre</span> você resolve aqui!
                </h3>
                <p className="text-white/70">
                  Retirada, devolução e envio oficial — atendimento direto em Santos.
                </p>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full uppercase tracking-wide transition-transform hover:scale-[1.03]"
                  style={{ background: YELLOW, color: NAVY, ...heading }}
                >
                  Saiba mais <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEJA ENTREGADOR */}
      <section className="py-20 px-5" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto text-white">
          <div className="text-center mb-14 space-y-3">
            <span className="text-sm uppercase tracking-widest" style={{ color: YELLOW, ...heading }}>
              Seja entregador BAG
            </span>
            <h2 className="text-4xl md:text-5xl uppercase" style={heading}>
              Cadastre-se com o seu <span style={{ color: YELLOW }}>modal</span>
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto pt-2">
              Aceitamos entregadores de qualquer modalidade. Escolha o seu e
              comece a receber rotas na Baixada Santista.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { e: "🚶", t: "A pé" },
              { e: "🚲", t: "Bike" },
              { e: "⚡", t: "Bike elétrica" },
              { e: "🏍️", t: "Moto" },
              { e: "🚗", t: "Carro" },
            ].map((m) => (
              <div
                key={m.t}
                className="p-6 rounded-3xl border border-white/10 text-center transition-all hover:-translate-y-1 hover:border-[color:var(--y)]"
                style={{ background: "rgba(255,255,255,0.04)", ["--y" as string]: YELLOW }}
              >
                <div className="text-5xl mb-3 leading-none">{m.e}</div>
                <p className="text-sm uppercase tracking-wide" style={heading}>
                  {m.t}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full uppercase tracking-wide transition-transform hover:scale-[1.03]"
              style={{ background: YELLOW, color: NAVY, ...heading }}
            >
              Quero me cadastrar <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href={`${WHATSAPP}?text=${encodeURIComponent("Olá! Quero ser entregador da BAG.")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full uppercase tracking-wide border-2 border-white/25 text-white hover:border-white transition-colors"
              style={heading}
            >
              <MessageCircle className="w-5 h-5" strokeWidth={2.8} /> Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* LOCALIZAÇÃO */}

      <section className="py-20 px-5 bg-[#F5F5F0]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="text-sm uppercase tracking-widest" style={{ color: YELLOW, ...heading }}>
              Onde estamos
            </span>
            <h2 className="text-4xl md:text-5xl uppercase leading-tight" style={heading}>
              Venha nos <span style={{ color: YELLOW }}>visitar</span>
            </h2>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${YELLOW}22` }}>
                  <MapPin className="w-5 h-5" style={{ color: NAVY }} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#0D1B2A]/60" style={heading}>Endereço</p>
                  <p className="text-base" style={heading}>Rua Carvalho de Mendonça, 71</p>
                  <p className="text-sm text-[#0D1B2A]/70">Santos — SP</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${YELLOW}22` }}>
                  <Phone className="w-5 h-5" style={{ color: NAVY }} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#0D1B2A]/60" style={heading}>Telefone</p>
                  <a href="tel:+5513991105065" className="text-base" style={heading}>(13) 99110-5065</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${YELLOW}22` }}>
                  <Instagram className="w-5 h-5" style={{ color: NAVY }} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#0D1B2A]/60" style={heading}>Instagram</p>
                  <a href="https://instagram.com/bag_envios" target="_blank" rel="noreferrer" className="text-base" style={heading}>
                    @bag_envios
                  </a>
                </div>
              </div>
            </div>

            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full uppercase tracking-wide text-white transition-transform hover:scale-[1.03]"
              style={{ background: NAVY, ...heading }}
            >
              <MessageCircle className="w-5 h-5" strokeWidth={2.8} />
              Falar pelo WhatsApp
            </a>
          </div>

          <a
            href={MAPS}
            target="_blank"
            rel="noreferrer"
            className="group relative block aspect-[4/3] rounded-3xl overflow-hidden border-2 transition-transform hover:scale-[1.01]"
            style={{ background: NAVY, borderColor: `${YELLOW}55` }}
          >
            {/* Fake map grid */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `linear-gradient(${YELLOW}22 1px, transparent 1px), linear-gradient(90deg, ${YELLOW}22 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
            {/* Fake roads */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
              <path d="M0 180 Q120 160 220 200 T400 210" stroke={`${YELLOW}66`} strokeWidth="3" fill="none" />
              <path d="M80 0 Q100 120 150 180 T220 300" stroke={`${YELLOW}44`} strokeWidth="2" fill="none" />
              <path d="M0 60 L400 90" stroke={`${YELLOW}33`} strokeWidth="2" fill="none" />
            </svg>
            {/* Pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl animate-bounce"
                style={{ background: YELLOW }}
              >
                <MapPin className="w-7 h-7" style={{ color: NAVY }} strokeWidth={2.8} fill={NAVY} />
              </div>
              <div className="w-2 h-2 rounded-full mt-1" style={{ background: NAVY }} />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <span className="text-white text-xs uppercase tracking-widest" style={heading}>BAG · Santos/SP</span>
              <span
                className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest group-hover:scale-105 transition-transform"
                style={{ background: YELLOW, color: NAVY, ...heading }}
              >
                Abrir no Maps →
              </span>
            </div>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-5" style={{ background: "#060E17" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <img
              src={bagLogo.url}
              alt="BAG Envios"
              className="w-8 h-8 rounded-lg object-cover border border-yellow-500/30"
            />
            <span className="text-white text-sm" style={heading}>
              BAG <span style={{ color: YELLOW }}>envios</span>
            </span>
          </div>
          <p
            className="text-xs uppercase tracking-[0.3em] text-center"
            style={{ color: YELLOW, ...heading }}
          >
            Envie · Retire · Compre
          </p>
          <a
            href="https://instagram.com/bag_envios"
            target="_blank"
            rel="noreferrer"
            className="text-white/70 hover:text-white text-sm md:text-right flex items-center gap-2 justify-center md:justify-end"
          >
            <Instagram className="w-4 h-4" /> @bag_envios
          </a>
        </div>
        <p className="text-center text-white/40 text-xs mt-6">
          © {new Date().getFullYear()} BAG Envios & Variedades · Santos/SP
        </p>
      </footer>
    </div>
  );
}
