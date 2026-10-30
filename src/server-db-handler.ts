import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const req: Request = (event as any).req;
  const url = new URL(req.url);

  if (url.pathname === "/api/db/setup") {
    const { auth } = await import("./lib/auth");
    const session = await auth.api.getSession({ headers: req.headers });
    if ((session?.user as any)?.role !== "admin") {
      if (url.searchParams.get("offset") !== null) return Response.json({ error: "forbidden" }, { status: 403 });
      const page = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup do banco</title><body style="font-family:system-ui;padding:24px;max-width:640px;margin:auto">
<h2>Entre como administrador</h2>
<p>Este navegador não está logado como <strong>admin</strong>. Entre com a conta de administrador e abra este endereço de novo.</p>
<p><a href="/auth" style="display:inline-block;padding:12px 20px;background:#7C5CFF;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">Ir para o login</a></p>
</body>`;
      return new Response(page, { status: 403, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.searchParams.get("offset") === null) {
      const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Setup do banco</title><body style="font-family:system-ui;padding:24px;max-width:640px;margin:auto">
<h2>Configurando o banco...</h2><p id="s">Iniciando...</p><pre id="e" style="white-space:pre-wrap;color:#b00020"></pre>
<script>
(async()=>{let off=0,errs=[],total=0;
while(off!==null){
 try{const r=await fetch("/api/db/setup?offset="+off+"&limit=40",{credentials:"same-origin"});const j=await r.json();
  if(!r.ok){errs.push(JSON.stringify(j));break}
  total=j.total;errs.push(...j.failed.map(f=>f.error+" :: "+f.stmt));off=j.next;
  document.getElementById("s").textContent="Executando... "+Math.min(off??total,total)+" de "+total;
 }catch(e){errs.push(String(e));break}}
document.querySelector("h2").textContent=errs.length?"Terminou com "+errs.length+" erro(s)":"Concluído com sucesso";
document.getElementById("s").textContent=errs.length?"Copie o texto abaixo e envie para o suporte:":"Pode fechar esta página e voltar ao app.";
document.getElementById("e").textContent=errs.join("\\n\\n");})();
</script></body>`;
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    const { runSetupBatch } = await import("./server/data-engine");
    const { default: sqlText } = await import("./db/setup-sql");
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
    const limit = Math.min(45, Math.max(1, parseInt(url.searchParams.get("limit") ?? "40", 10) || 40));
    return Response.json(await runSetupBatch(sqlText, offset, limit));
  }

  if (url.pathname === "/api/db/must-change-password" && req.method === "GET") {
    const { auth } = await import("./lib/auth");
    const session = await auth.api.getSession({ headers: req.headers });
    const u = session?.user as any;
    if (!u) return Response.json({ must: false });
    const { rawQuery } = await import("./server/data-engine");
    try {
      const r = await rawQuery(`select 1 from "senhas_provisorias" where "user_id" = $1`, [u.id]);
      return Response.json({ must: r.length > 0 }, { headers: { "cache-control": "no-store" } });
    } catch {
      return Response.json({ must: false });
    }
  }

  if (url.pathname === "/api/db/password-changed" && req.method === "POST") {
    const { auth } = await import("./lib/auth");
    const session = await auth.api.getSession({ headers: req.headers });
    const u = session?.user as any;
    if (!u) return Response.json({ error: "Não autenticado" }, { status: 401 });
    const { rawQuery } = await import("./server/data-engine");
    try {
      await rawQuery(`delete from "senhas_provisorias" where "user_id" = $1`, [u.id]);
    } catch {
      /* tabela ainda não existe: nada a limpar */
    }
    return Response.json({ ok: true });
  }

  if (url.pathname === "/api/db/claim-invite" && req.method === "POST") {
    const body: any = await req.json().catch(() => null);
    if (!body?.email || !body?.codigo || !body?.senha) return Response.json({ error: "Preencha e-mail, código e senha." }, { status: 400 });
    const { resgatarConvite } = await import("./server/data-engine");
    const r = await resgatarConvite(String(body.email), String(body.codigo), String(body.senha));
    return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.message }, { status: r.status });
  }

  if (url.pathname === "/api/db/register" && req.method === "POST") {
    const { auth } = await import("./lib/auth");
    const session = await auth.api.getSession({ headers: req.headers });
    const user = session?.user as any;
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }
    const { registerProfile } = await import("./server/data-engine");
    const r = await registerProfile({ id: user.id, name: user.name, role: user.role ?? null }, body?.role, body?.data ?? {});
    return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.message }, { status: r.status });
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
