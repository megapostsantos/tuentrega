import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
const rpc = (c: any, fn: string, args: any) => run(c, { table: "", op: "rpc", rpc: { fn, args } });
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
import { gerarRecorrencias } from "../src/server/recorrencias.ts";
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });
const n = async (sql: string, p: any[] = []) => Number(((await pg.query(sql, p)).rows[0] as any).n);
for (const [i, r] of [["E1","empresa"],["E2","empresa"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
const dono = { userId: "E1", role: "empresa" }, outra = { userId: "E2", role: "empresa" }, func = { userId: "E1", role: "empresa", operador: true, equipe: true };
const hoje = ((await pg.query(`select (now() at time zone 'America/Sao_Paulo')::date as d`)).rows[0] as any).d as Date;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const primeiroDoMes = (meses: number) => iso(new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - meses, 1)));
let r: any = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Bia", email: "bia@x.com", tambem_entregador: true });
const bia = r.data.id;
r = await rpc(dono, "cadastrar_membro_equipe", { nome_completo: "Caio", email: "caio@x.com" });
const caio = r.data.id;
await pg.query(`update equipe_empresa set valor_por_entrega = 0.5, salario_fixo = 1800 where user_id = $1`, [bia]);
await pg.query(`update equipe_empresa set ativo = false where user_id = $1`, [caio]);

// aluguel: dia 1, começou há 3 meses → 4 lançamentos (3 meses atrás até este mês), sem repetir
await pg.query(`insert into recorrencias (empresa_id,alvo,tipo,categoria,descricao,valor,dia,inicio) values ('E1','lancamento','saida','Aluguel','Aluguel do galpão',1500,1,$1)`, [primeiroDoMes(3)]);
await pg.query(`insert into recorrencias (empresa_id,alvo,tipo,categoria,descricao,valor,dia,inicio,ativa) values ('E1','lancamento','saida','Outros','Pausada',10,1,$1,false)`, [primeiroDoMes(3)]);
await pg.query(`insert into recorrencias (empresa_id,alvo,tipo,categoria,descricao,valor,dia,inicio) values ('E2','lancamento','saida','Aluguel','Outra empresa',700,1,$1)`, [primeiroDoMes(1)]);
let c = await gerarRecorrencias("E1");
ok("gera os 4 meses do aluguel (E1) e nada de pausada nem de outra empresa", c === 4 && (await n(`select count(*)::int n from financeiro_lancamentos where empresa_id='E1' and categoria='Aluguel'`)) === 4 && (await n(`select count(*)::int n from financeiro_lancamentos where empresa_id='E2'`)) === 0, c);
c = await gerarRecorrencias("E1");
ok("rodar de novo não duplica", c === 0 && (await n(`select count(*)::int n from financeiro_lancamentos where empresa_id='E1'`)) === 4, c);
c = await gerarRecorrencias();
ok("rodada geral gera as outras empresas", c === 2 && (await n(`select count(*)::int n from financeiro_lancamentos where empresa_id='E2'`)) === 2, c);
const l = (await pg.query(`select tipo, valor, data_lancamento, recorrencia_id, mes_ref from financeiro_lancamentos where empresa_id='E1' order by data_lancamento desc limit 1`)).rows[0] as any;
ok("lançamento sai como despesa, no dia 1, marcado como recorrente", l.tipo === "saida" && Number(l.valor) === 1500 && !!l.recorrencia_id && l.mes_ref === primeiroDoMes(0).slice(0, 7), l);

// dia que ainda não chegou neste mês não gera
if (hoje.getUTCDate() <= 27) {
  await pg.query(`insert into recorrencias (empresa_id,alvo,tipo,categoria,descricao,valor,dia,inicio) values ('E1','lancamento','saida','Outros','Futuro',5,$1,$2)`, [hoje.getUTCDate() + 1, primeiroDoMes(0)]);
  await gerarRecorrencias("E1");
  ok("dia que ainda não chegou não é lançado antes da hora", (await n(`select count(*)::int n from financeiro_lancamentos where descricao='Futuro'`)) === 0);
}

// salário mensal: só de funcionário ativo
await pg.query(`insert into recorrencias (empresa_id,alvo,tipo,valor,dia,membro_id,inicio) values ('E1','salario','saida',1800,1,$1,$2),('E1','salario','saida',1000,1,$3,$2)`, [bia, primeiroDoMes(2), caio]);
c = await gerarRecorrencias("E1");
ok("salário recorrente vira pagamento do funcionário ativo (3 meses), não do desativado", c === 3 && (await n(`select count(*)::int n from pagamentos_equipe where membro_id=$1 and tipo='salario'`, [bia])) === 3 && (await n(`select count(*)::int n from pagamentos_equipe where membro_id=$1`, [caio])) === 0, c);

// entregas: puxa as entregas do mês anterior
const mesAnt = primeiroDoMes(1);
const opId = ((await pg.query(`insert into operacoes (empresa_id,data_operacao,total_pacotes_sistema,total_pacotes_contados,total_paradas,valor_por_pacote,status,origem) values ('E1',$1,10,10,0,1.8,'draft','manual') returning id`, [mesAnt])).rows[0] as any).id;
const ofId = ((await pg.query(`insert into ofertas (empresa_id,operacao_id,titulo,tipo,status,data_trabalho,entregador_id,quantidade_pacotes) values ('E1',$1,'t','distribuicao','completed',$2,$3,5) returning id`, [opId, mesAnt, bia])).rows[0] as any).id;
for (let i = 1; i <= 3; i++) await pg.query(`insert into entregas_pacotes (oferta_id,operacao_id,numero_pacote,status,entregue_em) values ($1,$2,$3,'delivered',$4::date + 3)`, [ofId, opId, i, mesAnt]);
await pg.query(`insert into entregas_pacotes (oferta_id,operacao_id,numero_pacote,status) values ($1,$2,9,'pending')`, [ofId, opId]);
await pg.query(`insert into recorrencias (empresa_id,alvo,tipo,valor,dia,membro_id,inicio) values ('E1','entregas','saida',0,1,$1,$2)`, [bia, primeiroDoMes(0)]);
c = await gerarRecorrencias("E1");
const pe = (await pg.query(`select quantidade, valor, referencia from pagamentos_equipe where membro_id=$1 and tipo='entregas'`, [bia])).rows as any[];
ok("por entregas: paga só as entregues do mês anterior (3 × 0,50)", c === 1 && pe.length === 1 && pe[0].quantidade === 3 && Number(pe[0].valor) === 1.5 && pe[0].referencia === mesAnt.slice(0, 7), [c, pe]);

// consulta de entregas do funcionário
r = await rpc(dono, "entregas_do_membro", { _membro_id: bia, _mes: mesAnt.slice(0, 7) });
ok("entregas do mês puxadas das rotas, descontando as já pagas", !r.error && r.data.entregues === 3 && r.data.ja_pagas === 3 && r.data.a_pagar === 0 && r.data.valor_por_entrega === 0.5, r);
r = await rpc(dono, "entregas_do_membro", { _membro_id: bia, _mes: primeiroDoMes(0).slice(0, 7) });
ok("mês sem entregas dá zero", r.data?.entregues === 0, r);
r = await rpc(func, "entregas_do_membro", { _membro_id: bia, _mes: mesAnt.slice(0, 7) });
ok("funcionário não consulta", !!r.error, r);
r = await rpc(outra, "entregas_do_membro", { _membro_id: bia, _mes: mesAnt.slice(0, 7) });
ok("outra empresa não consulta", !!r.error, r);
r = await rpc(outra, "gerar_recorrencias", {});
ok("empresa só gera as próprias recorrências", !r.error && (await n(`select count(*)::int n from financeiro_lancamentos where empresa_id='E2'`)) === 2, r);
r = await run(func, { table: "recorrencias", op: "select", columns: "*", filters: [] });
ok("funcionário não vê as recorrências", r.data.length === 0, r);
r = await run(dono, { table: "recorrencias", op: "update", values: { ativa: false }, filters: [eq("descricao", "Aluguel do galpão")] });
ok("dono pausa a recorrência", !r.error && (await n(`select count(*)::int n from recorrencias where ativa and descricao='Aluguel do galpão'`)) === 0, r);

// excluir um lançamento gerado e marcar o mês como pulado: não volta
const alvoL = (await pg.query(`select id, recorrencia_id, mes_ref, empresa_id from financeiro_lancamentos where descricao='Outra empresa' order by data_lancamento desc limit 1`)).rows[0] as any;
await pg.query(`insert into recorrencias_puladas (empresa_id,recorrencia_id,mes_ref) values ($1,$2,$3)`, [alvoL.empresa_id, alvoL.recorrencia_id, alvoL.mes_ref]);
await pg.query(`delete from financeiro_lancamentos where id=$1`, [alvoL.id]);
await gerarRecorrencias();
ok("mês excluído e marcado como pulado não é gerado de novo", (await n(`select count(*)::int n from financeiro_lancamentos where recorrencia_id=$1 and mes_ref=$2`, [alvoL.recorrencia_id, alvoL.mes_ref])) === 0);
console.log(fail ? `${fail} FALHAS` : "✔ recorrencias.test.mts");
process.exit(fail ? 1 : 0);
