import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isLogin = path === "/admin/login";
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isLogin) return;
    if (loading) return;
    if (!user) { navigate({ to: "/admin/login" }); return; }
    if (role !== "admin") { navigate({ to: "/admin/login" }); return; }
  }, [isLogin, loading, user, role, navigate]);

  useEffect(() => {
    if (isLogin || role !== "admin") return;
    let cancel = false;
    (supabase as any).from("admin_notifications").select("id", { count: "exact", head: true }).is("read_at", null)
      .then(({ count }: { count: number | null }) => { if (!cancel) setUnread(count ?? 0); });
    return () => { cancel = true; };
  }, [isLogin, role, path]);

  if (isLogin) return <Outlet />;

  if (loading || !user || role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Logo />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar unreadCount={unread} />
        <div className="flex flex-1 flex-col">
          <ImpersonationBanner />
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
              Admin
            </span>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
