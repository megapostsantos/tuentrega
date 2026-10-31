import { OPERADOR_NEGADAS, OPERADOR_SEM_ESCRITA, OPERADOR_RPC_NEGADAS, mascarado, preencheFinanceiro, removeMascaradas } from "./operador";
import { neon } from "@neondatabase/serverless";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../db/schema";
import type { Filter, QueryReq, QueryResp } from "../lib/query-builder";
import { POLICIES, ruleFor, type Role } from "./policies";

export interface EngineCtx {
  userId: string | null;
  role: string | null;
  internal?: boolean;
  /** funcionário da empresa: userId já é o id da empresa; sem valores e sem exclusões */
  operador?: boolean;
}

type Fk = { col: string; table: string; refCol: string };
type TableInfo = { cols: Map<string, string>; pk: string[]; fks: Fk[] };
const registry = new Map<string, TableInfo>();

for (const v of Object.values(schema)) {
  if (!is(v, PgTable)) continue;
  const cfg = getTableConfig(v as PgTable);
  const cols = new Map<string, string>();
  const pk: string[] = [];
  for (const c of cfg.columns) {
    cols.set(c.name, c.getSQLType());
    if (c.primary) pk.push(c.name);
  }
  for (const p of cfg.primaryKeys) for (const c of p.columns) pk.push(c.name);
  const fks: Fk[] = [];
  for (const f of cfg.foreignKeys) {
    const ref = f.reference();
    if (ref.columns.length === 1)
      fks.push({ col: ref.columns[0].name, table: getTableConfig(ref.foreignTable as PgTable).name, refCol: ref.foreignColumns[0].name });
  }
  registry.set(cfg.name, { cols, pk, fks });
}

const BLOCKED = new Set(["user", "session", "account", "verification"]);
interface Scope {
  uid: string;
  role: Role;
  P: (v: unknown) => string;
  operador?: boolean;
}

function makeScope(ctx: EngineCtx, params: unknown[]): Scope | null {
  if (ctx.internal || ctx.role === "admin") return null;
  const role = ctx.role as Role;
  if (!ctx.userId) throw Object.assign(new Error("Não autenticado"), { code: "401" });
  if (role !== "empresa" && role !== "entregador" && role !== "dispatcher")
    throw Object.assign(new Error("Sem permissão"), { code: "403" });
  return { uid: ctx.userId, role, P: (v) => `$${params.push(v)}`, operador: !!ctx.operador };
}

function forbidden(msg = "Sem permissão"): never {
  throw Object.assign(new Error(msg), { code: "403" });
}

function readGuard(table: string, alias: string, scope: Scope | null): { deny: boolean; sql?: string } {
  if (!scope) return { deny: false };
  if (scope.operador && OPERADOR_NEGADAS.has(table)) return { deny: true };
  const rule = ruleFor(POLICIES[table]?.read, scope.role);
  if (rule === undefined || rule === false) return { deny: true };
  if (rule === true) return { deny: false };
  return { deny: false, sql: rule(alias, scope.P, scope.uid) };
}

function maskExpr(table: string, alias: string, col: string, scope: Scope | null): string | null {
  if (!scope) return null;
  if (scope.operador && mascarado(table, col)) return "null";
  const m = ruleFor(POLICIES[table]?.mask, scope.role);
  if (!m || !m.cols.includes(col)) return null;
  return m.unless ? `(case when ${m.unless(alias, scope.P, scope.uid)} then "${alias}"."${col}" else null end)` : "null";
}

function colRef(table: string, alias: string, col: string, scope: Scope | null): string {
  return maskExpr(table, alias, col, scope) ?? `${q(alias)}.${q(col)}`;
}

