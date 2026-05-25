import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ActiveRouteBanner } from "@/components/ActiveRouteBanner";
import { TopAppBar } from "@/components/TopAppBar";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Logo />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <ImpersonationBanner />
      <ActiveRouteBanner />
      <TopAppBar />
      <main className="flex-1 pb-20">
        <div className="mx-auto w-full max-w-2xl">
          <Outlet />
        </div>
      </main>
      <BottomNav role={role} />
    </div>
  );
}
