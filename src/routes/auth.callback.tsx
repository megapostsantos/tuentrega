import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Better Auth handles callback automatically via cookie session.
    // Just redirect to dashboard.
    navigate({ to: "/dashboard" });
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-content-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Redirecionando…</p>
      </div>
    </div>
  );
}
