import { useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  user_id: string;
  titulo: string;
  corpo: string | null;
  lida: boolean;
  link: string | null;
  created_at: string;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function todayLong() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function initials(name?: string | null) {
  if (!name) return "U";
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function TopAppBar() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => greeting());
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    const t = setInterval(() => setNow(greeting()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (active && data) setNotifs(data as Notification[]);
    })();

    const channel = supabase
      .channel(`user_notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifs((prev) => {
            if (payload.eventType === "INSERT") {
              return [payload.new as Notification, ...prev].slice(0, 50);
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((n) =>
                n.id === (payload.new as Notification).id ? (payload.new as Notification) : n,
              );
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((n) => n.id !== (payload.old as Notification).id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unread = useMemo(() => notifs.filter((n) => !n.lida).length, [notifs]);

  const handleClick = async (n: Notification) => {
    if (!n.lida) {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
      await supabase.from("user_notifications").update({ lida: true }).eq("id", n.id);
    }
    if (n.link) {
      setOpen(false);
      navigate({ to: n.link });
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
    await supabase
      .from("user_notifications")
      .update({ lida: true })
      .eq("user_id", user.id)
      .eq("lida", false);
  };

  const fullName: string =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.company_name ||
    user?.email?.split("@")[0] || "";
  const first = fullName.split(" ")[0] || "você";

  return (
    <header className="sticky top-0 z-30 h-[60px] border-b border-border bg-background/95 backdrop-blur elev-1">
      <div className="mx-auto flex h-full max-w-2xl items-center gap-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-foreground">
            <span className="truncate">{now}, {first} <span className="ml-0.5">👋</span></span>
            {role === "dispatcher" && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Dispatcher
              </span>
            )}
          </p>
          <p className="truncate text-[11px] capitalize text-muted-foreground">{todayLong()}</p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Notificações"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted press-scale"
            >
              <Bell className="h-5 w-5 text-foreground" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="text-base">Notificações</SheetTitle>
                {unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllRead}
                    className="h-8 text-xs"
                  >
                    <CheckCheck className="mr-1 h-3.5 w-3.5" />
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </SheetHeader>
            <ScrollArea className="flex-1">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-muted-foreground">
                  <Bell className="h-10 w-10 opacity-40" />
                  <p className="text-sm">Nenhuma notificação ainda</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifs.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => handleClick(n)}
                        className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/60 ${
                          !n.lida ? "bg-primary/5" : ""
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            !n.lida ? "bg-primary" : "bg-transparent"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className={`truncate text-sm ${!n.lida ? "font-semibold" : "font-medium"} text-foreground`}>
                              {n.titulo}
                            </p>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {timeAgo(n.created_at)}
                            </span>
                          </div>
                          {n.corpo && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {n.corpo}
                            </p>
                          )}
                        </div>
                        {n.lida && (
                          <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <Link
          to="/configuracoes"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground press-scale"
        >
          {initials(fullName)}
        </Link>
      </div>
    </header>
  );
}
