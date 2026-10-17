import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { execSync } from "child_process";
import { __setQueryImpl, executeQuery, runSetupSql } from "../src/server/data-engine.ts";
const pg = new PGlite();
__setQueryImpl(async (t, p) => (await pg.query(t, p as any[])).rows as any[]);
await runSetupSql(fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8"));
const files = execSync("grep -rl 'from(\"' src --include=*.ts --include=*.tsx", { cwd: new URL("..", import.meta.url).pathname }).toString().trim().split("\n");
const seen = new Set<string>(); let bad = 0, total = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const re = /from\("([a-z_]+)"\)\s*\.select\(\s*(["'`])((?:(?!\2)[\s\S])*?)\2/g;
  let m;
  while ((m = re.exec(src))) {
    const [, table, , cols] = m;
    if (cols.includes("${")) continue;
    const key = table + "|" + cols.replace(/\s+/g, " ");
    if (seen.has(key)) continue; seen.add(key); total++;
    for (const role of ["empresa","entregador","dispatcher"]) { const r = await executeQuery({ table, op: "select", columns: cols, filters: [], order: [], limit: 1 } as any, { userId: "x", role }); if (r.error) { bad++; console.log("FAIL", role, f.split("/src/")[1], table, "::", cols.replace(/\s+/g, " ").slice(0, 100), "=>", r.error.message.slice(0, 120)); } }
  }
}
console.log(`select strings checked: ${total}, failing: ${bad}`);
