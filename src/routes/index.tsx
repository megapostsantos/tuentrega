import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package, Store, Wallet, Star, CalendarDays, Map as MapIcon,
  ArrowRight, Check, TrendingUp, ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
      meta: [
        { title: "TuEntrega — Ganhe dinheiro extra fazendo entregas" },
        { name: "description", content: "Aceite rotas próximas, faça entregas no seu tempo e receba via PIX. Empresas encontram entregadores PJ e organizam toda a operação em um só lugar." },
        { property: "og:title", content: "TuEntrega — Ganhe dinheiro extra fazendo entregas" },
        { property: "og:description", content: "Aceite rotas próximas, faça entregas no seu tempo e receba via PIX. Empresas encontram entregadores PJ e organizam toda a operação." },
      ],
  }),
  component: Landing,
});

const features = [
  { icon: Wallet, title: "Receba via PIX na hora", desc: "Sem espera, sem burocracia. O dinheiro cai direto na sua conta ao fechar a rota." },
  { icon: MapIcon, title: "Rotas perto de você", desc: "Ofertas filtradas pela sua região para você rodar menos e ganhar mais." },
  { icon: CalendarDays, title: "Você escolhe quando", desc: "Aceite as rotas nos dias e horários que cabem na sua agenda." },
  { icon: Store, title: "Encontre entregadores PJ", desc: "Empresas publicam ofertas e os entregadores certos aceitam em segundos." },
  { icon: Package, title: "Organize sua operação", desc: "Importe pacotes, divida por bairro e distribua rotas sem planilha." },
  { icon: Star, title: "Score de confiabilidade", desc: "Bons entregadores ganham mais ofertas. Boas empresas atraem os melhores." },
];

const empresaItems = [
  "Encontre entregadores PJ disponíveis na sua região",
  "Importe pacotes e divida rotas em minutos",
  "Acompanhe cada entrega em tempo real",
  "Pague via PIX direto pela plataforma",
  "Controle financeiro e nota fiscal mensal",
];

const entregadorItems = [
  "Ganhe um dinheiro extra fazendo entregas",
  "Trabalhe quando e onde quiser",
  "Receba via PIX assim que terminar a rota",
  "Aceite rotas próximas com poucos cliques",
  "Construa reputação e ganhe mais ofertas",
];

