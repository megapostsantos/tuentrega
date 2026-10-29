/** Cada linha: "Nome da zona 120" ou "Nome;120;15" (paradas opcional, só com ponto e vírgula). */
export function parseZonas(texto: string): { nome: string; pacotes: number; paradas: number }[] {
  const out: { nome: string; pacotes: number; paradas: number }[] = [];
  for (const raw of texto.split(/\r?\n/)) {
    const linha = raw.trim();
    if (!linha) continue;
    if (/[;\t]/.test(linha)) {
      const [n, p, s] = linha.split(/[;\t]/).map((x) => x.trim());
      const pk = parseInt(p ?? "", 10);
      if (n && pk > 0) out.push({ nome: n, pacotes: pk, paradas: parseInt(s ?? "", 10) || 0 });
      continue;
    }
    const m = linha.match(/^(.*?)[\s:,\-–]*(\d+)\s*(?:pacotes?|pcs?|p)?\.?$/i);
    if (m && m[1].trim() && Number(m[2]) > 0) out.push({ nome: m[1].trim(), pacotes: Number(m[2]), paradas: 0 });
  }
  return out;
}
