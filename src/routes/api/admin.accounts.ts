import { createAPIFileRoute } from "@tanstack/start/api";
import { db } from "@/db";
import { empresas, entregadores, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const APIRoute = createAPIFileRoute("/api/admin/accounts")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "empresa") {
      const rows = await db
        .select({ id: empresas.id, name: empresas.razao_social })
        .from(empresas)
        .orderBy(empresas.razao_social)
        .limit(200);
      return Response.json(rows);
    }

    if (type === "entregador") {
      const rows = await db
        .select({ id: entregadores.id, name: entregadores.nome_completo })
        .from(entregadores)
        .orderBy(entregadores.nome_completo)
        .limit(200);
      return Response.json(rows);
    }

    return Response.json({ error: "type must be empresa or entregador" }, { status: 400 });
  },
});