let _sql: ReturnType<typeof neon> | null = null;
function sqlClient() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada");
    _sql = neon(url);
  }
  return _sql;
}
let queryImpl: ((text: string, params: unknown[]) => Promise<any[]>) | null = null;
export function __setQueryImpl(fn: typeof queryImpl) {
  queryImpl = fn;
}
async function query(text: string, params: unknown[] = []): Promise<any[]> {
  if (queryImpl) return queryImpl(text, params);
  return (await (sqlClient() as any).query(text, params)) as any[];
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
function q(id: string): string {
  if (!IDENT.test(id)) throw new Error(`Identificador inválido: ${id}`);
  return `"${id}"`;
}
function tableInfo(name: string): TableInfo {
  const t = registry.get(name);
  if (!t || BLOCKED.has(name)) throw new Error(`Tabela não disponível: ${name}`);
  return t;
}

function singulars(name: string): string[] {
  const out = new Set<string>();
  if (name.endsWith("ores")) out.add(name.slice(0, -2));
  if (name.endsWith("es")) out.add(name.slice(0, -2));
  if (name.endsWith("s")) out.add(name.slice(0, -1));
  out.add(name);
  return [...out];
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

let aliasN = 0;

function buildCols(table: string, alias: string, columns: string, extraWhere: string[], scope: Scope | null): string {
  const info = tableInfo(table);
  const out: string[] = [];
  for (const raw of splitTop(columns.trim() || "*")) {
    const p = raw.trim();
    if (!p) continue;
    if (p === "*") {
      const hasMask = scope && ruleFor(POLICIES[table]?.mask, scope.role);
      if (hasMask) {
        for (const c of info.cols.keys()) {
          const m = maskExpr(table, alias, c, scope);
          out.push(m ? `${m} as ${q(c)}` : `${q(alias)}.${q(c)}`);
        }
      } else out.push(`${q(alias)}.*`);
      continue;
    }
    const emb = p.match(/^(?:([A-Za-z_][A-Za-z0-9_]*)\s*:\s*)?([A-Za-z_][A-Za-z0-9_]*)(?:!([A-Za-z_][A-Za-z0-9_]*))?\s*\(([\s\S]*)\)$/);
    if (emb) {
      const [, outAlias, rel, hintRaw, sub] = emb;
      const inner = hintRaw === "inner";
      const hint = hintRaw && hintRaw !== "inner" ? hintRaw : undefined;
      out.push(buildEmbed(table, info, alias, outAlias ?? rel, rel, hint, sub, inner, extraWhere, scope));
      continue;
    }
    const plain = p.match(/^(?:([A-Za-z_][A-Za-z0-9_]*)\s*:\s*)?([A-Za-z_][A-Za-z0-9_]*)(?:::[a-z]+)?$/);
    if (!plain) throw new Error(`Seleção inválida: ${p}`);
    const [, a, col] = plain;
    const masked = maskExpr(table, alias, col, scope);
    out.push(`${masked ?? `${q(alias)}.${q(col)}`}${a || masked ? ` as ${q(a ?? col)}` : ""}`);
  }
  return out.join(", ") || `${q(alias)}.*`;
}

function buildEmbed(
  parent: string,
  parentInfo: TableInfo,
  pAlias: string,
  outName: string,
  rel: string,
  hint: string | undefined,
  sub: string,
  inner: boolean,
  extraWhere: string[],
  scope: Scope | null,
): string {
  const childInfo = tableInfo(rel);
  const a = `e${++aliasN}`;
  const subList = buildCols(rel, a, sub || "*", [], scope);
  const g = readGuard(rel, a, scope);
  const guard = g.deny ? " and false" : g.sql ? ` and (${g.sql})` : "";

  const declaredM2o = parentInfo.fks.filter((f) => f.table === rel);
  const declaredO2m = childInfo.fks.filter((f) => f.table === parent);
  if (declaredM2o.length) {
    const f = declaredM2o.find((x) => x.col === hint || x.col === `${outName}_id`) ?? declaredM2o[0];
    if (inner) extraWhere.push(`exists (select 1 from ${q(rel)} z where z.${q(f.refCol)}::text = ${q(pAlias)}.${q(f.col)}::text)`);
    return `(select to_jsonb(x) from (select ${subList} from ${q(rel)} ${q(a)} where ${q(a)}.${q(f.refCol)}::text = ${q(pAlias)}.${q(f.col)}::text${guard} limit 1) x) as ${q(outName)}`;
  }
  if (declaredO2m.length) {
    const f = declaredO2m.find((x) => x.col === hint) ?? declaredO2m[0];
    if (inner) extraWhere.push(`exists (select 1 from ${q(rel)} z where z.${q(f.col)}::text = ${q(pAlias)}.${q(f.refCol)}::text)`);
    return `coalesce((select jsonb_agg(to_jsonb(x)) from (select ${subList} from ${q(rel)} ${q(a)} where ${q(a)}.${q(f.col)}::text = ${q(pAlias)}.${q(f.refCol)}::text${guard}) x), '[]'::jsonb) as ${q(outName)}`;
  }

  const fkCands = [hint, `${outName}_id`, ...singulars(rel).map((s) => `${s}_id`)].filter(
    (c): c is string => !!c && parentInfo.cols.has(c) && c !== "id",
  );
  if (fkCands.length) {
    const fk = fkCands[0];
    if (inner) extraWhere.push(`exists (select 1 from ${q(rel)} z where z."id"::text = ${q(pAlias)}.${q(fk)}::text)`);
    return `(select to_jsonb(x) from (select ${subList} from ${q(rel)} ${q(a)} where ${q(a)}."id"::text = ${q(pAlias)}.${q(fk)}::text${guard} limit 1) x) as ${q(outName)}`;
  }
  const cfkCands = [hint, ...singulars(parent).map((s) => `${s}_id`)].filter(
    (c): c is string => !!c && childInfo.cols.has(c),
  );
  if (cfkCands.length) {
    const cfk = cfkCands[0];
    if (inner) extraWhere.push(`exists (select 1 from ${q(rel)} z where z.${q(cfk)}::text = ${q(pAlias)}."id"::text)`);
    return `coalesce((select jsonb_agg(to_jsonb(x)) from (select ${subList} from ${q(rel)} ${q(a)} where ${q(a)}.${q(cfk)}::text = ${q(pAlias)}."id"::text${guard}) x), '[]'::jsonb) as ${q(outName)}`;
  }
  throw new Error(`Relação não encontrada entre ${parent} e ${rel}`);
}

function norm(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object") return JSON.stringify(v);
  return v;
}

function cond(colRef: string, op: string, val: unknown, params: unknown[]): string {
  const push = (v: unknown) => `$${params.push(norm(v))}`;
  switch (op) {
    case "eq":
      return val === null ? `${colRef} is null` : `${colRef} = ${push(val)}`;
    case "neq":
      return val === null ? `${colRef} is not null` : `${colRef} <> ${push(val)}`;
    case "gt":
      return `${colRef} > ${push(val)}`;
    case "gte":
      return `${colRef} >= ${push(val)}`;
    case "lt":
      return `${colRef} < ${push(val)}`;
    case "lte":
      return `${colRef} <= ${push(val)}`;
    case "like":
      return `${colRef}::text like ${push(val)}`;
    case "ilike":
      return `${colRef}::text ilike ${push(val)}`;
    case "is": {
      const s = String(val).toLowerCase();
      if (val === null || s === "null") return `${colRef} is null`;
      if (s === "true") return `${colRef} is true`;
      if (s === "false") return `${colRef} is false`;
      throw new Error(`Valor inválido para is: ${val}`);
    }
    case "in": {
      let arr: unknown[];
      if (Array.isArray(val)) arr = val;
      else {
        const s = String(val).trim().replace(/^\(/, "").replace(/\)$/, "");
        arr = s ? s.split(",").map((x) => x.trim().replace(/^"|"$/g, "")) : [];
      }
      if (!arr.length) return "false";
      params.push(arr.map((x) => String(x)));
      return `${colRef}::text = any($${params.length}::text[])`;
    }
    default:
      throw new Error(`Operador não suportado: ${op}`);
  }
}

function parseGroup(expr: string, kind: "and" | "or", alias: string, params: unknown[], table: string, scope: Scope | null): string {
  const terms = splitTop(expr).map((t) => t.trim()).filter(Boolean);
  const parts = terms.map((t) => {
    const g = t.match(/^(and|or)\(([\s\S]*)\)$/);
    if (g) return parseGroup(g[2], g[1] as "and" | "or", alias, params, table, scope);
    const i = t.indexOf(".");
    if (i < 0) throw new Error(`Filtro inválido: ${t}`);
    const col = t.slice(0, i);
    let rest = t.slice(i + 1);
    let negate = false;
    if (rest.startsWith("not.")) {
      negate = true;
      rest = rest.slice(4);
    }
    const j = rest.indexOf(".");
    if (j < 0) throw new Error(`Filtro inválido: ${t}`);
    const c = cond(colRef(table, alias, col, scope), rest.slice(0, j), rest.slice(j + 1), params);
    return negate ? `not (${c})` : c;
  });
  return `(${parts.join(kind === "and" ? " and " : " or ")})`;
}

function buildWhere(filters: Filter[], alias: string, params: unknown[], table: string, scope: Scope | null): string[] {
  const out: string[] = [];
  for (const f of filters) {
    if (f.k === "f") out.push(cond(colRef(table, alias, f.col, scope), f.op, f.val, params));
    else if (f.k === "not") out.push(`not (${cond(colRef(table, alias, f.col, scope), f.op, f.val, params)})`);
    else out.push(parseGroup(f.expr, "or", alias, params, table, scope));
  }
  return out;
}

function encode(v: unknown, sqlType: string | undefined): unknown {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return sqlType?.endsWith("[]") ? v : JSON.stringify(v);
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
function fixTs(v: any): any {
  if (typeof v === "string") return TS.test(v) ? `${v}Z` : v;
  if (Array.isArray(v)) return v.map(fixTs);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = fixTs(v[k]);
    return o;
  }
  return v;
}

const PENALIDADE_RECUSA_TARDIA = -15;

function scoreStatements(entregadorId: string, pontos: number, evento: string, descricao: string) {
  return [
    {
      text: `insert into "confiabilidade_score" ("entregador_id","score","nivel","updated_at")
             values ($1, greatest(0, least(100, 100 + $2::int)), 'gold', now())
             on conflict ("entregador_id") do update
               set "score" = greatest(0, least(100, "confiabilidade_score"."score" + $2::int)), "updated_at" = now()`,
      params: [entregadorId, pontos],
    },
    {
      text: `update "confiabilidade_score" set "nivel" = case when "score" >= 80 then 'gold' when "score" >= 50 then 'silver' else 'bronze' end where "entregador_id" = $1`,
      params: [entregadorId],
    },
    {
      text: `insert into "confiabilidade_historico" ("entregador_id","tipo","delta","motivo") values ($1,$2,$3,$4)`,
      params: [entregadorId, evento, pontos, descricao],
    },
  ];
}

async function recusarRota(uid: string, args: Record<string, unknown>): Promise<QueryResp> {
  const ofertaId = String(args._oferta_id ?? "");
  const motivo = args._motivo == null ? null : String(args._motivo).slice(0, 200);
  const rows = await query(
    `select o."id", o."empresa_id", o."titulo",
            (o."data_trabalho" is not null
             and (((o."data_trabalho"::timestamp - interval '1 day') + interval '18 hours') at time zone 'America/Sao_Paulo') < now()) as tardia
       from "ofertas" o
      where o."id"::text = $1 and o."entregador_id"::text = $2 and o."status" = 'accepted'`,
    [ofertaId, uid],
  );
  if (!rows.length) throw new Error("Esta rota não está disponível para recusa");
  const o = rows[0];
  const tardia = !!o.tardia;
  const pontos = tardia ? PENALIDADE_RECUSA_TARDIA : 0;
  const stmts: { text: string; params: unknown[] }[] = [
    {
      text: `insert into "ofertas_recusas" ("oferta_id","empresa_id","entregador_id","origem","motivo","penalizada","pontos") values ($1,$2,$3,'entregador',$4,$5,$6)`,
      params: [ofertaId, o.empresa_id, uid, motivo, tardia, pontos || null],
    },
    {
      text: `update "alocacoes" set "status" = 'recusada' where "oferta_id"::text = $1 and "entregador_id"::text = $2`,
      params: [ofertaId, uid],
    },
    {
      text: `update "ofertas" set "status" = 'open', "entregador_id" = null, "atribuida_em" = null, "updated_at" = now()
              where "id"::text = $1 and "entregador_id"::text = $2 and "status" = 'accepted'`,
      params: [ofertaId, uid],
    },
  ];
  if (tardia) stmts.push(...scoreStatements(uid, pontos, "late_refusal", `Recusa tardia da rota ${o.titulo ?? ""}`.trim()));
  await runTransaction(stmts);
  return { data: { penalizado: tardia, pontos }, error: null, count: null };
}

async function infoAntecipacao(uid: string, empresaId: string) {
  const rows = await query(
    `select
       coalesce((select sum("valor") from "ofertas" where "entregador_id"::text = $1 and "empresa_id"::text = $2
                  and "status" in ('completed','closed') and coalesce("payment_status",'pending') = 'pending'), 0)::float as total,
       coalesce((select sum("valor_bruto") from "antecipacoes" where "entregador_id"::text = $1 and "empresa_id"::text = $2
                  and "status" in ('solicitada','aprovada','paga') and "abatida_em" is null), 0)::float as aberto,
       (select to_jsonb(c) from "config_pagamento" c where c."empresa_id"::text = $2) as cfg`,
    [uid, empresaId],
  );
  const r = rows[0] ?? {};
  const cfg = r.cfg ?? null;
  const ativa = !!cfg?.antecipacao_ativa;
  const total = Number(r.total ?? 0);
  const aberto = Number(r.aberto ?? 0);
  const limite = Number(cfg?.limite_percentual ?? 100);
  const disponivel = ativa ? Math.max(0, Math.round((total * limite) / 100 * 100 - aberto * 100) / 100) : 0;
  return {
    ativa, total, aberto, disponivel,
    minimo: Number(cfg?.valor_minimo ?? 50),
    percentual: Number(cfg?.antecipacao_percentual ?? 0),
  };
}

function calcAntecipacao(info: Awaited<ReturnType<typeof infoAntecipacao>>, valorIn: unknown) {
  if (!info.ativa) throw new Error("Esta empresa não oferece antecipação");
  const valor = Math.round(Number(valorIn) * 100) / 100;
  if (!(valor > 0)) throw new Error("Informe um valor");
  if (valor < info.minimo) throw new Error(`O valor mínimo para antecipar é R$ ${info.minimo.toFixed(2)}`);
  if (valor > info.disponivel + 0.001) throw new Error(`O máximo disponível é R$ ${info.disponivel.toFixed(2)}`);
  const desconto = Math.round(valor * info.percentual) / 100;
  return { valor, desconto, liquido: Math.round((valor - desconto) * 100) / 100 };
}

async function runAntecipacao(fn: string, uid: string, args: Record<string, unknown>): Promise<QueryResp> {
  const empresaId = String(args._empresa_id ?? "");
  if (!empresaId) throw new Error("Empresa não informada");
  const info = await infoAntecipacao(uid, empresaId);
  if (fn === "saldo_antecipacao") {
    return { data: { ativa: info.ativa, total: info.total, aberto: info.aberto, disponivel: info.disponivel, minimo: info.minimo }, error: null, count: null };
  }
  const c = calcAntecipacao(info, args._valor);
  if (fn === "simular_antecipacao") {
    return { data: { valor: c.valor, desconto: c.desconto, liquido: c.liquido }, error: null, count: null };
  }
  const rows = await query(
    `insert into "antecipacoes" ("empresa_id","entregador_id","valor_bruto","percentual","desconto","valor_liquido")
     values ($1,$2,$3,$4,$5,$6) returning "id"`,
    [empresaId, uid, c.valor, info.percentual, c.desconto, c.liquido],
  );
  return { data: { id: rows[0]?.id, valor: c.valor, desconto: c.desconto, liquido: c.liquido }, error: null, count: null };
}

let lastExpire = 0;
async function expirarAtribuicoes() {
  const now = Date.now();
  if (now - lastExpire < 60_000) return;
  lastExpire = now;
  try {
    await query(
      `with alvo as (
         select "id", "empresa_id", "entregador_id" from "ofertas"
          where "status" = 'accepted' and "entregador_id" is not null
            and coalesce("atribuida_em", "updated_at") < now() - interval '2 hours'),
       rec as (
         insert into "ofertas_recusas" ("oferta_id","empresa_id","entregador_id","origem","motivo")
         select "id", "empresa_id", "entregador_id", 'sistema', 'Sem resposta em 2 horas' from alvo),
       aloc as (
         update "alocacoes" set "status" = 'recusada'
          where "status" = 'allocated' and "oferta_id" in (select "id" from alvo)),
       up as (
         update "ofertas" set "status" = 'open', "entregador_id" = null, "atribuida_em" = null, "updated_at" = now()
          where "id" in (select "id" from alvo))
       select count(*)::int as n from alvo`,
    );
  } catch (e) {
    console.error("[expirar] erro:", (e as Error)?.message);
  }
}

async function moverPacotes(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  const origemId = String(args._rota_origem ?? "");
  const destId = String(args._rota_destino ?? "");
  if (!origemId || !destId || origemId === destId) throw new Error("Escolha duas rotas diferentes");
  const numeros = Array.isArray(args._numeros) ? (args._numeros as unknown[]).map(Number).filter((x) => Number.isInteger(x) && x > 0) : [];
  let qtd = Math.floor(Number(args._quantidade ?? 0));
  if (!numeros.length && !(qtd > 0)) throw new Error("Informe quantos pacotes mover");

  const rows = await query(
    `select r."id", r."operacao_id", r."status", r."quantidade_pacotes" as q, r."quantidade_paradas" as p, r."valor_total" as vt,
            r."oferta_id", o."status" as ostatus, o."valor_por_pacote" as ovp
       from "rotas_operacao" r left join "ofertas" o on o."id"::text = r."oferta_id"::text
      where r."id"::text = any($1::text[]) and ($2::text is null or r."empresa_id" = $2)`,
    [[origemId, destId], uid],
  );
  const o = rows.find((r) => String(r.id) === origemId);
  const d = rows.find((r) => String(r.id) === destId);
  if (!o || !d) throw new Error("Rota não encontrada");
  if (String(o.operacao_id) !== String(d.operacao_id)) throw new Error("As rotas precisam ser da mesma operação");
  for (const r of [o, d]) {
    if (r.status === "cancelada" || ["cancelled", "completed"].includes(String(r.ostatus ?? ""))) throw new Error("Uma das rotas já está encerrada");
  }

  const stmts: { text: string; params: unknown[] }[] = [];
  if (o.oferta_id && d.oferta_id) {
    const sel = numeros.length
      ? await query(
          `select "id" from "entregas_pacotes" where "oferta_id"::text = $1 and "status" = 'pending' and "numero_pacote" = any($2::int[]) order by "numero_pacote"`,
          [String(o.oferta_id), numeros],
        )
      : await query(
          `select "id" from "entregas_pacotes" where "oferta_id"::text = $1 and "status" = 'pending' order by "numero_pacote" desc limit $2`,
          [String(o.oferta_id), qtd],
        );
    const esperado = numeros.length ? numeros.length : qtd;
    if (sel.length < esperado) throw new Error(`Só há ${sel.length} pacote(s) pendente(s) disponíveis para mover`);
    qtd = sel.length;
    const mx = await query(`select coalesce(max("numero_pacote"), 0)::int as m from "entregas_pacotes" where "oferta_id"::text = $1`, [String(d.oferta_id)]);
    const base = Number(mx[0]?.m ?? 0);
    stmts.push({
      text: `update "entregas_pacotes" p set "oferta_id" = $1, "operacao_id" = $2, "numero_pacote" = v.n, "updated_at" = now()
               from unnest($3::uuid[], $4::int[]) as v(id, n) where p."id" = v.id`,
      params: [d.oferta_id, d.operacao_id, sel.map((x) => x.id), sel.map((_, i) => base + i + 1)],
    });
  } else if (qtd > Number(o.q)) {
    throw new Error(`A rota de origem só tem ${o.q} pacote(s)`);
  }

  const oq = Number(o.q), dq = Number(d.q), op = Number(o.p), dp = Number(d.p);
  let par = args._paradas == null || args._paradas === "" ? null : Math.floor(Number(args._paradas));
  if (par == null || !Number.isFinite(par)) par = qtd >= oq ? op : Math.round((qtd * op) / Math.max(1, oq));
  par = Math.max(0, Math.min(par, op));
  const vpO = oq > 0 ? Number(o.vt) / oq : Number(o.ovp ?? 0);
  const vpD = dq > 0 ? Number(d.vt) / dq : Number(d.ovp ?? vpO);
  const novo = (r: any, q: number, p: number, vp: number) => {
    stmts.push({
      text: `update "rotas_operacao" set "quantidade_pacotes" = $2, "quantidade_paradas" = $3, "valor_total" = $4, "updated_at" = now() where "id"::text = $1`,
      params: [r.id, q, p, Math.round(q * vp * 100) / 100],
    });
    if (r.oferta_id) {
      stmts.push({
        text: `update "ofertas" set "quantidade_pacotes" = $2, "quantidade_paradas" = $3, "valor" = $4, "updated_at" = now() where "id"::text = $1`,
        params: [r.oferta_id, q, p, Math.round(q * vp * 100) / 100],
      });
    }
  };
  novo(o, oq - qtd, op - par, vpO);
  novo(d, dq + qtd, dp + par, vpD);
  await runTransaction(stmts);
  return { data: { movidos: qtd, paradas: par }, error: null, count: null };
}

async function eliminarRota(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  const rotaId = String(args._rota_id ?? "");
  const motivo = String(args._motivo ?? "Rota eliminada pela empresa").slice(0, 200);
  const rows = await query(
    `select r."id", r."status", r."oferta_id", o."status" as ostatus
       from "rotas_operacao" r left join "ofertas" o on o."id"::text = r."oferta_id"::text
      where r."id"::text = $1 and ($2::text is null or r."empresa_id" = $2)`,
    [rotaId, uid],
  );
  const r = rows[0];
  if (!r) throw new Error("Rota não encontrada");
  if (args._apagar === true) {
    if (r.oferta_id) {
      const pg = await query(`select coalesce("payment_status",'pending') as ps from "ofertas" where "id"::text = $1`, [String(r.oferta_id)]);
      if (["paid", "pago"].includes(String(pg[0]?.ps ?? ""))) throw new Error("Esta rota já foi paga e não pode ser apagada");
    }
    const oid = r.oferta_id ? String(r.oferta_id) : null;
    const del: { text: string; params: unknown[] }[] = [];
    if (oid) {
      for (const t of ["entregas_pacotes", "entregas_ocorrencias", "entregador_localizacao", "ofertas_recusas", "entregas", "fechamentos_gestor"])
        del.push({ text: `delete from "${t}" where "oferta_id"::text = $1`, params: [oid] });
      del.push({ text: `delete from "alocacoes" where "oferta_id"::text = $1 or "rota_id"::text = $2`, params: [oid, rotaId] });
      del.push({ text: `delete from "ofertas" where "id"::text = $1`, params: [oid] });
    } else {
      del.push({ text: `delete from "alocacoes" where "rota_id"::text = $1`, params: [rotaId] });
    }
    del.push({ text: `delete from "rotas_operacao" where "id"::text = $1`, params: [rotaId] });
    await runTransaction(del);
    return { data: { ok: true, apagada: true }, error: null, count: null };
  }
  if (r.status === "cancelada") throw new Error("Esta rota já foi eliminada");
  if (r.ostatus === "completed") throw new Error("Esta rota já foi concluída");
  const stmts: { text: string; params: unknown[] }[] = [];
  if (r.oferta_id) {
    const ent = await query(`select count(*)::int as n from "entregas_pacotes" where "oferta_id"::text = $1 and "status" = 'delivered'`, [String(r.oferta_id)]);
    if (Number(ent[0]?.n ?? 0) > 0)
      throw new Error("Esta rota já tem pacotes entregues. Finalize a rota em vez de eliminá-la.");
    stmts.push(
      { text: `update "ofertas" set "status" = 'cancelled', "closing_notes" = $2, "updated_at" = now() where "id"::text = $1`, params: [r.oferta_id, motivo] },
      { text: `update "entregas_pacotes" set "status" = 'cancelado', "updated_at" = now() where "oferta_id"::text = $1 and "status" = 'pending'`, params: [r.oferta_id] },
    );
  }
  stmts.push(
    { text: `update "alocacoes" set "status" = 'removida' where "rota_id"::text = $1`, params: [rotaId] },
    { text: `update "rotas_operacao" set "status" = 'cancelada', "updated_at" = now() where "id"::text = $1`, params: [rotaId] },
  );
  await runTransaction(stmts);
  return { data: { ok: true }, error: null, count: null };
}

const DDL_LAZY: string[] = [
  `CREATE TABLE IF NOT EXISTS "entregadores_gerenciados" (
	"entregador_id" text PRIMARY KEY NOT NULL,
	"empresa_id" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);`,
  `ALTER TABLE "entregadores_gerenciados" ADD COLUMN IF NOT EXISTS "codigo_convite" text;`,
  `CREATE TABLE IF NOT EXISTS "entregador_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entregador_id" text NOT NULL,
	"empresa_id" text NOT NULL,
	"tipo" text NOT NULL,
	"path" text NOT NULL,
	"nome_arquivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);`,
  `CREATE TABLE IF NOT EXISTS "fechamentos_gestor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oferta_id" text NOT NULL,
	"empresa_id" text NOT NULL,
	"entregador_id" text,
	"entregues" integer DEFAULT 0 NOT NULL,
	"insucessos" integer DEFAULT 0 NOT NULL,
	"pendentes" integer DEFAULT 0 NOT NULL,
	"observacao" text,
	"status" text DEFAULT 'a_conferir' NOT NULL,
	"nota" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"conferido_em" timestamp
);`,
  `CREATE TABLE IF NOT EXISTS "equipe_empresa" (
	"user_id" text PRIMARY KEY NOT NULL,
	"empresa_id" text NOT NULL,
	"nome" text,
	"email" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"codigo_convite" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);`,
  `ALTER TABLE "equipe_empresa" ADD COLUMN IF NOT EXISTS "entregador" boolean DEFAULT false NOT NULL;`,
  `CREATE TABLE IF NOT EXISTS "senhas_provisorias" ("user_id" text PRIMARY KEY NOT NULL, "criada_em" timestamp DEFAULT now() NOT NULL);`,
];
let tabelasGarantidas = false;
async function garantirTabelas() {
  if (tabelasGarantidas) return;
  tabelasGarantidas = true;
  try {
    for (const d of DDL_LAZY) await query(d);
  } catch (e) {
    tabelasGarantidas = false;
    console.error("[schema] não foi possível garantir as tabelas:", (e as Error)?.message);
  }
}

const PENALIDADE_OCORRENCIA: Record<string, number> = { address_not_visited: -20, lost: -30, damaged: -10 };

// Encerra a rota: libera o valor a receber, aplica nota e avisa o admin. Só é chamada quando não há pacotes pendentes de devolução.
async function completarRota(ofertaId: string, extraviados = 0) {
  const rows = await query(
    `select o."id", o."empresa_id", o."entregador_id", o."titulo", coalesce(o."valor_por_pacote", 0)::float as vpp
       from "ofertas" o where o."id"::text = $1`,
    [ofertaId],
  );
  const o = rows[0];
  if (!o) throw new Error("Oferta não encontrada");
  const c = await query(
    `select count(*) filter (where "status" <> 'cancelado')::int as total, count(*) filter (where "status" = 'delivered')::int as ent
       from "entregas_pacotes" where "oferta_id"::text = $1`,
    [ofertaId],
  );
  const total = Number(c[0]?.total ?? 0);
  const entregues = Number(c[0]?.ent ?? 0);
  const nao = total - entregues;
  const valor = Math.round(entregues * Number(o.vpp) * 100) / 100;
  const stmts: { text: string; params: unknown[] }[] = [
    {
      text: `update "ofertas" set "status" = 'completed', "pacotes_entregues" = $2, "pacotes_nao_entregues" = $3, "valor" = $4, "closed_at" = now(), "updated_at" = now() where "id"::text = $1`,
      params: [ofertaId, entregues, nao, valor],
    },
  ];
  if (o.entregador_id) {
    stmts.push({
      text: `insert into "entregas" ("oferta_id","empresa_id","entregador_id","valor","status") values ($1,$2,$3,$4,'pendente')
             on conflict ("oferta_id") do update set "valor" = excluded."valor", "updated_at" = now() where "entregas"."status" <> 'pago'`,
      params: [ofertaId, o.empresa_id, o.entregador_id, valor],
    });
    const occ = await query(
      `select "motivo", count(*)::int as n from "entregas_ocorrencias" where "oferta_id"::text = $1 and "motivo" is not null group by 1`,
      [ofertaId],
    );
    for (const r of occ) {
      const pts = (PENALIDADE_OCORRENCIA[String(r.motivo)] ?? 0) * Number(r.n);
      if (pts) stmts.push(...scoreStatements(String(o.entregador_id), Math.max(-60, pts), String(r.motivo), `${r.n} ocorrência(s) na rota ${o.titulo ?? ""}`.trim()));
    }
    if (extraviados > 0) {
      stmts.push(...scoreStatements(String(o.entregador_id), -30 * Math.min(2, extraviados), "lost", `${extraviados} pacote(s) não devolvido(s) na rota ${o.titulo ?? ""}`.trim()));
    } else if (total > 0) {
      const pct = entregues / total;
      if (pct >= 0.95) stmts.push(...scoreStatements(String(o.entregador_id), pct === 1 ? 10 : 5, "route_completed", `Rota ${o.titulo ?? ""} ${Math.round(pct * 100)}% entregue`.trim()));
    }
  }
  stmts.push({
    text: `insert into "admin_notifications" ("type","title","body","link") values ('route_closed', $1, $2, '/ofertas')`,
    params: [`Rota fechada: ${o.titulo ?? ""}`, `✅ ${entregues} entregues / ❌ ${nao} não entregues`],
  });
  await runTransaction(stmts);
  return { entregues, nao, valor };
}

async function finalizarRota(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  const ofertaId = String(args._oferta_id ?? "");
  const rows = await query(
    `select o."id", o."empresa_id", o."entregador_id", o."status",
            exists (select 1 from "entregadores_gerenciados" g where g."entregador_id" = o."entregador_id" and g."empresa_id" = o."empresa_id") as gerenciado
       from "ofertas" o where o."id"::text = $1`,
    [ofertaId],
  );
  const o = rows[0];
  if (!o) throw new Error("Rota não encontrada");
  if (uid !== null) {
    const ehEntregador = o.entregador_id && String(o.entregador_id) === uid;
    const ehGerente = o.gerenciado && String(o.empresa_id) === uid;
    if (!ehEntregador && !ehGerente) throw Object.assign(new Error("Sem permissão"), { code: "403" });
  }
  if (o.status !== "in_progress") throw new Error("A rota precisa estar em andamento para ser finalizada");
  // pacotes sem baixa viram não entregues (voltam para a empresa)
  await query(
    `update "entregas_pacotes" set "status" = 'not_delivered', "motivo_nao_entrega" = coalesce("motivo_nao_entrega", 'Sem baixa no fechamento'), "updated_at" = now()
      where "oferta_id"::text = $1 and "status" = 'pending'`,
    [ofertaId],
  );
  const c = await query(
    `select count(*) filter (where "status" <> 'cancelado')::int as total, count(*) filter (where "status" = 'delivered')::int as ent from "entregas_pacotes" where "oferta_id"::text = $1`,
    [ofertaId],
  );
  const total = Number(c[0]?.total ?? 0);
  const entregues = Number(c[0]?.ent ?? 0);
  const nao = total - entregues;
  if (nao > 0) {
    await query(
      `update "ofertas" set "status" = 'awaiting_return', "pacotes_entregues" = $2, "pacotes_nao_entregues" = $3, "updated_at" = now() where "id"::text = $1`,
      [ofertaId, entregues, nao],
    );
    return { data: { concluida: false, entregues, nao }, error: null, count: null };
  }
  const r = await completarRota(ofertaId);
  return { data: { concluida: true, entregues: r.entregues, nao: r.nao }, error: null, count: null };
}

/** Gestor encerra a rota pelo motorista (fim do dia): informa entregues/insucessos; o resto fica pendente para conferir no dia seguinte. */
async function fecharRotaGestor(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  const ofertaId = String(args._oferta_id ?? "");
  const rows = await query(`select "id", "empresa_id", "entregador_id", "status" from "ofertas" where "id"::text = $1`, [ofertaId]);
  const o = rows[0];
  if (!o) throw new Error("Rota não encontrada");
  if (uid !== null && String(o.empresa_id) !== uid) throw Object.assign(new Error("Sem permissão"), { code: "403" });
  if (!["in_progress", "accepted"].includes(String(o.status))) throw new Error("A rota precisa estar aceita ou em andamento");
  const num = (v: unknown) => Math.max(0, Math.floor(Number(v ?? 0)) || 0);
  const entregues = num(args._entregues), insucessos = num(args._insucessos);
  const obs = args._observacao == null || String(args._observacao).trim() === "" ? null : String(args._observacao).trim().slice(0, 500);
  const cur = await query(
    `select count(*) filter (where "status" = 'delivered')::int as d, count(*) filter (where "status" = 'not_delivered')::int as n,
            count(*) filter (where "status" = 'pending')::int as p from "entregas_pacotes" where "oferta_id"::text = $1`, [ofertaId]);
  const d0 = Number(cur[0]?.d ?? 0), n0 = Number(cur[0]?.n ?? 0), p0 = Number(cur[0]?.p ?? 0);
  if (entregues < d0 || insucessos < n0) throw new Error(`Já existem ${d0} entregues e ${n0} insucessos registrados; os números não podem ser menores`);
  const addD = entregues - d0, addN = insucessos - n0;
  if (addD + addN > p0) throw new Error(`Só há ${p0} pacotes sem baixa; entregues + insucessos passam do total da rota`);
  const pendentes = p0 - addD - addN;
  const lote = (n: number, status: string, motivo: string | null) => ({
    text: `update "entregas_pacotes" set "status" = $2, "motivo_nao_entrega" = $3, "updated_at" = now()
            where "id" in (select "id" from "entregas_pacotes" where "oferta_id"::text = $1 and "status" = 'pending' order by "numero_pacote" limit $4)`,
    params: [ofertaId, status, motivo, n],
  });
  const stmts: { text: string; params: unknown[] }[] = [];
  if (addD > 0) stmts.push(lote(addD, "delivered", null));
  if (addN > 0) stmts.push(lote(addN, "not_delivered", "Insucesso informado pelo gestor"));
  if (pendentes > 0) stmts.push(lote(pendentes, "not_delivered", "Sem baixa — encerrado pelo gestor"));
  stmts.push({
    text: `insert into "fechamentos_gestor" ("oferta_id","empresa_id","entregador_id","entregues","insucessos","pendentes","observacao") values ($1,$2,$3,$4,$5,$6,$7)`,
    params: [ofertaId, String(o.empresa_id), o.entregador_id ? String(o.entregador_id) : null, entregues, insucessos, pendentes, obs],
  });
  await runTransaction(stmts);
  const nao = insucessos + pendentes;
  if (nao > 0) {
    await query(
      `update "ofertas" set "status" = 'awaiting_return', "pacotes_entregues" = $2, "pacotes_nao_entregues" = $3, "updated_at" = now() where "id"::text = $1`,
      [ofertaId, entregues, nao]);
    return { data: { concluida: false, entregues, insucessos, pendentes }, error: null, count: null };
  }
  const r = await completarRota(ofertaId);
  return { data: { concluida: true, entregues: r.entregues, insucessos: 0, pendentes: 0 }, error: null, count: null };
}

async function receberDevolucao(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  const ofertaId = String(args._oferta_id ?? "");
  const rows = await query(`select "id", "empresa_id", "status" from "ofertas" where "id"::text = $1`, [ofertaId]);
  const o = rows[0];
  if (!o) throw new Error("Rota não encontrada");
  if (uid !== null && String(o.empresa_id) !== uid) throw Object.assign(new Error("Sem permissão"), { code: "403" });
  if (o.status !== "awaiting_return") throw new Error("Esta rota não está aguardando devolução");
  const ids = Array.isArray(args._pacote_ids) ? (args._pacote_ids as unknown[]).map(String) : null;
  let extraviados = 0;
  if (args._extraviar === true) {
    const r = await query(
      `update "entregas_pacotes" set "status" = 'extraviado', "updated_at" = now() where "oferta_id"::text = $1 and "status" = 'not_delivered' returning "id"`,
      [ofertaId],
    );
    extraviados = r.length;
  } else if (ids && ids.length) {
    await query(
      `update "entregas_pacotes" set "status" = 'devolvido', "updated_at" = now() where "oferta_id"::text = $1 and "status" = 'not_delivered' and "id"::text = any($2::text[])`,
      [ofertaId, ids],
    );
  } else {
    await query(`update "entregas_pacotes" set "status" = 'devolvido', "updated_at" = now() where "oferta_id"::text = $1 and "status" = 'not_delivered'`, [ofertaId]);
  }
  const rest = await query(`select count(*)::int as n from "entregas_pacotes" where "oferta_id"::text = $1 and "status" = 'not_delivered'`, [ofertaId]);
  const restantes = Number(rest[0]?.n ?? 0);
  if (restantes === 0) {
    await completarRota(ofertaId, extraviados);
    return { data: { restantes: 0, concluida: true, extraviados }, error: null, count: null };
  }
  return { data: { restantes, concluida: false, extraviados }, error: null, count: null };
}

async function cadastrarEntregadorGerenciado(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  if (!uid) throw new Error("Informe a empresa responsável");
  const limpa = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim());
  const nome = limpa(args.nome_completo);
  if (!nome) throw new Error("Informe o nome do entregador");
  const cpf = limpa(args.cpf)?.replace(/\D/g, "") || null;
  const email = limpa(args.email)?.toLowerCase() ?? null;
  const id = crypto.randomUUID().replace(/-/g, "");
  const emailFinal = email ?? `gerenciado-${id}@sem-acesso.tuentrega.local`;
  if (email) {
    const e = await query(`select 1 from "user" where lower("email") = $1`, [email]);
    if (e.length) throw new Error("Já existe uma conta com este e-mail. Convide a pessoa em vez de cadastrá-la sem acesso.");
  }
  if (cpf) {
    const c = await query(`select 1 from "entregadores" where "cpf" = $1`, [cpf]);
    if (c.length) throw new Error("Este CPF já está cadastrado");
  }
  const enumVeic = ["walker", "biker", "motoboy", "carro", "caminhao", "moto_eletrica"];
  const enumPix = ["cpf", "cnpj", "email", "telefone", "aleatoria"];
  const veic = enumVeic.includes(String(args.tipo_veiculo)) ? String(args.tipo_veiculo) : null;
  const pix = enumPix.includes(String(args.pix_tipo)) ? String(args.pix_tipo) : null;
  const alfa = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codigo = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => alfa[b % alfa.length]).join("");
  const stmts: { text: string; params: unknown[] }[] = [
    { text: `insert into "user" ("id","name","email","emailVerified","role") values ($1,$2,$3,false,'entregador')`, params: [id, nome, emailFinal] },
    { text: `insert into "profiles" ("id","full_name","phone") values ($1,$2,$3) on conflict do nothing`, params: [id, nome, limpa(args.whatsapp)] },
    { text: `insert into "user_roles" ("user_id","role") values ($1,'entregador'::app_role) on conflict do nothing`, params: [id] },
    {
      text: `insert into "entregadores" ("id","nome_completo","cpf","whatsapp","email","tipo_veiculo","marca_veiculo","modelo_veiculo","placa","pix_tipo","pix_chave","status")
             values ($1,$2,$3,$4,$5,$6::veiculo_tipo,$7,$8,$9,$10::pix_tipo,$11,'ativo')`,
      params: [id, nome, cpf, limpa(args.whatsapp), email, veic, limpa(args.marca_veiculo), limpa(args.modelo_veiculo), limpa(args.placa)?.toUpperCase() ?? null, pix, limpa(args.pix_chave)],
    },
    { text: `insert into "entregadores_gerenciados" ("entregador_id","empresa_id","codigo_convite") values ($1,$2,$3)`, params: [id, uid, codigo] },
  ];
  await runTransaction(stmts);
  return { data: { id, codigo: email ? codigo : null }, error: null, count: null };
}

