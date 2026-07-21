import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { SplashScreen } from "@/components/SplashScreen";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ActiveRouteBanner } from "@/components/ActiveRouteBanner";
import { AppTopBar } from "@/components/AppTopBar";
import { AppDrawer } from "@/components/AppDrawer";
import { OfflineBanner } from "@/components/OfflineBanner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
    } else if (user.email && !user.email_confirmed_at) {
      navigate({ to: "/auth", search: { verify: user.email } as never });
    }
  }, [loading, user, navigate]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  if (loading || !user || (user.email && !user.email_confirmed_at)) return <SplashScreen />;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <ImpersonationBanner />
      <ActiveRouteBanner />
      <AppTopBar onOpenDrawer={() => setDrawerOpen(true)} />
      <AppDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} role={role} />
      <OfflineBanner />
      <main className="flex-1 pb-6">
        <div className="mx-auto w-full max-w-6xl">
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
    </div>
  );
}
