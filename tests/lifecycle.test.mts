// Ciclo completo: cadastro → agenda → operação → rotas atribuídas → baixa em massa → fechamento → antecipação → pagamento
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery, registerProfile } from "../src/server/data-engine.ts";

const pg = new PGlite();
__setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0, bad = 0;
while (off !== null) { const r = await runSetupBatch(sql, off, 40); bad += r.failed.length; off = r.next; }
console.log("setup failed:", bad);

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, x?: any) => { c ? pass++ : fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const base = { filters: [], order: [] } as any;
const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });
const hoje = new Date().toISOString().slice(0, 10);

// 1. cadastro (como o formulário: conta criada com perfil padrão e depois /api/db/register)
for (const [id, nome] of [["E1", "Empresa Um"], ["D1", "Ana Souza"], ["D2", "Beto Lima"], ["ADM", "Admin"]])
  await pg.query(`insert into "user" (id,name,email,role) values ($1,$2,$1||'@x.com',$3)`, [id, nome, id === "ADM" ? "admin" : "entregador"]);
let r: any = await registerProfile({ id: "E1", name: "Empresa Um", role: "entregador" }, "empresa", { razao_social: "Empresa Um", cnpj: "11222333000144" });
ok("cadastro de empresa", r.ok === true, r);
r = await registerProfile({ id: "D1", name: "Ana Souza", role: "entregador" }, "entregador", { nome_completo: "Ana Souza", cpf: "11111111111", pix_tipo: "cpf", pix_chave: "ana-pix", marca_veiculo: "Honda", modelo_veiculo: "CG 160" });
ok("cadastro de entregador com marca/modelo", r.ok === true, r);
await registerProfile({ id: "D2", name: "Beto Lima", role: "entregador" }, "entregador", { nome_completo: "Beto Lima", cpf: "22222222222" });
const E1 = { userId: "E1", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
r = await run(E1, { table: "entregadores", op: "select", columns: "id,marca_veiculo,modelo_veiculo,cpf", filters: [eq("id", "D1")] });
ok("empresa vê a marca/modelo mas não o CPF de quem nunca trabalhou para ela", r.data?.[0]?.marca_veiculo === "Honda" && r.data[0].cpf === null, r);

// 2. configuração financeira e agenda
await run(E1, { table: "config_pagamento", op: "upsert", values: { empresa_id: "E1", antecipacao_ativa: true, antecipacao_percentual: 10, limite_percentual: 100, valor_minimo: 20 }, onConflict: "empresa_id" });
const pv = (await run(E1, { table: "agenda_previsoes", op: "insert", values: { data_prevista: hoje, pacotes_estimados: 300, rotas_estimadas: 2, pacotes_por_rota: 150, valor_por_pacote: 2, status: "aberta", permite_cancelamento: true }, returning: true, single: "single" })).data.id;
await run(D1, { table: "agenda_compromissos", op: "insert", values: { previsao_id: pv, empresa_id: "E1", pacotes_comprometidos: 150 } });
await run(D2, { table: "agenda_compromissos", op: "insert", values: { previsao_id: pv, empresa_id: "E1", pacotes_comprometidos: 150 } });
await run(E1, { table: "agenda_compromissos", op: "update", values: { pacotes_ajustados: 100, status: "confirmado" }, filters: [eq("entregador_id", "D2")] });
r = await run(E1, { table: "agenda_compromissos", op: "select", columns: "entregador_id,pacotes_comprometidos,pacotes_ajustados" });
ok("empresa vê os dois compromissos e o ajuste", r.data.length === 2 && r.data.find((x: any) => x.entregador_id === "D2").pacotes_ajustados === 100, r);

// 3. operação do dia: 250 pacotes divididos 150/100 (proporcional ao ajustado), rotas já atribuídas
const op = (await run(E1, { table: "operacoes", op: "insert", values: { data_operacao: hoje, total_pacotes_sistema: 250, total_paradas: 120, valor_por_pacote: 2, status: "draft" }, returning: true, single: "single" })).data.id;
const rota: Record<string, string> = {}, oferta: Record<string, string> = {};
for (const [d, q] of [["D1", 150], ["D2", 100]] as const) {
  rota[d] = (await run(E1, { table: "rotas_operacao", op: "insert", values: { operacao_id: op, nome: "Rota " + d, quantidade_pacotes: q, valor_total: q * 2, status: "draft" }, returning: true, single: "single" })).data.id;
  await run(E1, { table: "alocacoes", op: "insert", values: { operacao_id: op, rota_id: rota[d], entregador_id: d, status: "allocated" } });
  oferta[d] = (await run(E1, { table: "ofertas", op: "insert", values: { titulo: "Rota " + d, status: "accepted", entregador_id: d, operacao_id: op, rota_operacao_id: rota[d], quantidade_pacotes: q, valor: q * 2, valor_por_pacote: 2, data_trabalho: hoje, atribuida_em: new Date().toISOString() }, returning: true, single: "single" })).data.id;
  await run(E1, { table: "alocacoes", op: "update", values: { oferta_id: oferta[d] }, filters: [eq("rota_id", rota[d])] });
  await run(E1, { table: "entregas_pacotes", op: "insert", values: Array.from({ length: q }, (_, i) => ({ oferta_id: oferta[d], operacao_id: op, numero_pacote: i + 1, status: "pending" })) });
}
r = await run(D1, { table: "ofertas", op: "select", columns: "titulo,status", filters: [eq("entregador_id", "D1")] });
ok("entregador vê a rota atribuída", r.data?.length === 1 && r.data[0].status === "accepted", r);

// 4. D1 aceita e executa: 2 problemas, baixa em massa, fecha
r = await run(D1, { table: "ofertas", op: "update", values: { status: "in_progress", iniciada_em: new Date().toISOString() }, filters: [eq("id", oferta.D1), eq("entregador_id", "D1")], returning: true });
ok("D1 inicia a rota", r.data?.[0]?.status === "in_progress", r);
for (const n of [7, 90]) {
  await run(D1, { table: "entregas_ocorrencias", op: "insert", values: { oferta_id: oferta.D1, empresa_id: "E1", numero_pacote: n, tipo: "could_not_deliver", motivo: "could_not_deliver", sub_motivo: n === 7 ? "ausente" : "estabelecimento_fechado", fotos_urls: ["foto.jpg"] } });
  await run(D1, { table: "entregas_pacotes", op: "update", values: { status: "not_delivered" }, filters: [eq("oferta_id", oferta.D1), eq("numero_pacote", n)] });
}
await run(D1, { table: "entregas_pacotes", op: "update", values: { status: "delivered", entregue_em: new Date().toISOString() }, filters: [eq("oferta_id", oferta.D1), eq("status", "pending")] });
const cnt = (await pg.query(`select status, count(*)::int n from entregas_pacotes where oferta_id=$1 group by 1 order by 1`, [oferta.D1])).rows;
ok("148 entregues e 2 com problema", cnt.find((x: any) => x.status === "delivered")?.n === 148 && cnt.find((x: any) => x.status === "not_delivered")?.n === 2, cnt);
r = await run(D1, { table: "ofertas", op: "update", values: { status: "completed", pacotes_entregues: 148, pacotes_nao_entregues: 2, closed_at: new Date().toISOString() }, filters: [eq("id", oferta.D1)], returning: true });
ok("D1 conclui a rota", r.data?.[0]?.status === "completed", r);
r = await rpc(D1, "apply_reliability_event", { _entregador_id: "D1", _evento: "route_completed", _pontos: 5, _descricao: "98%" });
ok("bônus de rota concluída", r.error == null, r);
r = await run(D1, { table: "entregas", op: "upsert", values: { oferta_id: oferta.D1, empresa_id: "E1", entregador_id: "D1", valor: 296, status: "pendente" }, onConflict: "oferta_id" });
ok("lançamento da entrega", r.error == null, r);
r = await run(D1, { table: "admin_notifications", op: "insert", values: { type: "route_closed", title: "Rota fechada", body: "148/2" } });
ok("aviso ao admin", r.error == null, r);

// 5. D2 recusa em cima da hora (rota é de hoje): penalizado, rota volta ao mercado
r = await rpc(D2, "recusar_rota", { _oferta_id: oferta.D2, _motivo: "desisti" });
ok("recusa no dia é penalizada", r.data?.penalizado === true && r.data.pontos === -15, r);
const sc = (await pg.query(`select score from confiabilidade_score where entregador_id='D2'`)).rows;
ok("nota do D2 caiu", sc[0]?.score === 85, sc);
r = await run(E1, { table: "ofertas", op: "select", columns: "status,entregador_id", filters: [eq("id", oferta.D2)] });
ok("rota do D2 voltou ao mercado", r.data?.[0]?.status === "open" && r.data[0].entregador_id === null, r);

// 6. D1 antecipa metade; empresa aprova e paga; depois paga o ciclo e abate
r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("saldo antecipável = valor da oferta concluída", r.data?.total === 300 && r.data.disponivel === 300, r);
r = await rpc(D1, "solicitar_antecipacao", { _empresa_id: "E1", _valor: 150 });
ok("antecipação de 150 com 10% (recebe 135)", r.data?.liquido === 135, r);
const ant = (await run(E1, { table: "antecipacoes", op: "select", columns: "id" })).data[0].id;
await run(E1, { table: "antecipacoes", op: "update", values: { status: "aprovada", decidida_em: new Date().toISOString() }, filters: [eq("id", ant)] });
await run(E1, { table: "antecipacoes", op: "update", values: { status: "paga", paga_em: new Date().toISOString() }, filters: [eq("id", ant)] });
r = await run(E1, { table: "ofertas", op: "update", values: { payment_status: "paid", payment_date: new Date().toISOString() }, filters: [eq("id", oferta.D1)], returning: true });
ok("empresa marca a oferta como paga", r.data?.[0]?.payment_status === "paid", r);
r = await run(E1, { table: "pagamentos", op: "insert", values: { entregador_id: "D1", ofertas_ids: [oferta.D1], valor_total: 150 } });
ok("registro do pagamento do ciclo (já abatido o adiantamento)", r.error == null, r);
await run(E1, { table: "entregas", op: "update", values: { status: "pago" }, filters: [eq("oferta_id", oferta.D1)] });
r = await run(E1, { table: "antecipacoes", op: "update", values: { abatida_em: new Date().toISOString() }, filters: [eq("id", ant)], returning: true });
ok("antecipação abatida", !!r.data?.[0]?.abatida_em, r);
r = await rpc(D1, "saldo_antecipacao", { _empresa_id: "E1" });
ok("depois de paga, o saldo antecipável zera", r.data?.total === 0 && r.data.disponivel === 0, r);
r = await run(D1, { table: "pagamentos", op: "select", columns: "valor_total" });
ok("entregador vê o próprio pagamento", r.data?.length === 1, r);
r = await run(D2, { table: "pagamentos", op: "select", columns: "valor_total" });
ok("outro entregador não vê", r.data?.length === 0, r);

console.log(`\n${pass} ok, ${fail} falhas`);
await pg.close();
