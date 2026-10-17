import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
function repartir(total: number, pesos: number[]): number[] {
  const W = pesos.reduce((a, b) => a + b, 0);
  if (W <= 0 || total <= 0) return pesos.map(() => 0);
  const raw = pesos.map((w) => (total * w) / W);
  const base = raw.map(Math.floor);
  let resto = total - base.reduce((a, b) => a + b, 0);
  const ordem = raw.map((r, i) => [r - base[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; resto > 0; k++, resto--) base[ordem[k % ordem.length][1]]++;
  return base;
}
const t = (n: string, c: boolean, x?: any) => console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x));
let r1 = repartir(500, [50, 60, 40]); t("500 em 50/60/40 soma 500", r1.reduce((a,b)=>a+b)===500 && r1.join()==="167,200,133", r1);
r1 = repartir(150, [50, 50, 50]); t("150 em 3 iguais", r1.join()==="50,50,50", r1);
r1 = repartir(10, [1,1,1]); t("10 em 3 → soma 10", r1.reduce((a,b)=>a+b)===10, r1);
r1 = repartir(100, [70]); t("um entregador leva tudo", r1[0]===100, r1);

const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','Emp')`);
await pg.query(`insert into entregadores (id,nome_completo,status) values ('D1','Ana Souza','ativo'),('D2','Beto Lima','ativo')`);
const E1 = { userId: "E1", role: "empresa" }, D1 = { userId: "D1", role: "entregador" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const dia = new Date().toISOString().slice(0,10);
const pv = (await run(E1, { table: "agenda_previsoes", op: "insert", values: { data_prevista: dia, pacotes_estimados: 100, status: "aberta", valor_por_pacote: 2 }, returning: true, single: "single" })).data.id;
await run(D1, { table: "agenda_compromissos", op: "insert", values: { previsao_id: pv, empresa_id: "E1", pacotes_comprometidos: 50 } });
await pg.query(`insert into agenda_compromissos (previsao_id, empresa_id, entregador_id, pacotes_comprometidos, pacotes_ajustados) values ($1,'E1','D2',40,60)`, [pv]);
let r = await run(E1, { table: "agenda_compromissos", op: "select", columns: "entregador_id, pacotes_comprometidos, pacotes_ajustados, entregadores(nome_completo)", filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }, { k: "not", col: "status", op: "eq", val: "cancelado" }], order: [{col:"created_at", asc:true}] });
t("empresa lê compromissos com nome", r.data?.length === 2 && r.data[1].entregadores?.nome_completo === "Beto Lima", r);
const op = (await run(E1, { table: "operacoes", op: "insert", values: { data_operacao: dia, total_pacotes_sistema: 110, total_paradas: 55, status: "draft" }, returning: true, single: "single" })).data.id;
const rota1 = (await run(E1, { table: "rotas_operacao", op: "insert", values: { operacao_id: op, nome: "Rota 1 · Ana", quantidade_pacotes: 50, quantidade_paradas: 25, valor_total: 100, status: "draft" }, returning: true, single: "single" })).data.id;
const rota2 = (await run(E1, { table: "rotas_operacao", op: "insert", values: { operacao_id: op, nome: "Rota 2 · Beto", quantidade_pacotes: 60, quantidade_paradas: 30, valor_total: 120, status: "draft" }, returning: true, single: "single" })).data.id;
r = await run(E1, { table: "alocacoes", op: "insert", values: [{ operacao_id: op, rota_id: rota1, entregador_id: "D1", status: "allocated" }, { operacao_id: op, rota_id: rota2, entregador_id: "D2", status: "allocated" }] });
t("empresa cria alocações das rotas", !r.error, r);
const of = await run(E1, { table: "ofertas", op: "insert", values: { titulo: "Rota 1", status: "accepted", entregador_id: "D1", operacao_id: op, rota_operacao_id: rota1, quantidade_pacotes: 50 }, returning: true, single: "single" });
t("oferta criada já atribuída", !of.error && of.data.entregador_id === "D1" && of.data.status === "accepted", of);
r = await run(E1, { table: "alocacoes", op: "update", values: { oferta_id: of.data.id }, filters: [{ k: "f", col: "rota_id", op: "eq", val: rota1 }], returning: true });
t("alocação recebe a oferta", r.data?.[0]?.oferta_id === of.data.id, r);
r = await run(E1, { table: "alocacoes", op: "select", columns: "*, entregadores(nome_completo)", filters: [{ k: "f", col: "operacao_id", op: "eq", val: op }] });
t("painel de alocação mostra os entregadores", r.data?.length === 2 && r.data.some((x: any) => x.entregadores?.nome_completo === "Ana Souza"), r);
r = await run(D1, { table: "ofertas", op: "select", columns: "titulo,status", filters: [{ k: "f", col: "entregador_id", op: "eq", val: "D1" }] });
t("entregador vê a rota que recebeu", r.data?.length === 1 && r.data[0].status === "accepted", r);
await pg.close();
