import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const req: Request = (event as any).req;
  const url = new URL(req.url);
  const { auth } = await import("./lib/auth");
  const session = await auth.api.getSession({ headers: req.headers });
  const user = session?.user as any;
  if (!user || user.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });
  const { rawQuery } = await import("./server/data-engine");

  if (url.pathname === "/api/admin/accounts" && req.method === "GET") {
    const type = url.searchParams.get("type");
    if (type === "empresa") {
      const rows = await rawQuery(
        `select "id", coalesce("nome_fantasia", "razao_social") as name from "empresas" order by 2 limit 500`,
      );
      return Response.json(rows);
    }
    if (type === "entregador") {
      const rows = await rawQuery(`select "id", "nome_completo" as name from "entregadores" order by 2 limit 500`);
      return Response.json(rows);
    }
    return Response.json({ error: "type deve ser empresa ou entregador" }, { status: 400 });
  }

  if (url.pathname === "/api/admin/impersonate" && req.method === "POST") {
    const body: any = await req.json().catch(() => null);
    if (!body?.targetUserId || !["empresa", "entregador"].includes(body?.targetType)) {
      return Response.json({ error: "parâmetros inválidos" }, { status: 400 });
    }
    const rows = await rawQuery(
      `insert into "admin_impersonations" ("admin_id","target_user_id","target_type") values ($1,$2,$3) returning "id"`,
      [user.id, String(body.targetUserId), body.targetType],
    );
    return Response.json({ id: rows[0]?.id ?? null });
  }

  return Response.json({ error: "not found" }, { status: 404 });
});
