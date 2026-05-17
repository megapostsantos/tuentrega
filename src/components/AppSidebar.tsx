import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Store, Map, CalendarDays, Wallet, Users, Building2,
  Settings, LogOut, FileText, BarChart3,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/use-auth";
import { toast } from "sonner";

type Item = { title: string; url: string; icon: typeof LayoutDashboard };

const baseItems: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const empresaItems: Item[] = [
  { title: "Pacotes (TMS)", url: "/pacotes", icon: Package },
  { title: "Marketplace", url: "/ofertas", icon: Store },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Pagamentos PIX", url: "/pagamentos", icon: Wallet },
  { title: "Notas fiscais", url: "/notas", icon: FileText },
  { title: "Entregadores", url: "/entregadores", icon: Users },
];

const entregadorItems: Item[] = [
  { title: "Ofertas", url: "/ofertas", icon: Store },
  { title: "Minhas rotas", url: "/rotas", icon: Map },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Ganhos", url: "/pagamentos", icon: Wallet },
  { title: "Notas fiscais", url: "/notas", icon: FileText },
];

const adminItems: Item[] = [
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Entregadores", url: "/entregadores", icon: Users },
  { title: "Métricas", url: "/metricas", icon: BarChart3 },
];

export function AppSidebar({ role }: { role: AppRole | null }) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => currentPath === p;

  const moduleItems =
    role === "admin" ? adminItems :
    role === "empresa" ? empresaItems :
    role === "entregador" ? entregadorItems : [];

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/" });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center px-2">
          <Logo />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {baseItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {moduleItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {role === "admin" ? "Administração" : role === "empresa" ? "Operação" : "Trabalho"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {moduleItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/configuracoes")}>
                  <Link to="/configuracoes">
                    <Settings />
                    <span>Configurações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