/** Dono cadastra um funcionário (operador). Ele ativa a conta pela aba Convite, com e-mail e código. */
async function cadastrarMembroEquipe(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  if (!uid) throw new Error("Informe a empresa");
  const nome = String(args.nome_completo ?? "").trim();
  const email = String(args.email ?? "").trim().toLowerCase();
  if (!nome) throw new Error("Informe o nome");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Informe um e-mail válido");
  const ja = await query(`select 1 from "user" where lower("email") = $1`, [email]);
  if (ja.length) throw new Error("Já existe uma conta com este e-mail");
  const id = crypto.randomUUID().replace(/-/g, "");
  const alfa = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codigo = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => alfa[b % alfa.length]).join("");
  const fone = args.whatsapp == null || String(args.whatsapp).trim() === "" ? null : String(args.whatsapp).trim();
  const tambemEntregador = args.tambem_entregador === true;
  const stmts: { text: string; params: unknown[] }[] = [
    { text: `insert into "user" ("id","name","email","emailVerified","role") values ($1,$2,$3,false,'operador')`, params: [id, nome, email] },
    { text: `insert into "profiles" ("id","full_name","phone") values ($1,$2,$3) on conflict do nothing`, params: [id, nome, fone] },
    { text: `insert into "equipe_empresa" ("user_id","empresa_id","nome","email","codigo_convite","entregador") values ($1,$2,$3,$4,$5,$6)`, params: [id, uid, nome, email, codigo, tambemEntregador] },
  ];
  if (tambemEntregador) stmts.push({ text: `insert into "entregadores" ("id","nome_completo","whatsapp","email","status") values ($1,$2,$3,$4,'ativo')`, params: [id, nome, fone, email] });
  await runTransaction(stmts);
  return { data: { id, codigo }, error: null, count: null };
}

