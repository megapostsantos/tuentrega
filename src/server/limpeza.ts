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

/** Apaga o histórico de UMA empresa (operações, rotas, ofertas, pacotes, ocorrências, pagamentos). Cadastros e contas ficam. */
export async function limparEmpresa(empresaId: string) {
  const cols = await existentes();
  const tem = (t: string, c?: string) => (c ? cols.has(`${t}.${c}`) : [...cols].some((k) => k.startsWith(`${t}.`)));
  const stmts: { text: string; params: unknown[] }[] = [];
  const del = (t: string, where: string) => { if (tem(t)) stmts.push({ text: `delete from "${t}" where ${where}`, params: [empresaId] }); };
  const minhasOfertas = `select "id"::text from "ofertas" where "empresa_id"::text = $1`;
  const minhasOps = `select "id"::text from "operacoes" where "empresa_id"::text = $1`;
  del("entregas_pacotes", `"oferta_id"::text in (${minhasOfertas}) or "operacao_id"::text in (${minhasOps})`);
  del("entregador_localizacao", `"oferta_id"::text in (${minhasOfertas})`);
  del("agenda_compromissos", `"empresa_id"::text = $1`);
  for (const t of ["entregas_ocorrencias", "ofertas_recusas", "entregas", "fechamentos_gestor", "antecipacoes", "alocacoes", "agenda_previsoes",
    "rotas_operacao", "auditoria_faixas", "pagamentos", "extratos_mensais", "financeiro_lancamentos", "saidas_nex", "insucessos_nex"])
    if (tem(t, "empresa_id")) del(t, `"empresa_id"::text = $1`);
  del("ofertas", `"empresa_id"::text = $1`);
  del("operacoes", `"empresa_id"::text = $1`);
  await runTransaction(stmts);
  return { ok: true };
}

/** Apaga de vez UMA conta (entregador, empresa ou funcionário) e o que depende dela. Empresa leva junto histórico e equipe. Admins nunca. */
export async function excluirConta(userId: string, adminId: string) {
  if (userId === adminId) throw new Error("Você não pode apagar a sua própria conta");
  const u = await rawQuery(`select "id","role","name" from "user" where "id" = $1`, [userId]);
  if (!u[0]) throw new Error("Conta não encontrada");
  if (u[0].role === "admin") throw new Error("Contas de administrador não podem ser apagadas aqui");
  const cols = await existentes();
  const tem = (t: string, c?: string) => (c ? cols.has(`${t}.${c}`) : [...cols].some((k) => k.startsWith(`${t}.`)));

  const ids = [userId];
  if (tem("equipe_empresa")) {
    const eq = await rawQuery(`select "user_id" from "equipe_empresa" where "empresa_id" = $1`, [userId]);
    for (const r of eq) if (r.user_id) ids.push(String(r.user_id));
  }

  if ((await rawQuery(`select 1 from "empresas" where "id" = $1`, [userId])).length) {
    await limparEmpresa(userId);
    // parceiros pré-cadastrados que nunca ativaram a conta (e-mail interno) somem junto; quem já tem conta real fica
    if (tem("entregadores_gerenciados", "empresa_id")) {
      const so = await rawQuery(`select g."entregador_id" as id from "entregadores_gerenciados" g join "user" u on u."id" = g."entregador_id" where g."empresa_id" = $1 and u."email" like '%@sem-acesso.tuentrega.local'`, [userId]);
      for (const r of so) ids.push(String(r.id));
    }
  }

  const stmts: { text: string; params: unknown[] }[] = [];
  const del = (t: string, c: string) => { if (tem(t, c)) stmts.push({ text: `delete from "${t}" where "${c}"::text = any($1::text[])`, params: [ids] }); };
  // histórico do entregador: solta as ofertas dele e remove o resto
  if (tem("ofertas", "entregador_id")) stmts.push({ text: `update "ofertas" set "entregador_id" = null where "entregador_id"::text = any($1::text[]) and "status" in ('open','accepted')`, params: [ids] });
  for (const [t, c] of [
    ["ofertas_recusas", "entregador_id"], ["entregador_localizacao", "entregador_id"], ["antecipacoes", "entregador_id"],
    ["confiabilidade_historico", "entregador_id"], ["candidaturas", "entregador_id"], ["agenda_zona_candidaturas", "entregador_id"],
    ["cla_empresa", "entregador_id"], ["cla_empresa", "empresa_id"], ["vinculos_empresa", "entregador_id"], ["vinculos_empresa", "empresa_id"],
    ["equipe_empresa", "user_id"], ["equipe_empresa", "empresa_id"], ["aprovacoes_cadastro", "user_id"],
    ["user_notifications", "user_id"], ["admin_notifications", "user_id"],
  ] as [string, string][]) del(t, c);
  // gerenciados da empresa: somem junto com a empresa
  for (const [t, c] of POR_USUARIO) del(t, c);
  if (tem("storage_objects", "owner")) stmts.push({ text: `delete from "storage_objects" where "owner" = any($1::text[])`, params: [ids] });
  if (tem("admin_logs")) stmts.push({ text: `insert into "admin_logs" ("admin_id","action","target") values ($1,'conta_apagada',$2)`, params: [adminId, userId] });
  await runTransaction(stmts);
  return { ok: true, nome: u[0].name as string, contas: ids.length };
}
