import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (t, p) => (await pg.query(t, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0, bad = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); bad += r.failed.length; off = r.next; }
console.log("setup failed:", bad);
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social,nome_fantasia) values ('E1','Emp Um','Um'),('E2','Emp Dois','Dois')`);
await pg.query(`insert into entregadores (id,nome_completo,status) values ('D1','Driver Um','ativo'),('D2','Driver Dois','ativo')`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
let pass = 0, fail = 0; const ok = (n: string, c: boolean, x?: any) => { c ? pass++ : fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

let r = await run(E1, { table: "agenda_previsoes", op: "insert", values: { data_prevista: amanha, pacotes_estimados: 150, rotas_estimadas: 3, pacotes_por_rota: 50, valor_por_pacote: 1.8, endereco_coleta: "Rua Secreta 10", permite_cancelamento: true, status: "aberta" }, returning: true, single: "single" });
ok("empresa cria previsão", !r.error && r.data.empresa_id === "E1", r);
const pv = r.data.id;
r = await run(E1, { table: "agenda_previsoes", op: "insert", values: { data_prevista: amanha, pacotes_estimados: 10, status: "aberta" } , returning: true });
const pvFechada = (await run(E1, { table: "agenda_previsoes", op: "insert", values: { data_prevista: amanha, pacotes_estimados: 5, status: "encerrada" }, returning: true, single: "single" })).data.id;

r = await run(D1, { table: "agenda_previsoes", op: "select", columns: "*, empresas(nome_fantasia)" });
const vis = r.data.find((x: any) => x.id === pv);
ok("entregador vê previsão aberta", !!vis, r);
ok("endereço de coleta oculto antes do compromisso", vis && vis.endereco_coleta === null, vis);
ok("não vê previsão encerrada", !r.data.some((x: any) => x.id === pvFechada), r.data.map((x: any) => x.status));
ok("nome da empresa oculto antes do compromisso", vis && (vis.empresas === null || vis.empresas?.nome_fantasia == null), vis);
r = await run(E2, { table: "agenda_previsoes", op: "select", columns: "id" });
ok("outra empresa não vê a previsão", r.data.length === 0, r);

r = await run(D1, { table: "agenda_compromissos", op: "insert", values: { previsao_id: pv, empresa_id: "E1", pacotes_comprometidos: 50 } });
ok("entregador se compromete", !r.error, r);
r = await run(D1, { table: "agenda_compromissos", op: "insert", values: { previsao_id: pvFechada, empresa_id: "E1", pacotes_comprometidos: 50 } });
ok("não se compromete em previsão encerrada", !!r.error, r);
r = await run(D2, { table: "agenda_compromissos", op: "insert", values: { previsao_id: pv, empresa_id: "E1", entregador_id: "D1", pacotes_comprometidos: 50 } });
ok("não se compromete em nome de outro", !!r.error, r);
r = await run(D1, { table: "agenda_previsoes", op: "select", columns: "*, empresas(nome_fantasia)", filters: [{ k: "f", col: "id", op: "eq", val: pv }] });
ok("endereço e empresa aparecem após compromisso", r.data[0].endereco_coleta === "Rua Secreta 10" && r.data[0].empresas?.nome_fantasia === "Um", r.data);

r = await run(D1, { table: "agenda_compromissos", op: "update", values: { pacotes_comprometidos: 70 }, filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }], returning: true });
ok("entregador altera quantidade (permitido)", r.data?.[0]?.pacotes_comprometidos === 70, r);
r = await run(D1, { table: "agenda_compromissos", op: "update", values: { pacotes_ajustados: 999 }, filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }] });
ok("entregador não ajusta o próprio ajuste", !!r.error, r);
r = await run(D2, { table: "agenda_compromissos", op: "update", values: { pacotes_comprometidos: 1 }, filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }], returning: true });
ok("outro entregador não altera", r.data?.length === 0, r);

r = await run(E1, { table: "agenda_compromissos", op: "select", columns: "pacotes_comprometidos, entregadores(nome_completo)", filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }] });
ok("empresa vê compromisso com nome do entregador", r.data?.[0]?.entregadores?.nome_completo === "Driver Um", r);
r = await run(E1, { table: "agenda_compromissos", op: "update", values: { pacotes_ajustados: 60, status: "confirmado" }, filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }], returning: true });
ok("empresa ajusta pacotes", r.data?.[0]?.pacotes_ajustados === 60, r);
r = await run(E2, { table: "agenda_compromissos", op: "update", values: { pacotes_ajustados: 1 }, filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }], returning: true });
ok("outra empresa não ajusta", r.data?.length === 0, r);

await run(E1, { table: "agenda_previsoes", op: "update", values: { permite_cancelamento: false }, filters: [{ k: "f", col: "id", op: "eq", val: pv }] });
r = await run(D1, { table: "agenda_compromissos", op: "update", values: { status: "cancelado" }, filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }], returning: true });
ok("compromisso firme não pode ser cancelado", r.data?.length === 0, r);
r = await run(E1, { table: "agenda_compromissos", op: "delete", filters: [{ k: "f", col: "previsao_id", op: "eq", val: pv }] });
ok("empresa remove compromissos", !r.error, r);
console.log(`\n${pass} ok, ${fail} falhas`);
await pg.close();
