// /asistentes/agenda.js — Agenda real de los asistentes de citas (solo servidor; no se publica).
// Multi-cliente: cada negocio es un archivo en asistentes/clientes/ y sus citas viven en la D1 «agencia-citas»
// (binding CITAS), separadas por slug.
//
// Públicas (chat, página de citas y widget; CORS según cfg.dominios):
//   GET  /api/as/:slug/config                       datos públicos del negocio
//   GET  /api/as/:slug/dias?servicio=ID             próximos días con huecos
//   GET  /api/as/:slug/huecos?servicio=ID&fecha=F   huecos libres de un día
//   POST /api/as/:slug/cita    {servicio, fecha, hora, nombre, telefono, email?, nota?}
//   POST /api/as/:slug/anular  {codigo, telefono}   el cliente anula su cita
//   POST /api/as/:slug/chat    {messages}           dudas (motor.js)
// Agente de voz (ElevenLabs → webhook; cabecera x-voz-clave si existe el secreto VOZ_WEBHOOK_SECRET):
//   POST /api/as/:slug/voz/huecos {dia, servicio?}  ·  POST /api/as/:slug/voz/cita {nombre, telefono, servicio, dia, hora}
// Panel del negocio (Authorization: Bearer <clave>; solo desde agencia-js.com):
//   GET  /api/as/:slug/panel/citas?desde=F&dias=N   ·  POST /panel/cita · /panel/cancelar · /panel/bloquear · /panel/desbloquear
//   GET  /api/as/:slug/agenda.ics?k=<clave>         calendario para suscribirse (Google, Apple, Outlook)
//   Plan Avanzado: GET panel/push/clave · POST panel/push/alta | baja | prueba (avisos al móvil del negocio)

import { CLIENTES } from "./clientes/index.js";
import { responderAsistente } from "./motor.js";
import { resolverDia } from "../voz/agenda.js";
import { avisarMoviles, altaMovil, bajaMovil, clavesVapid } from "./push.js";
import { plantillaWhatsApp } from "./whatsapp.js";
import { correo, marco } from "./correo.js";
import { atenderAlumnos, atenderPanelAlumnos, alumnaDeLaSesion, compruebaBono, avisarEspera, crearPagoEvento } from "./alumnos.js";
import { atenderEventos, atenderPanelEventos } from "./eventos.js";
import { atenderPanelFacturas } from "./facturas.js";
import { recuperarAcceso, atenderRecados, atenderSustituciones, recadosDe, cambiosDe, dirigidoA } from "./equipo-extra.js";
import { conHorario, atenderHorario } from "./horario.js";

const conPrefijo = (t) => { const d = String(t || "").replace(/\D/g, ""); return d.length === 9 ? "34" + d : d; };

const TZ = "Europe/Madrid";
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/* ---------------------------------------------------------------- utilidades */
const min2 = (t) => { const [a, b] = String(t).split(":").map(Number); return a * 60 + b; };
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const dow = (f) => new Date(f + "T12:00:00Z").getUTCDay();
const sumar = (f, n) => new Date(Date.parse(f + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const legible = (f) => { const d = new Date(f + "T12:00:00Z"); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
const limpiar = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const soloTel = (v) => String(v || "").replace(/[^\d+]/g, "").slice(0, 16);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function ahora() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
function codigo() {
  const r = crypto.getRandomValues(new Uint8Array(6));
  return [...r].map((x) => ALFABETO[x % ALFABETO.length]).join("");
}
async function sha256(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(t)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function igual(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function res(datos, estado = 200, cabeceras = {}) {
  return new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cabeceras } });
}
async function cuerpo(request, max = 4000) {
  const t = await request.text();
  if (t.length > max) throw new Error("grande");
  return t ? JSON.parse(t) : {};
}

/** ¿La petición viene de agencia-js.com o de la propia web del negocio? */
function mismoSitio(origen, url, cfg) {
  let host = "";
  try { host = new URL(origen).host; } catch (e) { return false; }
  if (host === url.host || host === "agencia-js.com") return true;
  return (cfg.dominios || []).some((d) => { try { return new URL(d).host === host; } catch (e) { return false; } });
}

/* ---------------------------------------------------------------- accesos del equipo
   Quién puede entrar y con qué clave. Hay dos sitios donde puede estar una clave:
   el archivo del cliente (la de partida) y la tabla `accesos` de la base de datos
   (las que el propio negocio cambia desde el panel). La base de datos MANDA: si
   alguien aparece ahí, su línea del archivo deja de valer. Así se cambia una clave
   o se da de baja a una persona sin tocar el código ni volver a publicar. */
/* Contraseñas del equipo: las que se ponen desde el panel van cifradas con PBKDF2
   y sal propia. Las que vienen escritas en el archivo del cliente son el SHA-256 de
   siempre, y solo existen hasta que esa persona se pone la suya. */
const ITER_EQ = 100000;
const deHex = (h) => new Uint8Array((String(h).match(/.{2}/g) || []).map((x) => parseInt(x, 16)));
export async function hashClave(clave, salHex, iter) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(clave)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: deHex(salHex), iterations: iter }, k, 256);
  return [...new Uint8Array(bits)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export function salNueva() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((x) => x.toString(16).padStart(2, "0")).join("");
}
/** El usuario se normaliza siempre igual: minúsculas, sin espacios ni acentos. */
export const normUsuario = (u) =>
  String(u == null ? "" : u).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]/g, "").slice(0, 40);

export async function equipo(env, cfg) {
  let filas = [], ultimos = [];
  try {
    const [a, v] = await env.CITAS.batch([
      env.CITAS.prepare("SELECT nombre, usuario, rol, hash, pass_salt, pass_iter, activo FROM accesos WHERE slug = ?").bind(cfg.slug),
      env.CITAS.prepare("SELECT nombre, visto FROM vistos WHERE slug = ?").bind(cfg.slug),
    ]);
    filas = a.results || []; ultimos = v.results || [];
  } catch (e) { /* tablas aún sin crear: seguimos con el archivo */ }
  // El último acceso va aparte a propósito: así anotarlo no convierte a nadie en
  // «clave propia» y las claves del archivo siguen mandando hasta que se cambien.
  const visto = Object.fromEntries(ultimos.map((x) => [x.nombre, x.visto]));
  const rolOk = (r) => (r === "panel" || r === "recepcion" || r === "profe" ? r : "profe");
  const gobierna = new Set(filas.map((f) => f.nombre));
  const lista = filas.map((f) => ({
    nombre: f.nombre, usuario: f.usuario || normUsuario(f.nombre), rol: rolOk(f.rol), hash: f.hash,
    sal: f.pass_salt || null, iter: f.pass_iter || ITER_EQ, activo: !!f.activo, visto: visto[f.nombre] || null, propia: true,
  }));
  const delArchivo = [];
  if (cfg.panel && cfg.panel.hash) delArchivo.push({ nombre: cfg.panel.nombre || "Responsable", usuario: cfg.panel.usuario, rol: "panel", hash: cfg.panel.hash });
  for (const p of (cfg.panel && cfg.panel.equipo) || []) delArchivo.push({ nombre: p.nombre, usuario: p.usuario, rol: p.rol === "panel" ? "panel" : "recepcion", hash: p.hash });
  for (const p of cfg.profes || []) delArchivo.push({ nombre: p.nombre, usuario: p.usuario, rol: "profe", hash: p.hash });
  for (const p of delArchivo) {
    if (!p.hash || gobierna.has(p.nombre)) continue;
    lista.push({ ...p, usuario: normUsuario(p.usuario || p.nombre), sal: null, iter: ITER_EQ, activo: true, visto: visto[p.nombre] || null, propia: false });
  }
  return lista;
}

/**
 * Comprueba usuario + contraseña y devuelve a esa persona, o null.
 * Pedir las dos cosas (y no solo una clave) es lo que convierte esto en un acceso
 * de verdad: una clave suelta que circula por WhatsApp no dice quién entró.
 */
async function quienEs(env, cfg, usuario, clave, roles) {
  const u = normUsuario(usuario);
  if (!u || !clave) return null;
  const l = await equipo(env, cfg);
  const p = l.find((x) => x.activo && x.usuario === u && roles.includes(x.rol));
  if (!p) return null;
  const vale = p.sal
    ? igual(await hashClave(clave, p.sal, p.iter), p.hash)   // puesta desde el panel
    : igual(await sha256(clave), p.hash);                    // la de partida del archivo
  return vale ? p : null;
}

/** Partes del panel que solo ve quien gestiona el estudio, no recepción. */
const SOLO_DUENA = (ruta) => ruta.startsWith("panel/factura") || ruta === "panel/equipo" || ruta === "panel/stats" || ruta === "panel/horas";

/** Deja constancia del último acceso, sin hacer esperar a quien entra. */
function visto(env, cfg, nombre, ctx) {
  const p = env.CITAS.prepare(
    "INSERT INTO vistos (slug, nombre, visto) VALUES (?1, ?2, ?3) ON CONFLICT(slug, nombre) DO UPDATE SET visto = ?3"
  ).bind(cfg.slug, nombre, new Date().toISOString()).run().catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(p);
}

/** Minutos que faltan para una clase (negativo si ya ha pasado). */
function faltan(fecha, inicio) {
  const ya = ahora();
  const dias = Math.round((Date.parse(fecha + "T12:00:00Z") - Date.parse(ya.fecha + "T12:00:00Z")) / 864e5);
  return dias * 1440 + inicio - ya.min;
}

/** Plan Avanzado: avisos push al móvil y vista semanal en el panel. */
export const avanzado = (cfg) => cfg.plan === "avanzado" || cfg.motor === "pro";

