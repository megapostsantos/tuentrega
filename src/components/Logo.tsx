import { MapPin, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
        <MapPin className="h-5 w-5" strokeWidth={2.5} />
        <ArrowUpRight className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-secondary p-0.5 text-primary" strokeWidth={3} />
      </div>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Tu<span className="text-primary">Entrega</span>
        </span>
      )}
    </div>
  );
}
