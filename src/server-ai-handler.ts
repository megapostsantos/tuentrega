import { defineEventHandler } from "h3";

const usos = new Map<string, number[]>();

export default defineEventHandler(async (event) => {
  const req: Request = (event as any).req;
  const url = new URL(req.url);
  if (url.pathname !== "/api/ai/ler-zonas" || req.method !== "POST") return Response.json({ error: "not found" }, { status: 404 });

  const { auth } = await import("./lib/auth");
  const session = await auth.api.getSession({ headers: req.headers });
  const user = session?.user as any;
  if (!user || !["empresa", "operador", "admin"].includes(user.role)) return Response.json({ error: "Sem permissão" }, { status: 403 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "A leitura por imagem ainda não foi ativada (falta a chave ANTHROPIC_API_KEY)." }, { status: 501 });

  // limite simples por usuário: 30 leituras por hora
  const agora = Date.now();
  const lista = (usos.get(user.id) ?? []).filter((t) => agora - t < 3_600_000);
  if (lista.length >= 30) return Response.json({ error: "Muitas leituras seguidas. Tente de novo mais tarde." }, { status: 429 });
  usos.set(user.id, [...lista, agora]);

  const body: any = await req.json().catch(() => null);
  const data = String(body?.image ?? "");
  const mediaType = String(body?.mediaType ?? "image/jpeg");
  if (!data || data.length > 7_000_000 || !/^image\/(jpeg|png|webp)$/.test(mediaType)) return Response.json({ error: "Imagem inválida ou grande demais." }, { status: 400 });

  try {
    const { lerZonasDaImagem } = await import("./server/ler-zonas");
    return Response.json(await lerZonasDaImagem(data, mediaType, key));
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Falha na leitura" }, { status: 502 });
  }
});
