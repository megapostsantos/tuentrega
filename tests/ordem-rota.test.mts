import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2) on conflict do nothing`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B') on conflict do nothing`);
await pg.query(`insert into entregadores (id,nome_completo,status) values ('D1','Ana','ativo'),('D2','Beto','ativo') on conflict do nothing`);
await pg.query(`insert into ofertas (id,empresa_id,entregador_id,titulo,tipo,status,quantidade_pacotes) values ('00000000-0000-0000-0000-0000000000a1','E1','D1','Rota','distribuicao','in_progress',3)`);
await pg.query(`insert into entregas_pacotes (id,oferta_id,numero_pacote,cep,status) values
 ('00000000-0000-0000-0000-000000000b01','00000000-0000-0000-0000-0000000000a1',1,'11060001','pending'),
 ('00000000-0000-0000-0000-000000000b02','00000000-0000-0000-0000-0000000000a1',2,'11070100','pending'),
 ('00000000-0000-0000-0000-000000000b03','00000000-0000-0000-0000-0000000000a1',3,'11080200','pending')`);
const OF = "00000000-0000-0000-0000-0000000000a1";
const it = [{ id: "00000000-0000-0000-0000-000000000b02", ordem: 100001, lat: -23.96, lng: -46.33, dist: 1200.4 }, { id: "00000000-0000-0000-0000-000000000b01", ordem: 100002, lat: -23.97, lng: -46.34, dist: 900 }, { id: "x", ordem: "abc" }, { id: "00000000-0000-0000-0000-000000000b03", ordem: 100003 }];
let r: any = await rpc({ userId: "D2", role: "entregador" }, "salvar_ordem_rota", { oferta_id: OF, itens: it });
ok("outro entregador não salva", !!r.error, r);
r = await rpc({ userId: "E2", role: "empresa" }, "salvar_ordem_rota", { oferta_id: OF, itens: it });
ok("outra empresa não salva", !!r.error, r);
r = await rpc({ userId: "D1", role: "entregador" }, "salvar_ordem_rota", { oferta_id: OF, itens: it });
ok("entregador da rota salva em lote (itens inválidos ignorados)", !r.error && r.data.atualizados === 3, r);
const rows = (await pg.query(`select numero_pacote n, ordem_otimizada o, lat, lng, distancia_anterior_metros d, cep from entregas_pacotes order by ordem_otimizada`)).rows as any[];
ok("ordem e localização gravadas, CEP preservado", rows[0].n === 2 && rows[0].o === 100001 && Number(rows[0].lat) === -23.96 && rows[0].cep === "11070100" && Number(rows[0].d) === 1200, rows);
ok("sem coordenada mantém a anterior (null)", rows[2].lat === null && rows[2].o === 100003, rows);
r = await rpc({ userId: "E1", role: "empresa" }, "salvar_ordem_rota", { oferta_id: OF, itens: [{ id: "00000000-0000-0000-0000-000000000b01", ordem: 5 }] });
ok("empresa dona também salva (operando pelo parceiro)", !r.error && r.data.atualizados === 1, r);
r = await rpc({ userId: "D1", role: "entregador" }, "salvar_ordem_rota", { oferta_id: "00000000-0000-0000-0000-0000000000ff", itens: it });
ok("rota inexistente recusada", !!r.error, r);
console.log(fail ? `${fail} FALHAS` : "✔ ordem-rota.test.mts");
process.exit(fail ? 1 : 0);
