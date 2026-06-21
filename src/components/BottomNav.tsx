import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Package, Store, Wallet, User, Map, CalendarDays, Building2, Users, BarChart3, UserCog, TrendingUp } from "lucide-react";
import type { AppRole } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Item = { label: string; to: string; icon: typeof Home };

const empresa: Item[] = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Pacotes", to: "/pacotes", icon: Package },
  { label: "Ofertas", to: "/ofertas", icon: Store },
  { label: "Pagam.", to: "/pagamentos", icon: Wallet },
  { label: "Perfil", to: "/configuracoes", icon: User },
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
  const items =
    role === "admin" ? admin :
    role === "empresa" ? empresa :
    role === "dispatcher" ? dispatcher :
    entregador;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background safe-bottom">
      <ul className="mx-auto grid h-16 max-w-2xl grid-cols-5">
        {items.map((it) => {
          const active = current === it.to || (it.to !== "/dashboard" && current.startsWith(it.to));
          return (
            <li key={it.to} className="flex">
              <Link
                to={it.to}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors press-scale",
                  active ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                <span className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary/12",
                )}>
                  <it.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className="leading-none">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