/** Dono liga/desliga o perfil de entregador de um funcionário (ele alterna entre Gestão e Entregador). */
async function definirMembroEntregador(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  if (!uid) throw new Error("Informe a empresa");
  const userId = String(args._user_id ?? "");
  const ligar = args._ativo === true;
  const m = await query(`select "nome","email" from "equipe_empresa" where "user_id" = $1 and "empresa_id" = $2`, [userId, uid]);
  if (!m[0]) throw new Error("Funcionário não encontrado");
  const stmts: { text: string; params: unknown[] }[] = [
    { text: `update "equipe_empresa" set "entregador" = $2 where "user_id" = $1`, params: [userId, ligar] },
  ];
  if (ligar) {
    stmts.push({
      text: `insert into "entregadores" ("id","nome_completo","email","status") values ($1,$2,$3,'ativo') on conflict ("id") do update set "status" = 'ativo'`,
      params: [userId, m[0].nome, m[0].email],
    });
  } else {
    stmts.push({ text: `update "entregadores" set "status" = 'inativo' where "id" = $1`, params: [userId] });
  }
  await runTransaction(stmts);
  return { data: { ok: true }, error: null, count: null };
}

/** Dono apaga o histórico (operações, rotas, ofertas, pacotes, ocorrências...) da própria empresa. Cadastros ficam. */
async function limparMeusDados(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  if (!uid) throw new Error("Informe a empresa");
  if (args._confirmar !== "APAGAR") throw new Error("Confirmação inválida");
  const { limparEmpresa } = await import("./limpeza");
  const r = await limparEmpresa(uid);
  return { data: r, error: null, count: null };
}

