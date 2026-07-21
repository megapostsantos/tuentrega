import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Map, Zap, ArrowRightFromLine, History,
  Bike, Building2, CalendarDays, BarChart2, Wallet, Settings, Users, LogOut, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: typeof LayoutDashboard; roles: AppRole[] };
type Group = { label: string; items: Item[] };

const ALL: AppRole[] = ["admin", "empresa", "dispatcher", "entregador"];
const NOT_ENTREGADOR: AppRole[] = ["admin", "empresa", "dispatcher"];
const ADMIN_EMPRESA: AppRole[] = ["admin", "empresa"];
const ADMIN_ONLY: AppRole[] = ["admin"];

const GROUPS: Group[] = [
  { label: "Geral", items: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ALL },
  ]},
  { label: "Distribuição", items: [
    { title: "Pacotes", url: "/pacotes", icon: Package, roles: NOT_ENTREGADOR },
    { title: "Rotas", url: "/rotas", icon: Map, roles: NOT_ENTREGADOR },
    { title: "Ofertas", url: "/ofertas", icon: Zap, roles: ALL },
  ]},
  { label: "NEX", items: [
    { title: "Saídas do Dia", url: "/nex/saidas", icon: ArrowRightFromLine, roles: NOT_ENTREGADOR },
    { title: "Histórico NEX", url: "/nex/historico", icon: History, roles: NOT_ENTREGADOR },
  ]},
  { label: "Pessoas", items: [
    { title: "Entregadores", url: "/entregadores", icon: Bike, roles: NOT_ENTREGADOR },
    { title: "Empresas", url: "/empresas", icon: Building2, roles: ADMIN_ONLY },
  ]},
  { label: "Agenda", items: [
    { title: "Agenda", url: "/agenda", icon: CalendarDays, roles: ALL },
  ]},
  { label: "Financeiro", items: [
    { title: "Financeiro", url: "/financeiro", icon: BarChart2, roles: ADMIN_EMPRESA },
    { title: "Pagamentos", url: "/pagamentos", icon: Wallet, roles: ADMIN_EMPRESA },
  ]},
  { label: "Sistema", items: [
    { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ALL },
    { title: "Funcionários", url: "/funcionarios", icon: Users, roles: ADMIN_ONLY },
  ]},
];

const ENTREGADOR_URLS = new Set(["/dashboard", "/ofertas", "/agenda", "/configuracoes"]);

function itemVisible(item: Item, role: AppRole | null): boolean {
  if (!role) return false;
  if (!item.roles.includes(role)) return false;
  if (role === "entregador" && !ENTREGADOR_URLS.has(item.url)) return false;
  return true;
}

export function AppDrawer({ open, onClose, role }: { open: boolean; onClose: () => void; role: AppRole | null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => currentPath === p;

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    onClose();
    navigate({ to: "/" });
  }

  const email = user?.email ?? "";
  const displayName =
    (user?.user_metadata as any)?.nome_completo ||
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    email.split("@")[0] || "Usuário";

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!open}
      />
      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#0D1B2A] text-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFB700] text-[#0D1B2A] font-black text-sm">
            BE
          </div>
          <div className="flex flex-1 flex-col leading-tight min-w-0">
            <span className="text-sm font-bold tracking-tight text-white">BAG Envios</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#FFB700]">
              envios & variedades
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {GROUPS.map((group) => {
            const visible = group.items.filter((i) => itemVisible(i, role));
            if (visible.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#FFB700]/40">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {visible.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <li key={item.url}>
                        <Link
                          to={item.url}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-[#FFB700] font-semibold text-[#0D1B2A]"
                              : "text-white/80 hover:bg-[#FFB700]/10 hover:text-white",
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-3 py-3">
          <div className="mb-2 px-1">
            <p className="truncate text-xs font-medium text-white">{displayName}</p>
            <p className="truncate text-[10px] text-white/50">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-[#FFB700]/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
