import { interpretarResposta, lerZonasDaImagem } from "../src/server/ler-zonas.ts";
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const resp = { content: [{ type: "text", text: "ok" }, { type: "tool_use", name: "registrar_zonas", input: { zonas: [{ nome: " Mega ", paradas: 16, pacotes: 135 }, { nome: "Gonzaga 1", paradas: "54", pacotes: 101.4 }, { nome: "", paradas: 1, pacotes: 5 }, { nome: "Zerada", paradas: 3, pacotes: 0 }], total_paradas: 1055, total_pacotes: "1982" } }] };
const r = interpretarResposta(resp);
ok("normaliza números e nomes", r.zonas.length === 2 && r.zonas[0].nome === "Mega" && r.zonas[1].pacotes === 101 && r.zonas[1].paradas === 54, r);
ok("descarta linhas sem nome ou sem pacotes", !r.zonas.some((z) => !z.nome || z.pacotes <= 0), r);
ok("totais do cabeçalho", r.totalPacotes === 1982 && r.totalParadas === 1055, r);
let err = ""; try { interpretarResposta({ content: [{ type: "text", text: "não consegui" }] }); } catch (e: any) { err = e.message; }
ok("sem ferramenta = erro amigável", /nítida/.test(err), err);
let enviado: any = null;
(globalThis as any).fetch = async (url: string, init: any) => { enviado = { url, init }; return { ok: true, json: async () => resp }; };
const lido = await lerZonasDaImagem("AAAA", "image/jpeg", "sk-teste");
const corpo = JSON.parse(enviado.init.body);
ok("chama a API com imagem e ferramenta forçada", enviado.url.includes("anthropic.com") && corpo.tool_choice.name === "registrar_zonas" && corpo.messages[0].content[0].type === "image" && enviado.init.headers["x-api-key"] === "sk-teste", corpo.tool_choice);
ok("devolve as zonas", lido.zonas.length === 2);
(globalThis as any).fetch = async () => ({ ok: false, status: 401, text: async () => "x" });
let e2 = ""; try { await lerZonasDaImagem("A", "image/jpeg", "k"); } catch (e: any) { e2 = e.message; }
ok("chave inválida tem mensagem clara", /chave/.test(e2), e2);
process.exit(fail ? 1 : 0);
