import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  to?: string;
};

export function StatCard({ icon: Icon, label, value, hint, to }: Props) {
  const inner = (
    <div className="relative h-full rounded-2xl border border-border bg-card p-5 elev-1 press-scale transition-shadow hover:elev-2">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="mt-3 text-[28px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
  if (to) {
    return (
      <Link to={to} className={cn("block")}>
        {inner}
      </Link>
    );
  }
  return inner;
}
