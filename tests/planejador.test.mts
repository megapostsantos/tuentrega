import { lerPlanilha, cepValido, formataCep } from "../src/lib/cep.ts";
import { ordenarParadas, estimarMinutos, haversineDistance } from "../src/lib/route-optimizer.ts";
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };

ok("CEP válido", cepValido("11060-001") && cepValido("11060001") && !cepValido("1106") && formataCep("11060001") === "11060-001");
let l = lerPlanilha("Código\tCEP\tEndereço\tNúmero\nBR123\t11060-001\tRua A\t10\nBR124\t11070100\tRua B\t");
ok("planilha com cabeçalho (tab)", l.length === 2 && l[0].codigo === "BR123" && l[0].cep === "11060001" && l[0].endereco === "Rua A, 10" && l[1].endereco === "Rua B", l);
l = lerPlanilha("cep;pacote\n11060001;X1\n99;X2\n11070-100;X3");
ok("CSV ; ignora CEP inválido", l.length === 2 && l[1].codigo === "X3", l);
l = lerPlanilha("11060-001\n11070100\nlixo");
ok("só CEPs, sem cabeçalho", l.length === 2 && l[0].cep === "11060001", l);
l = lerPlanilha("BR9, 11060001, Rua C 5");
ok("sem cabeçalho: código, CEP, endereço", l.length === 1 && l[0].codigo === "BR9" && l[0].endereco === "Rua C 5", l);
ok("planilha vazia", lerPlanilha("").length === 0);

// otimização: pontos numa linha, embaralhados
const o = { lat: 0, lng: 0 };
const pts = [5, 1, 4, 2, 3].map((x) => ({ id: x, lat: 0, lng: x * 0.01 }));
const r = ordenarParadas(o, pts);
ok("ordena em linha reta", r.ordem.map((p) => p.id).join() === "1,2,3,4,5", r.ordem.map((p) => p.id));
ok("distância total = ida até o fim", Math.abs(r.km - haversineDistance(0, 0, 0, 0.05)) < 0.01, r.km);
// 2-opt corrige zigue-zague
const z = [{ id: "a", lat: 0, lng: 0.01 }, { id: "b", lat: 0.01, lng: 0.01 }, { id: "c", lat: 0.01, lng: 0 }, { id: "d", lat: 0, lng: 0.02 }];
const rz = ordenarParadas({ lat: 0, lng: 0 }, z);
const naive = (() => { let k = 0, p: any = { lat: 0, lng: 0 }; for (const q of z) { k += haversineDistance(p.lat, p.lng, q.lat, q.lng); p = q; } return k; })();
ok("nunca pior que a ordem original", rz.km <= naive + 1e-9 && rz.ordem.length === 4, [rz.km, naive]);
ok("sem paradas", ordenarParadas(o, []).ordem.length === 0);
const grande = Array.from({ length: 300 }, (_, i) => ({ lat: Math.sin(i) * 0.05, lng: Math.cos(i * 1.7) * 0.05 }));
const t0 = Date.now(); const rg = ordenarParadas(o, grande);
ok("300 paradas em poucos segundos", rg.ordem.length === 300 && Date.now() - t0 < 8000, Date.now() - t0);
ok("tempo estimado", estimarMinutos(25, 10) === 60 + 30, estimarMinutos(25, 10));
console.log(fail ? `${fail} FALHAS` : "✔ planejador.test.mts");
process.exit(fail ? 1 : 0);
