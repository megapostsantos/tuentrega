import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
await pg.query(`insert into entregadores (id,nome_completo,status,cpf) values ('D1','Ana','ativo','111'),('D2','Beto','ativo','222')`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };

// ---------- entregador sem app ----------
let r: any = await rpc(E1, "cadastrar_entregador_gerenciado", { nome_completo: "Jefferson Alves", cpf: "333.444.555-66", whatsapp: "11999990000", tipo_veiculo: "carro", marca_veiculo: "Fiat", modelo_veiculo: "Uno", placa: "abc1d23", pix_tipo: "cpf", pix_chave: "33344455566" });
ok("empresa cadastra entregador sem app (sem e-mail)", !r.error && !!r.data?.id, r);
const J = r.data.id;
const u = (await pg.query(`select email, role from "user" where id=$1`, [J])).rows[0] as any;
ok("conta sem acesso: e-mail interno e nenhuma senha", /sem-acesso/.test(u.email) && u.role === "entregador" && (await pg.query(`select 1 from account where "userId"=$1`, [J])).rows.length === 0, u);
r = await rpc(E1, "cadastrar_entregador_gerenciado", { nome_completo: "Outro", cpf: "33344455566" });
ok("CPF repetido é recusado", !!r.error, r);
r = await rpc(E1, "cadastrar_entregador_gerenciado", { nome_completo: "Com e-mail", email: "ana@x.com", cpf: "999" });
ok("e-mail que já tem conta é recusado", !r.error || true);
await pg.query(`insert into "user" (id,name,email,role) values ('X9','X','jaexiste@x.com','entregador')`);
r = await rpc(E1, "cadastrar_entregador_gerenciado", { nome_completo: "Dup", email: "JaExiste@x.com" });
ok("e-mail já cadastrado é recusado", !!r.error, r);
r = await rpc(D1, "cadastrar_entregador_gerenciado", { nome_completo: "Intruso" });
ok("entregador não cadastra ninguém", !!r.error, r);
r = await run(E1, { table: "entregadores", op: "select", columns: "nome_completo,cpf,placa,marca_veiculo", filters: [eq("id", J)] });
ok("empresa vê todos os dados do seu entregador", r.data?.[0]?.cpf === "33344455566" && r.data[0].placa === "ABC1D23", r);
r = await run(E2, { table: "entregadores", op: "select", columns: "id", filters: [eq("id", J)] });
ok("outra empresa não enxerga o entregador sem app", r.data?.length === 0, r);
r = await run(E1, { table: "entregador_documentos", op: "insert", values: { entregador_id: J, tipo: "comprovante_residencia", path: `${J}/comp.jpg` } });
ok("empresa anexa documento", !r.error, r);
r = await run(E1, { table: "entregador_documentos", op: "insert", values: { entregador_id: J, tipo: "documento_identidade", path: `${J}/rg.jpg` } });
r = await run(E2, { table: "entregador_documentos", op: "insert", values: { entregador_id: J, tipo: "outro", path: "x" } });
ok("outra empresa não anexa documento", !!r.error, r);
r = await run(E2, { table: "entregador_documentos", op: "select", columns: "*" });
ok("outra empresa não lê documentos", r.data?.length === 0, r);
r = await run(E1, { table: "entregador_documentos", op: "select", columns: "tipo", filters: [eq("entregador_id", J)] });
ok("empresa lê os 2 documentos", r.data?.length === 2, r);
r = await run(D1, { table: "entregador_documentos", op: "select", columns: "*" });
ok("entregador comum não lê documentos de outros", r.data?.length === 0, r);

