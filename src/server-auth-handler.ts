import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  const rawRequest: Request = (event as any).req;
  const { auth } = await import("./lib/auth");
  (globalThis as any).__lastAuthError = undefined;
  let response: Response;
  try {
    response = await auth.handler(rawRequest);
  } catch (e: any) {
    console.error("[auth] handler falhou:", e?.message ?? e);
    return Response.json({ message: "Erro interno ao processar o pedido." }, { status: 500 });
  }
  if (response.status >= 500 && !(response.headers.get("content-length") ?? "").replace("0", "")) {
    console.error("[auth] erro 5xx:", (globalThis as any).__lastAuthError ?? "sem detalhe");
    return Response.json({ message: "Falha no servidor. Tente de novo em instantes." }, { status: response.status });
  }
  return response;
});
