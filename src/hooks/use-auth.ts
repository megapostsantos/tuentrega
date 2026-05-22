import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/lib/impersonation";

export type AppRole = "admin" | "empresa" | "entregador";

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  /** True when the admin is browsing the app as another user. */
  isImpersonating: boolean;
  /** Real admin user id when impersonating, otherwise null. */
  realUserId: string | null;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const imp = useImpersonation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id)
            .maybeSingle()
            .then(({ data }) => setRole((data?.role as AppRole) ?? null));
        }, 0);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle()
          .then(({ data: r }) => {
            setRole((r?.role as AppRole) ?? null);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const realUser = session?.user ?? null;

  // When the admin is impersonating, present the app as if it were the
  // target user. The underlying Supabase session stays the same (admin
  // keeps RLS access), but the UI keys off the impersonated id + role.
  if (imp && role === "admin" && realUser) {
    return {
      user: { ...realUser, id: imp.targetUserId } as User,
      session,
      role: imp.targetType as AppRole,
      loading,
      isImpersonating: true,
      realUserId: realUser.id,
    };
  }

  return {
    user: realUser,
    session,
    role,
    loading,
    isImpersonating: false,
    realUserId: null,
  };
}
