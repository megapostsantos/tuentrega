/** CEP → localização (aproximada, nível de rua/bairro) para ordenar paradas. Tudo no navegador, com cache local. */
export type Ponto = { lat: number; lng: number };
export type PacoteImportado = { codigo: string; cep: string; endereco: string };

export const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");
export const cepValido = (v: unknown) => soDigitos(v).length === 8;
export const formataCep = (v: unknown) => { const d = soDigitos(v); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : String(v ?? ""); };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Lê texto de planilha (colado do Excel/Sheets = tabulação, ou CSV com ; ou ,). Reconhece cabeçalho; sem cabeçalho aceita "CEP" ou "código CEP endereço". */
export function lerPlanilha(texto: string): PacoteImportado[] {
  const linhas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return [];
  const sep = linhas[0].includes("\t") ? "\t" : linhas[0].includes(";") ? ";" : ",";
  const cel = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const cab = cel(linhas[0]).map(norm);
  const achar = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c === n || c.includes(n)));
  const iCep = achar("cep", "zip", "postal");
  const temCab = iCep >= 0 && !cepValido(cel(linhas[0])[iCep]);
  const iCod = temCab ? achar("codigo", "pacote", "etiqueta", "barras", "rastreio", "id") : -1;
  const iEnd = temCab ? achar("endereco", "logradouro", "rua", "address") : -1;
  const iNum = temCab ? achar("numero", "num", "nº") : -1;
  const dados = temCab ? linhas.slice(1) : linhas;
  const out: PacoteImportado[] = [];
  for (const l of dados) {
    const c = cel(l);
    let cep = "", codigo = "", endereco = "";
    if (temCab) {
      cep = c[iCep] ?? ""; codigo = iCod >= 0 ? c[iCod] ?? "" : ""; endereco = iEnd >= 0 ? c[iEnd] ?? "" : "";
      if (iNum >= 0 && c[iNum]) endereco = `${endereco}, ${c[iNum]}`.replace(/^, /, "");
    } else {
      const k = c.findIndex((x) => cepValido(x));
      if (k < 0) continue;
      cep = c[k]; codigo = k > 0 ? c[0] : ""; endereco = c.filter((_, i) => i !== k && i !== 0).join(", ");
    }
    if (!cepValido(cep)) continue;
    out.push({ codigo: codigo.trim(), cep: soDigitos(cep), endereco: endereco.trim() });
  }
  return out;
}

function lerCache(k: string): Ponto | null { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as Ponto) : null; } catch { return null; } }
function gravaCache(k: string, p: Ponto) { try { localStorage.setItem(k, JSON.stringify(p)); } catch { /* sem cache */ } }
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) && n !== 0 ? n : null; };
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tenta BrasilAPI, depois AwesomeAPI e por último o mapa aberto (Nominatim) com o endereço do ViaCEP. */
export async function localizarCep(cep: string): Promise<Ponto | null> {
  const d = soDigitos(cep);
  if (d.length !== 8) return null;
  const k = `cep:${d}`;
  const c = lerCache(k);
  if (c) return c;
  const salva = (lat: number | null, lng: number | null) => { if (lat != null && lng != null) { const p = { lat, lng }; gravaCache(k, p); return p; } return null; };
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${d}`);
    if (r.ok) { const j = await r.json(); const p = salva(num(j?.location?.coordinates?.latitude), num(j?.location?.coordinates?.longitude)); if (p) return p; }
  } catch { /* próxima fonte */ }
  try {
    const r = await fetch(`https://cep.awesomeapi.com.br/json/${d}`);
    if (r.ok) { const j = await r.json(); const p = salva(num(j?.lat), num(j?.lng)); if (p) return p; }
  } catch { /* próxima fonte */ }
  try {
    const v = await fetch(`https://viacep.com.br/ws/${d}/json/`).then((r) => (r.ok ? r.json() : null));
    if (v && !v.erro) {
      await pausa(1100);
      const q = [v.logradouro, v.bairro, v.localidade, v.uf, "Brasil"].filter(Boolean).join(", ");
      const n = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`, { headers: { "Accept-Language": "pt-BR" } }).then((r) => (r.ok ? r.json() : []));
      if (Array.isArray(n) && n[0]) return salva(num(n[0].lat), num(n[0].lon));
    }
  } catch { /* sem localização */ }
  return null;
}

/** Localiza vários CEPs (únicos), poucos por vez para não travar. Devolve cep → ponto. */
export async function localizarCeps(ceps: string[], onProgresso?: (feitos: number, total: number) => void): Promise<Map<string, Ponto>> {
  const unicos = [...new Set(ceps.map(soDigitos).filter((c) => c.length === 8))];
  const mapa = new Map<string, Ponto>();
  let feitos = 0;
  for (let i = 0; i < unicos.length; i += 4) {
    await Promise.all(unicos.slice(i, i + 4).map(async (c) => { const p = await localizarCep(c); if (p) mapa.set(c, p); feitos++; onProgresso?.(feitos, unicos.length); }));
  }
  return mapa;
}
