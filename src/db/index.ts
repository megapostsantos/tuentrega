import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const url =
    (typeof process !== "undefined" ? process.env.DATABASE_URL : undefined) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (typeof import.meta !== "undefined" ? (import.meta as any).env?.DATABASE_URL : undefined);

  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please configure it in .env.local",
    );
  }
  return url as string;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    const sql = neon(getDatabaseUrl());
    _db = drizzle(sql, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export * from "./schema";
