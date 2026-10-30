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
import { ForcePasswordChange } from "@/components/ForcePasswordChange";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [mustChange, setMustChange] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/db/must-change-password", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => setMustChange(!!j?.must))
      .catch(() => {});
  }, [user?.id]);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  if (loading || !user) return <SplashScreen />;
  if (!role && (user as any).role === "operador")
    return <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">Seu acesso à equipe foi desativado. Fale com o dono da empresa.</div>;
  if (mustChange) return <ForcePasswordChange />;

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
