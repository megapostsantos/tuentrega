import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  BarChart3,
  Building2,
  Zap,
  ArrowRight,
  Check,
  PhoneCall,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bag Envios — Logística last mile para e-commerces e marketplaces" },
      {
        name: "description",
        content:
          "Entregamos o último quilômetro no mesmo dia com rastreio ao vivo, prova de entrega digital e cobertura nacional. Bag Envios: logística inteligente para o seu e-commerce.",
      },
      { property: "og:title", content: "Bag Envios — Logística last mile" },
      {
        property: "og:description",
        content:
          "Same day, next day e fracionado com rastreio ao vivo em todo o Brasil.",
      },
    ],
  }),
  component: Landing,
});

const headingFont = { fontFamily: "'Archivo Black', sans-serif" };
const bodyFont = { fontFamily: "'Hind', sans-serif" };

function Landing() {
  return (
    <div className="bg-[#0f0f0f] text-white selection:bg-[#e85d3a]/30" style={bodyFont}>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0f0f0f]/85 backdrop-blur-md border-b border-[#242424]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#e85d3a] rounded-lg flex items-center justify-center shadow-[0_0_20px_-5px_#e85d3a]">
              <Package className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl tracking-tight" style={headingFont}>
              BAG<span className="text-[#e85d3a]"> ENVIOS</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-wider">
            <a href="#servicos" className="hover:text-[#e85d3a] transition-colors">Serviços</a>
            <a href="#cobertura" className="hover:text-[#e85d3a] transition-colors">Cobertura</a>
            <a href="#tecnologia" className="hover:text-[#e85d3a] transition-colors">Tecnologia</a>
            <a href="#entregador" className="hover:text-[#e85d3a] transition-colors">Seja entregador</a>
            <Link to="/auth" className="hover:text-[#e85d3a] transition-colors">Entrar</Link>
            <a
              href="#contato"
              className="bg-[#e85d3a] px-6 py-2.5 rounded-full font-bold hover:bg-[#cf4d2d] transition-all text-white"
            >
              Fale com vendas
            </a>
          </div>
          <Link
            to="/auth"
            className="md:hidden bg-[#e85d3a] px-5 py-2 rounded-full text-sm font-bold text-white"
          >
            Entrar
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,93,58,0.15),transparent_60%)]" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-16 items-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1c1c1c] border border-[#333] text-sm">
              <span className="flex h-2 w-2 rounded-full bg-[#e85d3a] animate-pulse" />
              <span className="text-[#e85d3a] font-semibold uppercase tracking-widest text-xs">
                Operação em 120+ cidades
              </span>
            </div>
            <h1
              className="text-5xl md:text-7xl leading-[0.95] tracking-tight uppercase"
              style={headingFont}
            >
              O último quilômetro,
              <br />
              <span className="text-[#e85d3a]">no mesmo dia.</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-xl leading-relaxed">
              A Bag Envios é a operadora logística last mile dos e-commerces
              que não podem atrasar. Same day, next day e fracionado — com
              rastreio ao vivo, prova de entrega digital e SLA transparente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#contato"
                className="bg-[#e85d3a] px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_-5px_#e85d3a] transition-all inline-flex items-center justify-center gap-2 text-white uppercase tracking-wide"
              >
                Solicitar proposta <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#servicos"
                className="bg-[#1c1c1c] border border-[#333] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#242424] transition-all inline-flex items-center justify-center uppercase tracking-wide"
              >
                Ver serviços
              </a>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-gray-500">
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#e85d3a]" /> Integração via API</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#e85d3a]" /> SLA de 98%+</span>
              <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#e85d3a]" /> Faturamento mensal</span>
            </div>
          </div>

          {/* Tracking visual */}
          <div className="relative">
            <div className="aspect-[4/5] bg-[#161616] rounded-3xl overflow-hidden border border-[#2a2a2a] relative shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[#e85d3a]/10 via-transparent to-transparent" />

              {/* Map dots */}
              <div className="absolute inset-0 opacity-40" style={{
                backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }} />

              {/* Route line */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 500" preserveAspectRatio="none">
                <path d="M 50 400 Q 150 350, 200 250 T 350 80" stroke="#e85d3a" strokeWidth="2" fill="none" strokeDasharray="6 6" />
                <circle cx="50" cy="400" r="8" fill="#e85d3a" />
                <circle cx="350" cy="80" r="8" fill="#fff" />
              </svg>

              {/* Status pills */}
              <div className="absolute top-6 left-6 right-6 flex justify-between">
                <div className="bg-[#0f0f0f]/90 backdrop-blur border border-[#333] rounded-full px-3 py-1.5 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#e85d3a]" />
                  <span className="text-xs font-bold uppercase tracking-widest">Coleta · CD Guarulhos</span>
                </div>
              </div>

              {/* Tracking card */}
              <div className="absolute bottom-6 left-6 right-6 bg-[#0f0f0f]/95 backdrop-blur p-5 rounded-2xl border border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Pedido #BE-8241</span>
                  <span className="text-xs uppercase tracking-widest text-[#e85d3a] font-bold flex items-center gap-1.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-[#e85d3a] animate-pulse" /> A caminho
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { l: "Coletado no CD", t: "08:42", done: true },
                    { l: "Em rota de entrega", t: "10:15", done: true },
                    { l: "Entregue ao cliente", t: "chegando", done: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${s.done ? "bg-[#e85d3a]" : "bg-[#4a4a4a] animate-pulse"}`} />
                      <span className={`text-sm flex-1 ${s.done ? "text-white" : "text-gray-500"}`}>{s.l}</span>
                      <span className="text-xs text-gray-500 font-mono">{s.t}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#2a2a2a] flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-widest">Previsão</span>
                  <span className="text-lg text-[#e85d3a]" style={headingFont}>11h48</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-10 border-y border-[#242424] bg-[#141414]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: "2M+", l: "Entregas realizadas" },
            { v: "98,4%", l: "SLA no prazo" },
            { v: "120+", l: "Cidades atendidas" },
            { v: "24h", l: "Suporte operacional", accent: true },
          ].map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <p className={`text-4xl ${s.accent ? "text-[#e85d3a]" : "text-white"}`} style={headingFont}>
                {s.v}
              </p>
              <p className="text-[#9a9a9a] uppercase text-xs font-bold tracking-widest mt-1">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div className="max-w-xl">
              <span className="text-[#e85d3a] font-bold uppercase tracking-widest text-sm">Serviços</span>
              <h2 className="text-4xl md:text-5xl uppercase mt-2 leading-none" style={headingFont}>
                Modais para cada <span className="text-[#e85d3a]">urgência</span>
              </h2>
            </div>
            <p className="text-gray-400 max-w-md">
              Da coleta programada até a entrega same day, uma malha logística
              montada para acompanhar o ritmo do seu e-commerce.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                tag: "Same Day",
                title: "Entrega no mesmo dia",
                desc: "Coleta até 11h, entrega até 20h na mesma cidade. Ideal para marketplaces e food/pharma.",
              },
              {
                icon: Truck,
                tag: "Next Day",
                title: "D+1 metropolitano",
                desc: "Coleta programada e entrega no próximo dia útil em toda a região metropolitana.",
              },
              {
                icon: Package,
                tag: "Fracionado",
                title: "Encomendas fracionadas",
                desc: "Envios de até 30kg para todo o Brasil, com consolidação no CD e prazos competitivos.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-8 rounded-3xl bg-[#161616] border border-[#2a2a2a] hover:border-[#e85d3a]/60 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-[#e85d3a] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-2xl">
                  {f.tag}
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#242424] flex items-center justify-center mb-6 group-hover:bg-[#e85d3a] transition-colors">
                  <f.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-xl uppercase mb-3" style={headingFont}>{f.title}</h3>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cobertura + Tecnologia */}
      <section id="cobertura" className="py-24 px-6 bg-[#141414]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[#e85d3a] font-bold uppercase tracking-widest text-sm">Cobertura</span>
            <h2 className="text-4xl md:text-5xl uppercase mt-2 leading-tight" style={headingFont}>
              Uma malha que cobre <span className="text-[#e85d3a]">o Brasil</span>
            </h2>
            <p className="text-gray-400 text-lg mt-6 mb-8">
              Operamos com CDs próprios em São Paulo, Rio, Minas e Sul, e uma rede
              de mais de 15 mil entregadores PJ homologados atendendo capitais e
              regiões metropolitanas do país inteiro.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { r: "Sudeste", c: "SP · RJ · MG · ES" },
                { r: "Sul", c: "PR · SC · RS" },
                { r: "Nordeste", c: "BA · PE · CE · RN" },
                { r: "Centro-Oeste", c: "DF · GO · MT · MS" },
              ].map((r) => (
                <div key={r.r} className="p-5 rounded-2xl bg-[#0f0f0f] border border-[#242424]">
                  <p className="text-sm uppercase tracking-widest text-[#e85d3a] font-bold">{r.r}</p>
                  <p className="text-sm text-gray-400 mt-1">{r.c}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="tecnologia" className="space-y-4">
            {[
              {
                icon: MapPin,
                title: "Rastreio ao vivo",
                desc: "GPS a cada 15s durante rota. Seu cliente vê o entregador se aproximando em tempo real.",
              },
              {
                icon: ShieldCheck,
                title: "Prova de entrega digital",
                desc: "Foto, assinatura e geolocalização em cada entrega, com auditoria e exportação em Excel.",
              },
              {
                icon: BarChart3,
                title: "Dashboard operacional",
                desc: "Métricas de SLA, ocorrências, custo por entrega e produtividade da malha em tempo real.",
              },
              {
                icon: Building2,
                title: "Integração via API",
                desc: "Conecte seu ERP, WMS ou plataforma de e-commerce. Onboarding em até 48h.",
              },
            ].map((c) => (
              <div key={c.title} className="p-6 rounded-2xl bg-[#0f0f0f] border border-[#242424] flex gap-5 items-start hover:border-[#e85d3a]/40 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-[#e85d3a]/10 border border-[#e85d3a]/30 flex items-center justify-center shrink-0">
                  <c.icon className="w-5 h-5 text-[#e85d3a]" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="uppercase mb-1" style={headingFont}>{c.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#e85d3a] font-bold uppercase tracking-widest text-sm">Como funciona</span>
            <h2 className="text-4xl md:text-5xl uppercase mt-2" style={headingFont}>
              Do CD ao <span className="text-[#e85d3a]">porta a porta</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {[
              { n: "01", t: "Coleta", d: "Retiramos no seu CD ou você despacha no nosso." },
              { n: "02", t: "Triagem", d: "Bipagem, roteirização inteligente e formação de rotas." },
              { n: "03", t: "Última milha", d: "Entregadores PJ homologados fazem o porta a porta." },
              { n: "04", t: "Prova digital", d: "Foto, assinatura e GPS registrados em cada entrega." },
            ].map((s) => (
              <div key={s.n} className="relative p-8 rounded-3xl bg-[#161616] border border-[#2a2a2a]">
                <span className="text-5xl text-[#e85d3a]/30 absolute top-4 right-6" style={headingFont}>
                  {s.n}
                </span>
                <h3 className="text-xl uppercase mb-3 relative" style={headingFont}>{s.t}</h3>
                <p className="text-gray-400 text-sm relative">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Entregador */}
      <section id="entregador" className="py-24 px-6 bg-gradient-to-b from-[#141414] to-[#0f0f0f]">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e85d3a]/10 border border-[#e85d3a]/30 text-sm">
            <Truck className="w-4 h-4 text-[#e85d3a]" />
            <span className="text-[#e85d3a] font-bold uppercase tracking-widest text-xs">Rede de entregadores</span>
          </div>
          <h2 className="text-4xl md:text-5xl uppercase leading-tight" style={headingFont}>
            É entregador PJ? <span className="text-[#e85d3a]">Rode com a gente.</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Rotas todos os dias, pagamento via PIX e score que abre as melhores
            ofertas. Cadastre-se em minutos e comece a receber rotas na sua região.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <Link
              to="/auth"
              className="bg-[#e85d3a] px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_-5px_#e85d3a] transition-all inline-flex items-center justify-center gap-2 text-white uppercase tracking-wide"
            >
              Cadastrar como entregador <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA / Contato */}
      <section id="contato" className="py-24 px-6">
        <div className="max-w-6xl mx-auto bg-[#161616] border border-[#2a2a2a] rounded-[3rem] p-12 md:p-16 relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#e85d3a]/20 rounded-full blur-3xl" />
          <div className="grid md:grid-cols-2 gap-12 items-center relative">
            <div className="space-y-6">
              <span className="text-[#e85d3a] font-bold uppercase tracking-widest text-sm">Vamos operar juntos</span>
              <h2 className="text-4xl md:text-5xl uppercase leading-tight" style={headingFont}>
                Pronto para escalar sua <span className="text-[#e85d3a]">operação</span>?
              </h2>
              <p className="text-gray-400 text-lg">
                Fale com nosso time comercial e receba uma proposta customizada
                para o volume e as regiões do seu negócio.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-gray-300">
                  <PhoneCall className="w-5 h-5 text-[#e85d3a]" />
                  <span>0800 000 0000 · seg a sex, 8h-20h</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Clock className="w-5 h-5 text-[#e85d3a]" />
                  <span>Onboarding em até 48h úteis</span>
                </div>
              </div>
            </div>
            <div className="bg-[#0f0f0f] border border-[#242424] rounded-3xl p-8 space-y-4">
              <h3 className="uppercase text-lg" style={headingFont}>Solicitar proposta</h3>
              <input placeholder="Nome da empresa" className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm focus:border-[#e85d3a] outline-none" />
              <input placeholder="E-mail corporativo" className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm focus:border-[#e85d3a] outline-none" />
              <input placeholder="Volume mensal (envios)" className="w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm focus:border-[#e85d3a] outline-none" />
              <button className="w-full bg-[#e85d3a] hover:bg-[#cf4d2d] transition-all text-white font-bold py-3 rounded-xl uppercase tracking-wide">
                Quero uma proposta
              </button>
              <p className="text-xs text-gray-500 text-center">
                Retornamos em até 1 dia útil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#242424] bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#e85d3a] rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sm tracking-tight" style={headingFont}>
                BAG<span className="text-[#e85d3a]"> ENVIOS</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Logística last mile para e-commerces que não podem atrasar.
            </p>
          </div>
          {[
            { t: "Serviços", l: ["Same Day", "Next Day", "Fracionado", "Logística reversa"] },
            { t: "Empresa", l: ["Sobre", "Cobertura", "Carreiras", "Blog"] },
            { t: "Suporte", l: ["Central de ajuda", "Rastrear pedido", "Termos", "Privacidade"] },
          ].map((c) => (
            <div key={c.t}>
              <p className="text-xs font-bold uppercase tracking-widest text-[#e85d3a] mb-3">{c.t}</p>
              <ul className="space-y-2">
                {c.l.map((i) => (
                  <li key={i}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{i}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-[#242424] flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-gray-500 uppercase tracking-widest" style={headingFont}>
            BAG ENVIOS © 2026 · CNPJ 00.000.000/0001-00
          </span>
          <span className="text-xs text-gray-500">
            Feito com precisão para o último quilômetro.
          </span>
        </div>
      </footer>
    </div>
  );
}
