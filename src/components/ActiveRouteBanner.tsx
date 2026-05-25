import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Active = { id: string; titulo: string; updated_at: string };

export function ActiveRouteBanner() {
  const { user, role } = useAuth();
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    if (!user || role !== "entregador") {
      setActive(null);
      return;
    }
    let alertedCompany = false;
    let reminderTimer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      const { data } = await supabase
        .from("ofertas")
        .select("id,titulo,updated_at")
        .eq("entregador_id", user!.id)
        .eq("status", "in_progress")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActive((data as Active) ?? null);

      // 8h alert to company
      if (data && !alertedCompany) {
        const hours = (Date.now() - new Date(data.updated_at).getTime()) / 3_600_000;
        if (hours >= 8) {
          alertedCompany = true;
          await (supabase as any).from("admin_notifications").insert({
            type: "route_stale",
            title: "Rota aberta há mais de 8 horas",
            body: `Entregador não fechou a rota "${data.titulo}".`,
            link: `/ofertas`,
          });
        }
      }
    }
    load();

    const ch = supabase
      .channel("active-route-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas", filter: `entregador_id=eq.${user.id}` }, load)
      .subscribe();

    // Reminder every 2h while active
    reminderTimer = setInterval(() => {
      if (active) toast.message("🚚 Não esqueça de fechar sua rota!");
    }, 2 * 60 * 60 * 1000);

    return () => {
      supabase.removeChannel(ch);
      if (reminderTimer) clearInterval(reminderTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  if (!active) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-primary px-4 py-2 text-primary-foreground shadow">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Truck className="h-4 w-4" />
        <span>Rota ativa! Feche ao terminar.</span>
      </div>
      <Link
        to="/ofertas"
        search={{ close: active.id } as never}
        className="rounded-md bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
      >
        Fechar rota →
      </Link>
    </div>
  );
}
