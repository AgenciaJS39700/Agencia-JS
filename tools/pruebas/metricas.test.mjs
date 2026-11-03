// Pruebas de /metricas/registro.js con SQLite real (node:sqlite). Uso: node tools/pruebas/metricas.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { validar, sentencias, registrarMetricas } from "../../metricas/registro.js";

const db = new DatabaseSync(":memory:");
db.exec(readFileSync(new URL("../../metricas/schema.sql", import.meta.url), "utf8"));
const D1 = {
  prepare(sql) { return { bind: (...v) => ({ sql, v }) }; },
  async batch(lista) { for (const { sql, v } of lista) db.prepare(sql).run(...v); },
};
const env = { METRICAS: D1 };
const req = (cuerpo, h = {}) => new Request("https://agencia-js.com/api/m", {
  method: "POST", headers: { "Content-Type": "text/plain", ...h }, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) });
const ok = { v: 1, d: "m", n: 1, t: 42000, s: { inicio: 8000, planes: 12000, faq: 500 },
  c: [["whatsapp", "planes", 10, 4], ["whatsapp", "planes", 10, 4], ["cta:plan-impulso", "planes", 3, 15], ["zona", "inicio", 0, 0]] };

// 1) validación
assert.ok(validar(ok));
for (const malo of [null, [], { ...ok, v: 2 }, { ...ok, d: "x" }, { ...ok, t: -1 }, { ...ok, t: 99999999 }, { ...ok, t: 1.5 }])
  assert.equal(validar(malo), null);
const filtrado = validar({ ...ok, s: { inicio: 100, inventada: 500, planes: "x" }, c: [["<script>", "inicio", 1, 1], ["ok", "nope", 1, 1], ["ok", "inicio", 25, 1], ["ok", "inicio", 1, 1]] });
assert.deepEqual(filtrado.secciones, [["inicio", 100]]);
assert.deepEqual(filtrado.clics, [["ok", "inicio", 1, 1]]);

// 2) dos visitas + un segundo envío de la primera: se suman bien
for (const p of [ok, { ...ok, n: 0, t: 1000, s: { planes: 2000 }, c: [] }, { ...ok, d: "e" }]) {
  const r = await registrarMetricas(req(p), env, null, null);
  assert.equal(r.status, 204);
}
const vis = db.prepare("SELECT disp, n, ms FROM visitas ORDER BY disp").all();
assert.deepEqual(vis.map((x) => [x.disp, x.n, x.ms]), [["e", 1, 42000], ["m", 1, 43000]]);
const planes = db.prepare("SELECT vistas, ms FROM secciones WHERE seccion='planes' AND disp='m'").get();
assert.equal(planes.vistas, 1); assert.equal(planes.ms, 14000);
const faq = db.prepare("SELECT vistas FROM secciones WHERE seccion='faq' AND disp='m'").get();
assert.equal(faq.vistas, 0, "menos de 1 s no cuenta como vista");
const wa = db.prepare("SELECT SUM(n) n FROM clics WHERE objetivo='whatsapp'").get();
assert.equal(wa.n, 4);
const punto = db.prepare("SELECT n FROM puntos WHERE seccion='planes' AND disp='m' AND xb=10 AND yb=4").get();
assert.equal(punto.n, 2);

// 3) rechazos: método, origen ajeno, JSON roto, tamaño, bots (no guardan nada)
const antes = db.prepare("SELECT SUM(n) n FROM visitas").get().n;
assert.equal((await registrarMetricas(new Request("https://agencia-js.com/api/m"), env)).status, 405);
assert.equal((await registrarMetricas(req(ok, { Origin: "https://malo.com" }), env)).status, 403);
assert.equal((await registrarMetricas(req("{roto"), env)).status, 400);
assert.equal((await registrarMetricas(req("x".repeat(7000)), env)).status, 413);
assert.equal((await registrarMetricas(req(ok, { "User-Agent": "Googlebot/2.1" }), env)).status, 204);
assert.equal((await registrarMetricas(req(ok), env, null, () => false)).status, 204);
assert.equal(db.prepare("SELECT SUM(n) n FROM visitas").get().n, antes, "los rechazos no suman");

// 4) sin base de datos configurada no rompe
assert.equal((await registrarMetricas(req(ok), {})).status, 204);
console.log("METRICAS: todas las pruebas OK");
