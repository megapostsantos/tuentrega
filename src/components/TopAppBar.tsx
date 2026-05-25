import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

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

export function TopAppBar() {
  const { user } = useAuth();
  const [hasNotif] = useState(false);
  const [now, setNow] = useState(() => greeting());
  useEffect(() => {
    const t = setInterval(() => setNow(greeting()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fullName: string =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.company_name ||
    user?.email?.split("@")[0] || "";
  const first = fullName.split(" ")[0] || "você";

  return (
    <header className="sticky top-0 z-30 h-[60px] border-b border-border bg-background/95 backdrop-blur elev-1">
      <div className="mx-auto flex h-full max-w-2xl items-center gap-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {now}, {first} <span className="ml-0.5">👋</span>
          </p>
          <p className="truncate text-[11px] capitalize text-muted-foreground">{todayLong()}</p>
        </div>
        <button
          aria-label="Notificações"
          className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted press-scale"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {hasNotif && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </button>
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
