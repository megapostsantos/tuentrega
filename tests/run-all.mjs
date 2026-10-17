// Executa todas as suítes (cada uma imprime PASS/FAIL). Uso: npm test
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const dir = new URL(".", import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => f.endsWith(".test.mts")).sort();
let falhas = 0;
for (const f of files) {
  const r = spawnSync("npx", ["tsx", `tests/${f}`], { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname, timeout: 240000 });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const linhas = out.split("\n");
  const ruins = linhas.filter((l) => /^FAIL/.test(l));
  const extra = [];
  for (const l of linhas) {
    let m;
    if ((m = l.match(/failing: (\d+)/)) && Number(m[1]) > 0) extra.push(l);
    if ((m = l.match(/(?:setup )?failed: (\d+)/)) && Number(m[1]) > 0) extra.push(l);
  }
  const ok = r.status === 0 && ruins.length === 0 && extra.length === 0;
  const total = linhas.filter((l) => /^PASS/.test(l)).length;
  console.log(`${ok ? "✔" : "✘"} ${f}  (${total} verificações)`);
  if (!ok) {
    falhas++;
    console.log([...ruins, ...extra].slice(0, 10).join("\n") || out.slice(-800));
  }
}
console.log(falhas ? `\n${falhas} suíte(s) com falha` : "\nTodas as suítes passaram");
process.exit(falhas ? 1 : 0);
