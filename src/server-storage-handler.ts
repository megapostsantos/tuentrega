import { defineEventHandler } from "h3";

const PUBLIC_BUCKETS = new Set(["provas-entrega"]);
// buckets com dados pessoais: só o dono do upload (ou admin) lê
const PRIVATE_BUCKETS = new Set(["entregador-docs", "financeiro-comprovantes"]);
let ready = false;
async function ensureTable(rawQuery: (t: string, p?: unknown[]) => Promise<any[]>) {
  if (ready) return;
  await rawQuery(
    `create table if not exists "storage_objects" (
       "bucket" text not null, "path" text not null, "content_type" text,
       "size" integer, "data" text not null, "created_at" timestamp not null default now(),
       primary key ("bucket","path"))`,
  );
  await rawQuery(`alter table "storage_objects" add column if not exists "owner" text`);
  ready = true;
}

export default defineEventHandler(async (event) => {
  const req: Request = (event as any).req;
  const url = new URL(req.url);
  const { rawQuery } = await import("./server/data-engine");
  await ensureTable(rawQuery);

  if (req.method === "GET" && url.pathname.startsWith("/api/storage/object/")) {
    const rest = decodeURIComponent(url.pathname.slice("/api/storage/object/".length));
    const i = rest.indexOf("/");
    const bucket = rest.slice(0, i);
    const path = rest.slice(i + 1);
    if (!PUBLIC_BUCKETS.has(bucket)) {
      const { auth } = await import("./lib/auth");
      const sess = await auth.api.getSession({ headers: req.headers });
      if (!sess?.user) return new Response("não autenticado", { status: 401 });
      if (PRIVATE_BUCKETS.has(bucket) && (sess.user as any).role !== "admin") {
        const own = await rawQuery(`select 1 from "storage_objects" where bucket=$1 and path=$2 and "owner"=$3`, [bucket, path, (sess.user as any).id]);
        if (!own.length) return new Response("not found", { status: 404 });
      }
    }
    const rows = await rawQuery(`select content_type, data from "storage_objects" where bucket=$1 and path=$2`, [bucket, path]);
    if (!rows.length) return new Response("not found", { status: 404 });
    const bin = atob(rows[0].data);
    const bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    return new Response(bytes, {
      headers: { "content-type": rows[0].content_type || "application/octet-stream", "cache-control": PUBLIC_BUCKETS.has(bucket) ? "public, max-age=3600" : "private, max-age=600" },
    });
  }

  const { auth } = await import("./lib/auth");
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const uid = (session.user as any).id as string;
  const isAdmin = (session.user as any).role === "admin";

  if (req.method === "POST") {
    const body: any = await req.json();
    if (url.pathname === "/api/storage/upload") {
      const { bucket, path, contentType, data, upsert } = body;
      if (!bucket || !path || !data) return Response.json({ error: "parâmetros inválidos" }, { status: 400 });
      try {
        await rawQuery(
          `insert into "storage_objects" (bucket, path, content_type, size, data, owner) values ($1,$2,$3,$4,$5,$6)
           ${upsert ? `on conflict (bucket, path) do update set content_type=excluded.content_type, size=excluded.size, data=excluded.data
             where "storage_objects"."owner" is null or "storage_objects"."owner" = $6 or $7::boolean` : ""}`,
          upsert
            ? [bucket, path, contentType ?? null, Math.floor((data.length * 3) / 4), data, uid, isAdmin]
            : [bucket, path, contentType ?? null, Math.floor((data.length * 3) / 4), data, uid],
        );
      } catch (e: any) {
        return Response.json({ error: e?.message ?? "falha no upload" }, { status: 409 });
      }
      return Response.json({ path });
    }
    if (url.pathname === "/api/storage/remove") {
      for (const p of body.paths ?? [])
        await rawQuery(`delete from "storage_objects" where bucket=$1 and path=$2 and ("owner" = $3 or $4::boolean)`, [body.bucket, p, uid, isAdmin]);
      return Response.json({ ok: true });
    }
    if (url.pathname === "/api/storage/list") {
      const rows = await rawQuery(
        `select path, size, created_at from "storage_objects" where bucket=$1 and path like $2 and ("owner" = $3 or $4::boolean) order by created_at desc limit 500`,
        [body.bucket, `${body.prefix ?? ""}%`, uid, isAdmin],
      );
      return Response.json({ items: rows });
    }
  }
  return Response.json({ error: "not found" }, { status: 404 });
});
