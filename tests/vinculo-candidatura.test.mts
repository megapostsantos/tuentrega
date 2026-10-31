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
const oferta = async (c: any, titulo: string, extra: any = {}) => (await run(c, { table: "ofertas", op: "insert", values: { titulo, status: "open", quantidade_pacotes: 4, valor: 8, valor_por_pacote: 2, ...extra }, returning: true, single: "single" })).data.id as string;
const visiveis = async (c: any) => (await run(c, { table: "ofertas", op: "select", columns: "titulo", filters: [] })).data.map((x: any) => x.titulo).sort();

const oA = await oferta(E1, "Rota da A"), oB = await oferta(E2, "Rota da B");

// ---- vínculo exclusivo
ok("sem vínculo, o entregador vê as duas empresas", JSON.stringify(await visiveis(D1)) === JSON.stringify(["Rota da A", "Rota da B"]), await visiveis(D1));
await criarVinculo("D1", "E1");
ok("vinculado à empresa A: vê só as ofertas dela", JSON.stringify(await visiveis(D1)) === JSON.stringify(["Rota da A"]), await visiveis(D1));
ok("quem entrou sozinho continua vendo todas", (await visiveis(D2)).length === 2);
let r: any = await rpc(D1, "candidatar_oferta", { _oferta_id: oB });
ok("vinculado não consegue se candidatar a oferta de outra empresa", !!r.error && /vinculado/.test(r.error.message), r);
r = await run(D1, { table: "ofertas", op: "update", values: { entregador_id: "D1", status: "in_progress" }, filters: [eq("id", oB)] });
const bAntes = (await pg.query(`select entregador_id from ofertas where id=$1`, [oB])).rows[0] as any;
ok("e não pega por atualização direta", bAntes.entregador_id === null, { r, bAntes });
r = await run(E2, { table: "vinculos_empresa", op: "delete", filters: [eq("entregador_id", "D1")] });
ok("outra empresa não desvincula", (await pg.query(`select 1 from vinculos_empresa where entregador_id='D1'`)).rows.length === 1, r);
r = await run(E1, { table: "vinculos_empresa", op: "delete", filters: [eq("entregador_id", "D1")] });
ok("a empresa desvincula e o entregador volta a ver tudo", !r.error && (await visiveis(D1)).length === 2, await visiveis(D1));

await criarVinculo("D1", "E1");
ok("empresa B não enxerga (nem aloca) o entregador vinculado à A", (await run(E2, { table: "entregadores", op: "select", columns: "id", filters: [eq("id", "D1")] })).data.length === 0);
ok("empresa A enxerga o seu vinculado", (await run(E1, { table: "entregadores", op: "select", columns: "id", filters: [eq("id", "D1")] })).data.length === 1);
await run(E1, { table: "vinculos_empresa", op: "delete", filters: [eq("entregador_id", "D1")] });
ok("depois de desvincular, a empresa B volta a enxergar", (await run(E2, { table: "entregadores", op: "select", columns: "id", filters: [eq("id", "D1")] })).data.length === 1);

// ---- aprovação da empresa
r = await rpc(D2, "candidatar_oferta", { _oferta_id: oB });
ok("com aprovação ligada (padrão) vira candidatura pendente", !r.error && r.data.modo === "pendente", r);
ok("a rota continua aberta", ((await pg.query(`select status from ofertas where id=$1`, [oB])).rows[0] as any).status === "open");
r = await rpc(D2, "candidatar_oferta", { _oferta_id: oB });
ok("candidatar duas vezes não duplica", (await pg.query(`select 1 from candidaturas where oferta_id=$1`, [oB])).rows.length === 1, r);
await rpc(D3, "candidatar_oferta", { _oferta_id: oB });
ok("a empresa recebeu notificações dos candidatos", ((await pg.query(`select count(*)::int n from user_notifications where user_id='E2'`)).rows[0] as any).n === 2);
const cands = (await run(E2, { table: "candidaturas", op: "select", columns: "id,entregador_id,status", filters: [] })).data;
ok("empresa vê os 2 candidatos; outra empresa não vê", cands.length === 2 && (await run(E1, { table: "candidaturas", op: "select", columns: "id", filters: [] })).data.length === 0, cands);
const cD2 = cands.find((x: any) => x.entregador_id === "D2").id, cD3 = cands.find((x: any) => x.entregador_id === "D3").id;
r = await rpc(E1, "decidir_candidatura", { _candidatura_id: cD2, _aprovar: true });
ok("outra empresa não decide", !!r.error, r);
r = await rpc(D2, "decidir_candidatura", { _candidatura_id: cD2, _aprovar: true });
ok("o próprio candidato não se aprova", !!r.error, r);
r = await rpc(E2, "decidir_candidatura", { _candidatura_id: cD2, _aprovar: true });
const ob = (await pg.query(`select status, entregador_id from ofertas where id=$1`, [oB])).rows[0] as any;
ok("empresa aprova: rota fica com o escolhido", !r.error && ob.status === "accepted" && ob.entregador_id === "D2", { r, ob });
ok("os outros candidatos ficam recusados", ((await pg.query(`select status from candidaturas where id=$1`, [cD3])).rows[0] as any).status === "recusada");
r = await rpc(E2, "decidir_candidatura", { _candidatura_id: cD3, _aprovar: true });
ok("não dá para aprovar depois que a rota foi atribuída", !!r.error, r);
ok("o escolhido foi avisado", ((await pg.query(`select count(*)::int n from user_notifications where user_id='D2'`)).rows[0] as any).n === 1);
ok("pacotes da rota criados na aprovação", ((await pg.query(`select count(*)::int n from entregas_pacotes where oferta_id=$1`, [oB])).rows[0] as any).n === 4);

// ---- recusar candidatura
const oB2 = await oferta(E2, "Outra da B");
await rpc(D3, "candidatar_oferta", { _oferta_id: oB2 });
const c2 = (await run(E2, { table: "candidaturas", op: "select", columns: "id", filters: [eq("oferta_id", oB2)] })).data[0].id;
await rpc(E2, "decidir_candidatura", { _candidatura_id: c2, _aprovar: false });
r = await rpc(D3, "candidatar_oferta", { _oferta_id: oB2 });
ok("candidatura recusada não pode ser refeita", !!r.error, r);
ok("a rota segue aberta após recusar", ((await pg.query(`select status from ofertas where id=$1`, [oB2])).rows[0] as any).status === "open");

// ---- sem aprovação: dois entregadores na mesma rota
await run(E2, { table: "empresas", op: "update", values: { aprovar_candidatos: false }, filters: [eq("id", "E2")] });
const oB3 = await oferta(E2, "Disputada");
const [r1, r2] = await Promise.all([rpc(D2, "candidatar_oferta", { _oferta_id: oB3 }), rpc(D3, "candidatar_oferta", { _oferta_id: oB3 })]);
const dono = (await pg.query(`select entregador_id from ofertas where id=$1`, [oB3])).rows[0] as any;
ok("dois entregadores ao mesmo tempo: só um fica com a rota", [r1, r2].filter((x: any) => !x.error).length === 1 && [r1, r2].filter((x: any) => x.error).length === 1 && !!dono.entregador_id, { r1, r2, dono });
ok("o segundo recebe mensagem clara", [r1, r2].some((x: any) => x.error && /já foi atribuída/.test(x.error.message)), [r1, r2]);
process.exit(fail ? 1 : 0);