/** Publica de uma vez todas as rotas da operação que ainda não têm oferta (uma única transação). */
async function publicarRotas(uid: string | null, args: Record<string, unknown>): Promise<QueryResp> {
  const opId = String(args._operacao_id ?? "");
  const ops = await query(
    `select * from "operacoes" where "id"::text = $1 and ($2::text is null or "empresa_id" = $2)`, [opId, uid]);
  const op = ops[0] as any;
  if (!op) throw new Error("Operação não encontrada");
  const only = Array.isArray(args._rota_ids) ? (args._rota_ids as unknown[]).map(String) : null;
  const rotas = await query(
    `select r.*, a."entregador_id" as dono from "rotas_operacao" r
       left join lateral (select "entregador_id" from "alocacoes" x where x."rota_id"::text = r."id"::text and x."status" not in ('recusada','removida') limit 1) a on true
      where r."operacao_id"::text = $1 and r."oferta_id" is null and r."status" <> 'cancelada'
        and ($2::text[] is null or r."id"::text = any($2::text[]))`, [opId, only]);
  if (!rotas.length) return { data: { publicadas: 0 }, error: null, count: null };
  const stmts: { text: string; params: unknown[] }[] = [];
  const dataOp = op.data_operacao instanceof Date ? op.data_operacao.toISOString().slice(0, 10) : String(op.data_operacao).slice(0, 10);
  const dataFmt = dataOp.split("-").reverse().join("/");
  for (const r of rotas as any[]) {
    const qtd = Number(r.quantidade_pacotes || 0);
    const vp = qtd > 0 && Number(r.valor_total) > 0 ? Number(r.valor_total) / qtd : Number(op.valor_por_pacote || 0);
    const id = crypto.randomUUID();
    const dono = r.dono ? String(r.dono) : null;
    stmts.push({
      text: `insert into "ofertas" ("id","empresa_id","titulo","descricao","quantidade_pacotes","quantidade_paradas","valor","valor_por_pacote","status","entregador_id","atribuida_em","tipo_entrega","operacao_id","rota_operacao_id","data_trabalho")
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'package_delivery',$12,$13,$14)`,
      params: [id, op.empresa_id, `${op.origem || "Operação"} · ${r.nome} - ${dataFmt}`, op.observacoes || null, qtd, Number(r.quantidade_paradas || 0),
        Number(r.valor_total || qtd * vp), vp, dono ? "accepted" : "open", dono, dono ? new Date().toISOString() : null, opId, String(r.id), dataOp],
    });
    if (qtd > 0)
      stmts.push({
        text: `insert into "entregas_pacotes" ("oferta_id","operacao_id","numero_pacote","status") select $1, $2, g, 'pending' from generate_series(1, $3::int) g`,
        params: [id, opId, qtd],
      });
    stmts.push({ text: `update "rotas_operacao" set "oferta_id" = $1, "status" = 'open' where "id"::text = $2`, params: [id, String(r.id)] });
    if (dono) stmts.push({ text: `update "alocacoes" set "oferta_id" = $1 where "rota_id"::text = $2 and "oferta_id" is null`, params: [id, String(r.id)] });
  }
  stmts.push({ text: `update "operacoes" set "status" = 'published' where "id"::text = $1`, params: [opId] });
  await runTransaction(stmts);
  return { data: { publicadas: rotas.length }, error: null, count: null };
}

