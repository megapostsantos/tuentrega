import { useSession } from "@/lib/auth-client";
import { useImpersonation } from "@/lib/impersonation";

export type AppRole = "admin" | "empresa" | "dispatcher" | "entregador";

const PRECEDENCE: AppRole[] = ["admin", "dispatcher", "empresa", "entregador"];

export interface AuthState {
  user: { id: string; email: string; name: string; emailVerified: boolean; image?: string | null; role?: string | null } | null;
  session: { id: string; userId: string; expiresAt: Date } | null;
  role: AppRole | null;
  roles: AppRole[];
  loading: boolean;
  isImpersonating: boolean;
  realUserId: string | null;
  realRole: AppRole | null;
}

export function useAuth(): AuthState {
  const { data: sessionData, isPending } = useSession();
  const imp = useImpersonation();

  const user = sessionData?.user ?? null;
  const session = sessionData?.session ?? null;

  // better-auth stores a single role on the user record
  const userRole = (user?.role as AppRole) ?? null;
  const roles: AppRole[] = userRole ? [userRole] : [];
  const role: AppRole | null = userRole
    ? PRECEDENCE.find((r) => roles.includes(r)) ?? null
    : null;

  const loading = isPending;

  if (imp && role === "admin" && user) {
    return {
      user: { ...user, id: imp.targetUserId },
      session,
      role: imp.targetType as AppRole,
      roles: [imp.targetType as AppRole],
      loading,
      isImpersonating: true,
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
    realUserId: null,
    realRole: role,
  };
}
