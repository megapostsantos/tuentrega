import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["A1","admin"],["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social,cnpj) values ('E1','A','111'),('E2','B','222')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf,pix_chave) values ('D1','Ana','ativo','11111111111','pixA'),('D2','Beto','ativo','22222222222','pixB')`);
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c).catch((e: any) => ({ data: null, error: { message: String(e?.message ?? e) }, count: null }));
const E1 = { userId: "E1", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, NOAUTH = { userId: null, role: null };
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x).slice(0, 300)); };
const cnt = async (t: string) => Number(((await pg.query(`select count(*)::int n from "${t}"`)).rows[0] as any).n);
const ofB = (await run({ userId: "E2", role: "empresa" }, { table: "ofertas", op: "insert", values: { titulo: "SEGREDO-DA-B", status: "open", valor: 99, quantidade_pacotes: 1 }, returning: true, single: "single" })).data.id;
await run({ userId: "E2", role: "empresa" }, { table: "ofertas", op: "update", values: { status: "completed" }, filters: [{ k: "f", col: "id", op: "eq", val: ofB }] });
const usersAntes = await cnt("user"), ofAntes = await cnt("ofertas");

// 1) tabelas e colunas maliciosas
const maus = ['ofertas"; drop table "user"; --', "ofertas; select 1", '"user"', "user", "session", "account", "pg_catalog.pg_tables", "information_schema.tables", "ofertas o, user u", "../ofertas", "ofertas--"];
for (const t of maus) {
  const r: any = await run(E1, { table: t, op: "select", columns: "*", filters: [] });
  ok(`tabela maliciosa recusada: ${t.slice(0, 28)}`, !!r.error || (Array.isArray(r.data) && r.data.length === 0), r);
}
const colsMaus = ['id, (select password from account limit 1) as x', 'id"; drop table "user"; --', "*, pg_sleep(0)", 'titulo, "user"(id)', "id) from ofertas where 1=1 --", "(select 1)", "id,ofertas(*)", "id,empresas(*),user(*)", "to_jsonb(t0)"];
for (const c of colsMaus) {
  const r: any = await run(E1, { table: "ofertas", op: "select", columns: c, filters: [] });
  const vazou = JSON.stringify(r.data ?? "").includes("SEGREDO-DA-B") || JSON.stringify(r.data ?? "").includes("password");
  ok(`colunas maliciosas sem vazamento: ${c.slice(0, 32)}`, !vazou, r);
}
// 2) filtros e ordenação
const filtros = [
  { k: "f", col: 'id" or 1=1 --', op: "eq", val: "x" }, { k: "f", col: "titulo", op: "eq; drop table ofertas", val: "x" },
  { k: "f", col: "titulo", op: "in", val: "(a),(b)') or 1=1 --" }, { k: "or", expr: "titulo.eq.x,id.not.null)--" }, { k: "or", expr: 'titulo.eq.x),(select 1' },
  { k: "or", expr: "empresa_id.eq.E2" }, { k: "or", expr: "id.not.is.null,or(empresa_id.eq.E2)" },
];
for (const f of filtros) {
  const r: any = await run(E1, { table: "ofertas", op: "select", columns: "titulo", filters: [f] });
  ok(`filtro malicioso não expõe a empresa B: ${JSON.stringify(f).slice(0, 40)}`, !JSON.stringify(r.data ?? "").includes("SEGREDO-DA-B"), r);
}
for (const o of ['titulo; drop table "user"', "(select 1)", '"id" desc, (select 1)', "titulo asc nulls first, id"]) {
  const r: any = await run(E1, { table: "ofertas", op: "select", columns: "id", filters: [], order: [{ col: o, asc: true }] });
  ok(`ordenação maliciosa: ${o.slice(0, 28)}`, !!r.error || Array.isArray(r.data), r);
}
// 3) escritas e valores
let r: any = await run(E1, { table: "ofertas", op: "insert", values: { titulo: "x", empresa_id: "E2" }, returning: true });
const emp = (await pg.query(`select empresa_id from ofertas where titulo='x'`)).rows;
ok("não dá para criar oferta em nome de outra empresa", !!r.error || emp.every((x: any) => x.empresa_id === "E1"), { r, emp });
r = await run(E1, { table: "ofertas", op: "update", values: { titulo: "hack" }, filters: [{ k: "f", col: "id", op: "eq", val: ofB }] });
ok("não altera oferta de outra empresa", ((await pg.query(`select titulo from ofertas where id=$1`, [ofB])).rows[0] as any).titulo === "SEGREDO-DA-B", r);
r = await run(E1, { table: "ofertas", op: "delete", filters: [{ k: "f", col: "id", op: "eq", val: ofB }] });
ok("não apaga oferta de outra empresa", (await cnt("ofertas")) >= ofAntes, r);
r = await run(E1, { table: "ofertas", op: "update", values: { 'titulo" = (select 1), "valor': 1 }, filters: [{ k: "f", col: "id", op: "eq", val: "x" }] });
ok("chave de coluna maliciosa em update", !!r.error, r);
r = await run(E1, { table: "ofertas", op: "insert", values: { 'titulo") values (1); drop table "user"; --': "x" } });
ok("chave de coluna maliciosa em insert", !!r.error, r);
// 4) papéis e RPC
for (const rpc of ["finalizar_rota; drop table x", "../x", "recusar_rota", "apply_reliability_event", "limpar_meus_dados", "eliminar_rota"]) {
  const x: any = await run(D1, { table: "", op: "rpc", rpc: { fn: rpc, args: { _entregador_id: "D2", _pontos: 9, _confirmar: "APAGAR", _rota_id: "x", _oferta_id: "x" } } });
  ok(`entregador não executa RPC indevida: ${rpc.slice(0, 24)}`, !!x.error, x);
}
const pontos: any = await run(D1, { table: "", op: "rpc", rpc: { fn: "apply_reliability_event", args: { _entregador_id: "D2", _pontos: 9 } } });
ok("entregador não altera a nota de outro", !!pontos.error, pontos);
const lim: any = await run(D1, { table: "", op: "rpc", rpc: { fn: "limpar_meus_dados", args: { _confirmar: "APAGAR" } } });
ok("entregador não limpa dados de empresa", !!lim.error && (await cnt("ofertas")) >= ofAntes, lim);
// 5) sem login e tabelas de autenticação
for (const t of ["ofertas", "entregadores", "user", "session", "account", "verification"]) {
  const x: any = await run(NOAUTH, { table: t, op: "select", columns: "*", filters: [] });
  ok(`sem login não lê ${t}`, !!x.error, x);
}
for (const t of ["user", "session", "account", "verification"]) {
  const x: any = await run(E1, { table: t, op: "select", columns: "*", filters: [] });
  ok(`empresa não lê ${t}`, !!x.error || (x.data ?? []).length === 0, x);
}
const x2: any = await run(E1, { table: "user", op: "update", values: { role: "admin" }, filters: [{ k: "f", col: "id", op: "eq", val: "E1" }] });
ok("ninguém se promove a admin pela API", !!x2.error && ((await pg.query(`select role from "user" where id='E1'`)).rows[0] as any).role === "empresa", x2);
const d: any = await run(D1, { table: "entregadores", op: "update", values: { reliability_score: 100, status: "ativo", cpf: "999" }, filters: [{ k: "f", col: "id", op: "eq", val: "D1" }] });
ok("entregador não altera a própria nota/status", !!d.error, d);
const vaz: any = await run(E1, { table: "entregadores", op: "select", columns: "id,cpf,pix_chave", filters: [] });
ok("empresa não vê CPF/PIX de entregador que não trabalha para ela", (vaz.data ?? []).every((e: any) => !e.cpf && !e.pix_chave), vaz);
ok("nenhum ataque apagou ou alterou tabelas", (await cnt("user")) === usersAntes, { antes: usersAntes, depois: await cnt("user") });
process.exit(fail ? 1 : 0);
