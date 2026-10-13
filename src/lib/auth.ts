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
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "supersecretkey-change-in-production-32chars",
  baseURL: process.env.BETTER_AUTH_URL || "https://tuentrega.megapostsantos.workers.dev",
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "entregador",
        fieldName: "role",
      },
    },
  },
  plugins: [
    admin({
      adminRole: "admin",
      defaultRole: "entregador",
    }),
  ],
  trustedOrigins: [
    "http://localhost:5173",
    "https://tuentrega.megapostsantos.workers.dev",
    process.env.BETTER_AUTH_URL || "https://tuentrega.megapostsantos.workers.dev",
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
