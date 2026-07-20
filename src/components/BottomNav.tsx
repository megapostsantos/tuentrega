import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, Package, Store, Wallet, User, Map, CalendarDays, Building2, Users,
  BarChart3, UserCog, TrendingUp, MoreHorizontal, Truck, FileText, ClipboardList,
} from "lucide-react";
import type { AppRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type Item = { label: string; to: string; icon: typeof Home };

const empresaMain: Item[] = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Pacotes", to: "/pacotes", icon: Package },
  { label: "Ofertas", to: "/ofertas", icon: Store },
  { label: "NEX", to: "/nex/saidas", icon: Truck },
];

const empresaMore: { label: string; to: string; icon: typeof Home; hint?: string }[] = [
  { label: "Pagamentos PIX", to: "/pagamentos", icon: Wallet, hint: "Fechamento e repasses" },
  { label: "Financeiro", to: "/financeiro", icon: TrendingUp, hint: "Receitas e despesas" },
  { label: "Notas fiscais", to: "/notas", icon: FileText, hint: "NFs emitidas" },
  { label: "Entregadores", to: "/entregadores", icon: Users, hint: "Sua rede" },
  { label: "Agenda", to: "/agenda", icon: CalendarDays, hint: "Semana operacional" },
  { label: "Histórico NEX", to: "/nex/historico", icon: ClipboardList, hint: "Saídas anteriores" },
  { label: "Configurações", to: "/configuracoes", icon: User, hint: "Perfil e filiais" },
];

const entregador: Item[] = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Ofertas", to: "/ofertas", icon: Store },
  { label: "Rotas", to: "/rotas", icon: Map },
  { label: "Agenda", to: "/agenda", icon: CalendarDays },
  { label: "Perfil", to: "/configuracoes", icon: User },
];

const dispatcher: Item[] = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Pacotes", to: "/pacotes", icon: Package },
  { label: "Time", to: "/time", icon: UserCog },
  { label: "Agenda", to: "/agenda", icon: CalendarDays },
  { label: "Perfil", to: "/configuracoes", icon: User },
];

const admin: Item[] = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Empresas", to: "/empresas", icon: Building2 },
  { label: "Entreg.", to: "/entregadores", icon: Users },
  { label: "Métricas", to: "/metricas", icon: BarChart3 },
  { label: "Perfil", to: "/configuracoes", icon: User },
];

export function BottomNav({ role }: { role: AppRole | null }) {
  const current = useRouterState({ select: (r) => r.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to: string) =>
    current === to || (to !== "/dashboard" && current.startsWith(to));

  if (role === "empresa") {
    const moreActive = empresaMore.some((i) => isActive(i.to));
    return (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background safe-bottom">
        <ul className="mx-auto grid h-16 max-w-2xl grid-cols-5">
          {empresaMain.map((it) => (
            <NavCell key={it.to} item={it} active={isActive(it.to)} />
          ))}
          <li className="flex">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors press-scale",
                    moreActive ? "text-primary font-semibold" : "text-muted-foreground",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    moreActive && "bg-primary/12",
                  )}>
                    <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={moreActive ? 2.5 : 2} />
                  </span>
                  <span className="leading-none">Mais</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[85vh]">
                <SheetHeader className="px-5 pt-5 pb-2 text-left">
                  <SheetTitle>Mais opções</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-2 p-4">
                  {empresaMore.map((it) => (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border border-border bg-card p-3 press-scale",
                        isActive(it.to) && "border-primary/60 bg-primary/5",
                      )}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <it.icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{it.label}</span>
                        {it.hint && <span className="block truncate text-[11px] text-muted-foreground">{it.hint}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    );
  }

  const items =
    role === "admin" ? admin :
    role === "dispatcher" ? dispatcher :
    entregador;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background safe-bottom">
      <ul className="mx-auto grid h-16 max-w-2xl grid-cols-5">
        {items.map((it) => (
          <NavCell key={it.to} item={it} active={isActive(it.to)} />
        ))}
      </ul>
    </nav>
  );
}

function NavCell({ item, active }: { item: Item; active: boolean }) {
  return (
    <li className="flex">
      <Link
        to={item.to}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors press-scale",
          active ? "text-primary font-semibold" : "text-muted-foreground",
        )}
      >
        <span className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
          active && "bg-primary/12",
        )}>
          <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
        </span>
        <span className="leading-none">{item.label}</span>
      </Link>
    </li>
  );
}
