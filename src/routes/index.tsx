import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Truck,
  Wallet,
  Map as MapIcon,
  ShieldCheck,
  Check,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TuEntrega — Ganhe dinheiro extra fazendo entregas" },
      {
        name: "description",
        content:
          "Aceite rotas perto de você, trabalhe no seu tempo e receba via PIX. Empresas encontram entregadores PJ e organizam toda a operação.",
      },
      { property: "og:title", content: "TuEntrega — Ganhe dinheiro extra fazendo entregas" },
      {
        property: "og:description",
        content:
          "Plataforma para entregadores ganharem dinheiro extra e empresas organizarem a operação com entregadores PJ.",
      },
    ],
  }),
  component: Landing,
});

const headingFont = { fontFamily: "'Archivo Black', sans-serif" };
const bodyFont = { fontFamily: "'Hind', sans-serif" };

function Landing() {
  return (
    <div className="bg-[#1a1a1a] text-white selection:bg-[#e85d3a]/30" style={bodyFont}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-[#2d2d2d]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#e85d3a] rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl tracking-tighter" style={headingFont}>
              TU<span className="text-[#e85d3a]">ENTREGA</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-wider">
            <a href="#entregadores" className="hover:text-[#e85d3a] transition-colors">
              Entregadores
            </a>
            <a href="#empresas" className="hover:text-[#e85d3a] transition-colors">
              Empresas
            </a>
            <Link to="/auth" className="hover:text-[#e85d3a] transition-colors">
              Entrar
            </Link>
            <Link
              to="/auth"
              className="bg-[#e85d3a] px-6 py-2.5 rounded-full font-bold hover:bg-[#cf4d2d] transition-all text-white"
            >
              Cadastrar
            </Link>
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2d2d2d] border border-[#4a4a4a] text-sm">
              <span className="flex h-2 w-2 rounded-full bg-[#e85d3a] animate-pulse" />
              <span className="text-[#e85d3a] font-semibold">Vagas abertas em todo Brasil</span>
            </div>
            <h1
              className="text-5xl md:text-7xl leading-[1.05] tracking-tight uppercase"
              style={headingFont}
            >
              Ganhe <span className="text-[#e85d3a]">dinheiro extra</span> fazendo entregas.
            </h1>
            <p className="text-xl text-gray-400 max-w-xl">
              Aceite rotas perto de você, trabalhe no seu tempo e receba via PIX conforme o
              SLA da empresa. Empresas encontram entregadores PJ em minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/auth"
                className="bg-[#e85d3a] px-8 py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_-5px_#e85d3a] transition-all inline-flex items-center justify-center gap-2 text-white"
              >
                Quero ser entregador <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#empresas"
                className="bg-[#2d2d2d] border border-[#4a4a4a] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#4a4a4a] transition-all inline-flex items-center justify-center"
              >
                Sou empresa
              </a>
            </div>
          </div>

          {/* Hero card */}
          <div className="relative">
            <div className="aspect-square bg-[#2d2d2d] rounded-3xl overflow-hidden border border-[#4a4a4a] relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#e85d3a]/20 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
                <MapIcon className="w-52 h-52 text-[#e85d3a]" strokeWidth={0.5} />
              </div>

              <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a]/80 border border-[#4a4a4a] backdrop-blur">
                  <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Nova oferta · 1,2 km
                  </span>
                </div>
              </div>

              <div className="absolute bottom-8 left-8 right-8 bg-[#1a1a1a]/95 p-6 rounded-2xl border border-[#4a4a4a] backdrop-blur">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-[#9a9a9a] uppercase font-bold tracking-widest mb-1">
                      Ganhos da semana
                    </p>
                    <p className="text-3xl text-[#e85d3a]" style={headingFont}>
                      R$ 1.240,00
                    </p>
                    <p className="text-xs text-gray-500 mt-1">via PIX · 18 rotas</p>
                  </div>
                  <div className="h-14 w-24 flex items-end gap-1">
                    <div className="flex-1 bg-[#4a4a4a] rounded-sm h-[40%]" />
                    <div className="flex-1 bg-[#4a4a4a] rounded-sm h-[60%]" />
                    <div className="flex-1 bg-[#e85d3a] rounded-sm h-[100%]" />
                    <div className="flex-1 bg-[#4a4a4a] rounded-sm h-[80%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-[#2d2d2d] bg-[#2d2d2d]/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: "+15k", l: "Entregadores PJ" },
            { v: "500+", l: "Pacotes/dia" },
            { v: "R$ 0", l: "Taxa de adesão" },
            { v: "PIX", l: "Pagamento conforme SLA", accent: true },
          ].map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <p
                className={`text-4xl ${s.accent ? "text-[#e85d3a]" : "text-white"}`}
                style={headingFont}
              >
                {s.v}
              </p>
              <p className="text-[#9a9a9a] uppercase text-xs font-bold tracking-widest mt-1">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features entregador */}
      <section id="entregadores" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div className="max-w-xl">
              <h2
                className="text-4xl md:text-5xl uppercase mb-4 leading-none"
                style={headingFont}
              >
                Tudo que você
                <br />
                precisa para <span className="text-[#e85d3a]">rodar</span>
              </h2>
              <p className="text-gray-400 text-lg">
                Ferramentas pensadas para quem está no trecho todos os dias.
              </p>
            </div>
            <Link
              to="/auth"
              className="text-[#e85d3a] font-bold border-b border-[#e85d3a] pb-1 hover:text-white hover:border-white transition-all"
            >
              Criar minha conta
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Wallet,
                title: "Pagamento via PIX",
                desc:
                  "Receba via PIX de acordo com o SLA de cada empresa. Você vê o prazo antes de aceitar a rota — sem surpresa.",
              },
              {
                icon: MapIcon,
                title: "Rotas perto de você",
                desc:
                  "Ofertas filtradas pela sua região para você rodar menos quilômetros e ganhar mais por hora.",
              },
              {
                icon: ShieldCheck,
                title: "Score que abre portas",
                desc:
                  "Boas entregas viram score. Score alto te dá acesso às melhores ofertas das empresas.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-8 rounded-3xl bg-[#2d2d2d] border border-[#4a4a4a] hover:border-[#e85d3a]/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4a4a4a] flex items-center justify-center mb-6 group-hover:bg-[#e85d3a] transition-colors">
                  <f.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-xl uppercase mb-3" style={headingFont}>
                  {f.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bloco empresas */}
      <section id="empresas" className="py-24 px-6 bg-[#2d2d2d]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 order-2 md:order-1 w-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 bg-[#1a1a1a] rounded-2xl flex flex-col items-center justify-center p-6 border border-[#4a4a4a]">
                <span className="text-3xl text-[#e85d3a]" style={headingFont}>
                  98%
                </span>
                <span className="text-xs uppercase tracking-widest text-[#9a9a9a] mt-1">
                  Entregas no prazo
                </span>
              </div>
              <div className="h-40 bg-[#e85d3a] rounded-2xl flex items-center justify-center p-6">
                <span
                  className="text-white text-lg text-center uppercase leading-tight"
                  style={headingFont}
                >
                  500+ rotas
                  <br />
                  por dia
                </span>
              </div>
              <div className="h-44 bg-[#1a1a1a] rounded-2xl col-span-2 border border-[#4a4a4a] overflow-hidden">
                <div className="p-4 flex gap-2 border-b border-[#4a4a4a]">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-3 text-xs text-[#9a9a9a] uppercase tracking-widest font-bold">
                    Operação · Hoje
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 bg-[#e85d3a] rounded-full w-5/6" />
                    <span className="text-xs text-[#9a9a9a]">Rota 01 · 87%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 bg-[#4a4a4a] rounded-full w-3/5" />
                    <span className="text-xs text-[#9a9a9a]">Rota 02 · 62%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 bg-[#4a4a4a] rounded-full w-2/5" />
                    <span className="text-xs text-[#9a9a9a]">Rota 03 · 40%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 bg-[#4a4a4a] rounded-full w-1/4" />
                    <span className="text-xs text-[#9a9a9a]">Rota 04 · 24%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl uppercase leading-tight" style={headingFont}>
              Para empresas:{" "}
              <span className="text-[#e85d3a]">logística sem caos</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Importe pacotes, divida rotas por bairro, encontre entregadores PJ na sua região
              e acompanhe cada entrega em tempo real.
            </p>
            <ul className="space-y-4">
              {[
                "Entregadores PJ disponíveis em minutos",
                "Painel de controle com rastreio ao vivo",
                "Pagamento via PIX direto pela plataforma",
                "Score de confiabilidade dos entregadores",
              ].map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="text-[#e85d3a] w-5 h-5" strokeWidth={3} />
                  <span className="font-semibold">{i}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-white text-[#1a1a1a] px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all uppercase"
            >
              Cadastrar empresa <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-gradient-to-b from-[#2d2d2d] to-transparent p-12 rounded-[3rem] border border-[#4a4a4a]">
          <h2
            className="text-4xl md:text-6xl uppercase tracking-tighter"
            style={headingFont}
          >
            Pronto para
            <br />
            <span className="text-[#e85d3a]">acelerar</span> com a gente?
          </h2>
          <p className="text-xl text-gray-400">
            Cadastro grátis. Comece a rodar ou publicar rotas em minutos.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/auth"
              className="bg-[#e85d3a] px-10 py-5 rounded-full font-bold text-xl shadow-[0_20px_40px_-10px_rgba(232,93,58,0.4)] hover:scale-105 transition-all text-white"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/auth"
              className="bg-[#2d2d2d] border border-[#4a4a4a] px-10 py-5 rounded-full font-bold text-xl hover:bg-[#4a4a4a] transition-all"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-[#2d2d2d]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#e85d3a] rounded flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm tracking-tighter" style={headingFont}>
              TUENTREGA © 2026
            </span>
          </div>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-[#9a9a9a]">
            <a href="#" className="hover:text-white transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Termos
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Suporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
