import type { LucideIcon } from "lucide-react";

export function EmptyModule({ icon: Icon, title, description }: {
  icon: LucideIcon; title: string; description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs text-muted-foreground">Em breve — este módulo será construído nas próximas iterações.</p>
    </div>
  );
}
