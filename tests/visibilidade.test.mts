import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery, contextoDaSessao, criarVinculo } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"],["D4","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf) values ('D1','Ana','ativo','1'),('D2','Beto','ativo','2'),('D4','Dani','ativo','4')`);
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c).catch((e: any) => ({ data: null, error: { message: e.message } }));
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x).slice(0, 250)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });
const titulos = async (c: any) => (await run(c, { table: "ofertas", op: "select", columns: "titulo", filters: [] })).data.map((x: any) => x.titulo).sort();

// funcionário que também é entregador da E1
let r: any = await rpc(E1, "cadastrar_membro_equipe", { nome_completo: "Func Duplo", email: "fd@x.com", tambem_entregador: true });
const FD = r.data.id;
const D3 = await contextoDaSessao({ id: FD, role: "operador" }, "entregador");

// clã da E1: D1 entra manualmente
r = await run(E1, { table: "cla_empresa", op: "insert", values: { entregador_id: "D1" } });
ok("empresa adiciona um parceiro ao clã", !r.error, r);
ok("outra empresa não vê o clã", (await run(E2, { table: "cla_empresa", op: "select", columns: "*", filters: [] })).data.length === 0);
r = await run(E1, { table: "cla_empresa", op: "insert", values: { entregador_id: "NAO-EXISTE" } });
ok("não adiciona quem não existe", !!r.error, r);

for (const v of ["publica", "cla", "equipe"]) await run(E1, { table: "ofertas", op: "insert", values: { titulo: `E1-${v}`, status: "open", quantidade_pacotes: 1, valor: 1, visibilidade: v } });
await run(E2, { table: "ofertas", op: "insert", values: { titulo: "E2-publica", status: "open", quantidade_pacotes: 1, valor: 1 } });
ok("padrão da vaga é pública", ((await pg.query(`select visibilidade v from ofertas where titulo='E2-publica'`)).rows[0] as any).v === "publica");
ok("D1 (no clã) vê pública e clã, não a da equipe interna", JSON.stringify(await titulos(D1)) === JSON.stringify(["E1-cla", "E1-publica", "E2-publica"]), await titulos(D1));
ok("D2 (fora do clã) vê só as públicas", JSON.stringify(await titulos(D2)) === JSON.stringify(["E1-publica", "E2-publica"]), await titulos(D2));
ok("funcionário-entregador vê pública e equipe interna", JSON.stringify(await titulos(D3)) === JSON.stringify(["E1-equipe", "E1-publica", "E2-publica"]), await titulos(D3));

// ninguém pega à força
const idCla = (await pg.query(`select id from ofertas where titulo='E1-cla'`)).rows[0] as any;
const idEq = (await pg.query(`select id from ofertas where titulo='E1-equipe'`)).rows[0] as any;
r = await rpc(D2, "candidatar_oferta", { _oferta_id: idCla.id });
ok("fora do clã não se candidata à vaga do clã", !!r.error && /clã|equipe/i.test(r.error.message), r);
r = await rpc(D1, "candidatar_oferta", { _oferta_id: idEq.id });
ok("clã não se candidata à vaga da equipe interna", !!r.error, r);
r = await rpc(D1, "candidatar_oferta", { _oferta_id: idCla.id });
ok("do clã se candidata normalmente", !r.error && r.data.modo === "pendente", r);
r = await rpc(D3, "candidatar_oferta", { _oferta_id: idEq.id });
ok("funcionário-entregador se candidata à vaga interna", !r.error, r);

// publicar rotas escolhendo o público
const op = (await run(E1, { table: "operacoes", op: "insert", values: { data_operacao: "2026-12-01", total_pacotes_sistema: 6, total_pacotes_contados: 6, total_paradas: 0, valor_por_pacote: 2, status: "draft", origem: "ML" }, returning: true, single: "single" })).data.id;
const rs = (await run(E1, { table: "rotas_operacao", op: "insert", values: [{ operacao_id: op, nome: "Z1", quantidade_pacotes: 3, quantidade_paradas: 0, valor_total: 6, status: "draft" }, { operacao_id: op, nome: "Z2", quantidade_pacotes: 3, quantidade_paradas: 0, valor_total: 6, status: "draft" }], returning: true })).data;
await rpc(E1, "publicar_rotas", { _operacao_id: op, _rota_ids: [rs[0].id], _visibilidade: "cla" });
await rpc(E1, "publicar_rotas", { _operacao_id: op, _rota_ids: [rs[1].id] });
const vs = (await pg.query(`select titulo, visibilidade v from ofertas where operacao_id=$1 order by titulo`, [op])).rows as any[];
ok("publicar escolhendo 'clã' grava a audiência; sem escolher, pública", vs[0].v === "cla" && vs[1].v === "publica", vs);
ok("valor inválido cai para pública (não abre nem fecha por engano)", (await rpc(E1, "publicar_rotas", { _operacao_id: op, _visibilidade: "x" })).data.publicadas === 0);

// vínculo coloca no clã
await criarVinculo("D4", "E1");
ok("quem é vinculado entra no clã automaticamente", ((await pg.query(`select origem from cla_empresa where entregador_id='D4' and empresa_id='E1'`)).rows[0] as any)?.origem === "vinculo");
r = await run(E2, { table: "cla_empresa", op: "insert", values: { entregador_id: "D4" } });
ok("outra empresa não coloca no clã quem é vinculado à A", !!r.error, r);
r = await run(E1, { table: "cla_empresa", op: "delete", filters: [eq("entregador_id", "D1")] });
ok("empresa tira do clã e a pessoa deixa de ver as vagas dele", !r.error && !(await titulos(D1)).includes("E1-cla"), await titulos(D1));

// previsões respeitam a audiência
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
await run(E1, { table: "cla_empresa", op: "insert", values: { entregador_id: "D1" } });
await run(E1, { table: "agenda_previsoes", op: "insert", values: { data_prevista: amanha, pacotes_estimados: 10, rotas_estimadas: 1, status: "aberta", visibilidade: "cla" } });
ok("previsão do clã: D1 vê, D2 não", (await run(D1, { table: "agenda_previsoes", op: "select", columns: "id", filters: [] })).data.length === 1 && (await run(D2, { table: "agenda_previsoes", op: "select", columns: "id", filters: [] })).data.length === 0);
process.exit(fail ? 1 : 0);
