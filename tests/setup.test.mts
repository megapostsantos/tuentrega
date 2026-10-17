import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (t, p) => (await pg.query(t, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0, bad = 0, calls = 0;
while (off !== null) { const r = await runSetupBatch(sql, off, 40); bad += r.failed.length; off = r.next; calls++; }
console.log("batches:", calls, "failed:", bad);
