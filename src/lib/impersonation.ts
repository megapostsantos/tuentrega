import { useEffect, useState } from "react";

const KEY = "tu_impersonation";

export type Impersonation = {
  targetUserId: string;
  targetType: "empresa" | "entregador";
  targetName: string;
  sessionId: string; // admin_impersonations.id
  adminId: string;
};

export function getImpersonation(): Impersonation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Impersonation) : null;
  } catch {
    return null;
  }
}

export function setImpersonation(value: Impersonation) {
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("tu_impersonation_changed"));
}

export function clearImpersonation() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("tu_impersonation_changed"));
}

export function useImpersonation(): Impersonation | null {
  const [state, setState] = useState<Impersonation | null>(() => getImpersonation());
  useEffect(() => {
    const handler = () => setState(getImpersonation());
    window.addEventListener("tu_impersonation_changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("tu_impersonation_changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return state;
}
