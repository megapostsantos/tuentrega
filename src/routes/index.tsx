import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Route as RouteIcon, Wallet, CalendarDays, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:opacity-90">
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Gestão de entregas em tempo real
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
              O <span className="text-primary">Uber das entregas</span><br />
              para sua empresa
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Importe pacotes em lote, publique rotas por bairro e pague entregadores PJ via PIX. Tudo em um só lugar.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:opacity-90 shadow-[var(--shadow-glow)]">
                <Link to="/auth">
                  Sou empresa <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/auth">Sou entregador</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Package, title: "TMS de pacotes", desc: "Importe em lote por bairro" },
              { icon: RouteIcon, title: "Rotas otimizadas", desc: "Planejador inteligente" },
              { icon: Wallet, title: "Pagamento PIX", desc: "Direto empresa → entregador" },
              { icon: CalendarDays, title: "Agenda semanal", desc: "Reserva de dias de trabalho" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-5 transition hover:shadow-[var(--shadow-glow)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-secondary text-secondary-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Para <span className="text-primary">empresas</span>
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-secondary-foreground/80">
                {["Importação de pacotes via Excel/CSV","Divisão automática por bairro","Pagamento PIX integrado","Controle de nota fiscal mensal","Acompanhamento em tempo real"].map((i) => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Para <span className="text-primary">entregadores</span>
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-secondary-foreground/80">
                {["Ofertas filtradas pela sua região","Aceite rotas e fretes avulsos","Planejador de rotas otimizado","Reserve dias na agenda","Recebimento direto via PIX"].map((i) => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Pronto para começar?</h2>
          <p className="mt-3 text-muted-foreground">Crie sua conta gratuita em menos de 1 minuto.</p>
          <Button asChild size="lg" className="mt-8 bg-primary text-primary-foreground hover:opacity-90 shadow-[var(--shadow-glow)]">
            <Link to="/auth">Criar conta <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} TuEntrega</p>
        </div>
      </footer>
    </div>
  );
}
