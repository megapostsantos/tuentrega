import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/lib/impersonation";

export type AppRole = "admin" | "empresa" | "entregador" | "dispatcher";

const PRECEDENCE: AppRole[] = ["admin", "dispatcher", "empresa", "entregador"];

function pickRole(rows: { role: string }[] | null): AppRole | null {
  if (!rows?.length) return null;
  const set = new Set(rows.map((r) => r.role));
  for (const r of PRECEDENCE) if (set.has(r)) return r;
  return null;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  /** All roles the user holds (useful when dispatcher is also entregador). */
  roles: AppRole[];
  loading: boolean;
  isImpersonating: boolean;
  realUserId: string | null;
  realRole: AppRole | null;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const imp = useImpersonation();

  useEffect(() => {
    const loadRoles = (uid: string) => {
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .then(({ data }) => {
          const list = (data ?? []) as { role: string }[];
          setRoles(list.map((r) => r.role as AppRole));
          setRole(pickRole(list));
        });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRole(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .then(({ data: r }) => {
            const list = (r ?? []) as { role: string }[];
            setRoles(list.map((row) => row.role as AppRole));
            setRole(pickRole(list));
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const realUser = session?.user ?? null;

  if (imp && role === "admin" && realUser) {
    return {
      user: { ...realUser, id: imp.targetUserId } as User,
      session,
      role: imp.targetType as AppRole,
      roles: [imp.targetType as AppRole],
      loading,
      isImpersonating: true,
      realUserId: realUser.id,
      realRole: "admin",
    };
  }

  return {
    user: realUser,
    session,
    role,
    roles,
    loading,
    isImpersonating: false,
    realUserId: null,
    realRole: role,
  };
}
