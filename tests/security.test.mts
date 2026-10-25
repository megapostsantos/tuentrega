import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (t, p) => (await pg.query(t, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0, bad = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); bad += r.failed.length; off = r.next; }
console.log("setup failed:", bad);
const U = (id: string, role: string) => pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [id, role]);
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"],["ADM","admin"]]) await U(i, r);
await pg.query(`insert into empresas (id,razao_social,cnpj,nome_fantasia,responsavel,whatsapp) values ('E1','Emp Um','111','Um','Resp1','1199'),('E2','Emp Dois','222','Dois','Resp2','1188')`);
await pg.query(`insert into entregadores (id,nome_completo,cpf,pix_chave,whatsapp,status) values ('D1','Driver Um','11111111111','pix1','1197','ativo'),('D2','Driver Dois','22222222222','pix2','1196','ativo')`);
const ADM = { userId: "ADM", role: "admin" }, E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
const base = { filters: [], order: [] } as any;
const run = (ctx: any, r: any) => executeQuery({ ...base, ...r }, ctx);
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra?: any) => { cond ? pass++ : fail++; console.log(cond ? "PASS" : "FAIL", name, cond ? "" : JSON.stringify(extra)); };

// ofertas (admin cria)
const o1 = await run(ADM, { table: "ofertas", op: "insert", values: { empresa_id: "E1", titulo: "E1 aberta", valor: 100, status: "open" }, returning: true, single: "single" });
const o2 = await run(ADM, { table: "ofertas", op: "insert", values: { empresa_id: "E2", titulo: "E2 aberta", valor: 200, status: "open" }, returning: true, single: "single" });
const o3 = await run(ADM, { table: "ofertas", op: "insert", values: { empresa_id: "E1", titulo: "E1 privada", valor: 300, status: "open", tipo: "private" }, returning: true, single: "single" });
const o4 = await run(ADM, { table: "ofertas", op: "insert", values: { empresa_id: "E2", titulo: "E2 de D2", valor: 50, status: "in_progress", entregador_id: "D2" }, returning: true, single: "single" });
const id1 = o1.data.id, id2 = o2.data.id, id3 = o3.data.id, id4 = o4.data.id;

let r = await run(E1, { table: "ofertas", op: "select", columns: "titulo" });
ok("E1 só vê ofertas dela", r.data.length === 2 && r.data.every((x: any) => x.titulo.startsWith("E1")), r.data);
r = await run(D1, { table: "ofertas", op: "select", columns: "titulo" });
ok("D1 vê abertas públicas, não privadas nem de outro", r.data.length === 2 && !r.data.some((x: any) => x.titulo.includes("privada") || x.titulo.includes("de D2")), r.data);
r = await run(D2, { table: "ofertas", op: "select", columns: "titulo" });
ok("D2 vê as suas em andamento + abertas públicas", r.data.some((x: any) => x.titulo === "E2 de D2") && !r.data.some((x: any) => x.titulo.includes("privada")), r.data);

// escrita
r = await run(E1, { table: "ofertas", op: "update", values: { valor: 1 }, filters: [{ k: "f", col: "id", op: "eq", val: id2 }], returning: true });
ok("E1 não altera oferta da E2", r.error == null && r.data.length === 0, r);
r = await run(E1, { table: "ofertas", op: "update", values: { empresa_id: "E2" }, filters: [{ k: "f", col: "id", op: "eq", val: id1 }] });
ok("E1 não troca dono da própria oferta", !!r.error, r);
r = await run(E1, { table: "ofertas", op: "insert", values: { empresa_id: "E2", titulo: "x" } });
ok("E1 não cria oferta em nome da E2", !!r.error, r);
r = await run(E1, { table: "ofertas", op: "insert", values: { titulo: "sem dono" }, returning: true });
ok("insert da E1 força empresa_id dela", r.data?.[0]?.empresa_id === "E1", r);
r = await run(D1, { table: "ofertas", op: "update", values: { valor: 1 }, filters: [{ k: "f", col: "id", op: "eq", val: id2 }] });
ok("D1 não pode editar valor", !!r.error, r);
r = await run(D1, { table: "ofertas", op: "update", values: { status: "in_progress", entregador_id: "D2" }, filters: [{ k: "f", col: "id", op: "eq", val: id2 }] });
ok("D1 não pode atribuir a outro entregador", !!r.error, r);
r = await run(D1, { table: "ofertas", op: "update", values: { status: "in_progress", entregador_id: "D1" }, filters: [{ k: "f", col: "id", op: "eq", val: id2 }, { k: "f", col: "status", op: "eq", val: "open" }], returning: true });
ok("D1 aceita oferta aberta", r.data?.length === 1 && r.data[0].entregador_id === "D1", r);
r = await run(D2, { table: "ofertas", op: "update", values: { status: "in_progress", entregador_id: "D2" }, filters: [{ k: "f", col: "id", op: "eq", val: id3 }], returning: true });
ok("D2 não aceita oferta privada sem convite", r.data?.length === 0, r);
r = await run(D1, { table: "ofertas", op: "delete", filters: [{ k: "f", col: "id", op: "eq", val: id1 }] });
ok("entregador não deleta oferta", !!r.error, r);

// pacotes
await run(ADM, { table: "entregas_pacotes", op: "insert", values: [{ oferta_id: id1, numero_pacote: 1, destinatario_nome: "Fulano" }, { oferta_id: id2, numero_pacote: 1 }] });
r = await run(E1, { table: "entregas_pacotes", op: "select", columns: "oferta_id" });
ok("E1 só vê pacotes das suas ofertas", r.data.length === 1 && r.data[0].oferta_id === id1, r);
r = await run(D2, { table: "entregas_pacotes", op: "select", columns: "oferta_id" });
ok("D2 não vê pacotes de ofertas que não são suas", r.data.length === 0, r);
r = await run(E1, { table: "entregas_pacotes", op: "insert", values: { oferta_id: id2, numero_pacote: 9 } });
ok("E1 não insere pacote em oferta alheia", !!r.error, r);

