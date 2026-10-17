import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { __setQueryImpl, runSetupBatch, executeQuery } from "../src/server/data-engine.ts";
const pg = new PGlite(); __setQueryImpl(async (q, p) => (await pg.query(q, p as any[])).rows as any[]);
const sql = fs.readFileSync(new URL("../src/db/setup.sql", import.meta.url), "utf8");
let off: number | null = 0; while (off !== null) { const r = await runSetupBatch(sql, off, 40); off = r.next; }
for (const [i, r] of [["E1","empresa"],["E2","empresa"],["D1","entregador"],["D2","entregador"]]) await pg.query(`insert into "user" (id,name,email,role) values ($1,$1,$1||'@x.com',$2)`, [i, r]);
await pg.query(`insert into empresas (id,razao_social) values ('E1','A'),('E2','B')`);
await pg.query(`insert into entregadores (id,nome_completo,status) values ('D1','Ana','ativo'),('D2','Beto','ativo')`);
const E1 = { userId: "E1", role: "empresa" }, E2 = { userId: "E2", role: "empresa" }, D1 = { userId: "D1", role: "entregador" }, D2 = { userId: "D2", role: "entregador" };
const base = { filters: [], order: [] } as any; const run = (c: any, r: any) => executeQuery({ ...base, ...r }, c);
let fail = 0; const ok = (n: string, c: boolean, x?: any) => { if (!c) fail++; console.log(c ? "PASS" : "FAIL", n, c ? "" : JSON.stringify(x)); };
const eq = (col: string, val: any) => ({ k: "f", col, op: "eq", val });
const of = (await run(E1, { table: "ofertas", op: "insert", values: { titulo: "R", status: "in_progress", entregador_id: "D1" }, returning: true, single: "single" })).data.id;
const t0 = Date.now() - 600000;
// lote guardado offline (3 pontos com hora do aparelho), enviado de uma vez
const lote = [0, 1, 2].map((i) => ({ entregador_id: "D1", oferta_id: of, lat: -23.55 + i * 0.001, lng: -46.63, velocidade_kmh: 30, registrado_em: new Date(t0 + i * 15000).toISOString() }));
let r = await run(D1, { table: "entregador_localizacao", op: "insert", values: lote });
ok("lote de pontos guardados é aceito", !r.error, r);
r = await run(E1, { table: "entregador_localizacao", op: "select", columns: "lat,registrado_em", filters: [eq("oferta_id", of)], order: [{ col: "registrado_em", asc: true }] });
ok("empresa vê os 3 pontos na ordem da hora do aparelho", r.data?.length === 3 && new Date(r.data[0].registrado_em).getTime() === t0, r);
r = await run(E2, { table: "entregador_localizacao", op: "select", columns: "lat" });
ok("outra empresa não vê", r.data?.length === 0, r);
r = await run(D2, { table: "entregador_localizacao", op: "insert", values: [{ entregador_id: "D1", oferta_id: of, lat: 0, lng: 0 }] });
ok("outro entregador não grava posição em nome do D1", !!r.error, r);
const grande = Array.from({ length: 100 }, (_, i) => ({ entregador_id: "D1", oferta_id: of, lat: -23.5 + i * 1e-4, lng: -46.6, velocidade_kmh: 10, registrado_em: new Date(t0 + 60000 + i * 15000).toISOString() }));
r = await run(D1, { table: "entregador_localizacao", op: "insert", values: grande });
ok("lote de 100 pontos", !r.error, r);
process.exit(fail ? 1 : 0);
