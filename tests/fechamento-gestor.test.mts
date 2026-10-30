import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf,reliability_score) values ('D1','Ana','ativo','111',100)`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };

async function rota(n = 100) {
  const of = (await run(E1, { table: "ofertas", op: "insert", values: { titulo: "Zona", status: "in_progress", entregador_id: "D1", quantidade_pacotes: n, valor: n * 2, valor_por_pacote: 2 }, returning: true, single: "single" })).data.id;
  await run(E1, { table: "entregas_pacotes", op: "insert", values: Array.from({ length: n }, (_, i) => ({ oferta_id: of, numero_pacote: i + 1, status: "pending" })) });
  return of as string;
}
const cnt = async (of: string, st: string) => Number(((await pg.query(`select count(*)::int n from entregas_pacotes where oferta_id=$1 and status=$2`, [of, st])).rows[0] as any).n);

let of = await rota();
let r: any = await rpc(E2, "fechar_rota_gestor", { _oferta_id: of, _entregues: 75, _insucessos: 5 });
ok("outra empresa não encerra", !!r.error, r);
r = await rpc(D1, "fechar_rota_gestor", { _oferta_id: of, _entregues: 75, _insucessos: 5 });
ok("entregador não usa o encerramento do gestor", !!r.error, r);
r = await rpc(E1, "fechar_rota_gestor", { _oferta_id: of, _entregues: 90, _insucessos: 20 });
ok("soma acima do total é recusada", !!r.error, r);
r = await rpc(E1, "fechar_rota_gestor", { _oferta_id: of, _entregues: 75, _insucessos: 5, _observacao: "motorista sem sinal" });
ok("gestor fecha: 75 entregues, 5 insucessos, 20 pendentes", !r.error && r.data.pendentes === 20 && !r.data.concluida, r);
ok("pacotes marcados", (await cnt(of, "delivered")) === 75 && (await cnt(of, "not_delivered")) === 25 && (await cnt(of, "pending")) === 0);
const o = (await pg.query(`select status, pacotes_entregues, pacotes_nao_entregues from ofertas where id=$1`, [of])).rows[0] as any;
ok("rota aguarda devolução (valor só no fim)", o.status === "awaiting_return" && o.pacotes_entregues === 75 && o.pacotes_nao_entregues === 25, o);
r = await run(E1, { table: "fechamentos_gestor", op: "select", columns: "entregues,insucessos,pendentes,status,observacao", filters: [{ k: "f", col: "oferta_id", op: "eq", val: of }] });
ok("registro do fechamento para conferir", r.data?.[0]?.status === "a_conferir" && r.data[0].pendentes === 20 && r.data[0].observacao === "motorista sem sinal", r);
r = await run(D1, { table: "fechamentos_gestor", op: "select", columns: "pendentes", filters: [] });
ok("motorista enxerga o fechamento da própria rota", r.data?.length === 1, r);
r = await run(E2, { table: "fechamentos_gestor", op: "select", columns: "id", filters: [] });
ok("outra empresa não vê", r.data?.length === 0, r);
r = await run(E1, { table: "fechamentos_gestor", op: "update", values: { status: "conferido", nota: "falou com o motorista", conferido_em: new Date().toISOString() }, filters: [{ k: "f", col: "oferta_id", op: "eq", val: of }] });
ok("empresa marca como conferido", !r.error, r);
r = await rpc(E1, "receber_devolucao", { _oferta_id: of });
ok("devolução fecha a rota e libera o valor", !r.error && r.data?.concluida === true, r);

of = await rota(10);
r = await rpc(E1, "fechar_rota_gestor", { _oferta_id: of, _entregues: 10, _insucessos: 0 });
ok("100% entregue conclui na hora", !r.error && r.data.concluida === true, r);
process.exit(fail ? 1 : 0);
