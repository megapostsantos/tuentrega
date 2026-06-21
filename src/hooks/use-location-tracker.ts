import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const MIN_INTERVAL_MS = 15_000;

export type LocationTrackerState = {
  active: boolean;
  permissionDenied: boolean;
  error: string | null;
  lastUpdate: Date | null;
};

export function useLocationTracker(ofertaId: string | null): LocationTrackerState {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const sendingRef = useRef<boolean>(false);
  const [state, setState] = useState<LocationTrackerState>({
    active: false,
    permissionDenied: false,
    error: null,
    lastUpdate: null,
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
      setState({ active: false, permissionDenied: false, error: "Geolocalização não suportada neste dispositivo.", lastUpdate: null });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < MIN_INTERVAL_MS) return;
        if (sendingRef.current) return;
        sendingRef.current = true;
        lastSentAtRef.current = now;
        try {
          const { error } = await supabase.from("entregador_localizacao").insert({
            entregador_id: user.id,
            oferta_id: ofertaId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            velocidade_kmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : null,
          } as any);
          if (error) {
            setState((s) => ({ ...s, error: error.message }));
          } else {
            setState((s) => ({ ...s, active: true, error: null, permissionDenied: false, lastUpdate: new Date() }));
          }
        } finally {
          sendingRef.current = false;
        }
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setState({
          active: false,
          permissionDenied: denied,
          error: denied ? "Permissão de localização negada." : err.message,
          lastUpdate: null,
        });
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );

    watchIdRef.current = id;
    setState((s) => ({ ...s, active: true }));

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [ofertaId, user?.id]);

  return state;
}