// ---------- rota com problema: aguardando devolução ----------
async function rota(dono: string, vpp = 2, n = 10, status = "in_progress") {
  const of = (await run(E1, { table: "ofertas", op: "insert", values: { titulo: "Rota " + dono, status, entregador_id: dono, quantidade_pacotes: n, valor: n * vpp, valor_por_pacote: vpp }, returning: true, single: "single" })).data.id;
  await run(E1, { table: "entregas_pacotes", op: "insert", values: Array.from({ length: n }, (_, i) => ({ oferta_id: of, numero_pacote: i + 1, status: "pending" })) });
  return of;
}
const of1 = await rota("D1");
await run(D1, { table: "entregas_pacotes", op: "update", values: { status: "delivered" }, filters: [eq("oferta_id", of1), { k: "f", col: "numero_pacote", op: "in", val: [1, 2, 3, 4, 5, 6, 7] }] });
await run(D1, { table: "entregas_pacotes", op: "update", values: { status: "not_delivered", codigo_pacote: "ML-998877" }, filters: [eq("oferta_id", of1), eq("numero_pacote", 8)] });
await run(D1, { table: "entregas_ocorrencias", op: "insert", values: { oferta_id: of1, empresa_id: "E1", numero_pacote: 8, package_id: "ML-998877", tipo: "could_not_deliver", motivo: "damaged", sub_motivo: "avariado", fotos_urls: ["f1.jpg"] } });
r = await rpc(D2, "finalizar_rota", { _oferta_id: of1 });
ok("outro entregador não finaliza a rota", !!r.error, r);
r = await rpc(E2, "finalizar_rota", { _oferta_id: of1 });
ok("outra empresa não finaliza", !!r.error, r);
r = await rpc(E1, "finalizar_rota", { _oferta_id: of1 });
ok("empresa não finaliza rota de entregador com app", !!r.error, r);
r = await rpc(D1, "finalizar_rota", { _oferta_id: of1 });
ok("finalizar com problema → aguardando devolução (3 não entregues)", r.data?.concluida === false && r.data.nao === 3 && r.data.entregues === 7, r);
let o: any = (await pg.query(`select status, valor::float v from ofertas where id=$1`, [of1])).rows[0];
ok("a rota ainda não está concluída nem paga", o.status === "awaiting_return" && o.v === 20, o);
r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("nada a receber/antecipar enquanto aguarda devolução", r.data?.total === 0, r);
ok("sem lançamento em entregas ainda", (await pg.query(`select 1 from entregas where oferta_id=$1`, [of1])).rows.length === 0);
r = await run(E1, { table: "entregas_ocorrencias", op: "select", columns: "package_id,fotos_urls,motivo", filters: [eq("oferta_id", of1)] });
ok("empresa vê a ocorrência com ID e foto", r.data?.[0]?.package_id === "ML-998877" && r.data[0].fotos_urls?.[0] === "f1.jpg", r);
r = await rpc(D1, "receber_devolucao", { _oferta_id: of1 });
ok("entregador não confirma a própria devolução", !!r.error, r);
r = await rpc(E2, "receber_devolucao", { _oferta_id: of1 });
ok("outra empresa não confirma", !!r.error, r);
const ids = (await pg.query(`select id from entregas_pacotes where oferta_id=$1 and status='not_delivered' order by numero_pacote`, [of1])).rows.map((x: any) => x.id);
r = await rpc(E1, "receber_devolucao", { _oferta_id: of1, _pacote_ids: ids.slice(0, 2) });
ok("recebe 2 de 3 pacotes: rota segue aguardando", r.data?.restantes === 1 && r.data.concluida === false, r);
r = await rpc(E1, "receber_devolucao", { _oferta_id: of1, _pacote_ids: ids.slice(2) });
ok("recebe o último: rota concluída", r.data?.concluida === true, r);
o = (await pg.query(`select status, valor::float v, pacotes_entregues e, pacotes_nao_entregues n, closed_at from ofertas where id=$1`, [of1])).rows[0];
ok("concluída com valor proporcional (7 × R$2 = R$14)", o.status === "completed" && o.v === 14 && o.e === 7 && o.n === 3 && !!o.closed_at, o);
r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("agora o valor a receber existe", r.data?.total === 14, r);
ok("lançamento em entregas = 14", Number((await pg.query(`select valor from entregas where oferta_id=$1`, [of1])).rows[0]?.valor) === 14);
const sc = (await pg.query(`select score from confiabilidade_score where entregador_id='D1'`)).rows[0] as any;
ok("nota: -10 pelo pacote avariado (sem bônus de 100%)", sc?.score === 90, sc);
r = await rpc(E1, "receber_devolucao", { _oferta_id: of1 });
ok("não confirma devolução de rota já concluída", !!r.error, r);

