import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Shield, Building2, Bike, X, ChevronsUpDown, Search, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  clearImpersonation,
  getLastImpersonated,
  setImpersonation,
  useImpersonation,
} from "@/lib/impersonation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ViewMode = "admin" | "empresa" | "entregador";
type AccountRow = { id: string; name: string };

export function RoleSwitcher() {
  const { realRole, realUserId, isImpersonating, role } = useAuth();
  const imp = useImpersonation();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState<null | "empresa" | "entregador">(null);

  if (realRole !== "admin") return null;

  const current: ViewMode = isImpersonating ? (role as ViewMode) : "admin";

  async function goAdmin() {
    clearImpersonation();
    navigate({ to: "/admin/dashboard" });
  }

  async function impersonate(type: "empresa" | "entregador", target: AccountRow) {
    if (!realUserId) return;
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: target.id, targetType: type }),
      }).catch(() => null);

      const sessionId = res?.ok ? (await res.json()).id : crypto.randomUUID();

      setImpersonation({
        targetUserId: target.id,
        targetType: type,
        targetName: target.name,
        sessionId,
        adminId: realUserId,
      });
      toast.success(`Visualizando como ${target.name}`);
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error("Erro ao assumir conta", { description: e?.message });
    }
  }

  async function previewRole(type: "empresa" | "entregador") {
    const last = getLastImpersonated(type);
    if (last) {
      await impersonate(type, { id: last.targetUserId, name: last.targetName });
    } else {
      setPickerOpen(type);
    }
  }

  return (
    <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Eye className="h-3 w-3" />
        Visualizar como
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border bg-background p-1">
        <RoleBtn
          icon={Shield}
          label="Admin"
          active={current === "admin"}
          onClick={goAdmin}
        />
        <RoleBtn
          icon={Building2}
          label="Empresa"
          active={current === "empresa"}
          onClick={() => previewRole("empresa")}
        />
        <RoleBtn
          icon={Bike}
          label="Entreg."
          active={current === "entregador"}
          onClick={() => previewRole("entregador")}
        />
      </div>

      {isImpersonating && imp && (
        <div className="mt-2 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-xs">
          <span className="flex-1 truncate text-foreground">
            <span className="text-muted-foreground">como </span>
            <strong>{imp.targetName}</strong>
          </span>
          <button
            onClick={() => setPickerOpen(imp.targetType)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Trocar conta"
          >
            <ChevronsUpDown className="h-3 w-3" />
          </button>
          <button
            onClick={goAdmin}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Voltar para Admin"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <AccountPicker
        type={pickerOpen}
        onClose={() => setPickerOpen(null)}
        onPick={(t, row) => {
          setPickerOpen(null);
          impersonate(t, row);
        }}
      />
    </div>
  );
}

function RoleBtn({
  icon: Icon, label, active, onClick,
}: { icon: typeof Shield; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function AccountPicker({
  type, onClose, onPick,
}: {
  type: "empresa" | "entregador" | null;
  onClose: () => void;
  onPick: (t: "empresa" | "entregador", row: AccountRow) => void;
}) {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!type) return;
    setLoading(true);
    setQ("");
    fetch(`/api/admin/accounts?type=${type}`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Erro ao carregar contas"))
      .finally(() => setLoading(false));
  }, [type]);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q],
  );

  return (
    <Dialog open={!!type} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Escolher {type === "empresa" ? "empresa" : "entregador"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border rounded-md px-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Buscar pelo nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 border-0 focus-visible:ring-0 px-0"
          />
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {loading && <p className="p-3 text-xs text-muted-foreground text-center">Carregando…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground text-center">
              {rows.length === 0 ? "Nenhuma conta cadastrada ainda." : "Nenhum resultado."}
            </p>
          )}
          {!loading && filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => type && onPick(type, r)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
            >
              {type === "empresa"
                ? <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                : <Bike className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className="truncate">{r.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
