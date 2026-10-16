import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const rawRequest: Request = (event as any).req;
  const { auth } = await import("./lib/auth");
  (globalThis as any).__lastAuthError = undefined;
  let response: Response;
  try {
    response = await auth.handler(rawRequest);
  } catch (e: any) {
    return Response.json({ message: `auth.handler threw: ${e?.message ?? e}` }, { status: 500 });
  }
  if (response.status >= 500 && !(response.headers.get("content-length") ?? "").replace("0", "")) {
    const detail = (globalThis as any).__lastAuthError ?? "erro interno sem detalhe (provável falha de banco)";
    return Response.json({ message: `Falha no servidor: ${detail}` }, { status: response.status });
  }
  return response;
});
