import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useImpersonation } from "@/lib/impersonation";
import { useModo, setModo, type Modo } from "@/lib/modo";

export type AppRole = "admin" | "empresa" | "dispatcher" | "entregador";

const PRECEDENCE: AppRole[] = ["admin", "dispatcher", "empresa", "entregador"];

export interface AuthState {
  user: { id: string; email: string; name: string; emailVerified: boolean; image?: string | null; role?: string | null; mustChangePassword?: boolean | null } | null;
  session: { id: string; userId: string; expiresAt: Date } | null;
  role: AppRole | null;
  roles: AppRole[];
  loading: boolean;
  isImpersonating: boolean;
  /** funcionário da empresa: vê a empresa, mas sem valores e sem exclusões */
  isOperador: boolean;
  /** funcionário que também é entregador pode alternar o modo (Gestão ⇄ Entregador) */
  podeAlternarModo: boolean;
  modo: Modo;
  alternarModo: () => void;
  realUserId: string | null;
  realRole: AppRole | null;
}

type EquipeInfo = { empresaId: string | null; ativo: boolean; entregador: boolean };
const equipeCache = new Map<string, EquipeInfo>();

function useEquipe(userId: string | undefined, enabled: boolean): { info: EquipeInfo | null; pending: boolean } {
  const [info, setInfo] = useState<EquipeInfo | null>(userId ? equipeCache.get(userId) ?? null : null);
  useEffect(() => {
    if (!enabled || !userId) return;
    const c = equipeCache.get(userId);
    if (c) { setInfo(c); return; }
    fetch("/api/db/equipe-me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        const v = { empresaId: j?.empresaId ?? null, ativo: !!j?.ativo, entregador: !!j?.entregador };
        equipeCache.set(userId, v);
        setInfo(v);
      })
      .catch(() => setInfo({ empresaId: null, ativo: false, entregador: false }));
  }, [enabled, userId]);
  return { info, pending: enabled && !info };
}

export function useAuth(): AuthState {
  const { data: sessionData, isPending } = useSession();
  const imp = useImpersonation();
  const ehOperador = (sessionData?.user as any)?.role === "operador";
  const equipe = useEquipe(sessionData?.user?.id, ehOperador);
  const modoSalvo = useModo();

  const user = sessionData?.user ?? null;
  const session = sessionData?.session ?? null;

  // better-auth stores a single role on the user record
  const userRole = (user?.role as AppRole) ?? null;
  const roles: AppRole[] = userRole ? [userRole] : [];
  const role: AppRole | null = userRole
    ? PRECEDENCE.find((r) => roles.includes(r)) ?? null
    : null;

  const loading = isPending || equipe.pending;

  // Funcionário ativo: enxerga a empresa como "empresa" (id da empresa), marcado como operador.
  if (ehOperador && user) {
    const ok = !!equipe.info?.ativo && !!equipe.info.empresaId;
    const podeAlternarModo = ok && !!equipe.info?.entregador;
    const modo: Modo = podeAlternarModo ? modoSalvo : "gestao";
    const alternarModo = () => setModo(modo === "gestao" ? "entregador" : "gestao");
    if (modo === "entregador") {
      return { user, session, role: "entregador", roles: ["entregador"], loading, isImpersonating: false, isOperador: false, podeAlternarModo, modo, alternarModo, realUserId: user.id, realRole: null };
    }
    return {
      user: ok ? { ...user, id: equipe.info!.empresaId! } : user,
      session,
      role: ok ? "empresa" : null,
      roles: ok ? ["empresa"] : [],
      loading,
      isImpersonating: false,
      isOperador: true,
      podeAlternarModo,
      modo,
      alternarModo,
      realUserId: user.id,
      realRole: null,
    };
  }

  if (imp && role === "admin" && user) {
    return {
      user: { ...user, id: imp.targetUserId },
      session,
      role: imp.targetType as AppRole,
      roles: [imp.targetType as AppRole],
      loading,
      isImpersonating: true,
      isOperador: false,
      podeAlternarModo: false,
      modo: "gestao",
      alternarModo: () => {},
      realUserId: user.id,
      realRole: "admin",
    };
  }

  return {
    user,
    session,
    role,
    roles,
    loading,
    isImpersonating: false,
    isOperador: false,
    podeAlternarModo: false,
    modo: "gestao",
    alternarModo: () => {},
    realUserId: null,
    realRole: role,
  };
}
