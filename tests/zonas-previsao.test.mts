import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery, criarVinculo } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"],["D3","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social,nome_fantasia) values ('E1','A','Empresa A'),('E2','B','Empresa B')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf) values ('D1','Ana','ativo','1'),('D2','Beto','ativo','2'),('D3','Caio','ativo','3')`);
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" }, D3 = { userId: "D3", role: "entregador" };
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });

// catálogo de zonas (fixas)
let r: any = await run(E1, { table: "zonas_empresa", op: "insert", values: [{ nome: "Gonzaga", pacotes_tipicos: 100 }, { nome: "Vila Belmiro", pacotes_tipicos: 90 }], returning: true });
ok("empresa cadastra zonas fixas", !r.error && r.data.length === 2, r);
ok("outra empresa não vê as zonas", (await run(E2, { table: "zonas_empresa", op: "select", columns: "id", filters: [] })).data.length === 0);
r = await run(E1, { table: "zonas_empresa", op: "insert", values: { nome: "Gonzaga", pacotes_tipicos: 5 } });
ok("nome de zona repetido é recusado", !!r.error, r);

const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const pv = (await run(E1, { table: "agenda_previsoes", op: "insert", values: { data_prevista: amanha, pacotes_estimados: 190, rotas_estimadas: 2, status: "aberta" }, returning: true, single: "single" })).data.id;
const zs = (await run(E1, { table: "agenda_previsao_zonas", op: "insert", values: [{ previsao_id: pv, nome: "Gonzaga", pacotes_estimados: 100 }, { previsao_id: pv, nome: "Vila Belmiro", pacotes_estimados: 90 }], returning: true })).data;
const [Z1, Z2] = zs;
ok("entregador livre vê as zonas da previsão aberta", (await run(D2, { table: "agenda_previsao_zonas", op: "select", columns: "id", filters: [] })).data.length === 2);
await criarVinculo("D1", "E2");
ok("vinculado a outra empresa não vê as zonas", (await run(D1, { table: "agenda_previsao_zonas", op: "select", columns: "id", filters: [] })).data.length === 0);
r = await rpc(D1, "postular_zona", { _zona_id: Z1.id });
ok("e não consegue se postular", !!r.error && /vinculado/.test(r.error.message), r);

// postulação + aprovação
r = await rpc(D2, "postular_zona", { _zona_id: Z1.id });
ok("entregador se postula à zona do Gonzaga", !r.error && r.data.modo === "pendente", r);
await rpc(D3, "postular_zona", { _zona_id: Z1.id });
r = await rpc(D2, "postular_zona", { _zona_id: Z1.id });
ok("postular de novo não duplica", ((await pg.query(`select count(*)::int n from agenda_zona_candidaturas where zona_id=$1`, [Z1.id])).rows[0] as any).n === 2, r);
const cands = (await run(E1, { table: "agenda_zona_candidaturas", op: "select", columns: "id,entregador_id,status", filters: [eq("zona_id", Z1.id)] })).data;
ok("empresa vê os 2 interessados no Gonzaga", cands.length === 2, cands);
ok("empresa foi avisada", ((await pg.query(`select count(*)::int n from user_notifications where user_id='E1'`)).rows[0] as any).n === 2);
const c2 = cands.find((x: any) => x.entregador_id === "D2").id, c3 = cands.find((x: any) => x.entregador_id === "D3").id;
r = await rpc(E2, "decidir_zona", { _candidatura_id: c2, _aprovar: true });
ok("outra empresa não decide", !!r.error, r);
r = await rpc(E1, "decidir_zona", { _candidatura_id: c2, _aprovar: true });
const z = (await pg.query(`select entregador_id, status from agenda_previsao_zonas where id=$1`, [Z1.id])).rows[0] as any;
ok("aprovado: a zona fica com o Beto", !r.error && z.entregador_id === "D2" && z.status === "atribuida", { r, z });
ok("o outro interessado é recusado", ((await pg.query(`select status from agenda_zona_candidaturas where id=$1`, [c3])).rows[0] as any).status === "recusada");
ok("vira compromisso na agenda (aparece como ★ na alocação)", ((await pg.query(`select count(*)::int n from agenda_compromissos where entregador_id='D2'`)).rows[0] as any).n === 1);
r = await rpc(E1, "decidir_zona", { _candidatura_id: c3, _aprovar: true });
ok("não dá para aprovar outro depois", !!r.error, r);
r = await rpc(D3, "postular_zona", { _zona_id: Z1.id });
ok("zona atribuída não aceita novas postulações", !!r.error, r);

// recusar
await rpc(D3, "postular_zona", { _zona_id: Z2.id });
const cz = (await run(E1, { table: "agenda_zona_candidaturas", op: "select", columns: "id", filters: [eq("zona_id", Z2.id)] })).data[0].id;
await rpc(E1, "decidir_zona", { _candidatura_id: cz, _aprovar: false });
r = await rpc(D3, "postular_zona", { _zona_id: Z2.id });
ok("postulação recusada não se refaz", !!r.error, r);

// sem aprovação: o primeiro leva
await run(E1, { table: "empresas", op: "update", values: { aprovar_candidatos: false }, filters: [eq("id", "E1")] });
const Z3 = (await run(E1, { table: "agenda_previsao_zonas", op: "insert", values: { previsao_id: pv, nome: "Embaré", pacotes_estimados: 50 }, returning: true, single: "single" })).data;
const [a, b] = await Promise.all([rpc(D2, "postular_zona", { _zona_id: Z3.id }), rpc(D3, "postular_zona", { _zona_id: Z3.id })]);
ok("sem aprovação, dois ao mesmo tempo: só um fica", [a, b].filter((x: any) => !x.error).length === 1 && [a, b].filter((x: any) => x.error).length === 1, { a, b });
process.exit(fail ? 1 : 0);