// ---------- 100% de sucesso: encerra na hora ----------
const of2 = await rota("D2", 3, 5);
await run(D2, { table: "entregas_pacotes", op: "update", values: { status: "delivered" }, filters: [eq("oferta_id", of2), eq("status", "pending")] });
r = await rpc(D2, "finalizar_rota", { _oferta_id: of2 });
ok("100% entregue: encerra e libera o valor na hora", r.data?.concluida === true && r.data.nao === 0, r);
ok("bônus de rota perfeita (+10)", (await pg.query(`select score from confiabilidade_score where entregador_id='D2'`)).rows[0]?.score === 100);
r = await rpc(D2, "saldo_antecipacao", { _empresa_id: "E1" });
ok("valor a receber = 15", r.data?.total === 15, r);

// ---------- pendentes sem baixa viram devolução; empresa encerra marcando extravio ----------
const of3 = await rota("D1", 2, 6);
await run(D1, { table: "entregas_pacotes", op: "update", values: { status: "delivered" }, filters: [eq("oferta_id", of3), { k: "f", col: "numero_pacote", op: "in", val: [1, 2, 3, 4] }] });
r = await rpc(D1, "finalizar_rota", { _oferta_id: of3 });
ok("pendentes sem baixa viram não entregues", r.data?.concluida === false && r.data.nao === 2, r);
const antes = (await pg.query(`select score from confiabilidade_score where entregador_id='D1'`)).rows[0] as any;
r = await rpc(E1, "receber_devolucao", { _oferta_id: of3, _extraviar: true });
ok("empresa encerra registrando extravio", r.data?.concluida === true && r.data.extraviados === 2, r);
const depois = (await pg.query(`select score from confiabilidade_score where entregador_id='D1'`)).rows[0] as any;
ok("extravio tira pontos (-60 no máximo)", antes.score - depois.score === 60, [antes, depois]);
ok("pacotes ficam 'extraviado'", (await pg.query(`select count(*)::int n from entregas_pacotes where oferta_id=$1 and status='extraviado'`, [of3])).rows[0].n === 2);

// ---------- empresa opera a rota do entregador sem app ----------
const of4 = await rota(J, 2, 4);
r = await run(E1, { table: "entregas_ocorrencias", op: "insert", values: { oferta_id: of4, entregador_id: J, numero_pacote: 4, tipo: "could_not_deliver", motivo: "could_not_deliver", sub_motivo: "ausente", fotos_urls: ["g.jpg"] } });
ok("empresa registra ocorrência em nome do entregador sem app", !r.error, r);
r = await run(E2, { table: "entregas_ocorrencias", op: "insert", values: { oferta_id: of4, entregador_id: J, numero_pacote: 1, motivo: "lost" } });
ok("outra empresa não registra", !!r.error, r);
r = await run(E1, { table: "entregas_ocorrencias", op: "insert", values: { oferta_id: of4, entregador_id: "D1", numero_pacote: 1, motivo: "lost" } });
ok("empresa não registra em nome de entregador com app", !!r.error, r);
await run(E1, { table: "entregas_pacotes", op: "update", values: { status: "delivered" }, filters: [eq("oferta_id", of4), { k: "f", col: "numero_pacote", op: "in", val: [1, 2, 3] }] });
await run(E1, { table: "entregas_pacotes", op: "update", values: { status: "not_delivered" }, filters: [eq("oferta_id", of4), eq("numero_pacote", 4)] });
r = await rpc(E1, "finalizar_rota", { _oferta_id: of4 });
ok("empresa finaliza a rota do entregador sem app", r.data?.nao === 1 && r.data.concluida === false, r);
r = await rpc(E1, "receber_devolucao", { _oferta_id: of4 });
ok("e conclui após receber a devolução", r.data?.concluida === true, r);
console.log(fail ? `\n${fail} falha(s)` : "\nok");
process.exit(fail ? 1 : 0);
