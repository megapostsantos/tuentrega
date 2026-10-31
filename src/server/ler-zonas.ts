// Lê uma foto/print da tela "Distribuição por zonas" do marketplace e devolve as zonas (nome, paradas, pacotes).
export type ZonaLida = { nome: string; paradas: number; pacotes: number };
export type ResultadoZonas = { zonas: ZonaLida[]; totalPacotes: number | null; totalParadas: number | null };

const FERRAMENTA = {
  name: "registrar_zonas",
  description: "Registra as zonas lidas da imagem.",
  input_schema: {
    type: "object",
    properties: {
      zonas: {
        type: "array",
        description: "Uma entrada por linha da lista, na ordem em que aparecem. Inclua também linhas como 'Sem zona'.",
        items: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome da zona exatamente como escrito" },
            paradas: { type: "integer", description: "Número ao lado do ícone de pino/localização (paradas)" },
            pacotes: { type: "integer", description: "Número ao lado do ícone de caixa (pacotes)" },
          },
          required: ["nome", "paradas", "pacotes"],
        },
      },
      total_paradas: { type: "integer", description: "Total de paradas do cabeçalho (ex.: '1055 paradas, 1982 pacotes'). Omita se não estiver visível." },
      total_pacotes: { type: "integer", description: "Total de pacotes do cabeçalho. Omita se não estiver visível." },
    },
    required: ["zonas"],
  },
} as const;

const PROMPT =
  "Estas imagens são partes da tela 'Distribuição por zonas' de um marketplace de logística. Cada linha tem o nome da zona, " +
  "um número com ícone de pino (paradas) e um número com ícone de caixa (pacotes). As imagens podem se sobrepor (a mesma zona aparecendo em mais de uma): liste cada zona UMA única vez. Leia TODAS as linhas visíveis, sem pular nenhuma " +
  "e sem inventar valores. Se houver cabeçalho com totais (paradas e pacotes), informe-os. Responda chamando a ferramenta registrar_zonas (sem texto antes ou depois).";

/** Interpreta a resposta da API (tool_use) e valida os números. */
export function interpretarResposta(resp: any): ResultadoZonas {
  const bloco = (resp?.content ?? []).find((b: any) => b?.type === "tool_use" && b?.name === "registrar_zonas");
  let inp: any = bloco?.input;
  if (!inp) {
    // alguns modelos respondem em texto: aceita um JSON com {"zonas": [...]}
    const texto = (resp?.content ?? []).filter((b: any) => b?.type === "text").map((b: any) => String(b.text)).join("\n");
    const m = texto.match(/\{[\s\S]*\}/);
    try { inp = m ? JSON.parse(m[0]) : null; } catch { inp = null; }
  }
  if (!inp || !Array.isArray(inp.zonas)) throw new Error("Não consegui ler a imagem. Tente uma foto mais nítida, mostrando a lista inteira.");
  const zonas: ZonaLida[] = (Array.isArray(inp.zonas) ? inp.zonas : [])
    .map((z: any) => ({ nome: String(z?.nome ?? "").trim(), paradas: Math.max(0, Math.floor(Number(z?.paradas) || 0)), pacotes: Math.max(0, Math.floor(Number(z?.pacotes) || 0)) }))
    .filter((z: ZonaLida) => z.nome && z.pacotes > 0);
  const n = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : null);
  const vistos = new Set<string>();
  const unicas = zonas.filter((z) => {
    const k = `${z.nome.toLowerCase()}|${z.paradas}|${z.pacotes}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  return { zonas: unicas, totalPacotes: n(inp.total_pacotes), totalParadas: n(inp.total_paradas) };
}

export async function lerZonasDaImagem(imagens: { data: string; mediaType: string }[], apiKey: string): Promise<ResultadoZonas> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 4000,
      tools: [FERRAMENTA],
      messages: [{ role: "user", content: [...imagens.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mediaType, data: i.data } })), { type: "text", text: PROMPT }] }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[ler-zonas] Anthropic respondeu", res.status, t.slice(0, 300));
    let detalhe = "";
    try { detalhe = JSON.parse(t)?.error?.message ?? ""; } catch { detalhe = t.slice(0, 160); }
    const base = res.status === 401 ? "A chave da leitura por imagem está inválida." : res.status === 429 ? "Limite de uso da leitura por imagem atingido. Tente em alguns minutos." : "A leitura por imagem falhou.";
    throw new Error(`${base} (${res.status}${detalhe ? `: ${detalhe}` : ""})`);
  }
  return interpretarResposta(await res.json());
}
