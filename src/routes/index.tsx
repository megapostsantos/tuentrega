import { createFileRoute, Link } from "@tanstack/react-router";
import {
  RotateCcw, MessageCircle, Phone, ArrowRight, ShieldCheck, Zap,
  Building2, Bike, ClipboardList, Users, Map as MapIcon, Camera, Wallet, Star, CalendarDays, Smartphone, CheckCircle2,
} from "lucide-react";
import { CONTATO_TELEFONE, CONTATO_TEL, whatsappLink } from "@/lib/contato";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TuEntrega — Sistema de gestão de entregas last mile" },
      {
        name: "description",
        content:
          "Plataforma de gestão de last mile para qualquer operação: empresas organizam rotas, parceiros e pagamentos; entregadores encontram ofertas de rota todos os dias.",
      },
      { property: "og:title", content: "TuEntrega — Gestão de last mile" },
      {
        property: "og:description",
        content: "Gerencie entregas last mile ou encontre ofertas de rota. Do pacote ao pagamento, em um só lugar.",
      },
    ],
  }),
  component: Landing,
});

const NAVY = "#0D1B2A";
const YELLOW = "#FFB700";
const heading = { fontFamily: "'Montserrat', system-ui, sans-serif", fontWeight: 900 };
const body = { fontFamily: "'Montserrat', system-ui, sans-serif" };

const wa = (t: string) => whatsappLink(t);

const RECURSOS = [
  { icon: ClipboardList, t: "Operação do dia em minutos", d: "Informe o total de pacotes e cole a lista de zonas. Cada zona vira uma rota pronta, com paradas opcionais." },
  { icon: Users, t: "Alocação de parceiros", d: "Escolha quem leva cada rota, cadastre parceiros por e-mail ou telefone e mantenha seu time organizado." },
  { icon: MapIcon, t: "Rotas ao vivo", d: "Veja no mapa quem está em movimento, quem parou e por onde cada entregador passou, com rastro e progresso." },
  { icon: Camera, t: "Baixa com prova", d: "Insucesso registrado com ID do pacote e foto do local ou do pacote. A empresa vê tudo e dá baixa nas devoluções." },
  { icon: RotateCcw, t: "Devoluções controladas", d: "A rota só fecha quando os pacotes devolvidos são conferidos. Extravio tem regra e responsável." },
  { icon: Wallet, t: "Financeiro e antecipação", d: "Ganhos por rota concluída, controle de pagamentos por PIX e antecipação quinzenal configurada pela empresa." },
  { icon: Star, t: "Nível de confiabilidade", d: "Pontuação por entregas, recusas tardias e extravios. Quem entrega bem ganha prioridade." },
  { icon: CalendarDays, t: "Agenda e previsão", d: "Avise o volume dos próximos dias e veja quem se comprometeu. Ajuste no dia conforme chegam os pacotes." },
  { icon: Smartphone, t: "Funciona no celular", d: "Instale como aplicativo, sem loja. Rota, mapa, foto e baixa na palma da mão." },
];

const PASSOS = [
  { n: "1", t: "Cadastre a operação", d: "Pacotes e zonas do dia, para hoje ou para amanhã." },
  { n: "2", t: "Escolha os parceiros", d: "Atribua cada rota a quem vai levar ou publique no mercado de ofertas." },
  { n: "3", t: "Acompanhe ao vivo", d: "Mapa, progresso por zona e ocorrências com foto." },
  { n: "4", t: "Feche e pague", d: "Confira devoluções, conclua as rotas e libere o pagamento." },
];