/* ---------------------------------------------------------------- disponibilidad */
const ag = (cfg) => ({ paso: 30, capacidad: 1, antelacionMin: 60, diasMax: 60, festivos: [], maxPorTelefono: 3, ...(cfg.agenda || {}) });

/**
 * Modo «sesiones»: el negocio no da huecos libres sino clases a hora fija con plazas
 * (estudios de yoga o pilates, gimnasios, academias, centros con grupos).
 * Se activa con negocio.sesiones = { 0..6: [{ h:"10:00", s:"servicioId", min:75, cap:14, sala:"Sala 1" }] }.
 */
export const porSesiones = (cfg) => !!(cfg.negocio && cfg.negocio.sesiones);

/** Sesiones de un día concreto (ya resueltas con su duración y plazas). */
function sesionesDia(cfg, fecha) {
  const a = ag(cfg);
  if (a.festivos.includes(fecha)) return [];
  return ((cfg.negocio.sesiones || {})[dow(fecha)] || []).map((x) => {
    const serv = cfg.servicios.find((s) => s.id === x.s);
    return { h: x.h, inicio: min2(x.h), s: x.s, nombre: x.nombre || (serv && serv.nombre) || x.s, min: x.min || (serv && serv.min) || 60, cap: x.cap || a.capacidad, sala: x.sala || "", prof: x.prof || "", on: !!x.on, nota: x.nota || "" };
  }).sort((p, q) => p.inicio - q.inicio);
}

/** Huecos libres (minutos) de un día, dadas sus citas y bloqueos. `serv` es el servicio elegido (puede ser null en modo sesiones). */
function calcular(cfg, fecha, serv, citas, bloqueos, ya, forzar) {
  const a = ag(cfg);
  if (fecha < ya.fecha || fecha > sumar(ya.fecha, a.diasMax) || a.festivos.includes(fecha)) return [];
  const out = [];

  if (porSesiones(cfg)) {
    for (const x of sesionesDia(cfg, fecha)) {
      if (serv && x.s !== serv.id) continue;
      // Online: con antelación mínima. Panel (en el local): vale mientras la clase no haya terminado
      if (fecha === ya.fecha && (forzar ? x.inicio + x.min <= ya.min : x.inicio < ya.min + a.antelacionMin)) continue;
      if (citas.filter((c) => c.inicio === x.inicio && c.servicio === x.s).length >= x.cap) continue;
      if (bloqueos.some((b) => b.inicio < x.inicio + x.min && b.fin > x.inicio)) continue;
      out.push(x.inicio);
    }
    return out;
  }

  const dur = (serv && serv.min) || a.paso;
  const tramos = cfg.negocio.horario[dow(fecha)] || [];
  for (const [ini, fin] of tramos) {
    for (let t = min2(ini); t + dur <= min2(fin); t += a.paso) {
      // Online: con antelación mínima. Panel (en el local): vale el hueco en curso si aún no ha terminado su primer tramo
      if (fecha === ya.fecha && (forzar ? t + a.paso <= ya.min : t < ya.min + a.antelacionMin)) continue;
      const solapes = citas.filter((c) => c.inicio < t + dur && c.fin > t).length;
      if (solapes >= a.capacidad) continue;
      if (bloqueos.some((b) => b.inicio < t + dur && b.fin > t)) continue;
      out.push(t);
    }
  }
  return out;
}
async function ocupacion(env, slug, desde, hasta) {
  const [c, b] = await env.CITAS.batch([
    env.CITAS.prepare("SELECT fecha, inicio, fin, servicio FROM citas WHERE slug = ? AND fecha BETWEEN ? AND ? AND estado = 'ok'").bind(slug, desde, hasta),
    env.CITAS.prepare("SELECT fecha, inicio, fin FROM bloqueos WHERE slug = ? AND fecha BETWEEN ? AND ?").bind(slug, desde, hasta),
  ]);
  const por = (rows) => rows.reduce((m, r) => ((m[r.fecha] = m[r.fecha] || []).push(r), m), {});
  return { citas: por(c.results || []), bloqueos: por(b.results || []) };
}
export async function huecosDia(env, cfg, fecha, serv, forzar) {
  const o = await ocupacion(env, cfg.slug, fecha, fecha);
  return calcular(cfg, fecha, serv, o.citas[fecha] || [], o.bloqueos[fecha] || [], ahora(), forzar);
}
async function proximosDias(env, cfg, serv, n = 10) {
  const ya = ahora(), a = ag(cfg), hasta = sumar(ya.fecha, a.diasMax);
  const o = await ocupacion(env, cfg.slug, ya.fecha, hasta);
  const dias = [];
  for (let f = ya.fecha; f <= hasta && dias.length < n; f = sumar(f, 1)) {
    const h = calcular(cfg, f, serv, o.citas[f] || [], o.bloqueos[f] || [], ya);
    if (h.length) dias.push({ fecha: f, libres: h.length });
  }
  return dias;
}

/**
 * Cuadro de clases de varios días con las plazas que quedan en cada una (modo sesiones).
 * Lo usa la web del negocio para enseñar el horario real, no una imagen.
 */
async function clases(env, cfg, desde, dias) {
  const ya = ahora(), a = ag(cfg);
  const hasta = sumar(desde, dias - 1);
  const o = await ocupacion(env, cfg.slug, desde, hasta);
  const out = [];
  for (let f = desde; f <= hasta; f = sumar(f, 1)) {
    const citas = o.citas[f] || [], bloq = o.bloqueos[f] || [];
    const lista = sesionesDia(cfg, f).map((x) => {
      const ocupadas = citas.filter((c) => c.inicio === x.inicio && c.servicio === x.s).length;
      const cerrada = bloq.some((b) => b.inicio < x.inicio + x.min && b.fin > x.inicio);
      const pasada = f < ya.fecha || (f === ya.fecha && x.inicio < ya.min + a.antelacionMin);
      return { hora: x.h, servicio: x.s, nombre: x.nombre, min: x.min, sala: x.sala, prof: x.prof, on: x.on, nota: x.nota, plazas: x.cap, libres: Math.max(0, x.cap - ocupadas), abierta: !cerrada && !pasada && f <= sumar(ya.fecha, a.diasMax) && ocupadas < x.cap };
    });
    if (lista.length) out.push({ fecha: f, dia: legible(f), clases: lista });
  }
  return out;
}

