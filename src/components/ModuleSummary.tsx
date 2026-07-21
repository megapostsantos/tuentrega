import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export type SummaryItem = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
};

export function ModuleSummary({
  items,
  loading,
  columns = 4,
}: {
  items: SummaryItem[];
  loading?: boolean;
  columns?: 3 | 4 | 5;
}) {
  const gridCls =
    columns === 5
      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : columns === 3
        ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4";

  if (loading) {
    return (
      <div className={gridCls}>
        {Array.from({ length: items.length || columns }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={gridCls}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="relative rounded-2xl border border-border bg-card p-4 elev-1"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">{it.label}</span>
              <Icon className="h-4 w-4 text-muted-foreground/70" />
            </div>
            <p
              className="mt-2 text-[28px] font-bold leading-none tracking-tight"
              style={{ color: "#FFB700" }}
            >
              {it.value}
            </p>
            {it.hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{it.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
