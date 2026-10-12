// Compatibility shim — replaced by Better Auth + Drizzle
// Kept here so imports don't break during migration.
// Components should migrate to use authClient from @/lib/auth-client
// and db queries from @/db directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithPassword: async () => ({ data: null, error: new Error("Use authClient.signIn from @/lib/auth-client") }),
    signUp: async () => ({ data: null, error: new Error("Use authClient.signUp from @/lib/auth-client") }),
    signOut: async () => ({ error: null }),
    getClaims: async () => ({ data: null, error: new Error("Not available") }),
    resend: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ error: null }),
    setSession: async () => ({ error: null }),
  },
  from: (_table: string) => ({
    select: (_cols?: string, _opts?: unknown) => ({
      eq: (_col: string, _val: unknown) => ({
        eq: (_c: string, _v: unknown) => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
          then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
        }),
        neq: (_c: string, _v: unknown) => ({
          then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
        }),
        order: (_c: string, _o?: unknown) => ({
          limit: (_n: number) => Promise.resolve({ data: [], error: null }),
          then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
        }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
        is: (_c: string, _v: unknown) => ({
          then: (r: (v: { data: null; count: null; error: null }) => void) => Promise.resolve(r({ data: null, count: null, error: null })),
        }),
        then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
      }),
      order: (_c: string, _o?: unknown) => ({
        limit: (_n: number) => Promise.resolve({ data: [], error: null }),
        then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
      }),
      is: (_c: string, _v: unknown) => ({
        then: (r: (v: { data: null; count: null; error: null }) => void) => Promise.resolve(r({ data: null, count: null, error: null })),
      }),
      neq: (_c: string, _v: unknown) => ({
        then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
      }),
      single: () => Promise.resolve({ data: null, error: null }),
      limit: (_n: number) => Promise.resolve({ data: [], error: null }),
      then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
    }),
    insert: (_data: unknown) => ({
      select: (_c?: string) => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
    }),
    update: (_data: unknown) => ({
      eq: (_col: string, _val: unknown) => ({
        eq: (_c: string, _v: unknown) => Promise.resolve({ data: null, error: null }),
        then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
      }),
      then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
    }),
    upsert: (_data: unknown) => ({
      then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
    }),
    delete: () => ({
      eq: (_col: string, _val: unknown) => Promise.resolve({ data: null, error: null }),
      then: (r: (v: { data: null; error: null }) => void) => Promise.resolve(r({ data: null, error: null })),
    }),
  }),
  channel: (_name: string) => ({
    on: (_event: string, _schema: unknown, _cb?: unknown) => ({
      on: (_e: string, _s: unknown, _c?: unknown) => ({
        subscribe: (_cb?: (status: string) => void) => ({}),
      }),
      subscribe: (_cb?: (status: string) => void) => ({}),
    }),
    subscribe: (_cb?: (status: string) => void) => ({}),
  }),
  removeChannel: (_channel: unknown) => Promise.resolve(),
  storage: {
    from: (_bucket: string) => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: "" } }),
      createSignedUrl: async (_path: string, _exp: number) => ({ data: { signedUrl: "" }, error: null }),
    }),
  },
};
