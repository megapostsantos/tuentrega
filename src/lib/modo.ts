import { useSyncExternalStore } from "react";

export type Modo = "gestao" | "entregador";
const KEY = "tu_modo";
const EVENTO = "tu_modo_changed";

export function getModo(): Modo {
  if (typeof window === "undefined") return "gestao";
  try { return localStorage.getItem(KEY) === "entregador" ? "entregador" : "gestao"; } catch { return "gestao"; }
}

export function setModo(m: Modo) {
  try { localStorage.setItem(KEY, m); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENTO));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENTO, cb); window.removeEventListener("storage", cb); };
}

/** Modo em que um funcionário que também é entregador está atuando agora. */
export function useModo(): Modo {
  return useSyncExternalStore(subscribe, getModo, () => "gestao" as Modo);
}