const FAQ = [
  { q: "Para quem é o TuEntrega?", a: "Para empresas e operadores de last mile que precisam organizar rotas, parceiros e pagamentos, e para entregadores que querem encontrar ofertas de rota com regras claras." },
  { q: "Serve para qual tipo de operação?", a: "Para qualquer empresa que entrega: marketplaces como Mercado Livre, Shopee e Shein, e-commerce próprio, lojas, distribuidoras e transportadoras. O fluxo é o mesmo: pacotes em zonas, rotas, insucessos, devoluções e pagamento." },
  { q: "O entregador precisa instalar algo?", a: "Pode usar direto no navegador ou instalar como aplicativo. A empresa também pode cadastrar um parceiro sem app e operar a rota por ele." },
  { q: "Como é feito o pagamento?", a: "A plataforma registra o valor de cada rota concluída e o que está a pagar. O PIX é feito entre empresa e entregador, e a antecipação quinzenal é opcional, definida pela empresa." },
  { q: "Quanto custa?", a: "Fale com a gente pelo WhatsApp e montamos uma proposta para o tamanho da sua operação." },
];

function CTA({ href, children, variant = "solid" }: { href: string; children: React.ReactNode; variant?: "solid" | "outline" }) {
  const cls = "inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm sm:text-base uppercase tracking-wide transition-transform hover:scale-[1.03]";
  const st = variant === "solid" ? { background: YELLOW, color: NAVY, ...heading } : { border: "2px solid rgba(255,255,255,.35)", color: "white", ...heading };
  return href.startsWith("/") ? (
    <Link to={href} className={cls} style={st}>{children}</Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={cls} style={st}>{children}</a>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-white text-[#0D1B2A]" style={body}>
      {/* NAV */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10" style={{ background: NAVY }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5">
          <a href="#top" className="flex items-center gap-2 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black" style={{ backgroundColor: YELLOW, color: NAVY }}>TE</div>
            <span className="text-sm tracking-tight sm:text-base" style={heading}>Tu<span style={{ color: YELLOW }}>Entrega</span></span>
          </a>
          <div className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            <a href="#empresas" className="hover:text-white">Para empresas</a>
            <a href="#entregadores" className="hover:text-white">Para entregadores</a>
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#operacoes" className="hover:text-white">Operações</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden items-center rounded-full border-2 border-white/30 px-4 py-2 text-sm text-white hover:border-white sm:inline-flex" style={heading}>Entrar</Link>
            <Link to="/auth" className="inline-flex items-center rounded-full px-4 py-2 text-sm" style={{ background: YELLOW, color: NAVY, ...heading }}>Criar conta</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header id="top" className="relative overflow-hidden pt-16" style={{ background: NAVY }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: YELLOW }} />
        <div className="mx-auto max-w-7xl px-5 py-16 sm:py-24">
          <span className="inline-block rounded-full px-3 py-1 text-xs uppercase tracking-widest" style={{ background: `${YELLOW}22`, color: YELLOW, ...heading }}>
            Gestão de last mile
          </span>
          <h1 className="mt-5 max-w-4xl text-4xl uppercase leading-[0.95] text-white sm:text-6xl md:text-7xl" style={heading}>
            Do pacote ao pagamento, <span style={{ color: YELLOW }}>tudo no mesmo sistema.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            A TuEntrega é a plataforma para quem opera entregas de última milha. Empresas organizam rotas, parceiros e pagamentos.
            Entregadores encontram ofertas de rota todos os dias.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTA href="/auth"><Building2 className="h-5 w-5" /> Sou empresa — criar conta</CTA>
            <CTA href="/auth" variant="outline"><Bike className="h-5 w-5" /> Sou entregador — ver ofertas</CTA>
          </div>
          <a href={wa("Olá! Quero conhecer a TuEntrega.")} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-white/80 underline-offset-4 hover:underline">
            <MessageCircle className="h-4 w-4" /> Prefere conversar? Fale pelo WhatsApp
          </a>
          <div className="mt-12 grid max-w-3xl grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center">
            {[{ v: "Minutos", l: "para montar a operação" }, { v: "Ao vivo", l: "mapa e progresso" }, { v: "100%", l: "baixa com prova" }].map((s) => (
              <div key={s.l}>
                <p className="text-xl sm:text-2xl" style={{ color: YELLOW, ...heading }}>{s.v}</p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-white/60">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* DOIS CAMINHOS */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <div id="empresas" className="scroll-mt-20 rounded-3xl border-2 p-7" style={{ borderColor: `${NAVY}15` }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${YELLOW}30` }}><Building2 className="h-6 w-6" /></div>
            <h2 className="mt-4 text-2xl uppercase sm:text-3xl" style={heading}>Para empresas de last mile</h2>
            <p className="mt-2 text-[#0D1B2A]/70">Quem recebe pacotes todo dia e precisa de controle: transportadoras, estações, pontos e operadores logísticos.</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {["Monte a operação do dia (ou do dia seguinte) e divida em zonas", "Aloque parceiros ou publique ofertas para o mercado", "Acompanhe rotas ao vivo, insucessos com foto e devoluções", "Controle pagamentos, antecipação e a confiabilidade da equipe"].map((i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#16a34a" }} />{i}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm uppercase" style={{ background: NAVY, color: "white", ...heading }}>Criar conta da empresa <ArrowRight className="h-4 w-4" /></Link>
              <a href={wa("Olá! Quero contratar a TuEntrega para minha empresa.")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 px-5 py-3 text-sm uppercase" style={{ borderColor: NAVY, ...heading }}>Falar com a equipe</a>
            </div>
          </div>

          <div id="entregadores" className="scroll-mt-20 rounded-3xl p-7 text-white" style={{ background: NAVY }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${YELLOW}25`, color: YELLOW }}><Bike className="h-6 w-6" /></div>
            <h2 className="mt-4 text-2xl uppercase sm:text-3xl" style={heading}>Para entregadores</h2>
            <p className="mt-2 text-white/70">Moto, carro, bike ou a pé: encontre rotas disponíveis e trabalhe com regras claras.</p>
            <ul className="mt-5 space-y-2.5 text-sm text-white/90">
              {["Veja as ofertas de cada dia, com valor por pacote e zona", "Aceite a rota e siga o passo a passo no celular", "Registre insucessos com foto, sem burocracia", "Acompanhe seus ganhos e peça antecipação quando a empresa liberar", "Suba de nível: quem entrega bem recebe mais oportunidades"].map((i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: YELLOW }} />{i}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTA href="/auth">Quero ver as ofertas <ArrowRight className="h-4 w-4" /></CTA>
              <CTA href={wa("Olá! Quero ser entregador da TuEntrega.")} variant="outline">Tirar dúvidas</CTA>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="scroll-mt-16 bg-[#F6F7F9] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5">
          <span className="text-sm uppercase tracking-widest text-[#0D1B2A]/60" style={heading}>O que o sistema faz</span>
          <h2 className="mt-2 max-w-3xl text-3xl uppercase sm:text-5xl" style={heading}>Tudo que a operação precisa, <span className="underline decoration-4 underline-offset-4" style={{ textDecorationColor: YELLOW }}>sem planilha.</span></h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((r) => (
              <div key={r.t} className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${YELLOW}30` }}><r.icon className="h-5 w-5" /></div>
                <h3 className="text-base uppercase" style={heading}>{r.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#0D1B2A]/65">{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-16 text-white sm:py-24" style={{ background: NAVY }}>
        <div className="mx-auto max-w-7xl px-5">
          <span className="text-sm uppercase tracking-widest" style={{ color: YELLOW, ...heading }}>Como funciona</span>
          <h2 className="mt-2 text-3xl uppercase sm:text-5xl" style={heading}>Quatro passos por dia</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((p) => (
              <div key={p.n} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <span className="text-4xl" style={{ color: YELLOW, ...heading }}>{p.n}</span>
                <h3 className="mt-2 text-lg uppercase" style={heading}>{p.t}</h3>
                <p className="mt-1 text-sm text-white/65">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUALQUER OPERAÇÃO */}
      <section id="operacoes" className="scroll-mt-16 mx-auto max-w-7xl px-5 py-16 sm:py-24">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <span className="inline-block rounded-full px-3 py-1 text-xs uppercase tracking-widest" style={{ background: `${YELLOW}30`, ...heading }}>Para qualquer operação</span>
            <h2 className="text-3xl uppercase sm:text-5xl" style={heading}>Mercado Livre, Shopee, Shein ou a sua própria loja</h2>
            <p className="text-[#0D1B2A]/70">
              Não importa de onde vêm os pacotes. Se a sua empresa entrega, o TuEntrega organiza as rotas, os parceiros e o
              pagamento. Marketplaces, e-commerce próprio, lojas, distribuidoras e transportadoras usam o mesmo fluxo.
            </p>
            <ul className="space-y-2 text-sm">
              {["Pacotes do dia organizados em zonas e rotas", "Insucesso com foto, devolução conferida e extravio com regra", "Parceiros com histórico e nível de confiabilidade"].map((i) => (
                <li key={i} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{i}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl p-7 text-white" style={{ background: NAVY }}>
            <h3 className="text-xl uppercase" style={heading}>Funciona com a sua <span style={{ color: YELLOW }}>operação</span></h3>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Mercado Livre", "Shopee", "Shein", "Amazon", "E-commerce próprio", "Lojas e varejo", "Distribuidoras", "Transportadoras", "Farmácias", "Restaurantes e delivery"].map((t) => (
                <span key={t} className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/90">{t}</span>
              ))}
            </div>
            <p className="mt-5 text-sm text-white/65">Tem outro tipo de entrega? Conte como funciona e montamos junto.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTA href={wa("Olá! Quero saber se a TuEntrega serve para a minha operação.")}><MessageCircle className="h-4 w-4" /> Falar no WhatsApp</CTA>
              <a href={CONTATO_TEL} className="inline-flex items-center gap-2 px-3 py-3 text-sm text-white/80 hover:text-white"><Phone className="h-4 w-4" style={{ color: YELLOW }} />{CONTATO_TELEFONE}</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#F6F7F9] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-3xl uppercase sm:text-4xl" style={heading}>Perguntas frequentes</h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
                <summary className="cursor-pointer list-none text-base font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-[#0D1B2A]/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 text-center text-white sm:py-20" style={{ background: NAVY }}>
        <div className="mx-auto max-w-3xl px-5">
          <Zap className="mx-auto h-8 w-8" style={{ color: YELLOW }} />
          <h2 className="mt-3 text-3xl uppercase sm:text-5xl" style={heading}>Comece hoje a operar com <span style={{ color: YELLOW }}>controle</span></h2>
          <p className="mt-3 text-white/70">Crie sua conta em poucos minutos ou fale com a gente.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <CTA href="/auth">Criar conta grátis <ArrowRight className="h-4 w-4" /></CTA>
            <CTA href={wa("Olá! Quero conhecer a TuEntrega.")} variant="outline"><MessageCircle className="h-4 w-4" /> WhatsApp {CONTATO_TELEFONE}</CTA>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10" style={{ background: "#08121d" }}>
        <div className="mx-auto grid max-w-7xl items-center gap-6 md:grid-cols-3">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black" style={{ backgroundColor: YELLOW, color: NAVY }}>TE</div>
            <span className="text-sm text-white" style={heading}>Tu<span style={{ color: YELLOW }}>Entrega</span></span>
          </div>
          <p className="text-center text-xs uppercase tracking-[0.25em]" style={{ color: YELLOW, ...heading }}>Gestão de last mile</p>
          <div className="flex items-center justify-center gap-4 text-sm text-white/70 md:justify-end">
            <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] leading-relaxed text-white/40">
          © {new Date().getFullYear()} TuEntrega. Mercado Livre, Shopee, Shein e Amazon são marcas de seus respectivos titulares; a TuEntrega é uma plataforma independente de gestão, sem vínculo com essas empresas.
        </p>
      </footer>
    </div>
  );
}
