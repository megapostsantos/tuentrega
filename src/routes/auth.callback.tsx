import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorDesc = url.searchParams.get("error_description") || url.hash.match(/error_description=([^&]+)/)?.[1];

        if (errorDesc) {
          setErrorMsg(decodeURIComponent(errorDesc));
          setStatus("error");
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(error.message);
            setStatus("error");
            return;
          }
        } else {
          // Maybe implicit token flow (hash)
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setErrorMsg("Link inválido ou expirado.");
            setStatus("error");
            return;
          }
        }

        toast.success("E-mail confirmado! Bem-vindo(a).");
        navigate({ to: "/dashboard" });
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erro inesperado.");
        setStatus("error");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-content-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        {status === "loading" ? (
          <>
            <div className="mx-auto grid h-20 w-20 place-content-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-xl font-bold">Confirmando seu e-mail…</h1>
            <p className="mt-2 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Aguarde um instante
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-20 w-20 place-content-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-xl font-bold">Não foi possível confirmar</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <Button className="mt-6 w-full" onClick={() => navigate({ to: "/auth" })}>
              Voltar ao login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
