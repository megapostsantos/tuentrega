import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social,tms_valor_padrao_pacote) values ('E1','A',2.5),('E2','B',3)`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf,pix_chave,pix_tipo) values ('D1','Ana','ativo','111','chave','cpf')`);
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
const dono = { userId: "E1", role: "empresa" }, op = { userId: "E1", role: "empresa", operador: true }, outra = { userId: "E2", role: "empresa" };
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });

// equipe
let r: any = await rpc(op, "cadastrar_membro_equipe", { nome_completo: "X", email: "x@y.com" });
ok("operador não cadastra equipe", !!r.error, r);
r = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Bia Operadora", email: "Bia@Empresa.com", whatsapp: "13999990000" });
ok("dono cadastra funcionário com código", !r.error && r.data.codigo?.length === 8, r);
const B = r.data.id;
ok("conta criada com papel operador", ((await pg.query(`select role from "user" where id=$1`, [B])).rows[0] as any).role === "operador");
r = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Dup", email: "bia@empresa.com" });
ok("e-mail repetido é recusado", !!r.error, r);
r = await run(outra, { table: "equipe_empresa", op: "select", columns: "user_id", filters: [] });
ok("outra empresa não vê a equipe", r.data.length === 0, r);
r = await run(dono, { table: "equipe_empresa", op: "select", columns: "nome,ativo", filters: [] });
ok("dono vê a equipe", r.data.length === 1 && r.data[0].ativo === true, r);

// valores
const o = await run(dono, { table: "operacoes", op: "insert", values: { data_operacao: "2026-11-05", total_pacotes_sistema: 10, total_pacotes_contados: 10, total_paradas: 0, valor_por_pacote: 9, status: "draft", origem: "ML" }, returning: true, single: "single" });
const opId = o.data.id;
r = await run(op, { table: "operacoes", op: "select", columns: "total_pacotes_sistema,valor_por_pacote,valor_ml_por_pacote", filters: [eq("id", opId)] });
ok("operador não vê valor da operação", r.data[0].valor_por_pacote === null && r.data[0].total_pacotes_sistema === 10, r);
r = await run(op, { table: "operacoes", op: "insert", values: { data_operacao: "2026-11-06", total_pacotes_sistema: 20, total_pacotes_contados: 20, total_paradas: 0, valor_por_pacote: 99, valor_ml_por_pacote: 99, status: "draft", origem: "ML" }, returning: true, single: "single" });
ok("operador cria operação e o valor vem do padrão do dono", !r.error && r.data.valor_por_pacote === null, r);
ok("valor gravado = padrão da empresa (2.5), ignorando o que o operador mandou", Number(((await pg.query(`select valor_por_pacote v from operacoes where data_operacao='2026-11-06'`)).rows[0] as any).v) === 2.5);
const rt = await run(op, { table: "rotas_operacao", op: "insert", values: { operacao_id: opId, nome: "Z1", quantidade_pacotes: 10, quantidade_paradas: 0, valor_total: 999, status: "draft" }, returning: true, single: "single" });
ok("valor da rota calculado no servidor (10 × 2.5)", Number(((await pg.query(`select valor_total v from rotas_operacao where id=$1`, [rt.data.id])).rows[0] as any).v) === 25, rt);
r = await run(op, { table: "rotas_operacao", op: "update", values: { valor_total: 1, nome: "Zona 1" }, filters: [eq("id", rt.data.id)] });
const upd = (await pg.query(`select nome, valor_total v from rotas_operacao where id=$1`, [rt.data.id])).rows[0] as any;
ok("update do operador ignora valor mas muda o nome", upd.nome === "Zona 1" && Number(upd.v) === 25, upd);
r = await rpc(op, "publicar_rotas", { _operacao_id: opId });
ok("operador publica as rotas", !r.error && r.data.publicadas === 1, r);
r = await run(op, { table: "ofertas", op: "select", columns: "titulo,valor,valor_por_pacote,status", filters: [] });
ok("operador vê ofertas sem valores", r.data.length >= 1 && r.data.every((x: any) => x.valor === null && x.valor_por_pacote === null), r);
r = await run(dono, { table: "ofertas", op: "select", columns: "valor,valor_por_pacote", filters: [] });
ok("dono vê os valores (25 e 2.5)", Number(r.data[0].valor) === 25 && Number(r.data[0].valor_por_pacote) === 2.5, r);

// financeiro e entregadores
await pg.query(`insert into pagamentos (empresa_id, entregador_id, valor_total, status) values ('E1','D1',50,'pendente')`).catch(() => {});
r = await run(op, { table: "pagamentos", op: "select", columns: "*", filters: [] });
ok("operador não lê pagamentos", r.data.length === 0, r);
r = await run(op, { table: "financeiro_lancamentos", op: "insert", values: { empresa_id: "E1", valor: 1 } });
ok("operador não grava no financeiro", !!r.error, r);
r = await run(op, { table: "entregadores", op: "select", columns: "nome_completo,pix_chave", filters: [eq("id", "D1")] });
ok("PIX do entregador mascarado para o operador", r.data.length === 0 || r.data[0].pix_chave === null, r);

// exclusões
r = await run(op, { table: "ofertas", op: "delete", filters: [eq("status", "open")] });
ok("operador não apaga nada", !!r.error, r);
r = await run(op, { table: "empresas", op: "update", values: { razao_social: "Y" }, filters: [eq("id", "E1")] });
ok("operador não altera a empresa", !!r.error, r);
const rota = (await pg.query(`select id from rotas_operacao where operacao_id=$1`, [opId])).rows[0] as any;
r = await rpc(op, "eliminar_rota", { _rota_id: rota.id, _apagar: true });
ok("operador não elimina rota", !!r.error, r);
r = await rpc(op, "limpar_meus_dados", { _confirmar: "APAGAR" });
ok("operador não limpa histórico", !!r.error, r);

// dono apaga rota de vez e limpa histórico
r = await rpc(outra, "eliminar_rota", { _rota_id: rota.id, _apagar: true });
ok("outra empresa não apaga rota alheia", !!r.error, r);
r = await rpc(dono, "eliminar_rota", { _rota_id: rota.id, _apagar: true });
const restam = (await pg.query(`select (select count(*)::int from rotas_operacao where id=$1) r, (select count(*)::int from ofertas where rota_operacao_id=$1) o, (select count(*)::int from entregas_pacotes where operacao_id=$2) p`, [rota.id, opId])).rows[0] as any;
ok("dono apaga a rota de vez (rota, oferta e pacotes)", !r.error && restam.r === 0 && restam.o === 0 && restam.p === 0, { r, restam });
r = await rpc(dono, "limpar_meus_dados", { _confirmar: "nao" });
ok("limpeza exige confirmação", !!r.error, r);
await run(outra, { table: "operacoes", op: "insert", values: { data_operacao: "2026-11-07", total_pacotes_sistema: 1, total_pacotes_contados: 1, total_paradas: 0, valor_por_pacote: 1, status: "draft", origem: "ML" } });
r = await rpc(dono, "limpar_meus_dados", { _confirmar: "APAGAR" });
const cnt = async (t: string, w = "") => Number(((await pg.query(`select count(*)::int n from "${t}" ${w}`)).rows[0] as any).n);
ok("dono limpa o histórico da própria empresa", !r.error && (await cnt("operacoes", `where empresa_id='E1'`)) === 0, r);
ok("histórico de outra empresa e cadastros ficam", (await cnt("operacoes", `where empresa_id='E2'`)) === 1 && (await cnt("entregadores")) === 1 && (await cnt("equipe_empresa")) === 1);
process.exit(fail ? 1 : 0);
