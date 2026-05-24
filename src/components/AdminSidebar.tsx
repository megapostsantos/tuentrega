import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Users, Package, DollarSign, Bell, Settings,
  ExternalLink, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const items = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Empresas", url: "/admin/companies", icon: Building2 },
  { title: "Entregadores", url: "/admin/deliverers", icon: Users },
  { title: "Planos", url: "/admin/plans", icon: Package },
  { title: "Financeiro", url: "/admin/financial", icon: DollarSign },
  { title: "Notificações", url: "/admin/notifications", icon: Bell },
  { title: "Configurações", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/admin/login" });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-secondary text-secondary-foreground">
      <SidebarHeader className="border-b border-white/10">
        <div className="flex h-12 items-center px-2">
          <Logo />
          <span className="ml-2 hidden rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary group-data-[state=expanded]:inline">
            Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <RoleSwitcher />
        <SidebarGroup>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={path === it.url}>
                    <Link to={it.url}>
                      <it.icon />
                      <span>{it.title}</span>
                      {it.url === "/admin/notifications" && unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-primary px-2 text-[10px] font-bold text-primary-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/">
                <ExternalLink />
                <span>Ir para o site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
