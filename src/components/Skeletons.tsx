import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} aria-hidden />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <SkeletonBlock className="rounded-full" />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 elev-1">
      <div className="flex items-start justify-between">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-9 w-9 rounded-full" />
      </div>
      <SkeletonBlock className="mt-3 h-7 w-24" />
      <SkeletonBlock className="mt-2 h-2 w-20" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 elev-1">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-1/2" />
              <SkeletonBlock className="h-3 w-1/3" />
            </div>
            <SkeletonBlock className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <SkeletonBlock className="h-6 w-40" />
      <SkeletonStatGrid />
      <SkeletonList rows={3} />
    </div>
  );
}