async function runRpc(req: QueryReq, uid: string | null): Promise<QueryResp> {
  const { fn, args } = req.rpc!;
  if (fn === "publicar_rotas") return await publicarRotas(uid, args);
  if (fn === "cadastrar_membro_equipe") return await cadastrarMembroEquipe(uid, args);
  if (fn === "limpar_meus_dados") return await limparMeusDados(uid, args);
  if (fn === "definir_membro_entregador") return await definirMembroEntregador(uid, args);
  if (fn === "fechar_rota_gestor") return await fecharRotaGestor(uid, args);
  if (fn === "finalizar_rota") return await finalizarRota(uid, args);
  if (fn === "receber_devolucao") return await receberDevolucao(uid, args);
  if (fn === "cadastrar_entregador_gerenciado") return await cadastrarEntregadorGerenciado(uid, args);
  if (fn === "mover_pacotes") return await moverPacotes(uid, args);
  if (fn === "eliminar_rota") return await eliminarRota(uid, args);
  if (fn === "recusar_rota") {
    if (!uid) throw Object.assign(new Error("Não autenticado"), { code: "401" });
    return await recusarRota(uid, args);
  }
  if (fn === "saldo_antecipacao" || fn === "simular_antecipacao" || fn === "solicitar_antecipacao") {
    if (!uid) throw Object.assign(new Error("Não autenticado"), { code: "401" });
    return await runAntecipacao(fn, uid, args);
  }
  if (fn === "apply_reliability_event") {
    const id = String(args._entregador_id);
    const pontos = Number(args._pontos ?? 0);
    const evento = String(args._evento ?? "");
    const desc = args._descricao == null ? null : String(args._descricao);
    const rows = await query(
      `insert into "confiabilidade_score" ("entregador_id","score","nivel","updated_at")
       values ($1, greatest(0, least(100, 100 + $2::int)), 'gold', now())
       on conflict ("entregador_id") do update
         set "score" = greatest(0, least(100, "confiabilidade_score"."score" + $2::int)), "updated_at" = now()
       returning "score"`,
      [id, pontos],
    );
    const score = Number(rows[0]?.score ?? 100);
    const nivel = score >= 80 ? "gold" : score >= 50 ? "silver" : "bronze";
    await query(`update "confiabilidade_score" set "nivel" = $2 where "entregador_id" = $1`, [id, nivel]);
    await query(
      `insert into "confiabilidade_historico" ("entregador_id","tipo","delta","motivo") values ($1,$2,$3,$4)`,
      [id, evento, pontos, desc],
    );
    return { data: score, error: null, count: null };
  }
  throw new Error(`Função não disponível: ${fn}`);
}

