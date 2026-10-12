import { db } from "@/db";
import { empresas, entregadores } from "@/db/schema";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "empresa") {
      const rows = await db
        .select({ id: empresas.id, name: empresas.razaoSocial })
        .from(empresas)
        .orderBy(empresas.razaoSocial)
        .limit(200);
      return Response.json(rows);
    }

    if (type === "entregador") {
      const rows = await db
        .select({ id: entregadores.id, name: entregadores.nomeCompleto })
        .from(entregadores)
        .orderBy(entregadores.nomeCompleto)
        .limit(200);
      return Response.json(rows);
    }

    return Response.json({ error: "type must be empresa or entregador" }, { status: 400 });
  },
};
