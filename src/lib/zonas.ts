export type Zona = { nome: string; pacotes: number; paradas: number };
export type FormatoZonas = "ml" | "simples";

/**
 * "ml": como aparece na tela de distribuição por zonas dos marketplaces — nome, paradas, pacotes
 *       (na mesma linha "Mega 16 135", separados por tab/;, ou cada campo em uma linha).
 * "simples": "Nome 120" ou "Nome;120;15" (paradas opcional, só com ponto e vírgula).
 */
export function parseZonas(texto: string, formato: FormatoZonas = "simples"): Zona[] {
  const out: Zona[] = [];
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (formato === "ml") {
    let nome: string | null = null;
    let nums: number[] = [];
    const fecha = () => {
      if (nome && nums.length >= 2 && nums[1] > 0) out.push({ nome, paradas: nums[0], pacotes: nums[1] });
      nome = null; nums = [];
    };
    for (const l of linhas) {
      if (/^\d+$/.test(l)) {
        if (nome) { nums.push(Number(l)); if (nums.length === 2) fecha(); }
        continue;
      }
      const m = l.match(/^(.+?)[\s;\t,]+(\d+)[\s;\t,]+(\d+)$/);
      if (m && /\D/.test(m[1])) {
        fecha();
        out.push({ nome: m[1].trim(), paradas: Number(m[2]), pacotes: Number(m[3]) });
        continue;
      }
      // linha só de texto (nome em uma linha, números nas próximas). Ignora cabeçalhos como "1055 paradas, 1982 pacotes".
      if (/^\d/.test(l) || /paradas|pacotes|total/i.test(l)) { fecha(); continue; }
      fecha();
      nome = l;
    }
    fecha();
    return out;
  }

  for (const linha of linhas) {
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