const plans = [
  { name: "Free", price: "R$ 0", tag: "Para experimentar", items: ["50 pacotes/mês", "1 operação/dia", "Suporte por e-mail"] },
  { name: "Starter", price: "R$ 89", tag: "Pequenas operações", items: ["500 pacotes/mês", "3 rotas/dia", "PIX integrado"] },
  { name: "Pro", price: "R$ 249", tag: "Recomendado", featured: true, items: ["2.000 pacotes/mês", "Rotas ilimitadas", "Score de confiabilidade", "Suporte prioritário"] },
  { name: "Enterprise", price: "Consultar", tag: "Operações grandes", items: ["Pacotes ilimitados", "SLA dedicado", "Integrações", "Onboarding assistido"] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/15">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild size="sm" className="text-muted-foreground hover:text-primary">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 elev-1">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Plataforma para entregas Last Mile
                </span>
              </div>
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight lg:text-7xl">
                Gerencie entregas como um <span className="text-primary">profissional</span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                Conecte sua empresa com entregadores PJ. Distribua rotas, pague via PIX e acompanhe tudo em tempo real.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="h-13 rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-xl shadow-primary/20 hover:-translate-y-0.5 hover:bg-primary/90 transition-transform">
                  <Link to="/auth">Sou empresa <ArrowRight className="ml-1 h-5 w-5" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-13 rounded-xl border-2 border-border bg-card px-8 font-bold text-foreground hover:bg-secondary">
                  <Link to="/auth">Sou entregador</Link>
                </Button>
              </div>
            </div>

            {/* Hero mock */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-primary/15 blur-3xl" />
              <div className="relative rounded-3xl border border-border bg-card p-6 elev-3">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <span className="font-bold">Painel de Controle</span>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="rounded-2xl border border-primary/15 bg-primary/8 p-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="label-caps text-primary">Operação ativa</p>
                        <p className="mt-1 text-3xl font-extrabold">190 pacotes</p>
                        <p className="mt-1 text-sm text-muted-foreground">3 rotas · 111 paradas</p>
                      </div>
                      <div className="flex h-12 w-24 items-end gap-1 rounded-lg bg-card p-1.5">
                        <div className="h-[40%] flex-1 rounded-sm bg-primary/30" />
                        <div className="h-[65%] flex-1 rounded-sm bg-primary/50" />
                        <div className="h-[85%] flex-1 rounded-sm bg-primary/70" />
                        <div className="h-[70%] flex-1 rounded-sm bg-primary" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                      <p className="label-caps text-muted-foreground">Em rota</p>
                      <p className="mt-1 text-2xl font-bold">2</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                      <p className="label-caps text-muted-foreground">A pagar</p>
                      <p className="mt-1 text-2xl font-bold">R$ 342</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                      <p className="label-caps text-muted-foreground">Ofertas</p>
                      <p className="mt-1 text-2xl font-bold">3</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/50 p-4">
                      <p className="label-caps text-muted-foreground">Score</p>
                      <p className="mt-1 text-2xl font-bold">120</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="mx-auto max-w-5xl px-6 pb-16">
          <div className="grid grid-cols-3 divide-x divide-border rounded-3xl border border-border bg-card elev-1">
            {[
              { v: "325+", l: "Entregadores", accent: false },
              { v: "500+", l: "Pacotes/dia", accent: false },
              { v: "98%", l: "Taxa sucesso", accent: true },
            ].map((s) => (
              <div key={s.l} className="p-8 text-center">
                <p className={`text-4xl font-extrabold ${s.accent ? "text-primary" : ""}`}>{s.v}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">Tudo que você precisa</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Gestão completa para operadores de logística urbana, do carregamento ao pagamento final.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* EMPRESAS — zigzag */}
        <section className="bg-card py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="aspect-[5/4] overflow-hidden rounded-3xl border-8 border-card bg-[image:var(--gradient-primary)] elev-3">
                <div className="flex h-full w-full items-center justify-center text-primary-foreground/20">
                  <Package className="h-40 w-40" strokeWidth={1.2} />
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-2xl border border-border bg-background p-5 elev-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="label-caps text-muted-foreground">Eficiência</p>
                    <p className="text-base font-bold">+45% produtividade</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="label-caps mb-3 text-primary">Para empresas</p>
              <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Sua operação rodando <span className="text-primary">no automático</span>
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                Tudo o que você precisa para escalar sem perder controle ou margem.
              </p>
              <ul className="mt-8 space-y-4">
                {empresaItems.map((i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span className="font-medium">{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ENTREGADORES — zigzag invertido */}
        <section className="bg-secondary py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
            <div>
              <p className="label-caps mb-3 text-primary">Para entregadores</p>
              <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Trabalhe quando quiser, <span className="text-primary">receba na hora</span>
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                Aceite rotas próximas de você e tenha controle total da sua agenda.
              </p>
              <ul className="mt-8 space-y-4">
                {entregadorItems.map((i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span className="font-medium">{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-2 rounded-[2rem] bg-[image:var(--gradient-primary)] opacity-15 blur-2xl" />
              <div className="relative rounded-3xl border border-border bg-card p-4 elev-3">
                <div className="relative overflow-hidden rounded-2xl bg-foreground p-7 text-background">
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
                  <p className="label-caps relative text-primary">Carteira digital</p>
                  <p className="relative mt-2 text-4xl font-extrabold">R$ 1.250,00</p>
                  <div className="relative mt-10 flex items-center justify-between">
                    <span className="text-xs text-background/60">Saldo disponível</span>
                    <button className="rounded-full bg-background px-4 py-2 text-xs font-bold text-foreground">
                      Sacar PIX
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-3">
                    <p className="label-caps text-muted-foreground">Rotas hoje</p>
                    <p className="text-lg font-bold">3</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="label-caps text-muted-foreground">Score</p>
                    <p className="text-lg font-bold">Diamond</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Quem já usa o TuEntrega</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: "Logística Santos", city: "São Paulo, SP", quote: "Reduzimos o tempo de distribuição de rotas em 70%. Os entregadores aceitam em segundos." },
              { name: "Flex Express", city: "Campinas, SP", quote: "A transparência nos pagamentos via PIX trouxe muito mais segurança para nossa frota PJ.", featured: true },
              { name: "Rapidão MEI", city: "Rio de Janeiro, RJ", quote: "Melhor TMS do mercado para quem trabalha com volume pesado de entregas." },
            ].map((t, i) => (
              <div
                key={t.name}
                className={`relative rounded-2xl border bg-card p-8 ${
                  t.featured ? "border-primary/30 elev-2" : "border-border elev-1"
                }`}
              >
                {t.featured && (
                  <span className="absolute -top-3 right-8 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Destaque
                  </span>
                )}
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    U{i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.city}</p>
                  </div>
                </div>
                <p className="leading-relaxed text-muted-foreground">"{t.quote}"</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING — dark band */}
        <section className="mx-4 mb-24 rounded-[2.5rem] bg-foreground py-20 text-background md:mx-6">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">Planos simples</h2>
            <p className="mx-auto mt-4 max-w-md text-background/60">Escolha o plano que cabe na sua operação.</p>

            <div className="mt-14 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`relative rounded-2xl p-7 transition-all ${
                    p.featured
                      ? "scale-[1.03] border-2 border-primary bg-background text-foreground shadow-2xl shadow-primary/20"
                      : "border border-background/15 bg-background/5 hover:border-background/30"
                  }`}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      {p.tag}
                    </span>
                  )}
                  <p className={`label-caps ${p.featured ? "text-primary" : "text-background/50"}`}>
                    {p.name}
                  </p>
                  <p className="mt-3 text-3xl font-extrabold">{p.price}</p>
                  <p className={`mt-1 text-xs ${p.featured ? "text-muted-foreground" : "text-background/50"}`}>
                    {p.featured ? "Por mês" : p.tag}
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {p.items.map((it) => (
                      <li key={it} className="flex items-start gap-2">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.featured ? "text-primary" : "text-success"}`} strokeWidth={3} />
                        <span className={p.featured ? "text-foreground" : "text-background/80"}>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={`mt-8 w-full rounded-xl font-bold ${
                      p.featured
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-background/20 bg-transparent text-background hover:bg-background/10"
                    }`}
                  >
                    <Link to="/auth">{p.featured ? "Assinar Pro" : p.name === "Enterprise" ? "Falar com vendas" : "Começar"}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
          <div className="rounded-[3rem] border border-primary/15 bg-primary/5 p-12 md:p-16">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">Comece grátis hoje</h2>
            <p className="mt-4 text-muted-foreground">14 dias grátis, sem cartão de crédito.</p>
            <Button asChild size="lg" className="mt-8 h-14 rounded-full bg-primary px-10 font-bold text-primary-foreground shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
              <Link to="/auth">Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-muted-foreground md:flex-row">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <Logo />
            <p className="text-xs">Gestão de entregas em tempo real</p>
          </div>
          <div className="flex gap-6 text-xs font-semibold">
            <a href="#" className="hover:text-primary">Termos</a>
            <a href="#" className="hover:text-primary">Privacidade</a>
            <a href="#" className="hover:text-primary">Contato</a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} TuEntrega</p>
        </div>
      </footer>
    </div>
  );
}
