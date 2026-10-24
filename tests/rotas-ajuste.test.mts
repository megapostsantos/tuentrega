import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
await pg.query(`insert into entregadores (id,nome_completo,status) values ('D1','Ana','ativo')`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, ADM = { userId: "ADM", role: "admin" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });

const op = (await run(E1, { table: "operacoes", op: "insert", values: { data_operacao: "2026-10-25", status: "published" }, returning: true, single: "single" })).data.id;
async function mk(nome: string, q: number, par: number, dono?: string) {
  const rota = (await run(E1, { table: "rotas_operacao", op: "insert", values: { operacao_id: op, nome, quantidade_pacotes: q, quantidade_paradas: par, valor_total: q * 2, status: "open" }, returning: true, single: "single" })).data.id;
  const of = (await run(E1, { table: "ofertas", op: "insert", values: { titulo: nome, status: dono ? "accepted" : "open", entregador_id: dono ?? null, operacao_id: op, rota_operacao_id: rota, quantidade_pacotes: q, quantidade_paradas: par, valor: q * 2, valor_por_pacote: 2 }, returning: true, single: "single" })).data.id;
  await run(E1, { table: "rotas_operacao", op: "update", values: { oferta_id: of }, filters: [eq("id", rota)] });
  await run(E1, { table: "entregas_pacotes", op: "insert", values: Array.from({ length: q }, (_, i) => ({ oferta_id: of, operacao_id: op, numero_pacote: i + 1, status: "pending" })) });
  if (dono) await run(E1, { table: "alocacoes", op: "insert", values: { operacao_id: op, rota_id: rota, entregador_id: dono, oferta_id: of, status: "allocated" } });
  return { rota, of };
}
const z1 = await mk("Zona 1", 100, 40, "D1");
const z2 = await mk("Zona 2", 105, 50);
const rota = async (id: string) => (await pg.query(`select quantidade_pacotes q, quantidade_paradas p, valor_total::float v, status from rotas_operacao where id=$1`, [id])).rows[0] as any;
const oferta = async (id: string) => (await pg.query(`select quantidade_pacotes q, quantidade_paradas p, valor::float v, status from ofertas where id=$1`, [id])).rows[0] as any;
const nums = async (of: string) => (await pg.query(`select numero_pacote n from entregas_pacotes where oferta_id=$1 order by 1`, [of])).rows.map((x: any) => x.n);

// 1) mover 5 pacotes da zona 2 para a zona 1
let r = await rpc(E1, "mover_pacotes", { _rota_origem: z2.rota, _rota_destino: z1.rota, _quantidade: 5, _paradas: 2 });
ok("move 5 pacotes", r.data?.movidos === 5 && r.data.paradas === 2, r);
let a = await rota(z1.rota), b = await rota(z2.rota);
ok("zona 1 ficou com 105 pacotes, 42 paradas, R$ 210", a.q === 105 && a.p === 42 && a.v === 210, a);
ok("zona 2 ficou com 100 pacotes, 48 paradas, R$ 200", b.q === 100 && b.p === 48 && b.v === 200, b);
let oa = await oferta(z1.of), ob = await oferta(z2.of);
ok("as ofertas acompanham (quantidade e valor)", oa.q === 105 && oa.v === 210 && ob.q === 100 && ob.v === 200, [oa, ob]);
const n1 = await nums(z1.of);
ok("pacotes movidos recebem numeração nova sem repetir", n1.length === 105 && new Set(n1).size === 105 && Math.max(...n1) === 105, n1.slice(-8));
ok("a zona 2 manteve 100 pacotes", (await nums(z2.of)).length === 100);

// 2) mover pacotes específicos (etiqueta trocada)
r = await rpc(E1, "mover_pacotes", { _rota_origem: z1.rota, _rota_destino: z2.rota, _numeros: [3, 4], _paradas: 1 });
ok("move pacotes específicos #3 e #4", r.data?.movidos === 2, r);
ok("zona 1 = 103 e zona 2 = 102", (await rota(z1.rota)).q === 103 && (await rota(z2.rota)).q === 102);
r = await rpc(E1, "mover_pacotes", { _rota_origem: z1.rota, _rota_destino: z2.rota, _numeros: [3] });
ok("não move pacote que já saiu da origem", !!r.error, r);
r = await rpc(E1, "mover_pacotes", { _rota_origem: z1.rota, _rota_destino: z2.rota, _quantidade: 5000 });
ok("não move mais do que existe", !!r.error, r);
r = await rpc(E1, "mover_pacotes", { _rota_origem: z1.rota, _rota_destino: z1.rota, _quantidade: 1 });
ok("origem e destino precisam ser diferentes", !!r.error, r);

