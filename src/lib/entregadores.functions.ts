import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "@/db";
import { entregadores, userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";

const inviteSchema = z.object({
  nome_completo: z.string().min(2).max(120),
  email: z.string().email(),
  whatsapp: z.string().max(30).optional().nullable(),
  tipo_veiculo: z
    .enum(["moto", "carro", "bike", "van", "a_pe"])
    .optional()
    .nullable(),
  modelo_veiculo: z.string().max(80).optional().nullable(),
  placa: z.string().max(20).optional().nullable(),
  tipo_operacao: z.enum(["nex", "distribuicao", "ambos"]).default("ambos"),
  redirect_to: z.string().url().optional(),
});

export const inviteEntregador = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data }) => {
    // TODO: Implement invite flow with Better Auth
    // Better Auth's admin plugin can create users: auth.api.createUser(...)
    // For now return a not-implemented error
    throw new Error(
      "Convite de entregador requer configuração adicional do Better Auth admin plugin.",
    );
  });

// Get entregador profile
export const getEntregadorProfile = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ userId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(entregadores)
      .where(eq(entregadores.id, data.userId))
      .limit(1);
    return result[0] ?? null;
  });
