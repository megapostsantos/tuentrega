import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package, Store, Wallet, Star, CalendarDays, Map as MapIcon, ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: Package, title: "TMS de Pacotes", desc: "Importe, audite e distribua pacotes em segundos." },
  { icon: Store, title: "Marketplace", desc: "Encontre entregadores PJ disponíveis na sua região." },
  { icon: Wallet, title: "Pagamento PIX", desc: "Pague entregadores direto pela plataforma." },
  { icon: Star, title: "Score de Confiabilidade", desc: "Saiba quais entregadores são mais confiáveis." },
  { icon: CalendarDays, title: "Agenda Semanal", desc: "Planeje a semana com previsibilidade." },
  { icon: MapIcon, title: "Planejador de Rotas", desc: "Rotas otimizadas para mais entregas." },
];

const plans = [
  { name: "Free", price: "R$ 0", tag: "Para experimentar", items: ["50 pacotes/mês", "1 operação/dia", "Suporte por e-mail"] },
  { name: "Starter", price: "R$ 89", tag: "Pequenas operações", items: ["500 pacotes/mês", "3 rotas/dia", "PIX integrado"] },
  { name: "Pro", price: "R$ 249", tag: "Recomendado", featured: true, items: ["2.000 pacotes/mês", "Rotas ilimitadas", "Score de confiabilidade", "Suporte prioritário"] },
  { name: "Enterprise", price: "Sob consulta", tag: "Operações grandes", items: ["Pacotes ilimitados", "SLA dedicado", "Integrações", "Onboarding assistido"] },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur elev-1">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 elev-1">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-10 md:pt-20 md:pb-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Plataforma para Mercado Livre Flex
              </span>
              <h1 className="mt-5 text-[34px] font-bold leading-tight tracking-tight md:text-[56px]">
                Gerencie entregas <br />
                como um <span className="text-primary">profissional</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
                Conecte sua empresa com entregadores PJ. Distribua rotas, pague via PIX
                e acompanhe tudo em tempo real.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-13 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 elev-2">
                  <Link to="/auth">
                    Sou empresa <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-13 rounded-xl border-2 border-primary text-primary hover:bg-primary/10">
                  <Link to="/auth">Sou entregador</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] w-full rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 elev-3">
                <div className="grid h-full gap-3 rounded-2xl bg-card p-4 elev-2">
                  <div className="rounded-xl bg-primary/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Operação ativa</p>
                    <p className="mt-1 text-2xl font-bold">190 pacotes</p>
                    <p className="text-xs text-muted-foreground">3 rotas · 111 paradas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3"><p className="text-[10px] uppercase text-muted-foreground">Em rota</p><p className="text-xl font-bold">2</p></div>
                    <div className="rounded-xl border p-3"><p className="text-[10px] uppercase text-muted-foreground">A pagar</p><p className="text-xl font-bold">R$ 342</p></div>
                    <div className="rounded-xl border p-3"><p className="text-[10px] uppercase text-muted-foreground">Ofertas</p><p className="text-xl font-bold">3</p></div>
                    <div className="rounded-xl border p-3"><p className="text-[10px] uppercase text-muted-foreground">Score</p><p className="text-xl font-bold">120</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="mx-auto max-w-6xl px-4">
          <div className="rounded-2xl bg-primary/10 px-6 py-6 elev-1">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { v: "325+", l: "Entregadores" },
                { v: "500+", l: "Pacotes/dia" },
                { v: "98%", l: "Taxa sucesso" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl font-bold text-primary md:text-3xl">{s.v}</p>
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-[28px] font-bold tracking-tight md:text-[36px]">
            Tudo que você precisa
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 elev-1 transition hover:elev-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOR COMPANIES */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <h2 className="text-[28px] font-bold tracking-tight md:text-[36px]">Para empresas</h2>
              <p className="mt-3 text-primary-foreground/80">Tudo para sua operação rodar no automático.</p>
            </div>
            <ul className="space-y-3 text-sm">
              {["Importação de pacotes via Excel/CSV","Divisão automática por bairro","Pagamento PIX integrado","Controle de nota fiscal mensal","Acompanhamento em tempo real"].map((i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />{i}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FOR DELIVERERS */}
        <section className="mx-auto max-w-6xl grid gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight md:text-[36px]">
              Para <span className="text-primary">entregadores</span>
            </h2>
            <p className="mt-3 text-muted-foreground">Trabalhe quando quiser e receba na hora.</p>
          </div>
          <ul className="space-y-3 text-sm">
            {["Ofertas filtradas pela sua região","Aceite rotas e fretes avulsos","Planejador de rotas otimizado","Reserve dias na agenda","Recebimento direto via PIX"].map((i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{i}
              </li>
            ))}
          </ul>
        </section>

        {/* TESTIMONIALS */}
        <section className="bg-muted">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <h2 className="text-center text-[28px] font-bold tracking-tight md:text-[36px]">Quem já usa o TuEntrega</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[1,2,3].map((i) => (
                <div key={i} className="rounded-2xl bg-card p-6 elev-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">U{i}</div>
                    <div>
                      <p className="text-sm font-semibold">Operador Flex</p>
                      <p className="text-xs text-muted-foreground">São Paulo, SP</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    "Reduzimos o tempo de distribuição de rotas em 70%. Os entregadores aceitam em segundos."
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-[28px] font-bold tracking-tight md:text-[36px]">Planos simples</h2>
          <p className="mt-3 text-center text-muted-foreground">Escolha o plano que cabe na sua operação.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border bg-card p-6 elev-1 ${
                  p.featured ? "border-primary ring-2 ring-primary/30 elev-2" : "border-border"
                }`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Recomendado
                  </span>
                )}
                <p className="text-xs font-semibold uppercase text-muted-foreground">{p.name}</p>
                <p className="mt-2 text-2xl font-bold">{p.price}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.tag}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />{it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <h2 className="text-[28px] font-bold tracking-tight md:text-[36px]">Comece grátis hoje</h2>
          <p className="mt-3 text-muted-foreground">14 dias grátis, sem cartão de crédito.</p>
          <Button asChild size="lg" className="mt-8 h-13 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 elev-2">
            <Link to="/auth">Criar conta grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <Logo />
            <p className="text-xs">Gestão de entregas em tempo real</p>
          </div>
          <div className="flex gap-5 text-xs">
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Contato</a>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} TuEntrega</p>
        </div>
      </footer>
    </div>
  );
}
