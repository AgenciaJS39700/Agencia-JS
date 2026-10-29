// /mesas/cuenta.js — Cuenta compartida de una mesa (pagar entre varios móviles con un QR).
// Rutas: POST /api/cuenta/nueva · GET /api/cuenta/<código> · POST /api/cuenta/<código> {op:"cfg"|"pagar"}
// El servidor calcula siempre los importes: el móvil solo dice qué quiere pagar.
// Tabla D1 `cuentas` (binding CITAS). Demo: pagos simulados, las cuentas se borran a los 2 días.

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const ALFA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const codigoNuevo = () => { const b = crypto.getRandomValues(new Uint8Array(8)); return [...b].map((x) => ALFA[x % ALFA.length]).join(""); };
const PM = ["apple", "google", "card", "bizum", "cash"];
const envios = new Map();
function limitar(ip, max = 120) {
  const ahora = Date.now(), l = (envios.get(ip) || []).filter((t) => ahora - t < 600000);
  if (l.length >= max) return false;
  l.push(ahora); envios.set(ip, l);
  if (envios.size > 5000) envios.clear();
  return true;
}
const entero = (x, min, max) => { const n = Math.floor(Number(x)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; };
export function totales(d) {
  const sub = d.items.reduce((s, it) => s + it.p * it.q, 0);
  return { sub, tot: Math.round(sub * (1 + d.tip / 100)) };
}
// Importe de un pago según el modo de reparto (céntimos). En partes iguales, los céntimos sobrantes van a las primeras partes.
export function importe(d, sel) {
  const { tot } = totales(d), rate = 1 + d.tip / 100;
  if (d.spm === "eq") { const base = Math.floor(tot / d.n), extra = tot - base * d.n; return d.parts < d.n ? base + (d.parts < extra ? 1 : 0) : 0; }
  if (d.spm === "it") return d.items.reduce((s, it, k) => s + Math.round(it.p * Math.min(entero(sel && sel[k], 0, 99), it.q - it.paid) * rate), 0);
  return tot - d.paidC;
}
async function leer(env, c) {
  const r = await env.CITAS.prepare("SELECT datos, v FROM cuentas WHERE codigo = ?").bind(c).first();
  return r ? { d: JSON.parse(r.datos), v: r.v } : null;
}
export async function atenderCuenta(request, env) {
  if (!env.CITAS) return J({ error: "Sin base de datos" }, 503);
  const url = new URL(request.url), ip = request.headers.get("CF-Connecting-IP") || "x";
  const m = url.pathname.match(/^\/api\/cuenta\/(nueva|[A-Z0-9]{8})$/);
  if (!m) return J({ error: "No encontrado" }, 404);
  if (request.method === "GET") {
    if (m[1] === "nueva") return J({ error: "Método" }, 405);
    const x = await leer(env, m[1]);
    return x ? J({ codigo: m[1], v: x.v, ...x.d }) : J({ error: "Esta cuenta no existe o ya ha caducado." }, 404);
  }
  if (request.method !== "POST") return J({ error: "Método" }, 405);
  if (!limitar(ip)) return J({ error: "Demasiadas peticiones. Espera un momento." }, 429);
  let b; try { b = await request.json(); } catch { return J({ error: "Datos no válidos" }, 400); }
  const ahora = Date.now();
  if (m[1] === "nueva") {
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map((it) => ({ i: entero(it.i, 0, 999), p: entero(it.p, 1, 20000), q: entero(it.q, 1, 50), paid: 0 }));
    if (!items.length) return J({ error: "La cuenta está vacía" }, 400);
    const d = { mesa: String(b.mesa || "").replace(/\D/g, "").slice(0, 3) || "1", items, tip: [0, 5, 10].includes(b.tip) ? b.tip : 0, spm: "all", n: 2, parts: 0, paidC: 0, pagos: [], cerrada: false };
    if (totales(d).tot > 300000) return J({ error: "Importe demasiado alto para la demo" }, 400);
    const c = codigoNuevo();
    await env.CITAS.prepare("INSERT INTO cuentas (codigo, datos, v, creada, actualizada) VALUES (?, ?, 1, ?, ?)").bind(c, JSON.stringify(d), ahora, ahora).run();
    if (Math.random() < 0.1) await env.CITAS.prepare("DELETE FROM cuentas WHERE creada < ?").bind(ahora - 2 * 86400000).run();
    return J({ codigo: c, v: 1, ...d });
  }
  for (let intento = 0; intento < 4; intento++) {
    const x = await leer(env, m[1]);
    if (!x) return J({ error: "Esta cuenta no existe o ya ha caducado." }, 404);
    const d = x.d;
    if (d.cerrada) return J({ codigo: m[1], v: x.v, ...d, aviso: "La cuenta ya está pagada." });
    let aviso = "";
    if (b.op === "cfg") {
      if (d.paidC > 0) aviso = "Ya hay pagos hechos: el reparto queda fijado.";
      else {
        if ([0, 5, 10].includes(b.tip)) d.tip = b.tip;
        if (["all", "eq", "it"].includes(b.spm)) d.spm = b.spm;
        if (b.n != null) d.n = entero(b.n, 2, 30);
      }
    } else if (b.op === "pagar") {
      const am = importe(d, b.sel);
      if (!(am > 0)) return J({ codigo: m[1], v: x.v, ...d, aviso: "No hay nada que pagar con esa selección." });
      if (d.spm === "it") d.items.forEach((it, k) => { it.paid += Math.min(entero(b.sel && b.sel[k], 0, 99), it.q - it.paid); });
      if (d.spm === "eq") d.parts++;
      d.paidC += am;
      d.pagos.push({ c: am, pm: PM.includes(b.pm) ? b.pm : "card", t: ahora });
      const { tot } = totales(d);
      d.cerrada = d.paidC >= tot || (d.spm === "eq" && d.parts >= d.n) || (d.spm === "it" && d.items.every((it) => it.paid >= it.q));
      d.ultimo = am;
    } else return J({ error: "Operación no válida" }, 400);
    const r = await env.CITAS.prepare("UPDATE cuentas SET datos = ?, v = v + 1, actualizada = ? WHERE codigo = ? AND v = ?").bind(JSON.stringify(d), ahora, m[1], x.v).run();
    if (r.meta && r.meta.changes === 1) return J({ codigo: m[1], v: x.v + 1, ...d, aviso });
  }
  return J({ error: "Hay mucha gente pagando a la vez. Inténtalo de nuevo." }, 409);
}
