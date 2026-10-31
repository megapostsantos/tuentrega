// Camada de compatibilidade: mantém a API do supabase-js, mas executa tudo via /api/db (Neon) e Better Auth.
import { QueryBuilder, rpcBuilder, type QueryReq, type QueryResp } from "@/lib/query-builder";
import { authClient } from "@/lib/auth-client";
import { getModo } from "@/lib/modo";

const exec = async (req: QueryReq): Promise<QueryResp> => {
  if (typeof window === "undefined") {
    return { data: req.head || req.single ? null : [], error: null, count: req.count ? 0 : null };
  }
  const res = await fetch("/api/db/query", {
    method: "POST",
    headers: { "content-type": "application/json", "x-modo": getModo() },
    credentials: "same-origin",
    body: JSON.stringify(req),
  });
  try {
    return (await res.json()) as QueryResp;
  } catch {
    return { data: null, error: { message: `Erro ${res.status} ao consultar o servidor` }, count: null };
  }
};

let lastPassword: string | null = null;

function mapUser(u: any) {
  if (!u) return null;
  return { ...u, user_metadata: { name: u.name, role: u.role }, app_metadata: { role: u.role } };
}

class PollingChannel {
  private handlers: { cfg: any; cb: (p: any) => void }[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  on(_type: string, cfg: any, cb: (p: any) => void) {
    this.handlers.push({ cfg, cb });
    return this;
  }
  subscribe(cb?: (status: string) => void) {
    if (typeof window !== "undefined") {
      this.timer = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        for (const h of this.handlers) {
          if (h.cfg?.event !== "*") continue;
          try {
            const r: any = h.cb({ eventType: "UPDATE", table: h.cfg?.table, new: {}, old: {}, errors: null });
            if (r && typeof r.catch === "function") r.catch(() => {});
          } catch {
            /* ignore */
          }
        }
      }, 20000);
    }
    cb?.("SUBSCRIBED");
    return this;
  }
  unsubscribe() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return Promise.resolve("ok");
  }
}

const operadorEmpresa = new Map<string, string>();
const operadorEntregador = new Map<string, boolean>();

function objectUrl(bucket: string, path: string) {
  const enc = path.split("/").map(encodeURIComponent).join("/");
  return `${typeof window !== "undefined" ? window.location.origin : ""}/api/storage/object/${bucket}/${enc}`;
}

async function toBase64(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, json };
}

export const supabase: any = {
  from: (table: string) => new QueryBuilder(exec, table),
  rpc: (fn: string, args?: Record<string, unknown>) => rpcBuilder(exec, fn, args),
  channel: (_name: string) => new PollingChannel(),
  removeChannel: (ch: any) => ch?.unsubscribe?.() ?? Promise.resolve("ok"),
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: Blob, opts?: { contentType?: string; upsert?: boolean }) => {
        const { ok, json } = await post("/api/storage/upload", {
          bucket,
          path,
          contentType: opts?.contentType ?? (file as File).type,
          data: await toBase64(file),
          upsert: !!opts?.upsert,
        });
        if (!ok) return { data: null, error: { message: json?.error ?? "Falha no upload" } };
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: objectUrl(bucket, path) } }),
      createSignedUrl: async (path: string, _expiresIn?: number) => ({
        data: { signedUrl: objectUrl(bucket, path) },
        error: null,
      }),
      createSignedUrls: async (paths: string[], _expiresIn?: number) => ({
        data: paths.map((p) => ({ path: p, signedUrl: objectUrl(bucket, p), error: null })),
        error: null,
      }),
      download: async (path: string) => {
        const r = await fetch(objectUrl(bucket, path));
        if (!r.ok) return { data: null, error: { message: "Arquivo não encontrado" } };
        return { data: await r.blob(), error: null };
      },
      remove: async (paths: string[]) => {
        const { ok, json } = await post("/api/storage/remove", { bucket, paths });
        return ok ? { data: paths, error: null } : { data: null, error: { message: json?.error ?? "Falha ao remover" } };
      },
      list: async (prefix = "") => {
        const { ok, json } = await post("/api/storage/list", { bucket, prefix });
        if (!ok) return { data: null, error: { message: json?.error ?? "Falha ao listar" } };
        return { data: (json.items ?? []).map((i: any) => ({ name: i.path, ...i })), error: null };
      },
    }),
  },
  auth: {
    getSession: async () => {
      const { data } = await authClient.getSession();
      if (!data?.session) return { data: { session: null }, error: null };
      return {
        data: { session: { ...data.session, access_token: data.session.token, user: mapUser(data.user) } },
        error: null,
      };
    },
    getUser: async () => {
      const { data } = await authClient.getSession();
      const u: any = mapUser(data?.user);
      // funcionário da empresa age em nome da empresa: o "usuário" que os fluxos enxergam é o id da empresa
      if (u && (data?.user as any)?.role === "operador") {
        if (!operadorEmpresa.has(u.id)) {
          try {
            const j = await (await fetch("/api/db/equipe-me", { credentials: "same-origin" })).json();
            if (j?.empresaId) operadorEmpresa.set(u.id, j.empresaId);
            operadorEntregador.set(u.id, !!j?.entregador);
          } catch { /* ignore */ }
        }
        const emp = operadorEmpresa.get(u.id);
        if (emp && !(getModo() === "entregador" && operadorEntregador.get(u.id))) return { data: { user: { ...u, id: emp } }, error: null };
      }
      return { data: { user: u }, error: null };
    },
    onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const r = await authClient.signIn.email({ email, password });
      if (r.error) return { data: null, error: new Error(r.error.message || "Credenciais inválidas") };
      lastPassword = password;
      return { data: r.data, error: null };
    },
    updateUser: async ({ password }: { password?: string }) => {
      if (!password) return { data: null, error: null };
      const r = await authClient.changePassword({
        newPassword: password,
        currentPassword: lastPassword ?? "",
        revokeOtherSessions: false,
      });
      if (r.error) return { data: null, error: new Error(r.error.message || "Não foi possível alterar a senha") };
      lastPassword = password;
      return { data: r.data, error: null };
    },
    signUp: async () => ({ data: null, error: new Error("Use authClient.signUp from @/lib/auth-client") }),
    signOut: async () => {
      await authClient.signOut();
      return { error: null };
    },
    getClaims: async () => ({ data: null, error: new Error("Not available") }),
    resend: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ error: null }),
    setSession: async () => ({ error: null }),
  },
};
