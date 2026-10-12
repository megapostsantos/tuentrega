import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/db";
import { entregasPacotes } from "@/db/schema";
import { eq } from "drizzle-orm";

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

export const updatePacoteStatus = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.string(),
        foto_pod_url: z.string().optional(),
        motivo_nao_entrega: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await db
      .update(entregasPacotes)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(entregasPacotes.id, data.id));
    return { success: true };
  });
