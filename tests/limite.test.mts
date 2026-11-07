import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, limiteExcedido } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const res: boolean[] = [];
for (let i = 0; i < 5; i++) res.push(await limiteExcedido("t:a", 3, 600));
ok("passa do limite na 4ª tentativa", res.join() === "false,false,false,true,true", res);
ok("outra chave não é afetada", (await limiteExcedido("t:b", 3, 600)) === false);
ok("limite guardado no banco (vale entre instâncias)", Number(((await pg.query(`select n from limites_uso where chave='t:a'`)).rows[0] as any).n) === 5);
console.log(fail ? `${fail} FALHAS` : "✔ limite.test.mts");
process.exit(fail ? 1 : 0);