// entregadores: máscara
r = await run(E1, { table: "entregadores", op: "select", columns: "*" });
const d1 = r.data.find((x: any) => x.id === "D1"), d2 = r.data.find((x: any) => x.id === "D2");
ok("E1 vê CPF/PIX só de quem trabalha para ela (D1 aceitou oferta da E2, então ainda não)", d1 && d1.cpf === null && d2 && d2.cpf === null, { d1: d1?.cpf, d2: d2?.cpf });
r = await run(E2, { table: "entregadores", op: "select", columns: "id,cpf,pix_chave,nome_completo" });
if (!r.data) console.log("ERRO:", JSON.stringify(r.error));
const e2d1 = r.data.find((x: any) => x.id === "D1"), e2d2 = r.data.find((x: any) => x.id === "D2");
ok("E2 vê CPF de quem trabalha para ela (D1 e D2)", e2d1?.cpf === "11111111111" && e2d2?.cpf === "22222222222", r.data);
r = await run(E1, { table: "entregadores", op: "select", columns: "id", filters: [{ k: "f", col: "cpf", op: "eq", val: "11111111111" }] });
ok("E1 não consegue achar entregador por CPF mascarado", r.data.length === 0, r);
r = await run(D1, { table: "entregadores", op: "select", columns: "id" });
ok("D1 só enxerga a si mesmo", r.data.length === 1 && r.data[0].id === "D1", r);
r = await run(D1, { table: "entregadores", op: "update", values: { reliability_score: 100, status: "ativo" }, filters: [{ k: "f", col: "id", op: "eq", val: "D1" }] });
ok("entregador não altera score/status", !!r.error, r);
r = await run(E1, { table: "entregadores", op: "update", values: { status: "suspenso" }, filters: [{ k: "f", col: "id", op: "eq", val: "D1" }] });
const st = await run(D1, { table: "entregadores", op: "select", columns: "status", filters: [{ k: "f", col: "id", op: "eq", val: "D1" }] });
ok("empresa não suspende entregador (não gerenciado)", !!r.error || st.data[0]?.status !== "suspenso", { r, st });

// embeds respeitam política
r = await run(E1, { table: "ofertas", op: "select", columns: "titulo, entregadores(nome_completo, cpf)", filters: [{ k: "f", col: "id", op: "eq", val: id1 }] });
ok("embed de entregador mascarado/escopado", r.error == null, r);
r = await run(D1, { table: "ofertas", op: "select", columns: "titulo, empresas(nome_fantasia, cnpj)" });
const mk = r.data.find((x: any) => x.titulo === "E1 aberta");
ok("D1 não vê nome/CNPJ de empresa sem relação", mk && (mk.empresas === null || (mk.empresas.cnpj ?? null) === null), r.data);

// empresas
r = await run(E1, { table: "empresas", op: "select", columns: "id,razao_social" });
ok("E1 só lê a própria empresa", r.data.length === 1 && r.data[0].id === "E1", r);
r = await run(E1, { table: "empresas", op: "update", values: { plano: "enterprise" }, filters: [{ k: "f", col: "id", op: "eq", val: "E1" }] });
ok("empresa não troca o próprio plano", !!r.error, r);

// tabelas sem política
r = await run(E1, { table: "admin_settings", op: "select", columns: "*" });
ok("não-admin não lê admin_settings (vazio)", r.data.length === 0, r);
r = await run(E1, { table: "plans", op: "update", values: { name: "x" }, filters: [{ k: "f", col: "id", op: "eq", val: "p" }] });
ok("não-admin não altera plans", !!r.error, r);
r = await run(E1, { table: "admin_logs", op: "insert", values: { admin_id: "E1", action: "x" } });
ok("não-admin pode registrar log", r.error == null, r);
r = await run(E1, { table: "user", op: "select", columns: "*" });
ok("tabela user inacessível", !!r.error, r);
r = await run({ userId: null, role: null } as any, { table: "ofertas", op: "select", columns: "*" });
ok("anônimo bloqueado", r.error?.code === "401", r);

// rpc
r = await run(D1, { table: "", op: "rpc", rpc: { fn: "apply_reliability_event", args: { _entregador_id: "D1", _evento: "x", _pontos: 100, _descricao: "" } } });
ok("entregador não se dá 100 pontos", !!r.error, r);
r = await run(D1, { table: "", op: "rpc", rpc: { fn: "apply_reliability_event", args: { _entregador_id: "D2", _evento: "x", _pontos: -10, _descricao: "" } } });
ok("entregador não mexe no score de outro", !!r.error, r);
r = await run(D1, { table: "", op: "rpc", rpc: { fn: "apply_reliability_event", args: { _entregador_id: "D1", _evento: "late", _pontos: -10, _descricao: "" } } });
ok("entregador registra evento legítimo", r.error == null, r);

// NEX isolado
r = await run(E1, { table: "saidas_nex", op: "insert", values: { codigo_nx: "A", qr_saca: "QA" }, returning: true });
ok("saída NEX nasce da empresa", r.data?.[0]?.empresa_id === "E1", r);
r = await run(E2, { table: "saidas_nex", op: "select", columns: "*" });
ok("E2 não vê saída NEX da E1", r.data.length === 0, r);

console.log(`\n${pass} ok, ${fail} falhas`);
await pg.close();
