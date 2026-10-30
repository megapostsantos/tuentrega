import { rawQuery, runTransaction } from "./data-engine";

/** Dados do dia a dia (operação, financeiro, histórico). Nunca contém contas. */
const OPERACIONAIS = [
  "entregas_pacotes", "entregas_ocorrencias", "entregas", "ofertas_recusas", "ofertas_privadas_config",
  "antecipacoes", "alocacoes", "agenda_compromissos", "agenda_previsoes", "eventos_agenda",
  "rotas_operacao", "operacoes", "ofertas", "auditoria_faixas", "dispatcher_alocacoes", "dispatcher_commissions",
  "entregador_localizacao", "confiabilidade_historico", "pagamentos", "extratos_mensais", "financeiro_lancamentos",
  "saidas_nex", "insucessos_nex", "notificacoes_whatsapp", "notificacoes_destinatario", "user_notifications",
  "admin_notifications", "admin_impersonations",
];

/** [tabela, coluna que aponta para o dono/usuário] — apagadas quando a conta é removida. */
const POR_USUARIO: [string, string][] = [
  ["confiabilidade_score", "entregador_id"], ["entregador_documentos", "entregador_id"], ["entregador_documentos", "empresa_id"],
  ["entregadores_gerenciados", "entregador_id"], ["entregadores_gerenciados", "empresa_id"],
  ["dispatchers", "entregador_id"], ["dispatchers", "empresa_id"], ["dispatcher_team", "dispatcher_id"],
  ["config_pagamento", "empresa_id"], ["filiais", "empresa_id"], ["senhas_provisorias", "user_id"],
  ["user_roles", "user_id"], ["profiles", "id"], ["entregadores", "id"], ["empresas", "id"],
  ["session", "userId"], ["account", "userId"], ["user", "id"],
];

async function existentes(): Promise<Set<string>> {
  const r = await rawQuery(`select table_name || '.' || column_name as k from information_schema.columns where table_schema = current_schema()`);
  return new Set(r.map((x: any) => String(x.k)));
}

export async function previaLimpeza() {
  const cols = await existentes();
  const tabelas = new Set([...cols].map((k) => k.split(".")[0]));
  const contagens: Record<string, number> = {};
  for (const t of OPERACIONAIS) {
    if (!tabelas.has(t)) continue;
    const r = await rawQuery(`select count(*)::int as n from "${t}"`);
    if (Number(r[0]?.n) > 0) contagens[t] = Number(r[0].n);
  }
  const usuarios = await rawQuery(
    `select u."id", u."name", u."email", u."role",
            (select count(*)::int from "ofertas" o where o."empresa_id" = u."id" or o."entregador_id" = u."id") as ofertas
       from "user" u order by u."role", u."name"`).catch(async () =>
    rawQuery(`select u."id", u."name", u."email", u."role", 0 as ofertas from "user" u order by u."role", u."name"`));
  return { contagens, usuarios };
}

/** modo "operacional": apaga só operação/financeiro/histórico. modo "contas": também apaga contas fora da lista `manter` (admins sempre ficam). */
export async function executarLimpeza(modo: "operacional" | "contas", manter: string[], adminId: string) {
  const cols = await existentes();
  const tem = (t: string, c?: string) => (c ? cols.has(`${t}.${c}`) : [...cols].some((k) => k.startsWith(`${t}.`)));
  const stmts: { text: string; params: unknown[] }[] = [];
  for (const t of OPERACIONAIS) if (tem(t)) stmts.push({ text: `delete from "${t}"`, params: [] });

  let removidos = 0;
  if (modo === "contas") {
    const admins = (await rawQuery(`select "id" from "user" where "role" = 'admin'`)).map((r: any) => String(r.id));
    const ficam = [...new Set([...admins, ...manter.map(String), adminId])];
    const alvo = (await rawQuery(`select "id" from "user" where not ("id"::text = any($1::text[]))`, [ficam])).map((r: any) => String(r.id));
    removidos = alvo.length;
    if (alvo.length) {
      for (const [t, c] of POR_USUARIO) if (tem(t, c)) stmts.push({ text: `delete from "${t}" where "${c}"::text = any($1::text[])`, params: [alvo] });
    }
    if (tem("storage_objects")) {
      stmts.push({ text: `delete from "storage_objects" where "owner" is null or not ("owner" = any($1::text[]))`, params: [ficam] });
    }
  } else if (tem("storage_objects")) {
    stmts.push({ text: `delete from "storage_objects" where "bucket" in ('entregas-fotos','provas-entrega','notas-fiscais')`, params: [] });
  }
  if (tem("entregadores", "reliability_score"))
    stmts.push({ text: `update "entregadores" set "reliability_score" = 100`, params: [] });
  if (tem("admin_logs"))
    stmts.push({ text: `insert into "admin_logs" ("admin_id","action","target") values ($1,'limpeza_dados',$2)`, params: [adminId, modo] });
  await runTransaction(stmts);
  return { ok: true, modo, tabelasLimpas: OPERACIONAIS.filter((t) => tem(t)).length, contasRemovidas: removidos };
}
