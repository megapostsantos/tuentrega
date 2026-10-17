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
}

function makeScope(ctx: EngineCtx, params: unknown[]): Scope | null {
  if (ctx.internal || ctx.role === "admin") return null;
  const role = ctx.role as Role;
  if (!ctx.userId) throw Object.assign(new Error("Não autenticado"), { code: "401" });
  if (role !== "empresa" && role !== "entregador" && role !== "dispatcher")
    throw Object.assign(new Error("Sem permissão"), { code: "403" });
  return { uid: ctx.userId, role, P: (v) => `$${params.push(v)}` };
}

function forbidden(msg = "Sem permissão"): never {
  throw Object.assign(new Error(msg), { code: "403" });
}

function readGuard(table: string, alias: string, scope: Scope | null): { deny: boolean; sql?: string } {
  if (!scope) return { deny: false };
  const rule = ruleFor(POLICIES[table]?.read, scope.role);
  if (rule === undefined || rule === false) return { deny: true };
  if (rule === true) return { deny: false };
  return { deny: false, sql: rule(alias, scope.P, scope.uid) };
}

function maskExpr(table: string, alias: string, col: string, scope: Scope | null): string | null {
  if (!scope) return null;
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

async function runRpc(req: QueryReq, uid: string | null): Promise<QueryResp> {
  const { fn, args } = req.rpc!;
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
    const params: unknown[] = [];
    const scope = makeScope(ctx, params);

    if (req.op === "rpc") {
      if (scope) {
        const fn = req.rpc?.fn;
        if (fn === "apply_reliability_event") {
          const a = req.rpc?.args ?? {};
          const pontos = Number(a._pontos ?? 0);
          if (String(a._entregador_id) !== scope.uid || !(pontos >= -30 && pontos <= 10)) forbidden();
        } else if (fn === "recusar_rota" || fn === "saldo_antecipacao" || fn === "simular_antecipacao" || fn === "solicitar_antecipacao") {
          if (scope.role === "empresa") forbidden();
        } else forbidden();
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
      const keys = Object.keys(vals).filter((k) => vals[k] !== undefined);
      if (!keys.length) throw new Error("Nenhum valor para atualizar");
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
    const data = rows.map((x) => fixTs(x.r));
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

async function runTransaction(stmts: { text: string; params: unknown[] }[]) {
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
