import { defineEventHandler } from "h3";

const SETUP_SECRET = "tuentrega-reset-2024";

export default defineEventHandler(async (event) => {
  const req: Request = (event as any).req;
  const url = new URL(req.url);

  if (url.pathname === "/api/db/setup") {
    if (url.searchParams.get("secret") !== SETUP_SECRET) return Response.json({ error: "forbidden" }, { status: 403 });
    const { runSetupSql } = await import("./server/data-engine");
    const { default: sqlText } = await import("./db/setup-sql");
    return Response.json(await runSetupSql(sqlText));
  }

  if (url.pathname === "/api/db/query" && req.method === "POST") {
    const { auth } = await import("./lib/auth");
    const session = await auth.api.getSession({ headers: req.headers });
    const user = session?.user as any;
    const { executeQuery } = await import("./server/data-engine");
    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ data: null, error: { message: "JSON inválido" }, count: null }, { status: 400 });
    }
    const resp = await executeQuery(body, { userId: user?.id ?? null, role: user?.role ?? null });
    return Response.json(resp, { headers: { "cache-control": "no-store" } });
  }

  return Response.json({ error: "not found" }, { status: 404 });
});
