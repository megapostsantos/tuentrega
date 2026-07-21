import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "@/components/SplashScreen";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ActiveRouteBanner } from "@/components/ActiveRouteBanner";
import { TopAppBar } from "@/components/TopAppBar";
import { BottomNav } from "@/components/BottomNav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
    } else if (user.email && !user.email_confirmed_at) {
      navigate({ to: "/auth", search: { verify: user.email } as never });
    }
  }, [loading, user, navigate]);

  if (loading || !user || (user.email && !user.email_confirmed_at)) return <SplashScreen />;


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar role={role} />
        </div>
        <div className="flex min-h-screen flex-1 flex-col">
          <ImpersonationBanner />
          <ActiveRouteBanner />
          <div className="flex items-center gap-2 border-b bg-background md:px-2">
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>
            <div className="flex-1">
              <TopAppBar />
            </div>
          </div>
          <OfflineBanner />
          <main className="flex-1 pb-24 md:pb-6">
            <div className="mx-auto w-full max-w-2xl md:max-w-6xl">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
          <div className="md:hidden">
            <BottomNav role={role} />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
