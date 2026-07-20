import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Map, Zap, ArrowRightFromLine, UserCheck, History,
  Bike, Building2, CalendarDays, BarChart2, Wallet, Settings, Users, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { toast } from "sonner";

type Item = { title: string; url: string; icon: typeof LayoutDashboard; roles: AppRole[] };
type Group = { label: string; items: Item[] };

// "operador" (per spec) maps to the existing "dispatcher" role.
const ALL: AppRole[] = ["admin", "empresa", "dispatcher", "entregador"];
const NOT_ENTREGADOR: AppRole[] = ["admin", "empresa", "dispatcher"];
const ADMIN_EMPRESA: AppRole[] = ["admin", "empresa"];
const ADMIN_ONLY: AppRole[] = ["admin"];

const GROUPS: Group[] = [
  {
    label: "Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ALL },
    ],
  },
  {
    label: "Distribuição",
    items: [
      { title: "Pacotes", url: "/pacotes", icon: Package, roles: NOT_ENTREGADOR },
      { title: "Rotas", url: "/rotas", icon: Map, roles: NOT_ENTREGADOR },
      { title: "Ofertas", url: "/ofertas", icon: Zap, roles: ALL },
    ],
  },
  {
    label: "NEX",
    items: [
      { title: "Saídas do Dia", url: "/nex/saidas", icon: ArrowRightFromLine, roles: NOT_ENTREGADOR },
      { title: "Motoristas NEX", url: "/nex/motoristas", icon: UserCheck, roles: NOT_ENTREGADOR },
      { title: "Histórico NEX", url: "/nex/historico", icon: History, roles: NOT_ENTREGADOR },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { title: "Entregadores", url: "/entregadores", icon: Bike, roles: NOT_ENTREGADOR },
      { title: "Empresas", url: "/empresas", icon: Building2, roles: ADMIN_ONLY },
    ],
  },
  {
    label: "Agenda",
    items: [
      { title: "Agenda", url: "/agenda", icon: CalendarDays, roles: ALL },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: BarChart2, roles: ADMIN_EMPRESA },
      { title: "Pagamentos", url: "/pagamentos", icon: Wallet, roles: ADMIN_EMPRESA },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ALL },
      { title: "Funcionários", url: "/funcionarios", icon: Users, roles: ADMIN_ONLY },
    ],
  },
];

// Entregador restrictions: only Dashboard, Ofertas, Agenda, Configurações
const ENTREGADOR_URLS = new Set(["/dashboard", "/ofertas", "/agenda", "/configuracoes"]);

function itemVisible(item: Item, role: AppRole | null): boolean {
  if (!role) return false;
  if (!item.roles.includes(role)) return false;
  if (role === "entregador" && !ENTREGADOR_URLS.has(item.url)) return false;
  return true;
}

export function AppSidebar({ role }: { role: AppRole | null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => currentPath === p;

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/" });
  }

  const email = user?.email ?? "";
  const displayName = (user?.user_metadata as any)?.nome_completo || (user?.user_metadata as any)?.name || email.split("@")[0] || "Usuário";
  const initials = displayName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() || "BE";

  return (
    <Sidebar collapsible="icon" className="bg-[#0D1B2A] text-white border-r-0 [&_[data-sidebar=sidebar]]:bg-[#0D1B2A]">
      <SidebarHeader className="border-b border-white/10 bg-[#0D1B2A]">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFB700] text-[#0D1B2A] font-black text-sm">
            BE
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight text-white">BAG Envios</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#FFB700]">envios & variedades</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-[#0D1B2A]">
        <RoleSwitcher />
        {GROUPS.map((group) => {
          const visibleItems = group.items.filter((i) => itemVisible(i, role));
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-[#FFB700]/40">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          className={
                            active
                              ? "bg-[#FFB700] text-[#0D1B2A] font-semibold hover:bg-[#FFB700] hover:text-[#0D1B2A] data-[active=true]:bg-[#FFB700] data-[active=true]:text-[#0D1B2A]"
                              : "text-white/80 hover:bg-[#FFB700]/10 hover:text-white"
                          }
                          isActive={active}
                        >
                          <Link to={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 bg-[#0D1B2A]">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFB700] text-[#0D1B2A] text-xs font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium text-white">{displayName}</p>
            <p className="truncate text-[10px] text-white/50">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-white/70 hover:bg-[#FFB700]/10 hover:text-[#FFB700] group-data-[collapsible=icon]:hidden"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <SidebarMenu className="group-data-[collapsible=icon]:block hidden">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-white/80 hover:bg-[#FFB700]/10 hover:text-white">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
