import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery, registerProfile, contextoDaSessao, statusAprovacao, decidirCadastro, listarCadastros } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
// usuários que já existiam antes da aprovação manual
for (const [i, r] of [["A1","admin"],["OLDE","empresa"],["OLDD","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('OLDE','Velha')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf) values ('OLDD','Velho','ativo','0')`);
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c).catch((e: any) => ({ data: null, error: { message: e.message } }));

await run({ userId: "OLDE", role: "empresa" }, { table: "ofertas", op: "select", columns: "id", filters: [] }); // dispara a migração
ok("quem já usava o sistema continua aprovado (migração)", (await statusAprovacao("OLDE")) === "aprovado" && (await statusAprovacao("OLDD")) === "aprovado");
let c = await contextoDaSessao({ id: "OLDD", role: "entregador" });
ok("contexto normal para aprovado", c.role === "entregador" && c.userId === "OLDD", c);

// cadastro novo por conta própria
await pg.query(`insert into "user" (id,name,email,role) values ('NOVO','Novo Entregador','novo@x.com','entregador')`);
let r: any = await registerProfile({ id: "NOVO", name: "Novo Entregador", role: "entregador" }, "entregador", { nome_completo: "Novo Entregador", cpf: "123", whatsapp: "13999990000", tipo_veiculo: "motoboy" });
ok("cadastro novo é registrado", r.ok === true, r);
ok("fica pendente", (await statusAprovacao("NOVO")) === "pendente");
ok("admin é avisado do novo cadastro", ((await pg.query(`select count(*)::int n from admin_notifications where type='novo_cadastro'`)).rows[0] as any).n === 1);
c = await contextoDaSessao({ id: "NOVO", role: "entregador" });
ok("pendente recebe contexto bloqueado", c.role === "pendente", c);
r = await run(c, { table: "ofertas", op: "select", columns: "id", filters: [] });
ok("pendente não lê nada (403 com mensagem clara)", !!r.error && /aprova/i.test(r.error.message), r);
r = await run(c, { table: "entregadores", op: "select", columns: "id", filters: [] });
ok("nem os próprios dados pelo motor", !!r.error, r);

// empresa nova
await pg.query(`insert into "user" (id,name,email,role) values ('NOVAE','Nova Empresa','e@x.com','entregador')`);
r = await registerProfile({ id: "NOVAE", name: "Nova Empresa", role: "entregador" }, "empresa", { razao_social: "Nova LTDA", cnpj: "00000000000191" });
ok("empresa nova também fica pendente", r.ok === true && (await statusAprovacao("NOVAE")) === "pendente", r);

// conta criada sem concluir o cadastro (sem registro) também é bloqueada
await pg.query(`insert into "user" (id,name,email,role) values ('INCOMPLETO','Sem Perfil','i@x.com','entregador')`);
ok("conta sem cadastro concluído = pendente", (await statusAprovacao("INCOMPLETO")) === "pendente");

// lista do admin
const lista = await listarCadastros();
ok("admin vê pendentes primeiro, com dados do cadastro", lista[0].status === "pendente" && lista.some((x: any) => x.id === "NOVO" && x.cpf === "123" && x.tipo === "entregador") && lista.some((x: any) => x.id === "NOVAE" && x.empresa === "Nova LTDA"), lista.slice(0, 3));
ok("admin e funcionários não aparecem na lista", !lista.some((x: any) => x.id === "A1"));
ok("antigos aparecem como aprovados", lista.find((x: any) => x.id === "OLDE")?.status === "aprovado");

// decisão
await decidirCadastro("A1", "NOVO", true, null);
ok("aprovado passa a ter acesso", (await statusAprovacao("NOVO")) === "aprovado" && (await contextoDaSessao({ id: "NOVO", role: "entregador" })).role === "entregador");
ok("usuário é avisado da aprovação", ((await pg.query(`select count(*)::int n from user_notifications where user_id='NOVO'`)).rows[0] as any).n === 1);
ok("decisão fica no log do admin", ((await pg.query(`select count(*)::int n from admin_logs where action='cadastro_aprovado'`)).rows[0] as any).n === 1);
await decidirCadastro("A1", "NOVAE", false, "CNPJ inválido");
c = await contextoDaSessao({ id: "NOVAE", role: "empresa" });
ok("recusado fica bloqueado com mensagem", c.role === "recusado", c);
r = await run(c, { table: "ofertas", op: "select", columns: "id", filters: [] });
ok("recusado não lê nada", !!r.error && /não foi aprovado/i.test(r.error.message), r);
await decidirCadastro("A1", "NOVAE", true);
ok("admin pode reverter a decisão", (await statusAprovacao("NOVAE")) === "aprovado");
await decidirCadastro("A1", "OLDD", false, "bloqueado");
ok("admin pode bloquear quem já estava no sistema", (await contextoDaSessao({ id: "OLDD", role: "entregador" })).role === "recusado");

// exceções
ok("admin nunca fica bloqueado", (await contextoDaSessao({ id: "A1", role: "admin" })).role === "admin");
await pg.query(`insert into "user" (id,name,email,role) values ('FUNC','Func','f@x.com','operador')`);
await pg.query(`insert into equipe_empresa (user_id,empresa_id,nome,email,ativo) values ('FUNC','OLDE','Func','f@x.com',true)`);
ok("funcionário convidado pela empresa não passa pela aprovação", (await contextoDaSessao({ id: "FUNC", role: "operador" })).role === "empresa");
// convite de parceiro pré-cadastrado pela empresa
const rr: any = await executeQuery({ ...base, table: "", op: "rpc", rpc: { fn: "cadastrar_entregador_gerenciado", args: { nome_completo: "Convidado", email: "conv@x.com" } } }, { userId: "OLDE", role: "empresa" });
ok("parceiro pré-cadastrado pela empresa já nasce aprovado", !rr.error && (await statusAprovacao(rr.data.id)) === "aprovado", rr);
const rm: any = await executeQuery({ ...base, table: "", op: "rpc", rpc: { fn: "cadastrar_membro_equipe", args: { nome_completo: "Func Novo", email: "fn@x.com" } } }, { userId: "OLDE", role: "empresa" });
ok("funcionário pré-cadastrado nasce aprovado", !rm.error && (await statusAprovacao(rm.data.id)) === "aprovado", rm);
process.exit(fail ? 1 : 0);
