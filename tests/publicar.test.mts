import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf) values ('D1','Ana','ativo','111')`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };

const op = (await run(E1, { table: "operacoes", op: "insert", values: { data_operacao: "2026-11-02", total_pacotes_sistema: 8, total_pacotes_contados: 8, total_paradas: 6, valor_por_pacote: 2, status: "draft", origem: "Mercado Livre" }, returning: true, single: "single" })).data.id;
const rs = (await run(E1, { table: "rotas_operacao", op: "insert", values: [
  { operacao_id: op, nome: "Zona 1", quantidade_pacotes: 5, quantidade_paradas: 4, valor_total: 10, status: "draft" },
  { operacao_id: op, nome: "Zona 2", quantidade_pacotes: 3, quantidade_paradas: 2, valor_total: 6, status: "draft" }], returning: true })).data;
ok("insere rotas em lote", rs.length === 2, rs);
await run(E1, { table: "alocacoes", op: "insert", values: { operacao_id: op, rota_id: rs[0].id, entregador_id: "D1", status: "allocated" } });
let r: any = await rpc(E2, "publicar_rotas", { _operacao_id: op });
ok("outra empresa não publica", !!r.error, r);
r = await rpc(E1, "publicar_rotas", { _operacao_id: op });
ok("publica as 2 rotas", !r.error && r.data.publicadas === 2, r);
const of = (await pg.query(`select titulo, status, entregador_id, quantidade_pacotes from ofertas where operacao_id=$1 order by titulo`, [op])).rows as any[];
ok("rota alocada vira accepted, outra open", of[0].status === "accepted" && of[0].entregador_id === "D1" && of[1].status === "open", of);
const pk = (await pg.query(`select count(*)::int c from entregas_pacotes where operacao_id=$1`, [op])).rows[0] as any;
ok("cria 8 pacotes", pk.c === 8, pk);
r = await rpc(E1, "publicar_rotas", { _operacao_id: op });
ok("segunda publicação não duplica", r.data.publicadas === 0, r);
const al = (await pg.query(`select oferta_id from alocacoes where rota_id=$1`, [rs[0].id])).rows[0] as any;
ok("alocação recebe a oferta", !!al.oferta_id, al);
process.exit(fail ? 1 : 0);
