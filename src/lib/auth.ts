import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

export type AppRole = "admin" | "empresa" | "dispatcher" | "entregador";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: (() => {
    const s = process.env.BETTER_AUTH_SECRET;
    if (!s) throw new Error("BETTER_AUTH_SECRET não configurado");
    if (s.length < 32) console.warn("[auth] BETTER_AUTH_SECRET tem menos de 32 caracteres; troque por um valor forte");
    return s;
  })(),
  baseURL: process.env.BETTER_AUTH_URL || "https://tuentrega.megapostsantos.workers.dev",
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },
  user: {
    deleteUser: { enabled: true },
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "entregador",
        fieldName: "role",
        input: false,
      },
    },
  },
  plugins: [
    admin({
      adminRole: "admin",
      defaultRole: "entregador",
    }),
  ],
  onAPIError: {
    onError: (error: unknown) => {
      const e = error as any;
      (globalThis as any).__lastAuthError =
        [e?.message, e?.cause?.message, e?.body?.message].filter(Boolean).join(" | ") || String(error);
      console.error("[auth] API error:", error);
    },
  },
  trustedOrigins: [
    "http://localhost:5173",
    "https://tuentrega.megapostsantos.workers.dev",
    process.env.BETTER_AUTH_URL || "https://tuentrega.megapostsantos.workers.dev",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
