// Compatibility shim — replaced by Drizzle db
// Server-side operations should use db from @/db directly
export const supabaseAdmin = {
  from: (_table: string) => ({
    select: (_cols?: string) => ({
      eq: (_col: string, _val: unknown) =>
        Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
    }),
    insert: (_data: unknown) =>
      Promise.resolve({ data: null, error: null }),
    update: (_data: unknown) => ({
      eq: (_col: string, _val: unknown) =>
        Promise.resolve({ data: null, error: null }),
    }),
    delete: () => ({
      eq: (_col: string, _val: unknown) =>
        Promise.resolve({ data: null, error: null }),
    }),
  }),
} as const;