// 3) permissões
r = await rpc(E2, "mover_pacotes", { _rota_origem: z1.rota, _rota_destino: z2.rota, _quantidade: 1 });
ok("outra empresa não mexe nas rotas", !!r.error, r);
r = await rpc(D1, "mover_pacotes", { _rota_origem: z1.rota, _rota_destino: z2.rota, _quantidade: 1 });
ok("entregador não move pacotes", !!r.error, r);
r = await rpc(D1, "eliminar_rota", { _rota_id: z1.rota });
ok("entregador não elimina rota", !!r.error, r);
r = await rpc(E2, "eliminar_rota", { _rota_id: z1.rota });
ok("outra empresa não elimina rota", !!r.error, r);

// 4) unir: move tudo da zona 2 para a zona 1 e elimina a zona 2
r = await rpc(E1, "mover_pacotes", { _rota_origem: z2.rota, _rota_destino: z1.rota, _quantidade: 102 });
ok("move todos os pacotes da zona 2", r.data?.movidos === 102, r);
b = await rota(z2.rota);
ok("zona 2 zerada (pacotes, paradas e valor)", b.q === 0 && b.p === 0 && b.v === 0, b);
r = await rpc(E1, "eliminar_rota", { _rota_id: z2.rota, _motivo: "Unida à Zona 1" });
ok("elimina a zona 2", !r.error, r);
b = await rota(z2.rota); ob = await oferta(z2.of);
ok("rota e oferta ficam canceladas", b.status === "cancelada" && ob.status === "cancelled", [b, ob]);
r = await rpc(E1, "eliminar_rota", { _rota_id: z2.rota });
ok("não elimina duas vezes", !!r.error, r);
r = await rpc(E1, "mover_pacotes", { _rota_origem: z1.rota, _rota_destino: z2.rota, _quantidade: 1 });
ok("não move para rota eliminada", !!r.error, r);
a = await rota(z1.rota);
ok("zona 1 ficou com os 205 pacotes", a.q === 205 && a.v === 410, a);

// 5) eliminar rota atribuída, sem entregas: pacotes cancelados e alocação removida
const z3 = await mk("Zona 3", 30, 10, "D1");
r = await rpc(E1, "eliminar_rota", { _rota_id: z3.rota, _motivo: "Pacotes devolvidos ao Mercado Livre" });
ok("elimina rota atribuída", !r.error, r);
const pc = (await pg.query(`select status, count(*)::int n from entregas_pacotes where oferta_id=$1 group by 1`, [z3.of])).rows as any[];
ok("pacotes da rota viram 'cancelado'", pc.length === 1 && pc[0].status === "cancelado" && pc[0].n === 30, pc);
const al = (await pg.query(`select status from alocacoes where rota_id=$1`, [z3.rota])).rows as any[];
ok("alocação do entregador removida", al[0]?.status === "removida", al);
const nota = (await pg.query(`select closing_notes from ofertas where id=$1`, [z3.of])).rows[0] as any;
ok("motivo fica registrado", /Mercado Livre/.test(nota.closing_notes), nota);

// 6) rota com pacotes entregues não pode ser eliminada
const z4 = await mk("Zona 4", 10, 5, "D1");
await run(D1, { table: "entregas_pacotes", op: "update", values: { status: "delivered" }, filters: [eq("oferta_id", z4.of), eq("numero_pacote", 1)] });
r = await rpc(E1, "eliminar_rota", { _rota_id: z4.rota });
ok("rota com entregas não é eliminada", !!r.error && /entregues/.test(r.error.message), r);
const sobra = await rpc(ADM, "mover_pacotes", { _rota_origem: z4.rota, _rota_destino: z1.rota, _quantidade: 2 });
ok("admin também pode ajustar", !sobra.error, sobra);

// 7) rotas ainda não publicadas (só contagem)
const d1 = (await run(E1, { table: "rotas_operacao", op: "insert", values: { operacao_id: op, nome: "R5", quantidade_pacotes: 50, quantidade_paradas: 20, valor_total: 100, status: "draft" }, returning: true, single: "single" })).data.id;
const d2 = (await run(E1, { table: "rotas_operacao", op: "insert", values: { operacao_id: op, nome: "R6", quantidade_pacotes: 40, quantidade_paradas: 16, valor_total: 80, status: "draft" }, returning: true, single: "single" })).data.id;
r = await rpc(E1, "mover_pacotes", { _rota_origem: d2, _rota_destino: d1, _quantidade: 10 });
a = await rota(d1); b = await rota(d2);
ok("rascunho: move só as contagens (60/30 e R$120/R$60)", !r.error && a.q === 60 && b.q === 30 && a.v === 120 && b.v === 60, [a, b]);
process.exit(fail ? 1 : 0);
