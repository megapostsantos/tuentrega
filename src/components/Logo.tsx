import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
        <Package className="h-5 w-5" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Bag<span className="text-primary"> Envios</span>
        </span>
      )}
    </div>
  );
}