export async function executeQuery(req: QueryReq, ctx: EngineCtx): Promise<QueryResp> {
  try {
    if (!ctx.internal && !ctx.userId) throw Object.assign(new Error("Não autenticado"), { code: "401" });
    await garantirTabelas();
    const params: unknown[] = [];
    const scope = makeScope(ctx, params);

    if (req.op === "rpc") {
      if (scope) {
        const fn = req.rpc?.fn;
        if (scope.operador && fn && OPERADOR_RPC_NEGADAS.has(fn)) forbidden("Somente o dono da empresa pode fazer isso");
        if (fn === "apply_reliability_event") {
          const a = req.rpc?.args ?? {};
          const pontos = Number(a._pontos ?? 0);
          if (String(a._entregador_id) !== scope.uid || !(pontos >= -30 && pontos <= 10)) forbidden();
        } else if (fn === "recusar_rota" || fn === "saldo_antecipacao" || fn === "simular_antecipacao" || fn === "solicitar_antecipacao") {
          if (scope.role === "empresa") forbidden();
        } else if (fn === "mover_pacotes" || fn === "publicar_rotas" || fn === "fechar_rota_gestor" || fn === "cadastrar_membro_equipe" || fn === "limpar_meus_dados" || fn === "definir_membro_entregador" || fn === "eliminar_rota" || fn === "receber_devolucao" || fn === "cadastrar_entregador_gerenciado") {
          if (scope.role !== "empresa") forbidden();
        } else if (fn !== "finalizar_rota") forbidden();
      }
      return await runRpc(req, scope?.uid ?? null);
    }

    if (req.table === "ofertas" && req.op === "select") await expirarAtribuicoes();

    const info = tableInfo(req.table);
    const T = q(req.table);
    const pol = POLICIES[req.table];

    if (req.op === "select") {
      const alias = "t0";
      const g = readGuard(req.table, alias, scope);
      if (g.deny) {
        return { data: req.head || req.single ? null : [], error: null, count: req.count ? 0 : null };
      }
      const extra: string[] = [];
      const list = buildCols(req.table, alias, req.columns ?? "*", extra, scope);
      const where = [...buildWhere(req.filters, alias, params, req.table, scope), ...extra];
      if (g.sql) where.push(g.sql);
      const whereSql = where.length ? ` where ${where.join(" and ")}` : "";

      let count: number | null = null;
      if (req.count) {
        const cp: unknown[] = [];
        const cs = makeScope(ctx, cp);
        const cg = readGuard(req.table, alias, cs);
        const cw = buildWhere(req.filters, alias, cp, req.table, cs);
        if (cg.sql) cw.push(cg.sql);
        const rows = await query(
          `select count(*)::int as c from ${T} ${q(alias)}${cw.length ? ` where ${cw.join(" and ")}` : ""}`,
          cp,
        );
        count = Number(rows[0]?.c ?? 0);
      }
      if (req.head) return { data: null, error: null, count };

      const orderSql = req.order.length
        ? ` order by ${req.order.map((o) => `${colRef(req.table, alias, o.col, scope)} ${o.asc ? "asc" : "desc"}`).join(", ")}`
        : "";
      let limit = req.limit;
      if (req.single && limit == null) limit = 2;
      const limSql = (limit != null ? ` limit ${Math.max(0, Math.floor(limit))}` : "") +
        (req.offset ? ` offset ${Math.max(0, Math.floor(req.offset))}` : "");
      const rows = await query(
        `select to_jsonb(r) as r from (select ${list} from ${T} ${q(alias)}${whereSql}${orderSql}${limSql}) r`,
        params,
      );
      const data = rows.map((x) => fixTs(x.r));
      if (req.single === "single") {
        if (data.length !== 1)
          return {
            data: null,
            error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
            count,
          };
        return { data: data[0], error: null, count };
      }
      if (req.single === "maybe") {
        if (data.length > 1)
          return { data: null, error: { message: "multiple rows returned", code: "PGRST116" }, count };
        return { data: data[0] ?? null, error: null, count };
      }
      return { data, error: null, count };
    }

    // ----- escritas -----
    if (scope?.operador) {
      if (OPERADOR_NEGADAS.has(req.table) || OPERADOR_SEM_ESCRITA.has(req.table) || req.op === "delete") forbidden("Somente o dono da empresa pode fazer isso");
    }
    let vpOperador = 0;
    if (scope?.operador && ["operacoes", "rotas_operacao", "ofertas", "agenda_previsoes"].includes(req.table) && (req.op === "insert" || req.op === "upsert")) {
      const e = await query(`select "tms_valor_padrao_pacote" as v from "empresas" where "id" = $1`, [scope.uid]);
      vpOperador = Number(e[0]?.v ?? 0) || 0;
    }
    const forced = scope ? ruleFor(pol?.force, scope.role) : undefined;
    const allowedCols = scope ? ruleFor(pol?.updateCols, scope.role) : undefined;

    function updPred(): string | null {
      if (!scope) return null;
      const r = ruleFor(pol?.update, scope.role);
      if (r === undefined || r === false) return forbidden();
      return r === true ? null : r(req.table, scope.P, scope.uid);
    }

    let stmt: string;
    if (req.op === "insert" || req.op === "upsert") {
      const rows = ((Array.isArray(req.values) ? req.values : [req.values]) as Record<string, unknown>[]).map((r) => ({ ...r }));
      if (!rows.length || !rows[0]) return { data: req.returning ? [] : null, error: null, count: null };
      if (scope?.operador && vpOperador >= 0 && ["operacoes", "rotas_operacao", "ofertas", "agenda_previsoes"].includes(req.table)) {
        for (const r of rows) preencheFinanceiro(req.table, r, vpOperador);
      }
      if (scope) {
        const ins = ruleFor(pol?.insert, scope.role);
        if (ins === undefined || ins === false) forbidden();
        for (const r of rows) {
          if (forced) for (const c of Object.keys(forced)) if (r[c] === undefined || r[c] === null) r[c] = scope.uid;
          if (typeof ins === "function") {
            const err = await ins(r, scope.uid, query);
            if (err) forbidden(err);
          }
        }
      }
      const cols = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
      cols.forEach(q);
      if (!cols.length) throw new Error("Nenhum valor para inserir");
      const valuesSql = rows
        .map(
          (r) =>
            `(${cols
              .map((c) => (r[c] === undefined ? "default" : `$${params.push(encode(r[c], info.cols.get(c)))}`))
              .join(", ")})`,
        )
        .join(", ");
      stmt = `insert into ${T} (${cols.map(q).join(", ")}) values ${valuesSql}`;
      if (req.op === "upsert") {
        const conflict = req.onConflict ? req.onConflict.split(",").map((x) => x.trim()) : info.pk;
        if (!conflict.length) throw new Error("upsert sem chave de conflito");
        let upd = cols.filter((c) => !conflict.includes(c));
        let pred: string | null = null;
        let canUpdate = true;
        if (scope) {
          const r = ruleFor(pol?.update, scope.role);
          if (r === undefined || r === false) canUpdate = false;
          else {
            if (typeof r === "function") pred = r(req.table, scope.P, scope.uid);
            if (allowedCols) upd = upd.filter((c) => allowedCols.includes(c));
            if (forced) upd = upd.filter((c) => !(c in forced));
          }
        }
        stmt += ` on conflict (${conflict.map(q).join(", ")}) ` +
          (req.ignoreDuplicates || !upd.length || !canUpdate
            ? "do nothing"
            : `do update set ${upd.map((c) => `${q(c)} = excluded.${q(c)}`).join(", ")}${pred ? ` where ${pred}` : ""}`);
      }
    } else if (req.op === "update") {
      const vals = (req.values ?? {}) as Record<string, unknown>;
      const keys = Object.keys(vals).filter((k) => vals[k] !== undefined && !(scope?.operador && mascarado(req.table, k)));
      if (!keys.length) {
        if (scope?.operador) return { data: null, error: null, count: null };
        throw new Error("Nenhum valor para atualizar");
      }
      const pred = updPred();
      if (scope) {
        if (allowedCols) for (const k of keys) if (!allowedCols.includes(k)) forbidden(`Coluna não permitida: ${k}`);
        if (forced) for (const c of Object.keys(forced)) if (vals[c] !== undefined && String(vals[c]) !== scope.uid) forbidden(`Coluna protegida: ${c}`);
        const chk = ruleFor(pol?.updateCheck, scope.role);
        const err = chk?.(vals, scope.uid);
        if (err) forbidden(err);
      }
      const sets = keys.map((k) => `${q(k)} = $${params.push(encode(vals[k], info.cols.get(k)))}`);
      const where = buildWhere(req.filters, req.table, params, req.table, scope);
      if (!where.length) throw new Error("update sem filtro não é permitido");
      if (pred) where.push(pred);
      stmt = `update ${T} set ${sets.join(", ")} where ${where.join(" and ")}`;
    } else if (req.op === "delete") {
      let pred: string | null = null;
      if (scope) {
        const r = ruleFor(pol?.delete, scope.role);
        if (r === undefined || r === false) forbidden();
        if (typeof r === "function") pred = r(req.table, scope.P, scope.uid);
      }
      const where = buildWhere(req.filters, req.table, params, req.table, scope);
      if (!where.length) throw new Error("delete sem filtro não é permitido");
      if (pred) where.push(pred);
      stmt = `delete from ${T} where ${where.join(" and ")}`;
    } else {
      throw new Error(`Operação inválida: ${req.op}`);
    }

    if (!req.returning) {
      await query(stmt, params);
      return { data: null, error: null, count: null };
    }
    const rows = await query(`with m as (${stmt} returning *) select to_jsonb(m) as r from m`, params);
    const data = rows.map((x) => (scope?.operador ? removeMascaradas(req.table, fixTs(x.r)) : fixTs(x.r)));
    if (req.single === "single" || req.single === "maybe") return { data: data[0] ?? null, error: null, count: null };
    return { data, error: null, count: null };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.error("[db] erro:", msg, req.table, req.op);
    return { data: null, error: { message: msg, code: e?.code, details: e?.detail }, count: null };
  }
}

