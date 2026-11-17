// Lançamentos recorrentes: despesas/receitas fixas (aluguel…), salário mensal e pagamento mensal por entregas.
// Rodam sozinhos: a cada dia que passa, o que venceu é lançado uma única vez por mês (índice único impede duplicar).
import { rawQuery } from "./data-engine";

const HOJE = `(now() at time zone 'America/Sao_Paulo')::date`;
// uma linha por (regra, mês) desde o início da regra até hoje, no dia escolhido (limitado ao dia 28)
const MESES = (alvo: string) => `
  select r.*, d.data as data_lanc
    from "recorrencias" r
    cross join lateral (
      select (m::date + (least(r."dia", 28) - 1))::date as data
        from generate_series(date_trunc('month', r."inicio"), date_trunc('month', ${HOJE}), interval '1 month') m
    ) d
   where r."ativa" and r."alvo" = '${alvo}' and d.data >= r."inicio" and d.data <= ${HOJE}
     and not exists (select 1 from "recorrencias_puladas" p where p."recorrencia_id" = r."id" and p."mes_ref" = to_char(d.data,'YYYY-MM'))`;

/** Gera os lançamentos vencidos. Sem empresaId = todas as empresas. Devolve quantos criou. */
export async function gerarRecorrencias(empresaId?: string): Promise<number> {
  const f = empresaId ? `and x."empresa_id" = $1` : "";
  const p = empresaId ? [empresaId] : [];
  let n = 0;
  const a = await rawQuery(
    `insert into "financeiro_lancamentos" ("empresa_id","tipo","categoria","descricao","valor","data_lancamento","recorrencia_id","mes_ref")
     select x."empresa_id", x."tipo", coalesce(x."categoria",'Outros'), x."descricao", x."valor", x.data_lanc, x."id", to_char(x.data_lanc,'YYYY-MM')
       from (${MESES("lancamento")}) x where true ${f}
     on conflict ("recorrencia_id","mes_ref") where "recorrencia_id" is not null do nothing
     returning "id"`, p);
  n += a.length;
  const b = await rawQuery(
    `insert into "pagamentos_equipe" ("empresa_id","membro_id","tipo","referencia","valor","data_pagamento","observacao","recorrencia_id","mes_ref")
     select x."empresa_id", x."membro_id", 'salario', to_char(x.data_lanc,'YYYY-MM'), x."valor", x.data_lanc, 'Lançado automaticamente (recorrente)', x."id", to_char(x.data_lanc,'YYYY-MM')
       from (${MESES("salario")}) x
      where x."membro_id" is not null ${f}
        and exists (select 1 from "equipe_empresa" e where e."user_id" = x."membro_id" and e."empresa_id" = x."empresa_id" and e."ativo")
     on conflict ("recorrencia_id","mes_ref") where "recorrencia_id" is not null do nothing
     returning "id"`, p);
  n += b.length;
  // por entregas: paga no dia escolhido as entregas feitas no MÊS ANTERIOR (só se houve entregas)
  const c = await rawQuery(
    `insert into "pagamentos_equipe" ("empresa_id","membro_id","tipo","referencia","quantidade","valor","data_pagamento","observacao","recorrencia_id","mes_ref")
     select x."empresa_id", x."membro_id", 'entregas', to_char(x.data_lanc - interval '1 month','YYYY-MM'), q.n, round(q.n * e."valor_por_entrega", 2), x.data_lanc,
            'Lançado automaticamente: entregas do mês anterior', x."id", to_char(x.data_lanc,'YYYY-MM')
       from (${MESES("entregas")}) x
       join "equipe_empresa" e on e."user_id" = x."membro_id" and e."empresa_id" = x."empresa_id" and e."ativo" and e."valor_por_entrega" > 0
       cross join lateral (
         select count(*)::int as n from "entregas_pacotes" ep join "ofertas" o on o."id"::text = ep."oferta_id"::text
          where o."empresa_id" = x."empresa_id" and o."entregador_id" = x."membro_id" and ep."status" = 'delivered'
            and ep."entregue_em" >= date_trunc('month', x.data_lanc - interval '1 month') and ep."entregue_em" < date_trunc('month', x.data_lanc)
       ) q
      where x."membro_id" is not null and q.n > 0 ${f}
     on conflict ("recorrencia_id","mes_ref") where "recorrencia_id" is not null do nothing
     returning "id"`, p);
  n += c.length;
  return n;
}

/** Entregas do funcionário no mês (puxadas das rotas dele), as já pagas e as que faltam pagar. */
export async function entregasDoMembro(empresaId: string, membroId: string, mes: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error("Mês inválido");
  const m = await rawQuery(`select "valor_por_entrega" as v from "equipe_empresa" where "user_id" = $1 and "empresa_id" = $2`, [membroId, empresaId]);
  if (!m[0]) throw Object.assign(new Error("Funcionário não encontrado"), { code: "403" });
  const e = await rawQuery(
    `select count(*)::int as n from "entregas_pacotes" ep join "ofertas" o on o."id"::text = ep."oferta_id"::text
      where o."empresa_id" = $1 and o."entregador_id" = $2 and ep."status" = 'delivered'
        and ep."entregue_em" >= ($3 || '-01')::date and ep."entregue_em" < (($3 || '-01')::date + interval '1 month')`, [empresaId, membroId, mes]);
  const p = await rawQuery(`select coalesce(sum("quantidade"),0)::int as n from "pagamentos_equipe" where "empresa_id" = $1 and "membro_id" = $2 and "tipo" = 'entregas' and "referencia" = $3`, [empresaId, membroId, mes]);
  const entregues = Number(e[0]?.n ?? 0), ja = Number(p[0]?.n ?? 0);
  return { entregues, ja_pagas: ja, a_pagar: Math.max(0, entregues - ja), valor_por_entrega: Number(m[0].v ?? 0) };
}
