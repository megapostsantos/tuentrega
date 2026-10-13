export type Filter =
  | { k: "f"; col: string; op: string; val: unknown }
  | { k: "or"; expr: string }
  | { k: "not"; col: string; op: string; val: unknown };

export interface QueryReq {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert" | "rpc";
  columns?: string;
  values?: unknown;
  filters: Filter[];
  order: { col: string; asc: boolean }[];
  limit?: number;
  offset?: number;
  single?: "single" | "maybe";
  count?: boolean;
  head?: boolean;
  returning?: boolean;
  onConflict?: string;
  ignoreDuplicates?: boolean;
  rpc?: { fn: string; args: Record<string, unknown> };
}

export interface QueryError {
  message: string;
  code?: string;
  details?: string;
}

export interface QueryResp {
  data: any;
  error: QueryError | null;
  count: number | null;
}

export type Exec = (req: QueryReq) => Promise<QueryResp>;

export class QueryBuilder implements PromiseLike<QueryResp> {
  private req: QueryReq;

  constructor(private exec: Exec, table: string) {
    this.req = { table, op: "select", columns: "*", filters: [], order: [] };
  }

  select(columns = "*", opts?: { count?: string; head?: boolean }) {
    this.req.columns = columns;
    if (this.req.op !== "select") this.req.returning = true;
    if (opts?.count) this.req.count = true;
    if (opts?.head) this.req.head = true;
    return this;
  }
  insert(values: unknown, _opts?: unknown) {
    this.req.op = "insert";
    this.req.values = values;
    return this;
  }
  upsert(values: unknown, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.req.op = "upsert";
    this.req.values = values;
    this.req.onConflict = opts?.onConflict;
    this.req.ignoreDuplicates = opts?.ignoreDuplicates;
    return this;
  }
  update(values: unknown, _opts?: unknown) {
    this.req.op = "update";
    this.req.values = values;
    return this;
  }
  delete(_opts?: unknown) {
    this.req.op = "delete";
    return this;
  }

  private f(op: string, col: string, val: unknown) {
    this.req.filters.push({ k: "f", col, op, val });
    return this;
  }
  eq(col: string, val: unknown) { return this.f("eq", col, val); }
  neq(col: string, val: unknown) { return this.f("neq", col, val); }
  gt(col: string, val: unknown) { return this.f("gt", col, val); }
  gte(col: string, val: unknown) { return this.f("gte", col, val); }
  lt(col: string, val: unknown) { return this.f("lt", col, val); }
  lte(col: string, val: unknown) { return this.f("lte", col, val); }
  like(col: string, val: unknown) { return this.f("like", col, val); }
  ilike(col: string, val: unknown) { return this.f("ilike", col, val); }
  is(col: string, val: unknown) { return this.f("is", col, val); }
  in(col: string, val: unknown[]) { return this.f("in", col, val); }
  filter(col: string, op: string, val: unknown) { return this.f(op, col, val); }
  match(obj: Record<string, unknown>) {
    for (const [k, v] of Object.entries(obj)) this.f("eq", k, v);
    return this;
  }
  not(col: string, op: string, val: unknown) {
    this.req.filters.push({ k: "not", col, op, val });
    return this;
  }
  or(expr: string) {
    this.req.filters.push({ k: "or", expr });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.req.order.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.req.limit = n;
    return this;
  }
  range(from: number, to: number) {
    this.req.offset = from;
    this.req.limit = to - from + 1;
    return this;
  }
  single() {
    this.req.single = "single";
    return this;
  }
  maybeSingle() {
    this.req.single = "maybe";
    return this;
  }
  returns() { return this; }
  throwOnError() { return this; }
  abortSignal(_s?: unknown) { return this; }

  private async run(): Promise<QueryResp> {
    try {
      return await this.exec(this.req);
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) }, count: null };
    }
  }

  then<R1 = QueryResp, R2 = never>(
    onfulfilled?: ((value: QueryResp) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export function rpcBuilder(exec: Exec, fn: string, args: Record<string, unknown> = {}): PromiseLike<QueryResp> {
  const req: QueryReq = { table: "", op: "rpc", filters: [], order: [], rpc: { fn, args } };
  return {
    then(onf, onr) {
      return exec(req)
        .catch((e: any): QueryResp => ({ data: null, error: { message: e?.message ?? String(e) }, count: null }))
        .then(onf, onr);
    },
  };
}