export async function runSetupSql(sqlText: string): Promise<{ ok: number; failed: { stmt: string; error: string }[] }> {
  const parts = sqlText.split(/^-- @@\s*$/m).map((s) => s.trim()).filter(Boolean);
  let ok = 0;
  const failed: { stmt: string; error: string }[] = [];
  for (const stmt of parts) {
    try {
      await query(stmt);
      ok++;
    } catch (e: any) {
      failed.push({ stmt: stmt.slice(0, 160), error: e?.message ?? String(e) });
    }
  }
  return { ok, failed };
}

export async function runSetupBatch(sqlText: string, offset: number, limit: number) {
  const parts = sqlText.split(/^-- @@\s*$/m).map((x) => x.trim()).filter(Boolean);
  const slice = parts.slice(offset, offset + limit);
  const failed: { stmt: string; error: string }[] = [];
  if (slice.length) {
    let done = false;
    if (!queryImpl) {
      try {
        await (sqlClient() as any).transaction((t: any) => slice.map((x) => t.query(x)));
        done = true;
      } catch {
        /* cai para execução individual para achar o comando com erro */
      }
    }
    if (!done) {
      for (const stmt of slice) {
        try {
          await query(stmt);
        } catch (e: any) {
          failed.push({ stmt: stmt.slice(0, 160), error: e?.message ?? String(e) });
        }
      }
    }
  }
  const nextOffset = offset + limit;
  return { total: parts.length, offset, processed: slice.length, next: nextOffset < parts.length ? nextOffset : null, failed };
}

export async function runTransaction(stmts: { text: string; params: unknown[] }[]) {
  if (queryImpl) {
    await queryImpl("begin", []);
    try {
      for (const st of stmts) await queryImpl(st.text, st.params);
      await queryImpl("commit", []);
    } catch (e) {
      await queryImpl("rollback", []);
      throw e;
    }
    return;
  }
  await (sqlClient() as any).transaction((t: any) => stmts.map((st) => t.query(st.text, st.params)));
}

const VEICULOS = ["walker", "biker", "motoboy", "carro", "caminhao", "moto_eletrica"];
const PIX_TIPOS = ["cpf", "cnpj", "email", "telefone", "aleatoria"];
const EMPRESA_FIELDS = ["razao_social", "cnpj", "nome_fantasia", "segmento", "cep", "rua", "numero", "complemento", "bairro", "cidade", "estado", "whatsapp", "responsavel"];
const ENTREGADOR_FIELDS = ["nome_completo", "cpf", "cnpj", "whatsapp", "tipo_veiculo", "marca_veiculo", "modelo_veiculo", "placa", "pix_tipo", "pix_chave", "banco", "data_nascimento", "cep", "rua", "numero", "complemento", "bairro", "cidade", "estado"];

function clean(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function insertStmt(table: string, obj: Record<string, unknown>, onConflictNothing = false) {
  const cols = Object.keys(obj);
  const text = `insert into ${q(table)} (${cols.map(q).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})${onConflictNothing ? " on conflict do nothing" : ""}`;
  return { text, params: cols.map((c) => obj[c]) };
}

export async function registerProfile(
  user: { id: string; name: string; role: string | null },
  role: string,
  data: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (role !== "empresa" && role !== "entregador") return { ok: false, status: 400, message: "Perfil inválido" };
  if (user.role && user.role !== "entregador") return { ok: false, status: 409, message: "Perfil já cadastrado" };
  const exists = await query(
    `select 1 from "empresas" where "id" = $1 union all select 1 from "entregadores" where "id" = $1 limit 1`,
    [user.id],
  );
  if (exists.length) return { ok: false, status: 409, message: "Perfil já cadastrado" };

  const stmts: { text: string; params: unknown[] }[] = [
    { text: `update "user" set "role" = $1, "updatedAt" = now() where "id" = $2`, params: [role, user.id] },
    insertStmt("profiles", { id: user.id, full_name: clean(data.responsavel) ?? clean(data.nome_completo) ?? user.name, phone: clean(data.whatsapp), company_name: clean(data.razao_social) }, true),
    { text: `insert into "user_roles" ("user_id","role") values ($1, $2::app_role) on conflict do nothing`, params: [user.id, role] },
  ];

  if (role === "empresa") {
    const row: Record<string, unknown> = { id: user.id };
    for (const f of EMPRESA_FIELDS) row[f] = clean(data[f]);
    row.razao_social = row.razao_social ?? user.name;
    stmts.push(insertStmt("empresas", row));
  } else {
    const row: Record<string, unknown> = { id: user.id };
    for (const f of ENTREGADOR_FIELDS) row[f] = clean(data[f]);
    row.nome_completo = row.nome_completo ?? user.name;
    if (!VEICULOS.includes(String(row.tipo_veiculo))) row.tipo_veiculo = null;
    if (!PIX_TIPOS.includes(String(row.pix_tipo))) row.pix_tipo = null;
    if (Array.isArray(data.turnos)) row.turnos = data.turnos.map(String);
    if (Array.isArray(data.plataformas)) row.plataformas = data.plataformas.map(String);
    stmts.push(insertStmt("entregadores", row));
  }

  try {
    await runTransaction(stmts);
  } catch (e: any) {
    const m = String(e?.message ?? e);
    if (/cnpj/i.test(m) && /unique|duplicate/i.test(m)) return { ok: false, status: 409, message: "Este CNPJ já está cadastrado" };
    if (/cpf/i.test(m) && /unique|duplicate/i.test(m)) return { ok: false, status: 409, message: "Este CPF já está cadastrado" };
    console.error("[register] erro:", m);
    return { ok: false, status: 500, message: "Não foi possível concluir o cadastro" };
  }
  return { ok: true };
}

export { query as rawQuery };


const tentativasConvite = new Map<string, { n: number; ate: number }>();

/** Entregador pré-cadastrado pela empresa cria a própria senha e assume a conta (histórico preservado). */
export async function resgatarConvite(email: string, codigo: string, senha: string): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const em = email.trim().toLowerCase();
  const t = tentativasConvite.get(em);
  if (t && t.ate > Date.now() && t.n >= 5) return { ok: false, status: 429, message: "Muitas tentativas. Aguarde alguns minutos." };
  if (senha.length < 6) return { ok: false, status: 400, message: "A senha precisa ter pelo menos 6 caracteres." };
  await garantirTabelas();
  let rows = await query(
    `select u."id", g."empresa_id", g."codigo_convite", 'entregador' as tipo from "user" u join "entregadores_gerenciados" g on g."entregador_id" = u."id"
     where lower(u."email") = $1`, [em]);
  if (!rows.length)
    rows = await query(
      `select u."id", g."empresa_id", g."codigo_convite", 'equipe' as tipo from "user" u join "equipe_empresa" g on g."user_id" = u."id"
       where lower(u."email") = $1 and g."ativo"`, [em]);
  const r = rows[0] as any;
  const cod = codigo.trim().toUpperCase();
  if (!r || !r.codigo_convite || r.codigo_convite !== cod) {
    tentativasConvite.set(em, { n: (t && t.ate > Date.now() ? t.n : 0) + 1, ate: Date.now() + 10 * 60_000 });
    return { ok: false, status: 400, message: "E-mail ou código de convite inválido." };
  }
  const { auth } = await import("@/lib/auth");
  const ctx: any = await auth.$context;
  const hash = await ctx.password.hash(senha);
  await ctx.internalAdapter.linkAccount({ userId: r.id, providerId: "credential", accountId: r.id, password: hash });
  await runTransaction(
    r.tipo === "equipe"
      ? [
          { text: `update "equipe_empresa" set "codigo_convite" = null where "user_id" = $1`, params: [r.id] },
          { text: `update "user" set "emailVerified" = true where "id" = $1`, params: [r.id] },
        ]
      : [
          { text: `delete from "entregadores_gerenciados" where "entregador_id" = $1`, params: [r.id] },
          { text: `insert into "dispatchers" ("entregador_id","empresa_id","valor_por_pacote","status") values ($1,$2,0,'ativo') on conflict do nothing`, params: [r.id, r.empresa_id] },
          { text: `update "user" set "emailVerified" = true where "id" = $1`, params: [r.id] },
        ],
  );
  tentativasConvite.delete(em);
  return { ok: true };
}


/** Funcionário ativo → id da empresa onde trabalha (ou null), e se ele também atua como entregador. */
export async function empresaDoOperador(userId: string): Promise<{ empresaId: string; nome: string | null; entregador: boolean } | null> {
  await garantirTabelas();
  const r = await query(`select "empresa_id", "nome", "entregador" from "equipe_empresa" where "user_id" = $1 and "ativo"`, [userId]);
  return r[0] ? { empresaId: String(r[0].empresa_id), nome: r[0].nome ?? null, entregador: !!r[0].entregador } : null;
}

/** Contexto de acesso da sessão. Funcionário com perfil de entregador pode pedir o modo "entregador" (acesso só aos próprios dados). */
export async function contextoDaSessao(user: { id: string; role?: string | null } | null | undefined, modo?: string | null): Promise<EngineCtx> {
  if (!user) return { userId: null, role: null };
  if (user.role !== "operador") return { userId: user.id, role: user.role ?? null };
  const emp = await empresaDoOperador(user.id);
  if (!emp) return { userId: user.id, role: "operador" };
  if (modo === "entregador" && emp.entregador) return { userId: user.id, role: "entregador" };
  return { userId: emp.empresaId, role: "empresa", operador: true };
}
