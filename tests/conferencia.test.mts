import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf) values ('D1','Ana','ativo','1')`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, OP = { userId: "E1", role: "empresa", operador: true };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const q1 = async (s: string, p: any[] = []) => (await pg.query(s, p)).rows[0] as any;

const op = (await run(E1, { table: "operacoes", op: "insert", values: { data_operacao: "2026-11-10", total_pacotes_sistema: 150, total_pacotes_contados: 150, total_paradas: 0, valor_por_pacote: 2, status: "draft", origem: "ML" }, returning: true, single: "single" })).data.id;
const rs = (await run(E1, { table: "rotas_operacao", op: "insert", values: [
  { operacao_id: op, nome: "Vila Belmiro", quantidade_pacotes: 100, quantidade_paradas: 50, valor_total: 200, status: "draft" },
  { operacao_id: op, nome: "Gonzaga", quantidade_pacotes: 50, quantidade_paradas: 20, valor_total: 100, status: "draft" }], returning: true })).data;
const [V, G] = rs;

let r: any = await rpc(E2, "ajustar_pacotes_rota", { _rota_id: V.id, _quantidade: 98 });
ok("outra empresa não ajusta", !!r.error, r);
r = await rpc(E1, "ajustar_pacotes_rota", { _rota_id: V.id, _quantidade: 98, _motivo: "1 avariado, 1 não veio" });
let v = await q1(`select quantidade_pacotes q, pacotes_sistema ps, valor_total vt, conferida c, ajuste_motivo m, quantidade_paradas p from rotas_operacao where id=$1`, [V.id]);
ok("rota de 100 vira 98, guardando o número do sistema e o motivo", !r.error && v.q === 98 && v.ps === 100 && v.m === "1 avariado, 1 não veio" && v.c === true, v);
ok("valor acompanha (R$ 2 por pacote)", Number(v.vt) === 196 && v.p === 49, v);
let o = await q1(`select total_pacotes_contados c, pacotes_faltando f, pacotes_a_mais a from operacoes where id=$1`, [op]);
ok("totais da operação refletem a conferência (148 contados, 2 faltando)", o.c === 148 && o.f === 2 && o.a === 0, o);
await rpc(E1, "ajustar_pacotes_rota", { _rota_id: V.id, _quantidade: 97 });
v = await q1(`select pacotes_sistema ps from rotas_operacao where id=$1`, [V.id]);
ok("o número original do sistema é preservado em novos ajustes", v.ps === 100, v);
r = await rpc(OP, "ajustar_pacotes_rota", { _rota_id: G.id, _quantidade: 52 });
o = await q1(`select pacotes_a_mais a from operacoes where id=$1`, [op]);
ok("funcionário também confere (sem ver valores)", !r.error, r);

// publicada: oferta e pacotes acompanham
await rpc(E1, "publicar_rotas", { _operacao_id: op, _rota_ids: [V.id] });
const of = await q1(`select id, quantidade_pacotes q, valor from ofertas where rota_operacao_id=$1`, [V.id]);
ok("publicou só a rota escolhida (Gonzaga segue em rascunho)", of.q === 97 && (await q1(`select count(*)::int n from ofertas where operacao_id=$1`, [op])).n === 1);
await rpc(E1, "ajustar_pacotes_rota", { _rota_id: V.id, _quantidade: 90 });
ok("ajuste depois de publicar atualiza oferta e pacotes", (await q1(`select quantidade_pacotes q from ofertas where id=$1`, [of.id])).q === 90 && (await q1(`select count(*)::int n from entregas_pacotes where oferta_id=$1`, [of.id])).n === 90);
await rpc(E1, "ajustar_pacotes_rota", { _rota_id: V.id, _quantidade: 95 });
ok("aumentar também acrescenta pacotes", (await q1(`select count(*)::int n from entregas_pacotes where oferta_id=$1`, [of.id])).n === 95);
await pg.query(`update ofertas set status='in_progress', entregador_id='D1' where id=$1`, [of.id]);
r = await rpc(E1, "ajustar_pacotes_rota", { _rota_id: V.id, _quantidade: 10 });
ok("rota em andamento não pode ser ajustada", !!r.error, r);
r = await rpc(E1, "ajustar_pacotes_rota", { _rota_id: G.id, _quantidade: -3 });
ok("quantidade negativa é recusada", !!r.error, r);
process.exit(fail ? 1 : 0);
