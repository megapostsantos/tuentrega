import { useEffect, useState } from "react";

const KEY = "tu_impersonation";
const LAST_PREFIX = "tu_last_";

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
  // remember as last-used for this type
  setLastImpersonated(value.targetType, {
    targetUserId: value.targetUserId,
    targetName: value.targetName,
  });
  window.dispatchEvent(new Event("tu_impersonation_changed"));
}

export function clearImpersonation() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("tu_impersonation_changed"));
}

export type LastImpersonated = { targetUserId: string; targetName: string };

export function getLastImpersonated(
  type: "empresa" | "entregador",
): LastImpersonated | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_PREFIX + type);
    return raw ? (JSON.parse(raw) as LastImpersonated) : null;
  } catch {
    return null;
  }
}

export function setLastImpersonated(
  type: "empresa" | "entregador",
  value: LastImpersonated,
) {
  localStorage.setItem(LAST_PREFIX + type, JSON.stringify(value));
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
