import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0, bad = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); bad += r.failed.length; off = r.next; }
console.log("setup failed:", bad);
for (const [i, r] of [["E1","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','Emp')`);
await pg.query(`insert into entregadores (id,nome_completo,status) values ('D1','Ana','ativo'),('D2','Beto','ativo')`);
const E1 = { userId: "E1", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
let pass = 0, fail = 0; const ok = (n: string, c: boolean, x?: any) => { c ? pass++ : fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const mk = async (data: string, dono = "D1", atrib = "now()") => {
  const id = (await run(E1, { table: "ofertas", op: "insert", values: { titulo: "Rota " + data, status: "accepted", entregador_id: dono, data_trabalho: data }, returning: true, single: "single" })).data.id;
  await pg.query(`update ofertas set atribuida_em = ${atrib} where id = $1`, [id]);
  await run(E1, { table: "alocacoes", op: "insert", values: { oferta_id: id, entregador_id: dono, status: "allocated" } });
  return id;
};

// 1) expiração (primeira consulta de ofertas do processo)
const velha = await mk(day(10), "D1", "now() - interval '3 hours'");
const recente = await mk(day(10), "D2", "now() - interval '30 minutes'");
let r = await run(E1, { table: "ofertas", op: "select", columns: "id,status,entregador_id" });
const byId = Object.fromEntries(r.data.map((x: any) => [x.id, x]));
ok("atribuição sem resposta em 2h volta ao mercado", byId[velha].status === "open" && byId[velha].entregador_id === null, byId[velha]);
ok("atribuição recente permanece", byId[recente].status === "accepted" && byId[recente].entregador_id === "D2", byId[recente]);
r = await run(E1, { table: "ofertas_recusas", op: "select", columns: "origem,motivo", filters: [eq("oferta_id", velha)] });
ok("registro de expiração (origem sistema)", r.data?.[0]?.origem === "sistema", r);
r = await run(D1, { table: "ofertas", op: "select", columns: "id", filters: [eq("id", velha)] });
ok("quem não respondeu ainda pode aceitar depois (sistema não bloqueia)", r.data.length === 1, r);

// 2) recusa no prazo (rota daqui a 10 dias): sem penalidade
const cedo = await mk(day(10));
r = await run(D1, { table: "", op: "rpc", rpc: { fn: "recusar_rota", args: { _oferta_id: cedo, _motivo: "indisponível" } } });
ok("recusa antecipada sem penalidade", r.data?.penalizado === false && r.data.pontos === 0, r);
let sc = (await pg.query(`select score from confiabilidade_score where entregador_id='D1'`)).rows;
ok("nota intacta", sc.length === 0, sc);
// 3) recusa tardia (rota hoje): -15
const tarde = await mk(day(0));
r = await run(D1, { table: "", op: "rpc", rpc: { fn: "recusar_rota", args: { _oferta_id: tarde, _motivo: "desisti" } } });
ok("recusa no dia penalizada", r.data?.penalizado === true && r.data.pontos === -15, r);
sc = (await pg.query(`select score, nivel from confiabilidade_score where entregador_id='D1'`)).rows;
ok("nota caiu 15", sc[0]?.score === 85, sc);
const hist = (await pg.query(`select tipo, delta from confiabilidade_historico where entregador_id='D1'`)).rows;
ok("histórico registrado", hist[0]?.tipo === "late_refusal" && hist[0].delta === -15, hist);
r = await run(E1, { table: "ofertas_recusas", op: "select", columns: "penalizada,pontos,origem", filters: [eq("oferta_id", tarde)] });
ok("empresa vê que foi penalizada", r.data?.[0]?.penalizada === true, r);
// 4) segurança
r = await run(D1, { table: "", op: "rpc", rpc: { fn: "recusar_rota", args: { _oferta_id: recente } } });
ok("não recusa rota de outro", !!r.error, r);
r = await run(D1, { table: "", op: "rpc", rpc: { fn: "recusar_rota", args: { _oferta_id: cedo } } });
ok("não recusa duas vezes", !!r.error, r);
r = await run(E1, { table: "", op: "rpc", rpc: { fn: "recusar_rota", args: { _oferta_id: recente } } });
ok("empresa não usa a recusa do entregador", !!r.error, r);
r = await run(D2, { table: "ofertas", op: "update", values: { status: "open", entregador_id: null }, filters: [eq("id", recente)] });
ok("entregador não devolve rota por update direto (sem penalidade)", !!r.error, r);
r = await run(D2, { table: "ofertas", op: "update", values: { status: "in_progress", iniciada_em: new Date().toISOString() }, filters: [eq("id", recente)], returning: true });
ok("entregador inicia a própria rota", r.data?.[0]?.status === "in_progress", r);
r = await run(D2, { table: "ofertas_recusas", op: "insert", values: { oferta_id: recente, empresa_id: "E1", entregador_id: "D2" } });
ok("entregador não grava recusa direto", !!r.error, r);
r = await run(D2, { table: "alocacoes", op: "update", values: { status: "recusada" }, filters: [eq("oferta_id", recente)] });
ok("entregador não altera alocação direto", !!r.error, r);
console.log(`\n${pass} ok, ${fail} falhas`);
await pg.close();
