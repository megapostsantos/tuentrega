import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const MIN_INTERVAL_MS = 15_000;

export type LocationTrackerState = {
  active: boolean;
  permissionDenied: boolean;
  error: string | null;
  lastUpdate: Date | null;
  pending?: number;
  online?: boolean;
};

const QKEY = "tu_loc_queue_v1";
const MAX_QUEUE = 1500;
const BATCH = 100;

type Ponto = {
  entregador_id: string; oferta_id: string; lat: number; lng: number;
  velocidade_kmh: number | null; registrado_em: string;
};

function lerFila(): Ponto[] {
  try { return JSON.parse(localStorage.getItem(QKEY) ?? "[]"); } catch { return []; }
}
function gravarFila(f: Ponto[]) {
  try { localStorage.setItem(QKEY, JSON.stringify(f.slice(-MAX_QUEUE))); } catch { /* armazenamento cheio ou bloqueado */ }
}

// Mantém a tela acesa enquanto a rota está ativa, para o GPS continuar enviando a posição.
export function useKeepAwake(ativo: boolean) {
  useEffect(() => {
    if (!ativo || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelado = false;
    const pedir = async () => {
      try {
        lock = await (navigator as any).wakeLock.request("screen");
        if (cancelado) await lock?.release();
      } catch {
        /* sem permissão ou bateria baixa: segue sem manter a tela acesa */
      }
    };
    const aoVoltar = () => { if (document.visibilityState === "visible") pedir(); };
    pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      lock?.release().catch(() => {});
    };
  }, [ativo]);
}

export function useLocationTracker(ofertaId: string | null): LocationTrackerState {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const lastPointAtRef = useRef<number>(0);
  const sendingRef = useRef<boolean>(false);
  const [state, setState] = useState<LocationTrackerState>({
    active: false,
    permissionDenied: false,
    error: null,
    lastUpdate: null,
    pending: 0,
    online: true,
  });

  useEffect(() => {
    if (!ofertaId || !user?.id) {
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setState((s) => ({ ...s, active: false }));
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({ ...s, active: false, error: "Geolocalização não suportada neste dispositivo." }));
      return;
    }

    // Envia os pontos guardados em lotes; o que falhar continua na fila para a próxima tentativa.
    async function descarregar() {
      if (sendingRef.current) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setState((s) => ({ ...s, online: false, pending: lerFila().length }));
        return;
      }
      sendingRef.current = true;
      try {
        for (let guarda = 0; guarda < 30; guarda++) {
          const fila = lerFila();
          if (!fila.length) break;
          const lote = fila.slice(0, BATCH);
          const { error } = await supabase.from("entregador_localizacao").insert(lote as any);
          if (error) {
            setState((s) => ({ ...s, error: error.message, online: false, pending: lerFila().length }));
            return;
          }
          gravarFila(lerFila().slice(lote.length));
          setState((s) => ({ ...s, error: null, online: true, lastUpdate: new Date(), pending: lerFila().length }));
        }
      } finally {
        sendingRef.current = false;
      }
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const t = pos.timestamp || Date.now();
        if (t - lastPointAtRef.current < MIN_INTERVAL_MS) return;
        lastPointAtRef.current = t;
        const fila = lerFila();
        fila.push({
          entregador_id: user!.id,
          oferta_id: ofertaId!,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          velocidade_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
          registrado_em: new Date(t).toISOString(),
        });
        gravarFila(fila);
        setState((s) => ({ ...s, active: true, permissionDenied: false, pending: fila.length }));
        void descarregar();
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setState((s) => ({
          ...s,
          active: false,
          permissionDenied: denied,
          error: denied ? "Permissão de localização negada." : err.message,
        }));
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
    watchIdRef.current = id;
    setState((s) => ({ ...s, active: true, pending: lerFila().length }));

    const aoMudar = () => { void descarregar(); };
    window.addEventListener("online", aoMudar);
    window.addEventListener("offline", aoMudar);
    document.addEventListener("visibilitychange", aoMudar);
    const timer = setInterval(aoMudar, 20_000);
    void descarregar();

    return () => {
      window.removeEventListener("online", aoMudar);
      window.removeEventListener("offline", aoMudar);
      document.removeEventListener("visibilitychange", aoMudar);
      clearInterval(timer);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [ofertaId, user?.id]);

  return state;
}
