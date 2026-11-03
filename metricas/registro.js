// /metricas/registro.js — Medición propia de la web, anónima y sin cookies.
// Recibe POST /api/m (navigator.sendBeacon) con lo que hizo una visita en la portada y lo SUMA por día en D1.
// No guarda IP, identificadores, textos escritos ni nada que permita reconocer a una persona:
// solo contadores agregados (visitas, tiempo por sección, clics por botón y por zona de la pantalla).

export const SECCIONES = [
  "cabecera", "inicio", "auditoria", "asistentes", "demos", "planes", "video", "nfc",
  "servicios", "tecnologia", "faq", "contacto", "pie",
];
const DISPOSITIVOS = ["m", "t", "e"]; // móvil, tableta, escritorio
const MAX_BYTES = 6000;
const MAX_CLICS = 40;
const MAX_MS = 30 * 60 * 1000; // una visita no suma más de 30 minutos
const OBJETIVO_OK = /^[a-z0-9][a-z0-9:_./#-]{0,59}$/;
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|monitor/i;

function diaMadrid(fecha = new Date()) {
  // AAAA-MM-DD en hora de España
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(fecha);
}

function entero(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max ? v : null;
}

/** Valida y normaliza lo que manda el navegador. Devuelve null si no es válido. */
export function validar(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos) || datos.v !== 1) return null;
  if (!DISPOSITIVOS.includes(datos.d)) return null;
  const n = datos.n === 1 ? 1 : 0;
  const ms = entero(datos.t, 0, MAX_MS);
  if (ms === null) return null;
  const secciones = [];
  if (datos.s && typeof datos.s === "object" && !Array.isArray(datos.s)) {
    for (const [id, t] of Object.entries(datos.s)) {
      const v = entero(t, 0, MAX_MS);
      if (SECCIONES.includes(id) && v !== null && v > 0) secciones.push([id, v]);
    }
  }
  const clics = [];
  if (Array.isArray(datos.c)) {
    for (const c of datos.c.slice(0, MAX_CLICS)) {
      if (!Array.isArray(c) || c.length !== 4) continue;
      const [obj, sec, xb, yb] = c;
      if (typeof obj !== "string" || !OBJETIVO_OK.test(obj) || !SECCIONES.includes(sec)) continue;
      const x = entero(xb, 0, 19), y = entero(yb, 0, 19);
      if (x === null || y === null) continue;
      clics.push([obj, sec, x, y]);
    }
  }
  return { disp: datos.d, n, ms, secciones, clics };
}

/** Sentencias SQL (con sus valores) que suman la visita a los contadores del día. */
export function sentencias(dia, m) {
  const out = [];
  out.push(["INSERT INTO visitas (dia, disp, n, ms) VALUES (?, ?, ?, ?) ON CONFLICT(dia, disp) DO UPDATE SET n = n + excluded.n, ms = ms + excluded.ms",
    [dia, m.disp, m.n, m.ms]]);
  for (const [sec, t] of m.secciones) {
    // "vistas" = visitas que pasaron al menos 1 s en esa sección (en el primer envío de la visita)
    out.push(["INSERT INTO secciones (dia, seccion, disp, vistas, ms) VALUES (?, ?, ?, ?, ?) ON CONFLICT(dia, seccion, disp) DO UPDATE SET vistas = vistas + excluded.vistas, ms = ms + excluded.ms",
      [dia, sec, m.disp, m.n && t >= 1000 ? 1 : 0, t]]);
  }
  const porObjetivo = new Map(), porPunto = new Map();
  for (const [obj, sec, x, y] of m.clics) {
    const k1 = obj + "|" + sec, k2 = sec + "|" + x + "|" + y;
    porObjetivo.set(k1, (porObjetivo.get(k1) || 0) + 1);
    porPunto.set(k2, (porPunto.get(k2) || 0) + 1);
  }
  for (const [k, n] of porObjetivo) {
    const [obj, sec] = k.split("|");
    out.push(["INSERT INTO clics (dia, objetivo, seccion, disp, n) VALUES (?, ?, ?, ?, ?) ON CONFLICT(dia, objetivo, seccion, disp) DO UPDATE SET n = n + excluded.n",
      [dia, obj, sec, m.disp, n]]);
  }
  for (const [k, n] of porPunto) {
    const [sec, x, y] = k.split("|");
    out.push(["INSERT INTO puntos (dia, seccion, disp, xb, yb, n) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(dia, seccion, disp, xb, yb) DO UPDATE SET n = n + excluded.n",
      [dia, sec, m.disp, Number(x), Number(y), n]]);
  }
  return out;
}

export async function registrarMetricas(request, env, ctx, limitar) {
  const vacio = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (request.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!env.METRICAS) return vacio;
  const url = new URL(request.url);
  const origen = request.headers.get("Origin");
  if (origen) {
    let host = "";
    try { host = new URL(origen).host; } catch (e) { /* origen inválido */ }
    if (host !== url.host) return new Response("Origen no permitido", { status: 403 });
  }
  if (BOT.test(request.headers.get("User-Agent") || "")) return vacio;
  const ip = request.headers.get("CF-Connecting-IP") || "desconocida"; // solo para el límite en memoria; no se guarda
  if (limitar && !limitar(ip)) return vacio;
  const texto = await request.text();
  if (texto.length > MAX_BYTES) return new Response("Demasiado grande", { status: 413 });
  let datos;
  try { datos = JSON.parse(texto); } catch (e) { return new Response("JSON no válido", { status: 400 }); }
  const m = validar(datos);
  if (!m) return new Response("Datos no válidos", { status: 400 });
  const lote = sentencias(diaMadrid(), m).map(([sql, valores]) => env.METRICAS.prepare(sql).bind(...valores));
  const tarea = env.METRICAS.batch(lote).catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(tarea); else await tarea;
  return vacio;
}
