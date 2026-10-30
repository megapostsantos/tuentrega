import { parseZonas } from "../src/lib/zonas.ts";
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
let r = parseZonas("Zona Norte 120\nZona 1 85\nCentro - 60\nLeste: 40 pacotes\n\nSul;90;35\nsó texto\nZero 0");
ok("5 zonas válidas", r.length === 5, r);
ok("nome com número", r[1].nome === "Zona 1" && r[1].pacotes === 85, r[1]);
ok("separador e sufixo", r[2].nome === "Centro" && r[2].pacotes === 60 && r[3].nome === "Leste" && r[3].pacotes === 40, r);
ok("paradas opcional com ;", r[4].nome === "Sul" && r[4].pacotes === 90 && r[4].paradas === 35, r[4]);
ok("soma", r.reduce((s, z) => s + z.pacotes, 0) === 395);
const ml = parseZonas("1055 paradas, 1982 pacotes\nMega 16 135\nGonzaga 1\t54\t101\nEstuário PP;106;191\nSem zona\n5\n8\nZé Menino\n42\n94\nCampo gnd 2 51 70", "ml");
ok("formato ML: 6 zonas", ml.length === 6, ml);
ok("ML: nome, paradas, pacotes", ml[0].nome === "Mega" && ml[0].paradas === 16 && ml[0].pacotes === 135, ml[0]);
ok("ML: nome com número e tab", ml[1].nome === "Gonzaga 1" && ml[1].paradas === 54 && ml[1].pacotes === 101, ml[1]);
ok("ML: campos em linhas separadas", ml[3].nome === "Sem zona" && ml[3].paradas === 5 && ml[3].pacotes === 8 && ml[4].nome === "Zé Menino" && ml[4].pacotes === 94, ml);
ok("ML: nome com número no fim", ml[5].nome === "Campo gnd 2" && ml[5].paradas === 51 && ml[5].pacotes === 70, ml[5]);
const real = parseZonas(`Mega 16 135
Vila 63 118
Marape 39 53
Zé Menino 42 94
Campo Grande 52 94
Pompeia 44 92
Gonzaga 1 54 101
Gonzaga 2 47 86
Vila Nova 38 51
Vila Mathias 25 28
Campo gnd 2 51 70
Encruzilhada 51 103
Silva Jardim 44 66
Boqueirão 65 147
Estuário PP 106 191
Aparecida 85 146
Embare 60 131
Palmares 58 93
Macuco 41 53
Embare Praia 69 122
Sem zona 5 8`, "ml");
ok("lista real: 21 zonas, 1982 pacotes e 1055 paradas", real.length === 21 && real.reduce((a, z) => a + z.pacotes, 0) === 1982 && real.reduce((a, z) => a + z.paradas, 0) === 1055, { n: real.length, p: real.reduce((a, z) => a + z.pacotes, 0), s: real.reduce((a, z) => a + z.paradas, 0) });
process.exit(fail ? 1 : 0);
