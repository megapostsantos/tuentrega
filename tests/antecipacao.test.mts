import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0, bad = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); bad += r.failed.length; off = r.next; }
console.log("setup failed:", bad);
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','Emp1'),('E2','Emp2')`);
await pg.query(`insert into entregadores (id,nome_completo,status,pix_tipo,pix_chave) values ('D1','Ana','ativo','cpf','111'),('D2','Beto','ativo','cpf','222')`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
let pass = 0, fail = 0; const ok = (n: string, c: boolean, x?: any) => { c ? pass++ : fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });
// D1 tem R$1000 a receber da E1 (pendente) e 200 já pago
await pg.query(`insert into ofertas (empresa_id,titulo,entregador_id,status,valor,payment_status) values ('E1','a','D1','completed',600,'pending'),('E1','b','D1','completed',400,'pending'),('E1','c','D1','completed',200,'paid'),('E1','d','D1','in_progress',900,'pending')`);
await pg.query(`insert into entregas (empresa_id,entregador_id,valor,status) values ('E1','D1',1,'pendente')`);

let r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("sem config: antecipação desligada", r.data?.ativa === false && r.data.disponivel === 0, r);
r = await rpc(D1, "solicitar_antecipacao", { _empresa_id: "E1", _valor: 100 });
ok("não solicita com antecipação desligada", !!r.error, r);

r = await run(E1, { table: "config_pagamento", op: "upsert", values: { empresa_id: "E1", ciclo: "quinzenal", antecipacao_ativa: true, antecipacao_percentual: 10, limite_percentual: 80, valor_minimo: 50 }, onConflict: "empresa_id" });
ok("empresa grava a configuração", !r.error, r);
r = await run(D1, { table: "config_pagamento", op: "select", columns: "*" });
ok("entregador NÃO lê a configuração (percentual oculto)", r.data.length === 0, r);
r = await run(E2, { table: "config_pagamento", op: "select", columns: "*" });
ok("outra empresa não lê a config", r.data.length === 0, r);

r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("saldo: total 1000 (sem o pago), disponível 800 (limite 80%)", r.data?.total === 1000 && r.data.disponivel === 800 && r.data.ativa === true, r);
ok("saldo não expõe o percentual", r.data && !("percentual" in r.data), r.data);
r = await rpc(D1, "simular_antecipacao", { _empresa_id: "E1", _valor: 500 });
ok("simulação: desconto 50, líquido 450", r.data?.desconto === 50 && r.data.liquido === 450, r);
r = await rpc(D1, "simular_antecipacao", { _empresa_id: "E1", _valor: 900 });
ok("acima do disponível é recusado", !!r.error, r);
r = await rpc(D1, "simular_antecipacao", { _empresa_id: "E1", _valor: 10 });
ok("abaixo do mínimo é recusado", !!r.error, r);
r = await rpc(E1, "simular_antecipacao", { _empresa_id: "E1", _valor: 100 });
ok("empresa não usa a função do entregador", !!r.error, r);
r = await rpc(D2, "saldo_antecipacao", { _empresa_id: "E1" });
ok("quem não tem saldo vê 0", r.data?.disponivel === 0 && r.data.total === 0, r);

r = await rpc(D1, "solicitar_antecipacao", { _empresa_id: "E1", _valor: 500 });
ok("solicita 500", !r.error && r.data?.liquido === 450, r);
r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("disponível cai para 300", r.data?.disponivel === 300 && r.data.aberto === 500, r);
r = await rpc(D1, "solicitar_antecipacao", { _empresa_id: "E1", _valor: 400 });
ok("não ultrapassa o limite com o pedido em aberto", !!r.error, r);

r = await run(D1, { table: "antecipacoes", op: "select", columns: "*" });
ok("entregador vê o pedido, mas o percentual vem oculto", r.data.length === 1 && r.data[0].percentual === null && Number(r.data[0].valor_liquido) === 450, r.data);
r = await run(E1, { table: "antecipacoes", op: "select", columns: "valor_bruto, percentual, entregadores(nome_completo, pix_chave)" });
ok("empresa vê pedido, percentual, nome e PIX", Number(r.data[0].percentual) === 10 && r.data[0].entregadores?.pix_chave === "111", r.data);
r = await run(E2, { table: "antecipacoes", op: "select", columns: "*" });
ok("outra empresa não vê", r.data.length === 0, r);
r = await run(D1, { table: "antecipacoes", op: "insert", values: { empresa_id: "E1", entregador_id: "D1", valor_bruto: 1, percentual: 0, desconto: 0, valor_liquido: 1 } });
ok("entregador não grava pedido direto (burlando o cálculo)", !!r.error, r);
r = await run(D1, { table: "antecipacoes", op: "update", values: { valor_liquido: 9999 }, filters: [eq("entregador_id", "D1")] });
ok("entregador não altera valores", !!r.error, r);

const id = (await run(E1, { table: "antecipacoes", op: "select", columns: "id" })).data[0].id;
r = await run(D2, { table: "antecipacoes", op: "update", values: { status: "cancelada" }, filters: [eq("id", id)], returning: true });
ok("outro entregador não cancela", r.data?.length === 0, r);
r = await run(E1, { table: "antecipacoes", op: "update", values: { status: "aprovada", decidida_em: new Date().toISOString() }, filters: [eq("id", id)], returning: true });
ok("empresa aprova", r.data?.[0]?.status === "aprovada", r);
r = await run(D1, { table: "antecipacoes", op: "update", values: { status: "cancelada" }, filters: [eq("id", id)], returning: true });
ok("entregador não cancela depois de aprovada", r.data?.length === 0, r);
r = await run(E1, { table: "antecipacoes", op: "update", values: { valor_bruto: 1 }, filters: [eq("id", id)] });
ok("empresa não altera valores", !!r.error, r);
r = await run(E1, { table: "antecipacoes", op: "update", values: { status: "paga", paga_em: new Date().toISOString() }, filters: [eq("id", id)], returning: true });
ok("empresa marca como paga", r.data?.[0]?.status === "paga", r);
r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("pedido pago continua descontando do disponível", r.data?.aberto === 500, r);
r = await run(E1, { table: "antecipacoes", op: "update", values: { abatida_em: new Date().toISOString() }, filters: [eq("id", id)], returning: true });
ok("empresa marca como abatida", !!r.data?.[0]?.abatida_em, r);
r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("depois de abatida deixa de descontar", r.data?.aberto === 0, r);
console.log(`\n${pass} ok, ${fail} falhas`);
await pg.close();
