import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery, contextoDaSessao } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social,tms_valor_padrao_pacote) values ('E1','A',2),('E2','B',2)`);
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
const dono = { userId: "E1", role: "empresa" };
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });

let r: any = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Rafa Duplo", email: "rafa@e.com", tambem_entregador: true });
const R = r.data.id;
r = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Só Gestão", email: "gestao@e.com" });
const G = r.data.id;
ok("funcionário com perfil de entregador cria a linha em entregadores", ((await pg.query(`select status from entregadores where id=$1`, [R])).rows[0] as any)?.status === "ativo");
ok("funcionário comum não vira entregador", (await pg.query(`select 1 from entregadores where id=$1`, [G])).rows.length === 0);

let ctx = await contextoDaSessao({ id: R, role: "operador" }, undefined);
ok("modo padrão = gestão (age pela empresa, sem valores)", ctx.userId === "E1" && ctx.role === "empresa" && ctx.operador === true, ctx);
ctx = await contextoDaSessao({ id: R, role: "operador" }, "entregador");
ok("modo entregador = acesso só ao próprio id", ctx.userId === R && ctx.role === "entregador" && !ctx.operador, ctx);
ctx = await contextoDaSessao({ id: G, role: "operador" }, "entregador");
ok("sem perfil de entregador o pedido de modo é ignorado", ctx.userId === "E1" && ctx.operador === true, ctx);
ctx = await contextoDaSessao({ id: "E1", role: "empresa" }, "entregador");
ok("dono não troca de papel por cabeçalho", ctx.userId === "E1" && ctx.role === "empresa", ctx);

// como entregador: vê oferta aberta e aceita
const of = (await run(dono, { table: "ofertas", op: "insert", values: { titulo: "Zona", status: "open", quantidade_pacotes: 5, valor: 10, valor_por_pacote: 2 }, returning: true, single: "single" })).data.id;
const ent = await contextoDaSessao({ id: R, role: "operador" }, "entregador");
r = await run(ent, { table: "ofertas", op: "select", columns: "titulo,valor", filters: [eq("id", of)] });
ok("no modo entregador vê a oferta com valor (como qualquer entregador)", r.data?.length === 1 && Number(r.data[0].valor) === 10, r);
r = await run(ent, { table: "entregadores", op: "select", columns: "nome_completo", filters: [eq("id", R)] });
ok("lê o próprio cadastro de entregador", r.data?.[0]?.nome_completo === "Rafa Duplo", r);
const gestao = await contextoDaSessao({ id: R, role: "operador" }, "gestao");
r = await run(gestao, { table: "ofertas", op: "select", columns: "valor", filters: [eq("id", of)] });
ok("no modo gestão o valor continua oculto", r.data?.[0]?.valor === null, r);
r = await rpc(dono, "definir_membro_entregador", { _user_id: G, _ativo: true });
ok("dono habilita depois", !r.error && (await pg.query(`select 1 from entregadores where id=$1`, [G])).rows.length === 1, r);
r = await rpc(await contextoDaSessao({ id: R, role: "operador" }, undefined), "definir_membro_entregador", { _user_id: G, _ativo: false });
ok("funcionário não mexe nisso", !!r.error, r);
r = await rpc({ userId: "E2", role: "empresa" }, "definir_membro_entregador", { _user_id: G, _ativo: false });
ok("outra empresa não mexe", !!r.error, r);
process.exit(fail ? 1 : 0);
