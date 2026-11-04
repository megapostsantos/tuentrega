import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery, contextoDaSessao } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social,tms_valor_padrao_pacote) values ('E1','A',2.5),('E2','B',3)`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf,pix_chave,pix_tipo) values ('D1','Ana','ativo','111','chave','cpf')`);

const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
const dono = { userId: "E1", role: "empresa" };
const func = { userId: "E1", role: "empresa", operador: true, equipe: true, autor: "F1" };
const sup = { userId: "E1", role: "empresa", operador: false, equipe: true, autor: "S1" };
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });

// cargos pelo cadastro e pela sessão
let r: any = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Sônia", email: "sonia@x.com", cargo: "supervisor" });
const S = r.data.id;
r = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Fábio", email: "fabio@x.com" });
const F = r.data.id;
ok("cargo gravado", ((await pg.query(`select cargo from equipe_empresa where user_id=$1`, [S])).rows[0] as any).cargo === "supervisor" && ((await pg.query(`select cargo from equipe_empresa where user_id=$1`, [F])).rows[0] as any).cargo === "funcionario");
for (const u of [S, F]) await pg.query(`insert into aprovacoes_cadastro (user_id,status,tipo) values ($1,'aprovado','funcionario') on conflict do nothing`, [u]);
let c: any = await contextoDaSessao({ id: S, role: "operador" });
ok("sessão do supervisor: empresa, sem máscara financeira, restrito a dono", c.userId === "E1" && c.operador === false && c.equipe === true && c.autor === S, c);
c = await contextoDaSessao({ id: F, role: "operador" });
ok("sessão do funcionário: sem valores", c.operador === true && c.equipe === true, c);

// financeiro
await pg.query(`insert into pagamentos (empresa_id, entregador_id, valor_total) values ('E1','D1',50)`);
r = await run(func, { table: "pagamentos", op: "select", columns: "*", filters: [] });
ok("funcionário não lê pagamentos", r.data.length === 0, r);
r = await run(sup, { table: "pagamentos", op: "select", columns: "*", filters: [] });
ok("supervisor lê pagamentos", r.data.length === 1, r);
r = await run(sup, { table: "pagamentos", op: "insert", values: { entregador_id: "D1", valor_total: 80, observacao: "baixa" }, returning: true, single: "single" });
ok("supervisor registra pagamento (baixa)", !r.error && Number(((await pg.query(`select count(*)::int n from pagamentos`)).rows[0] as any).n) === 2, r);
r = await run(func, { table: "pagamentos", op: "insert", values: { entregador_id: "D1", valor_total: 1 } });
ok("funcionário não registra pagamento", !!r.error, r);

// valores
const mk = async (ctx: any, v: number) => await run(ctx, { table: "operacoes", op: "insert", values: { data_operacao: "2026-11-05", total_pacotes_sistema: 10, total_pacotes_contados: 10, total_paradas: 0, valor_por_pacote: v, status: "draft", origem: "manual" }, returning: true, single: "single" });
r = await mk(sup, 4); const opSup = r.data?.id;
ok("supervisor define o valor que quiser", !r.error && Number(((await pg.query(`select valor_por_pacote v from operacoes where id=$1`, [opSup])).rows[0] as any).v) === 4, r);
r = await mk(func, 9);
ok("funcionário usa o valor padrão (2.5)", !r.error && Number(((await pg.query(`select valor_por_pacote v from operacoes order by created_at desc limit 1`)).rows[0] as any).v) === 2.5, r);

// só o dono
r = await run(sup, { table: "empresas", op: "update", values: { tms_valor_padrao_pacote: 1 }, filters: [eq("id", "E1")] });
ok("supervisor não altera a empresa", !!r.error, r);
r = await run(sup, { table: "operacoes", op: "delete", filters: [eq("id", opSup)] });
ok("supervisor não apaga", !!r.error, r);
r = await run(sup, { table: "equipe_empresa", op: "update", values: { cargo: "supervisor" }, filters: [eq("user_id", F)] });
ok("supervisor não muda cargos", !!r.error, r);
r = await rpc(sup, "cadastrar_membro_equipe", { nome_completo: "Z", email: "z@x.com" });
ok("supervisor não cadastra equipe", !!r.error, r);
r = await rpc(sup, "eliminar_rota", { _rota_id: "x" });
ok("supervisor não elimina rota", !!r.error, r);
r = await run(dono, { table: "equipe_empresa", op: "update", values: { cargo: "supervisor" }, filters: [eq("user_id", F)] });
ok("dono muda o cargo", !r.error && ((await pg.query(`select cargo from equipe_empresa where user_id=$1`, [F])).rows[0] as any).cargo === "supervisor", r);
await pg.query(`update equipe_empresa set cargo='funcionario' where user_id=$1`, [F]);

// sugestão de valor
await pg.query(`insert into ofertas (empresa_id,titulo,tipo,status,quantidade_pacotes,valor_por_pacote,valor) values ('E1','Rota Gonzaga','distribuicao','open',100,2.5,250)`);
const of = (await pg.query(`select id from ofertas where titulo='Rota Gonzaga'`)).rows[0] as any;
r = await rpc(func, "sugerir_valor", { alvo_tipo: "oferta", alvo_id: of.id, valor_por_pacote: 3.2, motivo: "difícil acesso" });
ok("funcionário sugere valor", !r.error, r);
const sg = (await pg.query(`select * from sugestoes_valor`)).rows[0] as any;
ok("sugestão guarda autor e pendente", sg.autor_id === "F1" && sg.status === "pendente" && sg.quantidade_pacotes === 100, sg);
r = await rpc(func, "decidir_sugestao_valor", { id: sg.id, aprovar: true });
ok("funcionário não aprova", !!r.error, r);
r = await rpc({ userId: "E2", role: "empresa" }, "decidir_sugestao_valor", { id: sg.id, aprovar: true });
ok("outra empresa não aprova", !!r.error, r);
r = await rpc(sup, "decidir_sugestao_valor", { id: sg.id, aprovar: true });
const o2 = (await pg.query(`select valor_por_pacote v, valor from ofertas where id=$1`, [of.id])).rows[0] as any;
ok("supervisor aprova e o valor é aplicado (100 × 3,20)", !r.error && Number(o2.v) === 3.2 && Number(o2.valor) === 320, [r, o2]);
r = await rpc(sup, "decidir_sugestao_valor", { id: sg.id, aprovar: false });
ok("não decide duas vezes", !!r.error, r);
await rpc(func, "sugerir_valor", { alvo_tipo: "oferta", alvo_id: of.id, valor_por_pacote: 9 });
const sg2 = (await pg.query(`select id from sugestoes_valor where status='pendente'`)).rows[0] as any;
await rpc(dono, "decidir_sugestao_valor", { id: sg2.id, aprovar: false });
ok("recusar não muda o valor", Number(((await pg.query(`select valor_por_pacote v from ofertas where id=$1`, [of.id])).rows[0] as any).v) === 3.2);
r = await rpc(func, "sugerir_valor", { alvo_tipo: "oferta", alvo_id: of.id, valor_por_pacote: -1 });
ok("valor inválido recusado", !!r.error, r);
r = await run(func, { table: "sugestoes_valor", op: "insert", values: { empresa_id: "E1", alvo_tipo: "oferta", alvo_id: of.id, valor_por_pacote: 1 } });
ok("não grava sugestão direto na tabela", !!r.error || ((await pg.query(`select count(*)::int n from sugestoes_valor`)).rows[0] as any).n === 2, r);
console.log(fail ? `${fail} FALHAS` : "✔ supervisor.test.mts");
process.exit(fail ? 1 : 0);