/* ---------------------------------------------------------------- reservar */
/** Valida y guarda una cita de forma atómica (nunca dos citas en el mismo hueco por encima de la capacidad). */
export async function reservar(env, cfg, datos, origen = "chat", ctx) {
  const a = ag(cfg);
  if (cfg.activo === false) return { ok: false, estado: 403, mensaje: "Este negocio no está aceptando citas online ahora mismo." };
  const serv = cfg.servicios.find((s) => s.id === datos.servicio);
  const fecha = String(datos.fecha || ""), hora = String(datos.hora || "");
  const nombre = limpiar(datos.nombre, 60), tel = soloTel(datos.telefono), email = limpiar(datos.email, 120).toLowerCase(), nota = limpiar(datos.nota, 200);
  if (!serv) return { ok: false, estado: 400, mensaje: "Elige un servicio." };
  if (!RE_FECHA.test(fecha) || !/^\d{1,2}:\d{2}$/.test(hora)) return { ok: false, estado: 400, mensaje: "Falta el día o la hora." };
  if (nombre.length < 2) return { ok: false, estado: 400, mensaje: "Escribe tu nombre." };
  // En el panel (cliente que pasa por el local) el teléfono es opcional
  if (tel.replace(/\D/g, "").length < 9 && !(origen === "panel" && !tel)) return { ok: false, estado: 400, mensaje: "El teléfono no parece completo." };
  if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return { ok: false, estado: 400, mensaje: "El email no parece correcto." };
  const inicio = min2(hora);
  // Modo sesiones: la clase manda (su duración y sus plazas). Modo huecos: manda el servicio.
  const ses = porSesiones(cfg) ? sesionesDia(cfg, fecha).find((x) => x.inicio === inicio && x.s === serv.id) : null;
  if (porSesiones(cfg) && !ses) return { ok: false, estado: 400, mensaje: "Esa clase no está en el horario de ese día. Elige otra." };
  const fin = inicio + (ses ? ses.min : serv.min);
  const cupo = ses ? ses.cap : a.capacidad;
  const libres = await huecosDia(env, cfg, fecha, serv, origen === "panel");
  if (!libres.includes(inicio)) return { ok: false, estado: 409, mensaje: ses ? "Esa clase acaba de llenarse. Elige otra hora." : "Ese hueco acaba de ocuparse. Elige otra hora.", libres: libres.map(hhmm) };

  if (origen !== "panel") {
    const ya = ahora();
    if (ses && tel) {
      const rep = await env.CITAS.prepare("SELECT 1 FROM citas WHERE slug = ? AND fecha = ? AND inicio = ? AND servicio = ? AND telefono = ? AND estado = 'ok'").bind(cfg.slug, fecha, inicio, serv.id, tel).first();
      if (rep) return { ok: false, estado: 409, mensaje: "Ya tienes reservada esta clase con este teléfono." };
    }
    const n = await env.CITAS.prepare("SELECT COUNT(*) AS n FROM citas WHERE slug = ? AND telefono = ? AND estado = 'ok' AND fecha >= ?").bind(cfg.slug, tel, ya.fecha).first();
    if (n && n.n >= a.maxPorTelefono) return { ok: false, estado: 429, mensaje: ses ? "Ya tienes muchas clases reservadas con este teléfono. Anula alguna o escríbenos." : "Ya tienes varias citas pendientes con este teléfono. Para más, contacta con el negocio." };
  }

  // Si reserva sin entrar en su cuenta (el caso normal del formulario y del panel),
  // la atamos a su ficha por email o teléfono. Si no, la clase no cuenta en su cuenta
  // y el profesor no ve su nota interna: la reserva queda huérfana.
  let alumnoId = datos.alumno_id || null;
  if (!alumnoId && (email || tel)) {
    const al = await env.CITAS.prepare(
      "SELECT id FROM alumnos WHERE slug = ?1 AND ((?2 <> '' AND lower(email) = ?2) OR (?3 <> '' AND telefono = ?3)) ORDER BY (lower(email) = ?2) DESC LIMIT 1"
    ).bind(cfg.slug, email || "", tel || "").first().catch(() => null);
    if (al) alumnoId = al.id;
  }

  for (let intento = 0; intento < 3; intento++) {
    const cod = codigo();
    try {
      // Sesiones: cuentan las plazas de ESA clase. Huecos: cuentan los solapes con la cita.
      const ocupadas = ses
        ? "(SELECT COUNT(*) FROM citas WHERE slug = ?1 AND fecha = ?5 AND estado = 'ok' AND inicio = ?6 AND servicio = ?3)"
        : "(SELECT COUNT(*) FROM citas WHERE slug = ?1 AND fecha = ?5 AND estado = 'ok' AND inicio < ?7 AND fin > ?6)";
      const r = await env.CITAS.prepare(
        `INSERT INTO citas (slug, codigo, servicio, servicio_n, fecha, inicio, fin, nombre, telefono, email, nota, origen, alumno_id)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?14
         WHERE ${ocupadas} < ?13
           AND NOT EXISTS (SELECT 1 FROM bloqueos WHERE slug = ?1 AND fecha = ?5 AND inicio < ?7 AND fin > ?6)`
      ).bind(cfg.slug, cod, serv.id, ses ? ses.nombre : serv.nombre, fecha, inicio, fin, nombre, tel, email || null, nota || null, origen, cupo, alumnoId).run();
      if (!r.meta || !r.meta.changes) return { ok: false, estado: 409, mensaje: ses ? "Esa clase acaba de llenarse. Elige otra hora." : "Ese hueco acaba de ocuparse. Elige otra hora." };
      const nomServ = ses ? ses.nombre : serv.nombre;
      const cita = { id: r.meta.last_row_id, codigo: cod, servicio_n: nomServ, precio: serv.precio, sala: ses ? ses.sala : "", fecha, inicio, fin, nombre, telefono: tel, email, nota, origen };
      const avisos = Promise.all([
        avisarNegocio(env, cfg, cita, "nueva"),
        origen !== "panel" && cfg.avisos && cfg.avisos.whatsapp ? plantillaWhatsApp(env, cfg.avisos.whatsapp, "cita_nueva", [cfg.negocio.nombre, nombre + (origen === "voz" ? " (por teléfono)" : ""), nomServ, `${legible(fecha)} a las ${hhmm(inicio)}`, tel]) : null,
        cfg.avisos && cfg.avisos.whatsappCliente ? plantillaWhatsApp(env, conPrefijo(tel), "cita_cliente", [nombre.split(" ")[0], cfg.negocio.nombre, nomServ, `${legible(fecha)} a las ${hhmm(inicio)}`, cod, cfg.slug]) : null,
        avanzado(cfg) && origen !== "panel" ? avisarMoviles(env, cfg.slug, `📅 Nueva cita · ${nombre}`, `${nomServ} · ${legible(fecha)} a las ${hhmm(inicio)}${origen === "voz" ? " (por teléfono)" : ""}`) : null,
        email ? correo(env, cfg, email, nombre, `Cita confirmada · ${cfg.negocio.nombre}`, plantillaCliente(cfg, cita, "Tu cita está confirmada")) : null,
      ]).catch((e) => console.error("avisos", e && e.message));
      if (ctx) ctx.waitUntil(avisos); else await avisos;
      return { ok: true, estado: 200, codigo: cod, fecha, hora: hhmm(inicio), dia: legible(fecha), servicio: nomServ, sala: ses ? ses.sala : "",
        mensaje: `${ses ? "Plaza confirmada" : "Cita confirmada"}: ${nomServ} el ${legible(fecha)} a las ${hhmm(inicio)}, a nombre de ${nombre}. Código ${cod}.` };
    } catch (e) {
      if (!/UNIQUE/i.test(String(e && e.message))) throw e; // código repetido: probar otro
    }
  }
  return { ok: false, estado: 500, mensaje: "No se pudo guardar la cita. Inténtalo de nuevo." };
}

async function cancelar(env, cfg, where, binds, ctx, quien) {
  const c = await env.CITAS.prepare(`SELECT * FROM citas WHERE slug = ? AND estado = 'ok' AND ${where}`).bind(cfg.slug, ...binds).first();
  if (!c) return null;
  await env.CITAS.prepare("UPDATE citas SET estado = 'cancelada' WHERE id = ?").bind(c.id).run();
  const p = Promise.all([
    avisarNegocio(env, cfg, c, quien === "cliente" ? "anulada por el cliente" : "cancelada"),
    avisarEspera(env, cfg, c),
    quien === "cliente" && cfg.avisos && cfg.avisos.whatsapp ? plantillaWhatsApp(env, cfg.avisos.whatsapp, "cita_anulada", [cfg.negocio.nombre, c.nombre, c.servicio_n, `${legible(c.fecha)} a las ${hhmm(c.inicio)}`]) : null,
    quien === "cliente" && avanzado(cfg) ? avisarMoviles(env, cfg.slug, `❌ Cita anulada · ${c.nombre}`, `${c.servicio_n} · ${legible(c.fecha)} a las ${hhmm(c.inicio)}. El hueco vuelve a estar libre.`) : null,
    c.email && quien !== "cliente" ? correo(env, cfg, c.email, c.nombre, `Cita cancelada · ${cfg.negocio.nombre}`, plantillaCliente(cfg, c, "Tu cita se ha cancelado", "Si quieres otra fecha, puedes pedirla de nuevo cuando quieras.")) : null,
  ]).catch((e) => console.error("avisos", e && e.message));
  if (ctx) ctx.waitUntil(p); else await p;
  return c;
}

/* ---------------------------------------------------------------- correos de las citas (el envío está en correo.js) */
function bloque(c) {
  return `<p style="font-size:15px;line-height:1.7;background:#f6f6f8;padding:14px 16px;border-radius:10px;margin:14px 0"><b>${esc(legible(c.fecha))} · ${hhmm(c.inicio)}</b><br>${esc(c.servicio_n)}<br>A nombre de ${esc(c.nombre)} · ${esc(c.telefono)}${c.nota ? "<br>Nota: " + esc(c.nota) : ""}<br>Código: <b>${esc(c.codigo)}</b></p>`;
}
function plantillaCliente(cfg, c, titulo, pie) {
  const anular = `https://agencia-js.com/c/${cfg.slug}#anular`;
  return marco(cfg, titulo, `${bloque(c)}<p style="font-size:14px;line-height:1.6">${esc(pie || "Si no puedes venir, anúlala para que otra persona pueda usar el hueco:")}</p>${pie ? "" : `<p><a href="${anular}" style="color:#111;font-weight:700">Anular o cambiar mi cita</a></p>`}`);
}
async function avisarNegocio(env, cfg, c, tipo) {
  const to = cfg.avisos && cfg.avisos.email;
  if (!to) return;
  return correo(env, cfg, to, cfg.negocio.nombre, `${tipo === "nueva" ? "📅 Nueva cita" : "❌ Cita " + tipo}: ${legible(c.fecha)} ${hhmm(c.inicio)} · ${c.nombre}`,
    marco(cfg, tipo === "nueva" ? "Nueva cita" : "Cita " + tipo, `${bloque(c)}<p style="font-size:13px;color:#555">Origen: ${esc(c.origen || "chat")}. Ver todas en tu panel: <a href="https://agencia-js.com/panel/${cfg.slug}">agencia-js.com/panel/${cfg.slug}</a></p>`));
}

