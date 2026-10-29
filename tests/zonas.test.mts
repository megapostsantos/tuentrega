import { parseZonas } from "../src/lib/zonas.ts";
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
let r = parseZonas("Zona Norte 120\nZona 1 85\nCentro - 60\nLeste: 40 pacotes\n\nSul;90;35\nsó texto\nZero 0");
ok("5 zonas válidas", r.length === 5, r);
ok("nome com número", r[1].nome === "Zona 1" && r[1].pacotes === 85, r[1]);
ok("separador e sufixo", r[2].nome === "Centro" && r[2].pacotes === 60 && r[3].nome === "Leste" && r[3].pacotes === 40, r);
ok("paradas opcional com ;", r[4].nome === "Sul" && r[4].pacotes === 90 && r[4].paradas === 35, r[4]);
ok("soma", r.reduce((s, z) => s + z.pacotes, 0) === 395);
process.exit(fail ? 1 : 0);
