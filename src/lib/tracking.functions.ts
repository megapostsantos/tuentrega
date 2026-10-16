import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TrackingPacote = {
  id: string;
  numero_pacote: number;
  status: string;
  endereco_entrega: string | null;
  lat?: number | null;
  lng?: number | null;
  foto_pod_url?: string | null;
  entregue_em?: string | null;
  motivo_nao_entrega?: string | null;
  created_at: string;
  updated_at: string;
  oferta_id?: string | null;
  data_trabalho?: string | null;
  hora_inicio?: string | null;
};

export const getTrackingByToken = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ token: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data: _data }): Promise<{ pacote: TrackingPacote; oferta: { data_trabalho?: string | null; hora_inicio?: string | null; status?: string | null } | null } | null> => {
    // TODO: entregasPacotes does not have token_rastreamento column yet
    // This needs a schema migration to add that column
    return null;
  });
