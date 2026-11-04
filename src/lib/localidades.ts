/** Cidades (IBGE) e bairros (OpenStreetMap) — consultas públicas feitas pelo navegador, com cache local. */
export const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function cache<T>(k: string): T | null { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } }
function guarda(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem cache */ } }

export async function cidadesDaUF(uf: string): Promise<{ id: number; nome: string }[]> {
  const k = `ibge:${uf}`;
  const c = cache<{ id: number; nome: string }[]>(k);
  if (c?.length) return c;
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
  if (!r.ok) throw new Error("IBGE indisponível");
  const l = ((await r.json()) as { id: number; nome: string }[]).map((m) => ({ id: m.id, nome: m.nome }));
  guarda(k, l);
  return l;
}

/** Bairros mapeados no OpenStreetMap para a cidade. Pode vir incompleto: o usuário também pode digitar. */
export async function bairrosDaCidade(cidade: string, uf: string): Promise<string[]> {
  const k = `osm:${uf}:${semAcento(cidade)}`;
  const c = cache<string[]>(k);
  if (c?.length) return c;
  const q = `[out:json][timeout:25];area["boundary"="administrative"]["name"="${cidade.replace(/"/g, "")}"]["admin_level"="8"]->.c;(node["place"~"^(suburb|neighbourhood|quarter)$"](area.c);way["place"~"^(suburb|neighbourhood|quarter)$"](area.c););out tags 800;`;
  const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: q }) });
  if (!r.ok) throw new Error("Mapa indisponível");
  const j = (await r.json()) as { elements: { tags?: { name?: string } }[] };
  const nomes = [...new Set(j.elements.map((e) => e.tags?.name).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  if (nomes.length) guarda(k, nomes);
  return nomes;
}

/** Formato guardado: "Gonzaga (Santos-SP)". */
export const rotuloBairro = (b: string, cidade: string, uf: string) => `${b.trim()} (${cidade}-${uf})`;