/** Recordatorio por correo el día anterior (lo lanza el cron diario de worker.js). */
export async function enviarRecordatorios(env) {
  if (!env.CITAS) return;
  const hoy = ahora().fecha, manana = sumar(hoy, 1);
  // 1) Víspera: correo (si dejó email) y WhatsApp (si el negocio lo tiene activado y está montada la API de Meta)
  const { results } = await env.CITAS.prepare("SELECT * FROM citas WHERE fecha = ? AND estado = 'ok' AND recordada = 0 LIMIT 300").bind(manana).all();
  for (const c of results || []) {
    const cfg = CLIENTES[c.slug];
    if (!cfg || cfg.activo === false) continue;
    const [m, w] = await Promise.all([
      c.email ? correo(env, cfg, c.email, c.nombre, `Recordatorio: mañana a las ${hhmm(c.inicio)} · ${cfg.negocio.nombre}`, plantillaCliente(cfg, c, "Te esperamos mañana")) : false,
      cfg.avisos && cfg.avisos.whatsappCliente && c.telefono ? plantillaWhatsApp(env, conPrefijo(c.telefono), "cita_recordatorio", [c.nombre.split(" ")[0], cfg.negocio.nombre, c.servicio_n, `mañana a las ${hhmm(c.inicio)}`, c.codigo, cfg.slug]) : false,
    ]);
    if (m || w) await env.CITAS.prepare("UPDATE citas SET recordada = 1 WHERE id = ?").bind(c.id).run();
  }
  // 2) «Te toca volver»: cfg.vuelta = { idServicio: días }. Una sola vez (el día exacto) y solo si no tiene ya otra cita.
  for (const slug of Object.keys(CLIENTES)) {
    const cfg = CLIENTES[slug];
    if (!cfg || cfg.activo === false || !cfg.vuelta) continue;
    for (const [sid, dias] of Object.entries(cfg.vuelta)) {
      const f = sumar(hoy, -Number(dias));
      const r = await env.CITAS.prepare("SELECT * FROM citas WHERE slug = ? AND servicio = ? AND fecha = ? AND estado = 'ok' AND email IS NOT NULL LIMIT 100").bind(slug, sid, f).all();
      for (const c of r.results || []) {
        const otra = await env.CITAS.prepare("SELECT 1 FROM citas WHERE slug = ? AND email = ? AND fecha >= ? AND estado = 'ok' LIMIT 1").bind(slug, c.email, hoy).first();
        if (otra) continue;
        const sem = Math.round(Number(dias) / 7), url = cfg.negocio.web || `https://agencia-js.com/c/${slug}`;
        await correo(env, cfg, c.email, c.nombre, `${c.nombre.split(" ")[0]}, ¿repetimos? · ${cfg.negocio.nombre}`,
          marco(cfg, cfg.vueltaTitulo ? cfg.vueltaTitulo.replace("{servicio}", c.servicio_n.toLowerCase()) : `Hace ${sem} semanas de tu ${c.servicio_n.toLowerCase()}`, `<p style="font-size:15px;line-height:1.6">${esc(cfg.vueltaTexto || "Es el momento ideal para el retoque y que tu pelo siga perfecto.")} Reserva en un minuto, cuando quieras:</p><p style="margin:20px 0"><a href="${esc(url)}" style="display:inline-block;background:${esc(cfg.color)};color:#111;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none">Pedir cita</a></p>`));
      }
    }
  }
}

