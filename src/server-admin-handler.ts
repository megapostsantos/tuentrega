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

  if (url.pathname === "/api/admin/reset-password" && req.method === "POST") {
    const body: any = await req.json().catch(() => null);
    const alvo = String(body?.userId ?? "");
    if (!alvo) return Response.json({ error: "parâmetros inválidos" }, { status: 400 });
    const existe = await rawQuery(`select "id", "name", "email" from "user" where "id" = $1`, [alvo]);
    if (!existe.length) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const senha = Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
    try {
      await auth.api.setUserPassword({ body: { userId: alvo, newPassword: senha }, headers: req.headers });
      await auth.api.revokeUserSessions({ body: { userId: alvo }, headers: req.headers });
    } catch (e: any) {
      return Response.json({ error: e?.message ?? "Não foi possível redefinir a senha" }, { status: 500 });
    }
    await rawQuery(`create table if not exists "senhas_provisorias" ("user_id" text primary key, "criada_em" timestamp not null default now())`);
    await rawQuery(`insert into "senhas_provisorias" ("user_id") values ($1) on conflict ("user_id") do update set "criada_em" = now()`, [alvo]);
    await rawQuery(`insert into "admin_logs" ("admin_id","action","target") values ($1,'reset_senha',$2)`, [user.id, alvo]);
    return Response.json({ senha, nome: existe[0].name, email: existe[0].email });
  }

  if (url.pathname === "/api/admin/limpeza" && req.method === "GET") {
    const { previaLimpeza } = await import("./server/limpeza");
    return Response.json(await previaLimpeza());
  }

  if (url.pathname === "/api/admin/limpeza" && req.method === "POST") {
    const body: any = await req.json().catch(() => null);
    if (body?.confirmar !== "LIMPAR" || !["operacional", "contas"].includes(body?.modo))
      return Response.json({ error: "Confirmação inválida" }, { status: 400 });
    const { executarLimpeza } = await import("./server/limpeza");
    try {
      return Response.json(await executarLimpeza(body.modo, Array.isArray(body.manter) ? body.manter : [], user.id));
    } catch (e: any) {
      return Response.json({ error: e?.message ?? "Falha na limpeza" }, { status: 500 });
    }
  }

  return Response.json({ error: "not found" }, { status: 404 });
});
