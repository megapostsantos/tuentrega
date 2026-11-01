// Defesa extra contra requisições vindas de outros sites (CSRF): em escritas, se o navegador informa a origem,
// ela precisa ser o próprio app (ou um endereço confiável).
const CONFIAVEIS = new Set(["https://tuentrega.com.br", "https://www.tuentrega.com.br", "https://tuentrega.megapostsantos.workers.dev", "http://localhost:5173"]);

export function origemInvalida(req: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false; // chamadas do servidor/ferramentas não enviam Origin; o cookie SameSite já protege os navegadores
  try {
    const o = new URL(origin);
    const u = new URL(req.url);
    return !(o.host === u.host || CONFIAVEIS.has(o.origin) || (process.env.BETTER_AUTH_URL && o.origin === new URL(process.env.BETTER_AUTH_URL).origin));
  } catch { return true; }
}