/* ---------------------------------------------------------------- calendario .ics */
function ics(cfg, citas) {
  const p = (s) => String(s).replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const dt = (f, m) => f.replace(/-/g, "") + "T" + hhmm(m).replace(":", "") + "00";
  const ev = citas.map((c) => ["BEGIN:VEVENT", `UID:${c.codigo}-${c.slug}@agencia-js.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=${TZ}:${dt(c.fecha, c.inicio)}`, `DTEND;TZID=${TZ}:${dt(c.fecha, c.fin)}`,
    `SUMMARY:${p(c.nombre + " · " + c.servicio_n)}`, `DESCRIPTION:${p(`Tel. ${c.telefono}${c.nota ? "\nNota: " + c.nota : ""}\nCódigo ${c.codigo} · ${c.origen}`)}`, "END:VEVENT"].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agencia JS//Agenda de citas//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${p("Citas · " + cfg.negocio.nombre)}`, `X-WR-TIMEZONE:${TZ}`, "REFRESH-INTERVAL;VALUE=DURATION:PT15M", ...ev, "END:VCALENDAR"].join("\r\n");
}

/* ---------------------------------------------------------------- config pública */
export function configPublica(cfg) {
  const a = ag(cfg);
  return {
    slug: cfg.slug, demo: !!cfg.demo, activo: cfg.activo !== false, icono: cfg.icono, color: cfg.color, sector: cfg.sector,
    negocio: { nombre: cfg.negocio.nombre, direccion: cfg.negocio.direccion, telefono: cfg.negocio.telefono, horarioTexto: cfg.negocio.horarioTexto, horario: cfg.negocio.horario, wa: cfg.negocio.wa, web: cfg.negocio.web, mapa: cfg.negocio.mapa, logo: cfg.negocio.logo },
    servicios: cfg.servicios.map(({ id, nombre, min, precio }) => ({ id, nombre, min, precio })),
    modo: porSesiones(cfg) ? "sesiones" : "huecos", sesiones: cfg.negocio.sesiones || null,
    gestion: !!(cfg.productos && cfg.productos.length),
    cancelarHoras: ag(cfg).cancelarHoras || 0,
    productos: (cfg.productos || []).map(({ id, nombre, precio, recurrente }) => ({ id, nombre, precio, recurrente: !!recurrente })),
    chips: cfg.chips, saludo: cfg.saludo, pedirEmail: !!a.pedirEmail, diasMax: a.diasMax, avanzado: avanzado(cfg),
  };
}

/* ---------------------------------------------------------------- CORS */
function cors(request, cfg, url) {
  const o = request.headers.get("Origin");
  if (!o) return {};
  let host = ""; try { host = new URL(o).host; } catch (e) { return null; }
  const propio = host === url.host || host === "agencia-js.com";
  const permitido = propio || !(cfg.dominios && cfg.dominios.length) || cfg.dominios.some((d) => { try { return new URL(d).host === host; } catch (e) { return false; } });
  if (!permitido) return null;
  return { "Access-Control-Allow-Origin": o, Vary: "Origin", "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
}

/* ---------------------------------------------------------------- router */
/**
 * @param {Request} request
 * @param {object} env  CITAS (D1), AI, ANTHROPIC_API_KEY?, BREVO_API_KEY?, MAIL_FROM?, VOZ_WEBHOOK_SECRET?
 * @param {ExecutionContext} ctx
 * @param {(ip: string) => boolean} limitar  límite por IP de worker.js
 */
export async function atenderAgenda(request, env, ctx, limitar) {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/api\/as\/([a-z0-9-]{2,40})\/([a-z/.-]+)$/);   // el guion también: hay rutas como panel/nueva-clave
  const cfgArchivo = m && CLIENTES[m[1]];
  if (!cfgArchivo) return res({ error: "Negocio no encontrado" }, 404);
  // El cuadro de clases puede llevarlo el propio negocio desde el panel: si lo ha
  // hecho suyo, manda esa tabla y no el archivo. Copia por petición, nunca se
  // toca el objeto del cliente, que es compartido.
  const cfg = await conHorario(env, cfgArchivo);
  const ruta = m[2];
  const ip = request.headers.get("CF-Connecting-IP") || "desconocida";

  /* ---- panel y calendario (acceso del negocio) ---- */
  if (ruta.startsWith("panel/") || ruta === "agenda.ics") {
    if (!env.CITAS) return res({ error: "Agenda no configurada" }, 503);
    const o = request.headers.get("Origin");
    if (o && !mismoSitio(o, url, cfg)) return res({ error: "Origen no permitido" }, 403);

    // Olvidar la contraseña: estas dos van ANTES de pedir acceso, claro.
    // El enlace sale siempre al correo del estudio, nunca a uno que escriba quien lo pide.
    if ((ruta === "panel/olvidada" || ruta === "panel/nueva-clave") && request.method === "POST") {
      if (!limitar(ip)) return res({ error: "Demasiados intentos. Espera unos minutos." }, 429);
      let b; try { b = await cuerpo(request); } catch (e) { return res({ error: "JSON no válido" }, 400); }
      const r = await recuperarAcceso(env, cfg, ruta, b);
      return res(r.cuerpo, r.estado);
    }
    // Rutas que se abren como enlace (descarga o suscripción), donde la clave no
    // puede ir en una cabecera y viaja en ?k=
    const porURL = ruta === "agenda.ics" || ruta === "panel/exportar" || ruta === "panel/facturacion/csv" || ruta === "panel/factura" || ruta === "panel/lista";
    // El navegador manda «Bearer usuario:contraseña»; los enlaces de descarga, ?u= y ?k=
    const cab = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const corte = cab.indexOf(":");
    const usuario = porURL ? url.searchParams.get("u") : (corte > 0 ? cab.slice(0, corte) : "");
    const clave = porURL ? url.searchParams.get("k") : (corte > 0 ? cab.slice(corte + 1) : "");
    const yo = await quienEs(env, cfg, usuario, clave, ["panel", "recepcion"]);
    if (!yo) {
      if (!limitar(ip)) return res({ error: "Demasiados intentos. Espera unos minutos." }, 429);
      return res({ error: "Usuario o contraseña incorrectos" }, 401);
    }
    if (SOLO_DUENA(ruta) && yo.rol !== "panel") {
      return res({ error: "Tu acceso no llega a esta parte del panel. Pídeselo a quien gestiona el estudio." }, 403);
    }
    if (ruta === "agenda.ics") {
      const desde = sumar(ahora().fecha, -30);
      const { results } = await env.CITAS.prepare("SELECT * FROM citas WHERE slug = ? AND estado = 'ok' AND fecha >= ? ORDER BY fecha, inicio LIMIT 2000").bind(cfg.slug, desde).all();
      return new Response(ics(cfg, results || []), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
    }
    if (ruta === "panel/push/clave" && request.method === "GET") {
      if (!avanzado(cfg)) return res({ error: "Los avisos al móvil son del plan Avanzado." }, 403);
      return res({ clave: (await clavesVapid(env)).pub });
    }
    if (ruta === "panel/huecos" && request.method === "GET") {
      const serv = cfg.servicios.find((s) => s.id === url.searchParams.get("servicio")), fecha = url.searchParams.get("fecha") || "";
      if (!serv || !RE_FECHA.test(fecha)) return res({ error: "Servicio o fecha no válidos" }, 400);
      return res({ fecha, huecos: (await huecosDia(env, cfg, fecha, serv, true)).map(hhmm) });
    }
    // El cuadro de clases de un día con quién lo da: es lo que necesita el panel
    // para poner un sustituto cuando alguien falla.
    if (ruta === "panel/dia" && request.method === "GET") {
      const f = RE_FECHA.test(url.searchParams.get("fecha") || "") ? url.searchParams.get("fecha") : ahora().fecha;
      if (!porSesiones(cfg)) return res({ fecha: f, clases: [], sesiones: false });
      const cam = await cambiosDe(env, cfg, f, f);
      const l = await equipo(env, cfg);
      return res({
        fecha: f, dia: legible(f), sesiones: true,
        equipo: l.filter((p) => p.activo).map((p) => p.nombre),
        clases: sesionesDia(cfg, f).map((x) => {
          const sub = cam[`${f}|${x.inicio}|${x.s}`];
          return { hora: x.h, inicio: x.inicio, servicio: x.s, nombre: x.nombre, sala: x.sala, min: x.min, plazas: x.cap,
                   prof: x.prof || "", da: sub && sub.prof ? sub.prof : x.prof || "", sustituida: !!(sub && sub.prof), nota: sub ? sub.nota || "" : "" };
        }),
      });
    }

    // Lo primero que ve la jefa al entrar: cómo va el día y cuánto hay en caja.
    // Si para saberlo hay que pasear por cuatro pestañas, no se mira nunca.
    if (ruta === "panel/hoy" && request.method === "GET") {
      const f = RE_FECHA.test(url.searchParams.get("fecha") || "") ? url.searchParams.get("fecha") : ahora().fecha;
      const mes = f.slice(0, 7);
      const [cam, cit, caja, mesT, pend, recs] = await Promise.all([
        cambiosDe(env, cfg, f, f),
        env.CITAS.prepare("SELECT servicio, inicio, estado, asistio FROM citas WHERE slug = ? AND fecha = ?").bind(cfg.slug, f).all(),
        // Caja del día: por método, para cuadrar el cajón antes de cerrar
        env.CITAS.prepare(
          `SELECT COALESCE(metodo,'tarjeta') AS metodo, COUNT(*) AS n, COALESCE(SUM(importe),0) AS total
           FROM pagos WHERE slug = ? AND estado = 'pagado' AND fecha = ? GROUP BY COALESCE(metodo,'tarjeta')`).bind(cfg.slug, f).all(),
        env.CITAS.prepare("SELECT COALESCE(SUM(importe),0) AS total, COUNT(*) AS n FROM pagos WHERE slug = ? AND estado = 'pagado' AND substr(fecha,1,7) = ?").bind(cfg.slug, mes).all(),
        env.CITAS.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(importe),0) AS total FROM pagos WHERE slug = ? AND estado = 'pendiente'").bind(cfg.slug).first(),
        recadosDe(env, cfg, yo).catch(() => []),
      ]);
      const citas = cit.results || [];
      const clases = !porSesiones(cfg) ? [] : sesionesDia(cfg, f).map((x) => {
        const sub = cam[`${f}|${x.inicio}|${x.s}`];
        const g = citas.filter((c) => c.inicio === x.inicio && c.servicio === x.s && c.estado === "ok");
        return { hora: x.h, inicio: x.inicio, nombre: x.nombre, sala: x.sala, servicio: x.s, plazas: x.cap,
                 apuntadas: g.length, libres: Math.max(0, x.cap - g.length),
                 da: sub && sub.prof ? sub.prof : x.prof || "", sustituida: !!(sub && sub.prof),
                 pasadas: g.filter((c) => c.asistio !== null).length };
      });
      const m = (mesT.results || [])[0] || { total: 0, n: 0 };
      return res({
        fecha: f, dia: legible(f), sesiones: porSesiones(cfg),
        clases,
        ocupacion: clases.length ? Math.round((clases.reduce((s, c) => s + c.apuntadas, 0) / clases.reduce((s, c) => s + c.plazas, 0)) * 100) : 0,
        reservas: citas.filter((c) => c.estado === "ok").length,
        anuladas: citas.filter((c) => c.estado === "cancelada").length,
        sinPasar: clases.filter((c) => c.apuntadas && !c.pasadas).length,
        caja: caja.results || [],
        cajaTotal: (caja.results || []).reduce((s, x) => s + x.total, 0),
        // El acumulado del mes es cuenta de resultados: recepción cuadra la caja del día
        mes: yo.rol === "panel" ? { nombre: mes, total: m.total, n: m.n } : null,
        pendientes: pend || { n: 0, total: 0 },
        recados: recs.filter((r) => !r.leido && dirigidoA(r, yo)).length,   // la misma cuenta que la pestaña Tablón
      });
    }

    // La lista de una clase en papel, para colgarla en la sala o llevarla a mano
    // cuando el móvil se queda sin batería a mitad de clase.
    if (ruta === "panel/lista" && request.method === "GET") {
      const f = RE_FECHA.test(url.searchParams.get("fecha") || "") ? url.searchParams.get("fecha") : ahora().fecha;
      const ini = +url.searchParams.get("inicio") || 0;
      const sv = String(url.searchParams.get("servicio") || "");
      const ses = porSesiones(cfg) ? sesionesDia(cfg, f).find((x) => x.inicio === ini && x.s === sv) : null;
      if (!ses) return res({ error: "Esa clase no está en el horario de ese día." }, 404);
      const [g, cam, nt] = await Promise.all([
        env.CITAS.prepare(
          `SELECT c.nombre, c.telefono, c.email, c.estado, a.nota_interna
           FROM citas c LEFT JOIN alumnos a ON a.id = c.alumno_id
           WHERE c.slug = ? AND c.fecha = ? AND c.inicio = ? AND c.servicio = ? AND c.estado = 'ok'
           ORDER BY c.nombre`).bind(cfg.slug, f, ini, sv).all(),
        cambiosDe(env, cfg, f, f),
        env.CITAS.prepare("SELECT email, telefono, nota_interna FROM alumnos WHERE slug = ? AND nota_interna IS NOT NULL AND nota_interna <> ''").bind(cfg.slug).all().catch(() => ({ results: [] })),
      ]);
      const xM = {}, xT = {};
      for (const a2 of nt.results || []) {
        if (a2.email) xM[String(a2.email).toLowerCase()] = a2.nota_interna;
        if (a2.telefono) xT[String(a2.telefono)] = a2.nota_interna;
      }
      const sub = cam[`${f}|${ini}|${sv}`];
      const gente = g.results || [];
      const filas = gente.map((c, i) => {
        const nota = c.nota_interna || xM[String(c.email || "").toLowerCase()] || xT[String(c.telefono || "")] || "";
        return `<tr><td class="num">${i + 1}</td><td>${esc(c.nombre)}${nota ? `<div class="av">⚠︎ ${esc(nota)}</div>` : ""}</td><td>${esc(c.telefono || "")}</td><td class="fir"></td></tr>`;
      }).join("");
      const libres = Math.max(0, ses.cap - gente.length);
      const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(ses.nombre)} · ${esc(f)}</title>
<style>
*{box-sizing:border-box}body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#111;margin:0;padding:24px;background:#fff}
h1{font-size:1.35rem;margin:0 0 .15rem}.sub{color:#555;margin:0 0 1rem}
table{width:100%;border-collapse:collapse;margin-top:.5rem}
th,td{border-bottom:1px solid #ddd;padding:.5rem .4rem;text-align:left;vertical-align:top}
th{background:#f3f3f3;font-size:.85rem;text-transform:uppercase;letter-spacing:.03em}
.num{width:2.2rem;color:#777}.fir{width:38%}.av{color:#8a5b00;font-size:.82rem;font-weight:600}
.pie{margin-top:1.2rem;color:#666;font-size:.85rem}
@media print{body{padding:0}.no{display:none}}
button{margin-bottom:1rem;padding:.55rem 1rem;border:1px solid #bbb;border-radius:9px;background:#fff;font:inherit;cursor:pointer}
</style></head><body>
<button class="no" onclick="window.print()" type="button">Imprimir</button>
<h1>${esc(ses.nombre)}</h1>
<p class="sub">${esc(legible(f))} · ${esc(ses.h)} · ${esc(ses.sala || "")} · ${esc(sub && sub.prof ? sub.prof : ses.prof || "")}${sub && sub.prof ? " (sustituye)" : ""}<br>
${gente.length} de ${ses.cap} plazas · ${libres} libre${libres === 1 ? "" : "s"}</p>
<table><thead><tr><th class="num">#</th><th>Alumna</th><th>Teléfono</th><th>Firma</th></tr></thead>
<tbody>${filas || '<tr><td colspan="4">Nadie apuntado todavía.</td></tr>'}</tbody></table>
<p class="pie">${esc(cfg.negocio?.nombre || "")} · lista sacada el ${esc(ahora().fecha)}. Los avisos marcados son información interna: no se deja a la vista de las alumnas.</p>
</body></html>`;
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }

    // Clases y horas de cada profesor en un mes, contando sustituciones:
    // es lo que hace falta para pagarles sin discutir.
    if (ruta === "panel/horas" && request.method === "GET") {
      const mes = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes") : ahora().fecha.slice(0, 7);
      if (!porSesiones(cfg)) return res({ mes, sesiones: false, profes: [] });
      const desde = mes + "-01", hasta = mes + "-31";
      const cam = await cambiosDe(env, cfg, desde, hasta);
      const hoy = ahora().fecha;
      const cuenta = {};
      // Dos cuentas a la vez: lo que ya ha dado (para pagar a mitad de mes) y
      // lo que le queda por dar según el cuadro (para prever el mes entero).
      const suma = (quien, min, sust, dado) => {
        if (!quien) return;
        const p = (cuenta[quien] = cuenta[quien] || { nombre: quien, clases: 0, min: 0, dadas: 0, minDadas: 0, sustituciones: 0 });
        p.clases++; p.min += min;
        if (dado) { p.dadas++; p.minDadas += min; }
        if (sust) p.sustituciones++;
      };
      for (let f = desde; f <= hasta && f.slice(0, 7) === mes; f = sumar(f, 1)) {
        for (const x of sesionesDia(cfg, f)) {
          const sub = cam[`${f}|${x.inicio}|${x.s}`];
          suma(sub && sub.prof ? sub.prof : x.prof, x.min, !!(sub && sub.prof), f <= hoy);
        }
      }
      const h1 = (m) => Math.round((m / 60) * 10) / 10;
      const profes = Object.values(cuenta).sort((a, b) => b.min - a.min)
        .map((p) => ({ ...p, horas: h1(p.min), horasDadas: h1(p.minDadas) }));
      return res({
        mes, sesiones: true, profes, hasta: mes === hoy.slice(0, 7) ? hoy : "",
        totalHoras: h1(profes.reduce((s, p) => s + p.min, 0)),
        totalHorasDadas: h1(profes.reduce((s, p) => s + p.minDadas, 0)),
      });
    }

    if (ruta === "panel/citas" && request.method === "GET") {
      const desde = RE_FECHA.test(url.searchParams.get("desde") || "") ? url.searchParams.get("desde") : ahora().fecha;
      const dias = Math.min(Math.max(+url.searchParams.get("dias") || 14, 1), 92);
      const hasta = sumar(desde, dias - 1);
      const [c, b, nt] = await env.CITAS.batch([
        env.CITAS.prepare(
          `SELECT c.id, c.codigo, c.servicio, c.servicio_n, c.fecha, c.inicio, c.fin, c.nombre, c.telefono, c.email, c.nota,
                  c.origen, c.estado, c.asistio, c.creada, c.alumno_id, a.nota_interna
           FROM citas c LEFT JOIN alumnos a ON a.id = c.alumno_id
           WHERE c.slug = ? AND c.fecha BETWEEN ? AND ? ORDER BY c.fecha, c.inicio`).bind(cfg.slug, desde, hasta),
        env.CITAS.prepare("SELECT id, fecha, inicio, fin, motivo FROM bloqueos WHERE slug = ? AND fecha BETWEEN ? AND ? ORDER BY fecha, inicio").bind(cfg.slug, desde, hasta),
        env.CITAS.prepare("SELECT email, telefono, nota_interna FROM alumnos WHERE slug = ? AND nota_interna IS NOT NULL AND nota_interna <> ''").bind(cfg.slug),
      ]);
      const xMail = {}, xTel = {};
      for (const a2 of nt.results || []) {
        if (a2.email) xMail[String(a2.email).toLowerCase()] = a2.nota_interna;
        if (a2.telefono) xTel[String(a2.telefono)] = a2.nota_interna;
      }
      const citasP = (c.results || []).map((x) => ({
        ...x,
        interna: x.nota_interna || xMail[String(x.email || "").toLowerCase()] || xTel[String(x.telefono || "")] || "",
      }));
      visto(env, cfg, yo.nombre, ctx);
      return res({ negocio: configPublica(cfg), yo: { nombre: yo.nombre, usuario: yo.usuario, rol: yo.rol }, desde, hasta, citas: citasP, bloqueos: b.results || [] });
    }
    /* ---- equipo: quién entra y con qué clave ---- */
    if (ruta === "panel/equipo" && request.method === "GET") {
      const l = await equipo(env, cfg);
      // Nombres que aparecen dando clase en el horario: sirve para avisar si una
      // profesora está escrita de otra forma y por eso no vería ninguna clase.
      const enHorario = new Set();
      if (porSesiones(cfg)) for (const d of Object.values(cfg.negocio.sesiones || {})) for (const s of d || []) if (s && s.prof) enHorario.add(s.prof);
      return res({
        yo: yo.nombre,
        horario: [...enHorario].sort((a, b2) => a.localeCompare(b2, "es")),
        gente: l.map((p) => ({ nombre: p.nombre, usuario: p.usuario, rol: p.rol, activo: p.activo, visto: p.visto, propia: p.propia }))
          .sort((a, b2) => {
            const peso = { panel: 0, recepcion: 1, profe: 2 };
            return peso[a.rol] - peso[b2.rol] || a.nombre.localeCompare(b2.nombre, "es");
          }),
      });
    }
    const ph1 = await atenderHorario(request, env, cfg, cfgArchivo, ruta, url, yo, null);
    if (ph1) return ph1;
    const pr1 = await atenderRecados(request, env, cfg, ruta, url, yo);
    if (pr1) return pr1;
    const ps1 = await atenderSustituciones(request, env, cfg, ruta, url, yo);
    if (ps1) return ps1;
    const pf1 = await atenderPanelFacturas(request, env, cfg, ruta, url);
    if (pf1) return pf1;
    const pa1 = await atenderPanelAlumnos(request, env, cfg, ruta, url);
    if (pa1) return pa1;
    const pe1 = await atenderPanelEventos(request, env, cfg, ruta, url);
    if (pe1) return pe1;
    if (request.method !== "POST") return res({ error: "Método no permitido" }, 405);
    let b; try { b = await cuerpo(request); } catch (e) { return res({ error: "JSON no válido" }, 400); }
    if (ruta.startsWith("panel/push/")) {
      if (!avanzado(cfg)) return res({ error: "Los avisos al móvil son del plan Avanzado." }, 403);
      if (ruta === "panel/push/alta") return (await altaMovil(env, cfg.slug, b.sub)) ? res({ ok: true }) : res({ error: "Suscripción no válida" }, 400);
      if (ruta === "panel/push/baja") { await bajaMovil(env, cfg.slug, b.endpoint); return res({ ok: true }); }
      if (ruta === "panel/push/prueba") { const n = await avisarMoviles(env, cfg.slug, "🔔 Aviso de prueba", "Así te llegarán las citas nuevas en este móvil."); return res({ ok: true, moviles: n }); }
    }
    if (ruta === "panel/equipo") {
      const nombre = limpiar(b.nombre, 40);
      if (nombre.length < 2) return res({ error: "Escribe el nombre de la persona." }, 400);
      const l = await equipo(env, cfg);
      const actual = l.find((p) => p.nombre === nombre);
      const jefes = l.filter((p) => p.activo && p.rol === "panel");
      const ultimoJefe = (n) => jefes.length <= 1 && jefes[0] && jefes[0].nombre === n;
      const hoy = new Date().toISOString();

      if (b.accion === "baja" || b.accion === "alta") {
        if (!actual) return res({ error: "Esa persona no existe." }, 404);
        if (b.accion === "baja") {
          if (nombre === yo.nombre) return res({ error: "No puedes quitarte el acceso a ti misma. Que lo haga otra persona del equipo." }, 400);
          if (ultimoJefe(nombre)) return res({ error: "Es la única persona que gestiona el estudio. Da de alta a otra antes de quitarle el acceso." }, 400);
        }
        const activo = b.accion === "alta" ? 1 : 0;
        await env.CITAS.prepare(
          `INSERT INTO accesos (slug, nombre, usuario, rol, hash, pass_salt, pass_iter, activo, creado)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) ON CONFLICT(slug, nombre) DO UPDATE SET activo = ?8`
        ).bind(cfg.slug, nombre, actual.usuario, actual.rol, actual.hash, actual.sal, actual.iter, activo, hoy).run();
        return res({ ok: true });
      }

      // Sin papel en la petición (solo se cambia la contraseña), se queda con el que tenía.
      const rol = ["panel", "recepcion", "profe"].includes(b.rol) ? b.rol : actual ? actual.rol : "profe";
      const clave = String(b.clave == null ? "" : b.clave).replace(/\s+/g, "");
      const usuario = normUsuario(b.usuario || (actual && actual.usuario) || nombre);
      if (usuario.length < 3) return res({ error: "El usuario tiene que tener al menos 3 letras o números, sin espacios." }, 400);
      const repe = l.find((p) => p.usuario === usuario && p.nombre !== nombre);
      if (repe) return res({ error: `Ese usuario ya lo tiene ${repe.nombre}. Pon otro.` }, 400);
      if (actual && rol !== actual.rol && actual.rol === "panel" && ultimoJefe(nombre)) {
        return res({ error: "Es la única persona que gestiona el estudio. Da de alta a otra antes de cambiarle el papel." }, 400);
      }
      if (!actual && !clave) return res({ error: "Ponle una contraseña para que pueda entrar." }, 400);
      if (clave && (clave.length < 8 || clave.length > 60)) return res({ error: "La contraseña tiene que tener entre 8 y 60 caracteres, sin espacios." }, 400);
      // Las contraseñas puestas aquí van cifradas con PBKDF2 y sal propia
      const sal = clave ? salNueva() : actual.sal;
      const hash = clave ? await hashClave(clave, sal, ITER_EQ) : actual.hash;
      const iter = clave ? ITER_EQ : actual.iter;
      await env.CITAS.prepare(
        `INSERT INTO accesos (slug, nombre, usuario, rol, hash, pass_salt, pass_iter, activo, creado)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)
         ON CONFLICT(slug, nombre) DO UPDATE SET usuario = ?3, rol = ?4, hash = ?5, pass_salt = ?6, pass_iter = ?7, activo = 1`
      ).bind(cfg.slug, nombre, usuario, rol, hash, sal, iter, hoy).run();
      return res({ ok: true, nuevo: !actual, usuario });
    }
    if (ruta === "panel/cita") { const r = await reservar(env, cfg, b, "panel", ctx); return res(r, r.estado); }
    if (ruta === "panel/cancelar") { const c = await cancelar(env, cfg, "id = ?", [+b.id || 0], ctx, "negocio"); return c ? res({ ok: true }) : res({ error: "Cita no encontrada" }, 404); }
    if (ruta === "panel/bloquear") {
      if (!RE_FECHA.test(b.fecha || "")) return res({ error: "Fecha no válida" }, 400);
      const ini = b.desde ? min2(b.desde) : 0, fin = b.hasta ? min2(b.hasta) : 1440;
      if (!(fin > ini)) return res({ error: "Horas no válidas" }, 400);
      const fechas = [b.fecha]; const hasta = RE_FECHA.test(b.fechaFin || "") ? b.fechaFin : b.fecha;
      for (let f = sumar(b.fecha, 1); f <= hasta && fechas.length < 92; f = sumar(f, 1)) fechas.push(f);
      await env.CITAS.batch(fechas.map((f) => env.CITAS.prepare("INSERT INTO bloqueos (slug, fecha, inicio, fin, motivo) VALUES (?, ?, ?, ?, ?)").bind(cfg.slug, f, ini, fin, limpiar(b.motivo, 80) || null)));
      return res({ ok: true, dias: fechas.length });
    }
    if (ruta === "panel/desbloquear") { await env.CITAS.prepare("DELETE FROM bloqueos WHERE slug = ? AND id = ?").bind(cfg.slug, +b.id || 0).run(); return res({ ok: true }); }
    const pr2 = await atenderRecados(request, env, cfg, ruta, url, yo);
    if (pr2) return pr2;
    const ps2 = await atenderSustituciones(request, env, cfg, ruta, url, yo);
    if (ps2) return ps2;
    const pf2 = await atenderPanelFacturas(request, env, cfg, ruta, url);
    if (pf2) return pf2;
    const pa2 = await atenderPanelAlumnos(request, env, cfg, ruta, url);
    if (pa2) return pa2;
    const pe2 = await atenderPanelEventos(request, env, cfg, ruta, url);
    if (pe2) return pe2;
    return res({ error: "No encontrado" }, 404);
  }

  /* ---- acceso de profesor: solo sus clases y su lista ---- */
  if (ruta.startsWith("profe/")) {
    if (!env.CITAS) return res({ error: "Agenda no configurada" }, 503);
    const o = request.headers.get("Origin");
    if (o && !mismoSitio(o, url, cfg)) return res({ error: "Origen no permitido" }, 403);
    const cabP = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const cp = cabP.indexOf(":");
    const profe = await quienEs(env, cfg, cp > 0 ? cabP.slice(0, cp) : "", cp > 0 ? cabP.slice(cp + 1) : "", ["profe"]);
    if (!profe) {
      if (!limitar(ip)) return res({ error: "Demasiados intentos. Espera unos minutos." }, 429);
      return res({ error: "Usuario o contraseña incorrectos" }, 401);
    }

    const prf = await atenderRecados(request, env, cfg, ruta, url, profe);
    if (prf) return prf;

    /* Cada profesora cambia su propia clave sin tener que pedírselo a nadie. */
    if (ruta === "profe/clave" && request.method === "POST") {
      let b; try { b = await cuerpo(request); } catch (e) { return res({ error: "JSON no válido" }, 400); }
      const nueva = String(b.nueva == null ? "" : b.nueva).replace(/\s+/g, "");
      if (nueva.length < 8 || nueva.length > 60) return res({ error: "La clave nueva tiene que tener entre 8 y 60 caracteres, sin espacios." }, 400);
      const sal = salNueva();
      await env.CITAS.prepare(
        `INSERT INTO accesos (slug, nombre, usuario, rol, hash, pass_salt, pass_iter, activo, creado)
         VALUES (?1, ?2, ?3, 'profe', ?4, ?5, ?6, 1, ?7)
         ON CONFLICT(slug, nombre) DO UPDATE SET usuario = ?3, hash = ?4, pass_salt = ?5, pass_iter = ?6, activo = 1`
      ).bind(cfg.slug, profe.nombre, profe.usuario, await hashClave(nueva, sal, ITER_EQ), sal, ITER_EQ, new Date().toISOString()).run();
      return res({ ok: true });
    }

    if (ruta === "profe/clases" && request.method === "GET") {
      const desde = RE_FECHA.test(url.searchParams.get("desde") || "") ? url.searchParams.get("desde") : ahora().fecha;
      const dias = Math.min(Math.max(+url.searchParams.get("dias") || 7, 1), 31);
      const hasta = sumar(desde, dias - 1);
      // La nota interna (una lesión, un embarazo, lo que haya que tener en cuenta) viaja
      // con la lista: es justo cuando el profesor la necesita.
      const [c1, cam, notas] = await Promise.all([
        env.CITAS.prepare(
          `SELECT c.id, c.codigo, c.servicio, c.servicio_n, c.fecha, c.inicio, c.nombre, c.telefono, c.email, c.nota,
                  c.estado, c.asistio, a.nota_interna
           FROM citas c LEFT JOIN alumnos a ON a.id = c.alumno_id
           WHERE c.slug = ? AND c.fecha BETWEEN ? AND ? ORDER BY c.fecha, c.inicio`).bind(cfg.slug, desde, hasta).all(),
        cambiosDe(env, cfg, desde, hasta),
        // Red de seguridad: si la reserva no quedó atada a la ficha, buscamos la nota
        // por email o teléfono. Una lesión no puede perderse por un dato sin casar.
        env.CITAS.prepare("SELECT email, telefono, nota_interna FROM alumnos WHERE slug = ? AND nota_interna IS NOT NULL AND nota_interna <> ''").bind(cfg.slug).all().catch(() => ({ results: [] })),
      ]);
      const citas = c1.results || [];
      const porMail = {}, porTel = {};
      for (const a2 of notas.results || []) {
        if (a2.email) porMail[String(a2.email).toLowerCase()] = a2.nota_interna;
        if (a2.telefono) porTel[String(a2.telefono)] = a2.nota_interna;
      }
      const interna = (c) => c.nota_interna || porMail[String(c.email || "").toLowerCase()] || porTel[String(c.telefono || "")] || "";
      const dias2 = [];
      for (let f = desde; f <= hasta; f = sumar(f, 1)) {
        // Con sustitución, la clase es de quien la da ESE día, no de quien figura en el cartel
        const todas = porSesiones(cfg) ? sesionesDia(cfg, f) : [];
        const mias = todas.filter((x) => {
          const sub = cam[`${f}|${x.inicio}|${x.s}`];
          return (sub && sub.prof ? sub.prof : x.prof) === profe.nombre;
        });
        if (!mias.length) continue;
        dias2.push({
          fecha: f, dia: legible(f),
          clases: mias.map((x) => {
            const g = citas.filter((c) => c.fecha === f && c.inicio === x.inicio && c.servicio === x.s);
            const sub = cam[`${f}|${x.inicio}|${x.s}`];
            return {
              hora: x.h, nombre: x.nombre, sala: x.sala, min: x.min, plazas: x.cap,
              cubre: sub && sub.prof === profe.nombre && x.prof !== profe.nombre ? x.prof : "",
              aviso: sub ? sub.nota || "" : "",
              apuntadas: g.filter((c) => c.estado === "ok").length,
              gente: g.map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono, nota: c.nota, interna: interna(c), estado: c.estado, asistio: c.asistio, codigo: c.codigo })),
            };
          }),
        });
      }
      visto(env, cfg, profe.nombre, ctx);
      const recs = await recadosDe(env, cfg, profe).catch(() => []);
      return res({ profe: profe.nombre, rol: profe.rol, negocio: cfg.negocio.nombre, color: cfg.color, desde, dias: dias2, sinLeer: recs.filter((r) => !r.leido).length });
    }

    if (ruta === "profe/asistencia" && request.method === "POST") {
      let b; try { b = await cuerpo(request); } catch (e) { return res({ error: "JSON no válido" }, 400); }
      const marca = b.vino === null || b.vino === undefined ? null : (b.vino ? 1 : 0);
      await env.CITAS.prepare("UPDATE citas SET asistio = ?3 WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug, marca).run();
      return res({ ok: true });
    }
    return res({ error: "No encontrado" }, 404);
  }

  /* ---- agente de voz ---- */
  if (ruta === "voz/huecos" || ruta === "voz/cita" || ruta === "voz/recado" || ruta === "voz/anular") {
    if (!env.VOZ_WEBHOOK_SECRET || !igual(request.headers.get("x-voz-clave") || "", env.VOZ_WEBHOOK_SECRET)) return res({ error: "No autorizado" }, 401); // sin secreto configurado, cerrado
    let b; try { b = await cuerpo(request, 2000); } catch (e) { return res({ error: "JSON no válido" }, 400); }
    // Recado: el cliente quiere hablar con una persona o el agente no puede resolverlo → aviso al negocio para devolver la llamada
    if (ruta === "voz/recado") {
      const nom = limpiar(b.nombre, 60), tel = soloTel(b.telefono), mot = limpiar(b.motivo, 400);
      if (!tel || tel.replace(/\D/g, "").length < 9) return res({ ok: false, mensaje: "Pide un teléfono de contacto para que el negocio pueda devolver la llamada." });
      const env1 = await correo(env, cfg, cfg.avisos && cfg.avisos.email, cfg.negocio.nombre, `📞 Devolver llamada · ${nom || tel}`,
        marco(cfg, "Llamada pendiente de devolver", `<p style="font-size:15px;line-height:1.7;background:#f6f6f8;padding:14px 16px;border-radius:10px;margin:14px 0"><b>${esc(nom || "Sin nombre")}</b> · <a href="tel:${esc(tel)}">${esc(tel)}</a><br>${esc(mot || "Quiere hablar con una persona.")}</p><p style="color:#555;font-size:14px">Lo ha anotado el asistente de voz.</p>`)).catch(() => false);
      const env2 = avanzado(cfg) ? await avisarMoviles(env, cfg.slug, `📞 Devolver llamada · ${nom || tel}`, mot || "Quiere hablar con una persona.").catch(() => 0) : 0;
      return res({ ok: true, mensaje: env1 || env2 ? "Recado entregado: el negocio devolverá la llamada lo antes posible." : "Recado anotado. Di que el negocio le llamará lo antes posible." });
    }
    if (!env.CITAS) return res({ ok: false, mensaje: "La agenda no está disponible. Ofrece tomar nota y que el negocio llame." });
    // Anular por teléfono: con el código de la cita, o con el teléfono y el día si solo hay una cita ese día
    if (ruta === "voz/anular") {
      const tel = soloTel(b.telefono).replace(/\D/g, "").slice(-9), cod = limpiar(b.codigo, 8).toUpperCase();
      if (tel.length < 9) return res({ ok: false, mensaje: "Pide el teléfono con el que se hizo la cita." });
      let c = null;
      if (cod.length >= 6) c = await cancelar(env, cfg, "codigo = ? AND substr(replace(telefono, '+', ''), -9) = ? AND fecha >= ?", [cod, tel, ahora().fecha], ctx, "cliente");
      else {
        const d = resolverDia(b.dia);
        if (!d) return res({ ok: false, mensaje: "Pregunta el día de la cita (o el código que se le dio al reservar)." });
        const f = d.toISOString().slice(0, 10);
        const n = await env.CITAS.prepare("SELECT COUNT(*) AS n FROM citas WHERE slug = ? AND estado = 'ok' AND fecha = ? AND substr(replace(telefono, '+', ''), -9) = ?").bind(cfg.slug, f, tel).first();
        if (n && n.n > 1) return res({ ok: false, mensaje: "Hay varias citas ese día con ese teléfono: pide la hora o el código, o toma recado." });
        if (f >= ahora().fecha) c = await cancelar(env, cfg, "fecha = ? AND substr(replace(telefono, '+', ''), -9) = ?", [f, tel], ctx, "cliente");
      }
      return res(c ? { ok: true, mensaje: `Cita del ${legible(c.fecha)} a las ${hhmm(c.inicio)} anulada. El negocio ya está avisado.` } : { ok: false, mensaje: "No encuentro una cita pendiente con esos datos. Ofrece tomar recado para el negocio." });
    }
    const d = resolverDia(b.dia); // Date (12:00 UTC) o null
    if (!d) return res({ ok: false, mensaje: "No he entendido el día. Pide un día concreto, por ejemplo «el martes» o «el 5 de noviembre»." });
    const fecha = d.toISOString().slice(0, 10);
    const t = limpiar(b.servicio, 60).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const serv = cfg.servicios.find((s) => t && (norm(s.nombre).includes(t) || t.includes(norm(s.nombre).split(" ")[0]) || s.id === t)) || cfg.servicios[0];
    if (ruta === "voz/huecos") {
      const libres = (await huecosDia(env, cfg, fecha, serv)).map(hhmm);
      if (!libres.length) {
        const sig = (await proximosDias(env, cfg, serv, 1))[0];
        return res({ ok: true, fecha, libres: [], mensaje: `El ${legible(fecha)} no hay huecos para ${serv.nombre}.${sig ? ` El primer día con huecos es el ${legible(sig.fecha)}.` : ""}` });
      }
      const man = libres.filter((h) => h < "14:00").slice(0, 3), tar = libres.filter((h) => h >= "14:00").slice(0, 3);
      return res({ ok: true, fecha, servicio: serv.nombre, manana: man, tarde: tar, mensaje: `Huecos para ${serv.nombre} el ${legible(fecha)}: por la mañana ${man.join(", ") || "ninguno"}; por la tarde ${tar.join(", ") || "ninguno"}.` });
    }
    const hora = limpiar(b.hora, 5);
    const r = await reservar(env, cfg, { servicio: serv.id, fecha, hora: /^\d:\d{2}$/.test(hora) ? "0" + hora : hora, nombre: b.nombre, telefono: b.telefono, nota: "Reservada por teléfono" }, "voz", ctx);
    return res({ ok: r.ok, codigo: r.codigo, mensaje: r.mensaje + (r.libres ? ` Libres: ${r.libres.slice(0, 5).join(", ")}.` : "") });
  }

  /* ---- públicas ---- */
  const cab = cors(request, cfg, url);
  if (cab === null) return res({ error: "Origen no permitido" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cab });
  const r = (d, e = 200) => res(d, e, cab);

  if (ruta === "config") return r(configPublica(cfg));
  if (!env.CITAS && ruta !== "chat") return r({ error: "Agenda no configurada" }, 503);

  // Cuadro de clases con plazas reales (modo sesiones): lo pinta la web del negocio
  if (ruta === "clases" && request.method === "GET") {
    if (!porSesiones(cfg)) return r({ error: "Este negocio no trabaja por clases" }, 400);
    const desde = RE_FECHA.test(url.searchParams.get("desde") || "") ? url.searchParams.get("desde") : ahora().fecha;
    const dias = Math.min(Math.max(+url.searchParams.get("dias") || 7, 1), 21);
    return r({ desde, dias: await clases(env, cfg, desde, dias) });
  }

  if (request.method === "GET" && (ruta === "dias" || ruta === "huecos")) {
    const serv = cfg.servicios.find((s) => s.id === url.searchParams.get("servicio"));
    if (!serv) return r({ error: "Servicio no válido" }, 400);
    if (ruta === "dias") return r({ dias: await proximosDias(env, cfg, serv, Math.min(Math.max(+url.searchParams.get("n") || 10, 1), 31)) });
    const fecha = url.searchParams.get("fecha") || "";
    if (!RE_FECHA.test(fecha)) return r({ error: "Fecha no válida" }, 400);
    return r({ fecha, huecos: (await huecosDia(env, cfg, fecha, serv)).map(hhmm) });
  }

  // Cuentas, bonos, pagos y lista de espera (alumnos.js). Devuelve null si no es cosa suya.
  const alu = await atenderAlumnos(request, env, ctx, cfg, ruta, url, cab, request.headers.get("Origin") || "");
  if (alu) return alu;

  // Talleres, retiros y encuentros con entrada (eventos.js)
  const ev = await atenderEventos(request, env, ctx, cfg, ruta, url, cab, await alumnaDeLaSesion(env, request, cfg.slug), crearPagoEvento);
  if (ev) return ev;

  if (request.method !== "POST") return r({ error: "Método no permitido" }, 405);
  if (!limitar(ip)) return r({ error: "Demasiadas peticiones. Inténtalo más tarde." }, 429);
  let b; try { b = await cuerpo(request, 6000); } catch (e) { return r({ error: "JSON no válido" }, 400); }

  if (ruta === "cita") {
    const al = await alumnaDeLaSesion(env, request, cfg.slug);
    if (al) {
      b.alumno_id = al.id;
      b.nombre = b.nombre || al.nombre;
      b.telefono = b.telefono || al.telefono;
      b.email = b.email || al.email;
    }
    const bono = await compruebaBono(env, cfg, al, b.servicio, b.fecha);
    if (!bono.ok) return r({ ok: false, estado: 409, mensaje: bono.bloqueo }, 409);
    const x = await reservar(env, cfg, b, al ? "cuenta" : "chat", ctx);
    if (x.ok && bono.aviso) x.aviso = bono.aviso;
    if (x.ok && bono.bono) x.bono = bono.bono.nombre;
    return r(x, x.estado);
  }
  if (ruta === "anular") {
    const cod = limpiar(b.codigo, 8).toUpperCase(), tel = soloTel(b.telefono).replace(/\D/g, "").slice(-9);
    if (cod.length < 6 || tel.length < 9) return r({ ok: false, mensaje: "Escribe el código de la cita y tu teléfono." }, 400);
    // Ventana de cancelación: pasado el plazo, la plaza ya no se libera sola
    const horas = ag(cfg).cancelarHoras || 0;
    if (horas) {
      const prev = await env.CITAS.prepare("SELECT fecha, inicio FROM citas WHERE slug = ? AND codigo = ? AND estado = 'ok' AND substr(replace(telefono, '+', ''), -9) = ?").bind(cfg.slug, cod, tel).first();
      if (prev && faltan(prev.fecha, prev.inicio) < horas * 60) {
        return r({ ok: false, mensaje: `Quedan menos de ${horas} ${horas === 1 ? "hora" : "horas"} para la clase y ya no se puede anular desde aquí. Llámanos o escríbenos y lo vemos.`, tarde: true }, 409);
      }
    }
    const c = await cancelar(env, cfg, "codigo = ? AND substr(replace(telefono, '+', ''), -9) = ? AND fecha >= ?", [cod, tel, ahora().fecha], ctx, "cliente");
    return c ? r({ ok: true, mensaje: `Cita del ${legible(c.fecha)} a las ${hhmm(c.inicio)} anulada.` }) : r({ ok: false, mensaje: "No encontramos una cita pendiente con ese código y teléfono." }, 404);
  }
  if (ruta === "chat") { const x = await responderAsistente(env, b, cfg); return r(x.datos, x.estado); }
  return r({ error: "No encontrado" }, 404);
}

/** Manifiesto de la app del panel (para instalarlo en el móvil; en iPhone es necesario para los avisos). */
export function manifiesto(slug) {
  const cfg = CLIENTES[slug];
  if (!cfg) return null;
  return new Response(JSON.stringify({
    name: `Citas · ${cfg.negocio.nombre}`, short_name: "Citas", lang: "es", start_url: `/panel/${slug}`, scope: "/panel/", display: "standalone",
    background_color: "#0a0a0a", theme_color: "#0f0f10", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
  }), { headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-store" } });
}
