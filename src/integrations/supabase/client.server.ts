// Acesso administrativo (sem checagem de sessão) para código que roda só no servidor.
import { QueryBuilder, rpcBuilder, type QueryReq } from "@/lib/query-builder";
import { executeQuery } from "@/server/data-engine";

const exec = (req: QueryReq) => executeQuery(req, { userId: null, role: "admin", internal: true });

export const supabaseAdmin: any = {
  from: (table: string) => new QueryBuilder(exec, table),
  rpc: (fn: string, args?: Record<string, unknown>) => rpcBuilder(exec, fn, args),
};
