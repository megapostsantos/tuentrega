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
      total_paradas: { type: ["integer", "null"], description: "Total de paradas do cabeçalho (ex.: '1055 paradas, 1982 pacotes'), se visível" },
      total_pacotes: { type: ["integer", "null"], description: "Total de pacotes do cabeçalho, se visível" },
    },
    required: ["zonas"],
  },
} as const;

const PROMPT =
  "Esta imagem é a tela 'Distribuição por zonas' de um marketplace de logística. Cada linha tem o nome da zona, " +
  "um número com ícone de pino (paradas) e um número com ícone de caixa (pacotes). Leia TODAS as linhas visíveis, sem pular nenhuma " +
  "e sem inventar valores. Se houver cabeçalho com totais (paradas e pacotes), informe-os. Responda chamando a ferramenta registrar_zonas.";

/** Interpreta a resposta da API (tool_use) e valida os números. */
export function interpretarResposta(resp: any): ResultadoZonas {
  const bloco = (resp?.content ?? []).find((b: any) => b?.type === "tool_use" && b?.name === "registrar_zonas");
  if (!bloco) throw new Error("Não consegui ler a imagem. Tente uma foto mais nítida, mostrando a lista inteira.");
  const inp = bloco.input ?? {};
  const zonas: ZonaLida[] = (Array.isArray(inp.zonas) ? inp.zonas : [])
    .map((z: any) => ({ nome: String(z?.nome ?? "").trim(), paradas: Math.max(0, Math.floor(Number(z?.paradas) || 0)), pacotes: Math.max(0, Math.floor(Number(z?.pacotes) || 0)) }))
    .filter((z: ZonaLida) => z.nome && z.pacotes > 0);
  const n = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : null);
  return { zonas, totalPacotes: n(inp.total_pacotes), totalParadas: n(inp.total_paradas) };
}

export async function lerZonasDaImagem(base64: string, mediaType: string, apiKey: string): Promise<ResultadoZonas> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 4000,
      tools: [FERRAMENTA],
      tool_choice: { type: "tool", name: "registrar_zonas" },
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: PROMPT }] }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[ler-zonas] Anthropic respondeu", res.status, t.slice(0, 300));
    throw new Error(res.status === 401 ? "A chave da leitura por imagem está inválida." : "A leitura por imagem não respondeu. Tente de novo em instantes.");
  }
  return interpretarResposta(await res.json());
}
