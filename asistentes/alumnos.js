// /asistentes/alumnos.js — Cuentas de clientes, bonos, pagos con Stripe y lista de espera.
// Es la parte que convierte el asistente de citas en la gestión completa de un estudio
// (lo que negocios como los de yoga pagan hoy a plataformas tipo Momoyoga).
//
// Público (desde la web del negocio, con cookie propia de su dominio):
//   POST acceso            {email, nombre?}            manda un código de 6 cifras al correo
//   POST entrar            {email, codigo}             crea la sesión (cookie asid)
//   POST salir                                         cierra la sesión
//   GET  cuenta                                        alumna, bonos y sus clases
//   POST cuenta            {nombre, telefono, marketing}
//   GET  baja?t=TOKEN                                  baja de ofertas en un clic (enlace del correo)
//   GET  productos                                     bonos a la venta
//   POST pagar             {producto}                  crea el pago en Stripe → {url}
//   GET  pago?s=SESSION                                estado del pago al volver de Stripe
//   POST espera            {servicio, fecha, hora}     apuntarse a la lista de espera
//   POST stripe                                        webhook de Stripe (firma verificada)
//
// Panel del negocio (Bearer con la clave del panel):
//   GET  panel/alumnas?q=  · GET panel/alumna?id= · POST panel/bono · POST panel/bono/baja
//   GET  panel/pagos       · POST panel/pago (cobro a mano) · POST panel/asistencia
//   GET  panel/espera      · GET panel/exportar?que=alumnas|pagos|citas (CSV)

import { correo, marco, boton, esc } from "./correo.js";
import { confirmaEntrada } from "./eventos.js";
import { emitirFactura, facturaHTML } from "./facturas.js";
import { avisarMoviles } from "./push.js";
import { avanzado, onlineDeClase } from "./agenda.js";
import { conHorario } from "./horario.js";

const STRIPE = "https://api.stripe.com/v1";
const DIAS_SESION = 120;
const MIN_CODIGO = 15;          // minutos que vale el código de acceso
const MAX_INTENTOS = 6;         // por correo e IP en 15 minutos
const VENTANA_MIN = 15;

/* ---------------------------------------------------------------- utilidades */
const te = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (t) => hex(await crypto.subtle.digest("SHA-256", te.encode(String(t))));
const alAzar = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const limpiar = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const correoLimpio = (v) => String(v || "").trim().toLowerCase().slice(0, 254);
const RE_MAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const soloTel = (v) => String(v || "").replace(/[^\d+ ]/g, "").trim().slice(0, 16);
const euros = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

/* ---------------------------------------------------------------- contraseñas */
// PBKDF2-SHA256 con sal propia por persona. Workers admite 100.000 iteraciones como máximo.
const ITER = 100000;
const deHex = (h) => new Uint8Array((String(h).match(/.{2}/g) || []).map((x) => parseInt(x, 16)));
async function hashPass(pass, salHex, iter) {
  const k = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: deHex(salHex), iterations: iter }, k, 256);
  return hex(bits);
}
/** Mínimos razonables sin volverse insoportable: 8 caracteres y que no sea el propio correo. */
function passFloja(pass, email) {
  const p = String(pass || "");
  if (p.length < 8) return "La contraseña tiene que tener al menos 8 caracteres.";
  if (p.length > 200) return "La contraseña es demasiado larga.";
  if (p.toLowerCase() === String(email || "").toLowerCase()) return "La contraseña no puede ser tu correo.";
  if (/^(\d)\1+$/.test(p) || ["12345678", "123456789", "contrasena", "contraseña", "password"].includes(p.toLowerCase())) return "Esa contraseña es demasiado fácil de adivinar.";
  return "";
}
async function ponPass(env, alumnoId, pass) {
  const sal = alAzar(16);
  await env.CITAS.prepare("UPDATE alumnos SET pass_hash = ?2, pass_salt = ?3, pass_iter = ?4 WHERE id = ?1")
    .bind(alumnoId, await hashPass(pass, sal, ITER), sal, ITER).run();
}
async function passCorrecta(a, pass) {
  if (!a || !a.pass_hash || !a.pass_salt) return false;
  return igual(await hashPass(String(pass || ""), a.pass_salt, a.pass_iter || ITER), a.pass_hash);
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
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const min2 = (t) => { const [a, b] = String(t).split(":").map(Number); return a * 60 + b; };
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const legible = (f) => { const d = new Date(f + "T12:00:00Z"); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const sumarDias = (f, n) => new Date(Date.parse(f + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/** Lunes de la semana de esa fecha (para los bonos de «N clases por semana»). */
function lunes(f) {
  const d = new Date(f + "T12:00:00Z");
  return sumarDias(f, -((d.getUTCDay() + 6) % 7));
}

/* ---------------------------------------------------------------- cookie de la alumna */
const COOKIE = "asid";
function galleta(request, nombre) {
  const h = request.headers.get("cookie") || "";
  for (const p of h.split(";")) { const i = p.indexOf("="); if (i > 0 && p.slice(0, i).trim() === nombre) return p.slice(i + 1).trim(); }
  return "";
}
// Sin Domain: la cookie queda en el dominio del negocio, que es quien sirve /api (ver su worker.js)
const ponCookie = (v, segundos) => `${COOKIE}=${v}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${segundos}`;

export async function alumnaDeLaSesion(env, request, slug) {
  const t = galleta(request, COOKIE);
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  const a = await env.CITAS.prepare(
    `SELECT a.* FROM al_sesiones s JOIN alumnos a ON a.id = s.alumno_id
     WHERE s.token_hash = ?1 AND s.expira > datetime('now') AND a.slug = ?2`
  ).bind(await sha256(t), slug).first();
  return a || null;
}

/* ---------------------------------------------------------------- límite de intentos */
async function demasiados(env, claves) {
  const desde = Math.floor(Date.now() / 1000) - VENTANA_MIN * 60;
  for (const k of claves) {
    const r = await env.CITAS.prepare("SELECT COUNT(*) AS n FROM al_intentos WHERE k = ?1 AND ts > ?2").bind(k, desde).first();
    if (r && r.n >= MAX_INTENTOS) return true;
  }
  return false;
}
async function apunta(env, claves) {
  const t = Math.floor(Date.now() / 1000);
  await env.CITAS.batch(claves.map((k) => env.CITAS.prepare("INSERT INTO al_intentos (k, ts) VALUES (?1, ?2)").bind(k, t)));
  if (Math.random() < 0.05) await env.CITAS.prepare("DELETE FROM al_intentos WHERE ts < ?1").bind(t - 86400).run();
}

/* ---------------------------------------------------------------- bonos */
export const productos = (cfg) => cfg.productos || [];
const producto = (cfg, id) => productos(cfg).find((p) => p.id === id) || null;
const tipoDe = (cfg, servicioId) => { const s = (cfg.servicios || []).find((x) => x.id === servicioId); return (s && s.tipo) || ""; };

/** Fin de validez de un bono comprado hoy. */
function caduca(p, desde) {
  if (p.dias) return sumarDias(desde, p.dias - 1);
  const d = new Date(desde + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + (p.meses || 1));
  return sumarDias(d.toISOString().slice(0, 10), -1);
}

/** Bonos vigentes de una alumna, con los más útiles primero. */
async function bonosDe(env, slug, alumnoId) {
  const hoy = hoyMadrid();
  const { results } = await env.CITAS.prepare(
    "SELECT * FROM bonos WHERE slug = ?1 AND alumno_id = ?2 AND estado = 'activo' AND fin >= ?3 ORDER BY sem = 0 DESC, fin DESC"
  ).bind(slug, alumnoId, hoy).all();
  return results || [];
}

/**
 * ¿Puede esta alumna reservar esta clase con lo que tiene pagado?
 * Devuelve { ok, bono, aviso, bloqueo }. No bloquea si no hay bono: deja reservar
 * y avisa, porque muchas se apuntan antes de pasar por el estudio a pagar.
 */
export async function compruebaBono(env, cfg, alumno, servicioId, fecha) {
  if (!alumno) return { ok: true, aviso: "" };
  const tipo = tipoDe(cfg, servicioId);
  const bonos = await bonosDe(env, cfg.slug, alumno.id);
  const sirven = bonos.filter((b) => !b.tipos || b.tipos.split(",").includes(tipo));
  if (!sirven.length) {
    return { ok: true, bono: null, aviso: bonos.length
      ? "Tu bono no cubre esta actividad. Puedes venir como clase suelta o ampliarlo."
      : "Aún no tienes bono activo. Puedes pagarlo desde tu cuenta o en el estudio." };
  }
  // Con límite semanal: contar lo que ya tiene reservado esa semana cubierto por ese bono
  for (const b of sirven) {
    if (!b.sem) return { ok: true, bono: b, aviso: "" };
    const l = lunes(fecha), d = sumarDias(l, 6);
    const r = await env.CITAS.prepare(
      "SELECT COUNT(*) AS n FROM citas WHERE slug = ?1 AND alumno_id = ?2 AND estado = 'ok' AND fecha BETWEEN ?3 AND ?4"
    ).bind(cfg.slug, alumno.id, l, d).first();
    if ((r ? r.n : 0) < b.sem) return { ok: true, bono: b, aviso: "" };
  }
  const mejor = sirven[0];
  const cuantas = mejor.sem === 1 ? "su clase de esa semana reservada" : `sus ${mejor.sem} clases de esa semana reservadas`;
  return { ok: false, bono: mejor, bloqueo: `Tu ${mejor.nombre} ya tiene ${cuantas}. Anula esa clase o amplía el bono.` };
}

/* ---------------------------------------------------------------- Stripe */
/**
 * La cuenta de Stripe que cobra. Cada negocio puede tener la suya:
 * con cfg.stripe = "IOMFIT" se usan los secretos STRIPE_SK_IOMFIT y STRIPE_WHSEC_IOMFIT.
 * Sin eso, se usan STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET (los de la demo).
 */
export const claveStripe = (env, cfg) => (cfg.stripe && env["STRIPE_SK_" + cfg.stripe]) || env.STRIPE_SECRET_KEY || "";
export const firmaWebhook = (env, cfg) => (cfg.stripe && env["STRIPE_WHSEC_" + cfg.stripe]) || env.STRIPE_WEBHOOK_SECRET || "";

async function stripe(env, cfg, metodo, ruta, params, idem) {
  const cab = { Authorization: `Bearer ${claveStripe(env, cfg)}` };
  let body;
  if (params) { cab["Content-Type"] = "application/x-www-form-urlencoded"; body = params.toString(); }
  if (idem) cab["Idempotency-Key"] = idem;
  const r = await fetch(STRIPE + ruta, { method: metodo, headers: cab, body });
  const datos = await r.json().catch(() => ({}));
  return { ok: r.ok, datos };
}
async function firmaStripe(cuerpo, cabecera, secreto) {
  if (!cabecera || !secreto) return false;
  let t = null; const sigs = [];
  for (const p of cabecera.split(",")) {
    const i = p.indexOf("="); if (i < 0) continue;
    const k = p.slice(0, i), v = p.slice(i + 1);
    if (k === "t") t = v; if (k === "v1") sigs.push(v);
  }
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", te.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, te.encode(`${t}.${cuerpo}`));
  const esperado = hex(mac);
  return sigs.some((s) => igual(s, esperado));
}

/* ---------------------------------------------------------------- códigos promocionales */
/** Busca un código y comprueba que se puede usar con ese bono. */
export async function buscaPromo(env, cfg, codigo, prodId) {
  const c = limpiar(codigo, 32).toUpperCase().replace(/\s+/g, "");
  if (!c) return { ok: false };
  const p = await env.CITAS.prepare("SELECT * FROM promos WHERE slug = ?1 AND codigo = ?2 AND activo = 1").bind(cfg.slug, c).first();
  if (!p) return { ok: false, error: "Ese código no existe." };
  if (p.caduca && p.caduca < hoyMadrid()) return { ok: false, error: "Ese código ya ha caducado." };
  if (p.usos_max && p.usados >= p.usos_max) return { ok: false, error: "Ese código ya se ha agotado." };
  if (p.productos && prodId && !p.productos.split(",").includes(prodId)) return { ok: false, error: "Ese código no vale para este bono." };
  return { ok: true, promo: p };
}
/** Lo que queda a pagar con el descuento aplicado. */
const conDescuento = (precio, p) => p.tipo === "importe" ? Math.max(0, precio - p.valor) : Math.max(0, Math.round(precio * (100 - p.valor) / 100));
const textoPromo = (p) => p.tipo === "importe" ? `${euros(p.valor)} de descuento` : `${p.valor} % de descuento`;

/** ¿Le toca pagar matrícula? Solo la primera vez y según el bono. */
async function tocaMatricula(env, cfg, alumno, p) {
  const m = cfg.matricula;
  if (!m || !m.precio || (m.exentos || []).includes(p.id)) return false;
  const r = await env.CITAS.prepare("SELECT COUNT(*) AS n FROM pagos WHERE slug = ?1 AND alumno_id = ?2 AND estado = 'pagado'").bind(cfg.slug, alumno.id).first();
  return !(r && r.n);
}

/** Crea el pago en Stripe: suscripción si el bono es recurrente, pago único si no. */
async function crearPago(env, cfg, alumno, p, volverA, promo) {
  if (!claveStripe(env, cfg)) return { error: "Los pagos online todavía no están activados en este negocio." };
  const moneda = cfg.moneda || "eur";
  const params = new URLSearchParams();
  params.set("mode", p.recurrente ? "subscription" : "payment");
  params.set("success_url", `${volverA}?pago=ok&s={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${volverA}?pago=no`);
  params.set("customer_email", alumno.email);
  params.set("locale", "es");
  params.set("client_reference_id", `${cfg.slug}:${alumno.id}:${p.id}`);
  params.set("metadata[slug]", cfg.slug);
  params.set("metadata[alumno]", String(alumno.id));
  params.set("metadata[producto]", p.id);
  if (promo) params.set("metadata[promo]", promo.codigo);

  let i = 0;
  const linea = (nombre, importe, recurrente) => {
    params.set(`line_items[${i}][price_data][currency]`, moneda);
    params.set(`line_items[${i}][price_data][unit_amount]`, String(importe));
    params.set(`line_items[${i}][price_data][product_data][name]`, nombre.slice(0, 120));
    if (recurrente) params.set(`line_items[${i}][price_data][recurring][interval]`, "month");
    params.set(`line_items[${i}][quantity]`, "1");
    i++;
  };
  linea(`${p.nombre} · ${cfg.negocio.nombre}`, p.precio, p.recurrente);
  if (promo) {
    // Cupón de Stripe: en los bonos mensuales se aplica a los meses que diga el código
    const cp = new URLSearchParams();
    if (promo.tipo === "importe") { cp.set("amount_off", String(promo.valor)); cp.set("currency", moneda); }
    else cp.set("percent_off", String(promo.valor));
    if (p.recurrente) {
      if (promo.meses <= 0) cp.set("duration", "forever");
      else if (promo.meses === 1) cp.set("duration", "once");
      else { cp.set("duration", "repeating"); cp.set("duration_in_months", String(promo.meses)); }
    } else cp.set("duration", "once");
    cp.set("name", `${promo.codigo} · ${textoPromo(promo)}`);
    const cup = await stripe(env, cfg, "POST", "/coupons", cp);
    if (cup.ok && cup.datos.id) params.set("discounts[0][coupon]", cup.datos.id);
    else console.error("Stripe no aceptó el cupón:", JSON.stringify(cup.datos).slice(0, 200));
  }
  if (await tocaMatricula(env, cfg, alumno, p)) {
    if (p.recurrente) {
      // En una suscripción la matrícula va como cargo de alta, no como línea mensual
      params.set("subscription_data[metadata][matricula]", String(cfg.matricula.precio));
    } else linea(cfg.matricula.nombre, cfg.matricula.precio, false);
  }
  if (p.recurrente) params.set("subscription_data[metadata][slug]", cfg.slug);
  if (p.recurrente) params.set("subscription_data[metadata][alumno]", String(alumno.id));
  if (p.recurrente) params.set("subscription_data[metadata][producto]", p.id);

  const r = await stripe(env, cfg, "POST", "/checkout/sessions", params, `${cfg.slug}-${alumno.id}-${p.id}-${Date.now()}`);
  if (!r.ok || !r.datos.url) {
    console.error("Stripe rechazó el pago:", JSON.stringify(r.datos).slice(0, 300));
    return { error: "No se ha podido abrir el pago. Inténtalo otra vez o paga en el estudio." };
  }
  await env.CITAS.prepare(
    "INSERT OR IGNORE INTO pagos (slug, alumno_id, concepto, importe, estado, stripe_id) VALUES (?1, ?2, ?3, ?4, 'pendiente', ?5)"
  ).bind(cfg.slug, alumno.id, p.nombre, p.precio, r.datos.id).run();
  return { url: r.datos.url, id: r.datos.id };
}

/** Cobro de entradas de un taller o evento (una sola vez, sin suscripción). */
export async function crearPagoEvento(env, cfg, entrada, ev) {
  if (!claveStripe(env, cfg)) return { error: "Los pagos online todavía no están activados en este negocio." };
  const sitio = (cfg.negocio.web || "https://agencia-js.com/").replace(/\/?$/, "/");
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${sitio}mi-cuenta/?entrada=ok&s={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${sitio}actividades/?pago=no`);
  params.set("customer_email", entrada.email);
  params.set("locale", "es");
  params.set("metadata[slug]", cfg.slug);
  params.set("metadata[tipo]", "evento");
  params.set("metadata[entrada]", String(entrada.id));
  params.set("line_items[0][price_data][currency]", cfg.moneda || "eur");
  params.set("line_items[0][price_data][unit_amount]", String(ev.precio));
  params.set("line_items[0][price_data][product_data][name]", `${ev.nombre} · ${cfg.negocio.nombre}`.slice(0, 120));
  params.set("line_items[0][quantity]", String(entrada.cantidad));
  const r = await stripe(env, cfg, "POST", "/checkout/sessions", params, `ev-${cfg.slug}-${entrada.id}`);
  if (!r.ok || !r.datos.url) {
    console.error("Stripe rechazó la entrada:", JSON.stringify(r.datos).slice(0, 300));
    return { error: "No se ha podido abrir el pago. Inténtalo otra vez o escríbenos." };
  }
  return { url: r.datos.url, id: r.datos.id };
}

/** Da el bono por bueno tras el cobro. Es idempotente: el webhook puede llegar dos veces. */
async function activarBono(env, cfg, alumnoId, prodId, extra) {
  const p = producto(cfg, prodId);
  if (!p) return null;
  const hoy = hoyMadrid();
  if (extra && extra.sub) {
    const ya = await env.CITAS.prepare("SELECT id FROM bonos WHERE stripe_sub = ?1").bind(extra.sub).first();
    if (ya) {
      // Renovación mensual: se estira la validez en vez de duplicar el bono
      await env.CITAS.prepare("UPDATE bonos SET fin = ?2, estado = 'activo' WHERE id = ?1").bind(ya.id, caduca(p, hoy)).run();
      return ya.id;
    }
  }
  const r = await env.CITAS.prepare(
    `INSERT INTO bonos (slug, alumno_id, producto, nombre, estado, inicio, fin, sem, tipos, recurrente, stripe_sub, stripe_cust)
     VALUES (?1, ?2, ?3, ?4, 'activo', ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  ).bind(cfg.slug, alumnoId, p.id, p.nombre, hoy, caduca(p, hoy), p.sem || 0, (p.tipos || []).join(","),
    p.recurrente ? 1 : 0, (extra && extra.sub) || null, (extra && extra.cust) || null).run();
  return r.meta.last_row_id;
}

/* ---------------------------------------------------------------- correos */
function correoCodigo(cfg, codigo, nombre) {
  return marco(cfg, "Tu código de acceso",
    `<p style="font-size:15px;line-height:1.7">${nombre ? "Hola " + esc(nombre) + ", e" : "E"}ste es tu código para entrar en tu cuenta:</p>
     <p style="font-size:34px;letter-spacing:.3em;font-weight:800;text-align:center;background:#f6f6f8;border-radius:12px;padding:18px 0;margin:18px 0">${esc(codigo)}</p>
     <p style="font-size:14px;color:#555;line-height:1.6">Vale durante ${MIN_CODIGO} minutos y solo se puede usar una vez. Si no has sido tú, puedes ignorar este correo.</p>`);
}
function correoNueva(cfg, nombre, sitio) {
  return marco(cfg, "Bienvenida a " + cfg.negocio.nombre,
    `<p style="font-size:15px;line-height:1.7">${nombre ? "Hola " + esc(nombre) + ", t" : "T"}u cuenta ya está creada. Desde aquí puedes reservar tus clases, ver tu bono y anular si no puedes venir.</p>
     ${boton(cfg, sitio + "mi-cuenta/", "Ir a mi cuenta")}
     <p style="font-size:13px;color:#555">Si no has sido tú quien ha creado esta cuenta, avísanos respondiendo a este correo.</p>`);
}
function correoReset(cfg, nombre, enlace) {
  return marco(cfg, "Cambiar tu contraseña",
    `<p style="font-size:15px;line-height:1.7">${nombre ? "Hola " + esc(nombre) + ", h" : "H"}emos recibido una petición para cambiar la contraseña de tu cuenta.</p>
     ${boton(cfg, enlace, "Poner una contraseña nueva")}
     <p style="font-size:14px;color:#555;line-height:1.6">El enlace vale durante 1 hora y solo se puede usar una vez. Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.</p>`);
}
function correoBono(cfg, b, p) {
  return marco(cfg, "Bono activado",
    `<p style="font-size:15px;line-height:1.7">Ya está. Tu <b>${esc(p.nombre)}</b> está activo.</p>
     <p style="font-size:15px;line-height:1.7;background:#f6f6f8;padding:14px 16px;border-radius:10px">
      Válido hasta el <b>${esc(legible(b.fin))}</b>${p.sem ? `<br>${p.sem} ${p.sem === 1 ? "clase" : "clases"} por semana` : "<br>Clases sin límite"}
      ${p.recurrente ? "<br>Se renueva solo cada mes. Puedes darlo de baja cuando quieras desde tu cuenta." : ""}</p>
     ${boton(cfg, (cfg.negocio.web || "") + "reservar/", "Reservar mi primera clase")}`);
}
function correoEspera(cfg, c) {
  return marco(cfg, "Se ha liberado una plaza",
    `<p style="font-size:15px;line-height:1.7">Ha quedado un hueco en <b>${esc(c.nombre_clase)}</b> del <b>${esc(legible(c.fecha))} a las ${esc(hhmm(c.inicio))}</b>.</p>
     <p style="font-size:14px;color:#555">Quien antes entre, se la queda.</p>
     ${boton(cfg, (cfg.negocio.web || "") + "reservar/", "Coger la plaza")}`);
}

/* ---------------------------------------------------------------- rutas públicas */
export async function atenderAlumnos(request, env, ctx, cfg, ruta, url, cab, origen) {
  const r = (d, e = 200, c = {}) => res(d, e, { ...cab, ...c });
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const post = request.method === "POST";
  const cuerpo = async () => { try { return await request.json(); } catch (e) { return {}; } };
  // El sitio al que vuelve Stripe y al que apuntan los correos
  const sitio = (cfg.negocio.web || (cfg.dominios && cfg.dominios[0]) || "https://agencia-js.com/").replace(/\/?$/, "/");

  if (ruta === "productos" && request.method === "GET") {
    return r({
      productos: productos(cfg).map(({ id, nombre, precio, meses, dias, sem, tipos, recurrente, destacado, nota, nuevas, online }) =>
        ({ id, nombre, precio, meses, dias, sem, tipos, recurrente: !!recurrente, destacado: !!destacado, nota: nota || "", nuevas: !!nuevas, online: !!online })),
      matricula: cfg.matricula || null,
      pagos: !!claveStripe(env, cfg),
    });
  }

  /* ---- baja de ofertas en un clic (enlace del correo) ---- */
  if (ruta === "baja") {
    const t = String(url.searchParams.get("t") || "").slice(0, 64);
    if (/^[0-9a-f]{32,64}$/.test(t)) {
      await env.CITAS.prepare("UPDATE alumnos SET marketing = 0 WHERE slug = ?1 AND baja_token = ?2").bind(cfg.slug, t).run();
    }
    if (request.method === "POST") return r({ ok: true });  // baja en un clic de Gmail y Outlook
    return new Response(
      `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja confirmada</title>
       <body style="font-family:system-ui,sans-serif;background:#f4effa;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px">
       <div style="background:#fff;border-radius:18px;padding:32px;max-width:420px;text-align:center;box-shadow:0 20px 50px -30px rgba(0,0,0,.4)">
       <h1 style="font-size:22px;margin:0 0 10px;color:#3e2156">Listo, te hemos dado de baja</h1>
       <p style="color:#555;line-height:1.6">No volverás a recibir ofertas ni novedades de ${esc(cfg.negocio.nombre)}. Los avisos de tus clases reservadas sí te seguirán llegando.</p>
       <p><a href="${esc(sitio)}" style="color:${esc(cfg.color)};font-weight:700">Volver a la web</a></p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  /* ---- webhook de Stripe (sin cookie, firma verificada) ---- */
  if (ruta === "stripe" && post) {
    const crudo = await request.text();
    if (!(await firmaStripe(crudo, request.headers.get("stripe-signature"), firmaWebhook(env, cfg)))) return res({ error: "Firma no válida" }, 400);
    let ev; try { ev = JSON.parse(crudo); } catch (e) { return res({ error: "JSON no válido" }, 400); }
    ctx.waitUntil(procesaStripe(env, cfg, ev).catch((e) => console.error("stripe", e && e.message)));
    return res({ recibido: true });
  }

  /* ---- registro con contraseña ---- */
  if (ruta === "registro" && post) {
    const b = await cuerpo();
    const email = correoLimpio(b.email), nombre = limpiar(b.nombre, 60), pass = String(b.pass || "");
    if (!RE_MAIL.test(email)) return r({ error: "Escribe un correo correcto." }, 400);
    if (nombre.length < 2) return r({ error: "Escribe tu nombre." }, 400);
    const flojo = passFloja(pass, email);
    if (flojo) return r({ error: flojo }, 400);
    if (await demasiados(env, ["ip:" + ip])) return r({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    await apunta(env, ["ip:" + ip]);

    const ya = await env.CITAS.prepare("SELECT id, pass_hash FROM alumnos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, email).first();
    if (ya && ya.pass_hash) return r({ error: "Ya hay una cuenta con ese correo. Entra con tu contraseña o pide una nueva." }, 409);
    let id;
    if (ya) { id = ya.id; if (nombre) await env.CITAS.prepare("UPDATE alumnos SET nombre = ?2 WHERE id = ?1").bind(id, nombre).run(); }
    else {
      const ins = await env.CITAS.prepare("INSERT INTO alumnos (slug, email, nombre, baja_token) VALUES (?1, ?2, ?3, ?4)").bind(cfg.slug, email, nombre, alAzar(16)).run();
      id = ins.meta.last_row_id;
    }
    await ponPass(env, id, pass);
    if (b.marketing) await env.CITAS.prepare("UPDATE alumnos SET marketing = 1, marketing_fecha = datetime('now') WHERE id = ?1").bind(id).run();
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1").bind(id).first();
    const tok = alAzar(32);
    await env.CITAS.prepare("INSERT INTO al_sesiones (token_hash, alumno_id, expira) VALUES (?1, ?2, datetime('now', ?3))").bind(await sha256(tok), id, `+${DIAS_SESION} days`).run();
    ctx.waitUntil(correo(env, cfg, email, nombre, `Bienvenida a ${cfg.negocio.nombre}`, correoNueva(cfg, nombre, sitio)).catch(() => {}));
    return r(await miCuenta(env, cfg, a), 200, { "Set-Cookie": ponCookie(tok, DIAS_SESION * 86400) });
  }

  /* ---- he olvidado mi contraseña ---- */
  if (ruta === "olvidada" && post) {
    const b = await cuerpo();
    const email = correoLimpio(b.email);
    if (!RE_MAIL.test(email)) return r({ error: "Escribe un correo correcto." }, 400);
    if (await demasiados(env, ["ip:" + ip, "olv:" + email])) return r({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    await apunta(env, ["ip:" + ip, "olv:" + email]);
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, email).first();
    // Se responde siempre igual: así nadie puede averiguar qué correos tienen cuenta
    if (a) {
      const tok = alAzar(24);
      await env.CITAS.batch([
        env.CITAS.prepare("UPDATE al_codigos SET usado = 1 WHERE slug = ?1 AND email = ?2 AND tipo = 'reset' AND usado = 0").bind(cfg.slug, email),
        env.CITAS.prepare("INSERT INTO al_codigos (slug, email, codigo_hash, expira, tipo) VALUES (?1, ?2, ?3, datetime('now', '+60 minutes'), 'reset')").bind(cfg.slug, email, await sha256(tok)),
      ]);
      ctx.waitUntil(correo(env, cfg, email, a.nombre, `Cambiar tu contraseña · ${cfg.negocio.nombre}`,
        correoReset(cfg, a.nombre, `${sitio}mi-cuenta/?nueva=${tok}&m=${encodeURIComponent(email)}`)).catch(() => {}));
    }
    return r({ ok: true });
  }

  /* ---- poner la contraseña nueva con el enlace del correo ---- */
  if (ruta === "nueva-pass" && post) {
    const b = await cuerpo();
    const email = correoLimpio(b.email), tok = String(b.token || "").trim(), pass = String(b.pass || "");
    if (!RE_MAIL.test(email) || !/^[0-9a-f]{48}$/.test(tok)) return r({ error: "El enlace no es válido. Pide otro." }, 400);
    const flojo = passFloja(pass, email);
    if (flojo) return r({ error: flojo }, 400);
    if (await demasiados(env, ["ip:" + ip])) return r({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    await apunta(env, ["ip:" + ip]);
    const c = await env.CITAS.prepare(
      "SELECT id FROM al_codigos WHERE slug = ?1 AND email = ?2 AND tipo = 'reset' AND usado = 0 AND expira > datetime('now') AND codigo_hash = ?3 ORDER BY id DESC LIMIT 1"
    ).bind(cfg.slug, email, await sha256(tok)).first();
    if (!c) return r({ error: "Ese enlace ya se ha usado o ha caducado. Pide otro." }, 401);
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, email).first();
    if (!a) return r({ error: "No encontramos esa cuenta." }, 404);
    await ponPass(env, a.id, pass);
    // Cambiar la contraseña cierra las sesiones abiertas en otros aparatos
    const tok2 = alAzar(32);
    await env.CITAS.batch([
      env.CITAS.prepare("UPDATE al_codigos SET usado = 1 WHERE id = ?1").bind(c.id),
      env.CITAS.prepare("DELETE FROM al_sesiones WHERE alumno_id = ?1").bind(a.id),
      env.CITAS.prepare("INSERT INTO al_sesiones (token_hash, alumno_id, expira) VALUES (?1, ?2, datetime('now', ?3))").bind(await sha256(tok2), a.id, `+${DIAS_SESION} days`),
    ]);
    const a2 = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1").bind(a.id).first();
    return r(await miCuenta(env, cfg, a2), 200, { "Set-Cookie": ponCookie(tok2, DIAS_SESION * 86400) });
  }

  /* ---- acceso: pedir código ---- */
  if (ruta === "acceso" && post) {
    const b = await cuerpo();
    const email = correoLimpio(b.email), nombre = limpiar(b.nombre, 60);
    if (!RE_MAIL.test(email)) return r({ error: "Escribe un correo correcto." }, 400);
    if (await demasiados(env, ["ip:" + ip, "mail:" + email])) return r({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    await apunta(env, ["ip:" + ip, "mail:" + email]);

    let a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, email).first();
    if (!a) {
      await env.CITAS.prepare("INSERT INTO alumnos (slug, email, nombre, baja_token) VALUES (?1, ?2, ?3, ?4)").bind(cfg.slug, email, nombre, alAzar(16)).run();
      a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, email).first();
    } else if (nombre && !a.nombre) {
      await env.CITAS.prepare("UPDATE alumnos SET nombre = ?2 WHERE id = ?1").bind(a.id, nombre).run();
    }
    const codigo = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, "0");
    await env.CITAS.batch([
      env.CITAS.prepare("UPDATE al_codigos SET usado = 1 WHERE slug = ?1 AND email = ?2 AND tipo = 'acceso' AND usado = 0").bind(cfg.slug, email),
      env.CITAS.prepare("INSERT INTO al_codigos (slug, email, codigo_hash, expira, tipo) VALUES (?1, ?2, ?3, datetime('now', ?4), 'acceso')").bind(cfg.slug, email, await sha256(codigo), `+${MIN_CODIGO} minutes`),
    ]);
    const enviado = await correo(env, cfg, email, a.nombre || nombre, `Tu código: ${codigo}`, correoCodigo(cfg, codigo, a.nombre || nombre));
    if (!enviado) console.log(`[${cfg.slug}] código de acceso no enviado por falta de BREVO_API_KEY`);
    return r({ ok: true, enviado, nueva: !a.nombre });
  }

  /* ---- entrar: con contraseña o con el código del correo ---- */
  if (ruta === "entrar" && post) {
    const b = await cuerpo();
    const email = correoLimpio(b.email);
    const codigo = String(b.codigo || "").replace(/\D/g, "").slice(0, 6);
    const pass = String(b.pass || "");
    if (!RE_MAIL.test(email) || (!pass && codigo.length !== 6)) return r({ error: "Falta el correo, la contraseña o el código." }, 400);
    if (await demasiados(env, ["ip:" + ip, "cod:" + email])) return r({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    await apunta(env, ["ip:" + ip, "cod:" + email]);

    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, email).first();
    let usado = 0;
    if (pass) {
      if (!a || !a.pass_hash) return r({ error: "Esa cuenta no tiene contraseña. Entra con el código que te mandamos al correo.", sinPass: true }, 401);
      if (!(await passCorrecta(a, pass))) return r({ error: "El correo o la contraseña no son correctos." }, 401);
    } else {
      const c = await env.CITAS.prepare(
        "SELECT id FROM al_codigos WHERE slug = ?1 AND email = ?2 AND tipo = 'acceso' AND usado = 0 AND expira > datetime('now') AND codigo_hash = ?3 ORDER BY id DESC LIMIT 1"
      ).bind(cfg.slug, email, await sha256(codigo)).first();
      if (!c || !a) return r({ error: "El código no es correcto o ha caducado. Pide uno nuevo." }, 401);
      usado = c.id;
    }
    const tok = alAzar(32);
    const ops = [
      env.CITAS.prepare("INSERT INTO al_sesiones (token_hash, alumno_id, expira) VALUES (?1, ?2, datetime('now', ?3))").bind(await sha256(tok), a.id, `+${DIAS_SESION} days`),
      env.CITAS.prepare("UPDATE alumnos SET visto = datetime('now') WHERE id = ?1").bind(a.id),
    ];
    if (usado) ops.unshift(env.CITAS.prepare("UPDATE al_codigos SET usado = 1 WHERE id = ?1").bind(usado));
    await env.CITAS.batch(ops);
    return r(await miCuenta(env, cfg, a), 200, { "Set-Cookie": ponCookie(tok, DIAS_SESION * 86400) });
  }

  if (ruta === "salir" && post) {
    const t = galleta(request, COOKIE);
    if (/^[0-9a-f]{64}$/.test(t)) await env.CITAS.prepare("DELETE FROM al_sesiones WHERE token_hash = ?1").bind(await sha256(t)).run();
    return r({ ok: true }, 200, { "Set-Cookie": ponCookie("", 0) });
  }

  /* ---- a partir de aquí hace falta estar dentro ---- */
  const alumna = await alumnaDeLaSesion(env, request, cfg.slug);

  if (ruta === "cuenta" && request.method === "GET") {
    if (!alumna) return r({ dentro: false });
    return r(await miCuenta(env, cfg, alumna));
  }
  if (ruta === "cuenta" && post) {
    if (!alumna) return r({ error: "Entra en tu cuenta." }, 401);
    const b = await cuerpo();
    const nombre = limpiar(b.nombre, 60), tel = soloTel(b.telefono);
    const marketing = b.marketing ? 1 : 0;
    await env.CITAS.prepare(
      `UPDATE alumnos SET nombre = ?2, telefono = ?3, marketing = ?4,
       marketing_fecha = CASE WHEN ?4 = 1 AND marketing = 0 THEN datetime('now') WHEN ?4 = 0 THEN NULL ELSE marketing_fecha END,
       baja_token = COALESCE(baja_token, ?5) WHERE id = ?1`
    ).bind(alumna.id, nombre || alumna.nombre, tel, marketing, alAzar(16)).run();
    // Cambiar la contraseña (o ponerla por primera vez si entró con código)
    if (b.pass) {
      const flojo = passFloja(b.pass, alumna.email);
      if (flojo) return r({ error: flojo }, 400);
      if (alumna.pass_hash && !(await passCorrecta(alumna, b.passActual))) return r({ error: "La contraseña actual no es correcta." }, 401);
      await ponPass(env, alumna.id, b.pass);
    }
    const a2 = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1").bind(alumna.id).first();
    return r(await miCuenta(env, cfg, a2));
  }

  if (ruta === "promo" && post) {
    const b = await cuerpo();
    const p = producto(cfg, String(b.producto || ""));
    const x = await buscaPromo(env, cfg, b.codigo, p ? p.id : "");
    if (!x.ok) return r({ ok: false, error: x.error || "Ese código no es válido." }, 200);
    return r({ ok: true, codigo: x.promo.codigo, texto: textoPromo(x.promo),
      precio: p ? conDescuento(p.precio, x.promo) : null,
      meses: x.promo.meses });
  }

  if (ruta === "pagar" && post) {
    if (!alumna) return r({ error: "Entra en tu cuenta para pagar." }, 401);
    const b = await cuerpo();
    const p = producto(cfg, String(b.producto || ""));
    if (!p) return r({ error: "Ese bono no existe." }, 400);
    if (!p.precio) {   // la clase de prueba no se cobra: se activa directamente
      const id = await activarBono(env, cfg, alumna.id, p.id, null);
      return r({ ok: true, gratis: true, bono: id });
    }
    let promo = null;
    if (b.codigo) {
      const x = await buscaPromo(env, cfg, b.codigo, p.id);
      if (!x.ok) return r({ error: x.error || "Ese código no es válido." }, 400);
      promo = x.promo;
    }
    const x = await crearPago(env, cfg, alumna, p, sitio + "mi-cuenta/", promo);
    return x.error ? r({ error: x.error }, 400) : r(x);
  }

  if (ruta === "pago" && request.method === "GET") {
    const sid = String(url.searchParams.get("s") || "").slice(0, 100);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return r({ error: "Pago no válido" }, 400);
    const p = await env.CITAS.prepare("SELECT estado, concepto, importe FROM pagos WHERE stripe_id = ?1 AND slug = ?2").bind(sid, cfg.slug).first();
    if (p && p.estado === "pagado") return r({ estado: "pagado", concepto: p.concepto, importe: p.importe });
    // Aún no ha llegado el webhook: se pregunta a Stripe directamente
    if (claveStripe(env, cfg)) {
      const s = await stripe(env, cfg, "GET", `/checkout/sessions/${sid}`, null);
      if (s.ok && s.datos.payment_status === "paid") {
        await aplicaPago(env, cfg, s.datos);
        return r({ estado: "pagado", concepto: p ? p.concepto : "", importe: s.datos.amount_total || 0 });
      }
    }
    return r({ estado: p ? p.estado : "pendiente" });
  }

  if (ruta === "factura" && request.method === "GET") {
    if (!alumna) return r({ error: "Entra en tu cuenta." }, 401);
    const id = +url.searchParams.get("id") || 0;
    const p = await env.CITAS.prepare("SELECT * FROM pagos WHERE id = ?1 AND slug = ?2 AND alumno_id = ?3 AND estado = 'pagado'").bind(id, cfg.slug, alumna.id).first();
    if (!p) return r({ error: "Factura no encontrada." }, 404);
    if (!p.numero) p.numero = await emitirFactura(env, cfg, { id: p.id });
    return new Response(facturaHTML(cfg, p, alumna), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  if (ruta === "bono/baja" && post) {
    if (!alumna) return r({ error: "Entra en tu cuenta." }, 401);
    const b = await cuerpo();
    const bono = await env.CITAS.prepare("SELECT * FROM bonos WHERE id = ?1 AND slug = ?2 AND alumno_id = ?3").bind(+b.id || 0, cfg.slug, alumna.id).first();
    if (!bono) return r({ error: "No encontramos ese bono." }, 404);
    if (bono.stripe_sub && claveStripe(env, cfg)) {
      const pr = new URLSearchParams(); pr.set("cancel_at_period_end", "true");
      await stripe(env, cfg, "POST", `/subscriptions/${bono.stripe_sub}`, pr);
    }
    await env.CITAS.prepare("UPDATE bonos SET recurrente = 0 WHERE id = ?1").bind(bono.id).run();
    return r({ ok: true, mensaje: `Tu bono no se renovará. Puedes seguir viniendo hasta el ${legible(bono.fin)}.` });
  }

  /* ---- lista de espera ---- */
  if (ruta === "espera" && post) {
    const b = await cuerpo();
    const serv = (cfg.servicios || []).find((s) => s.id === b.servicio);
    const fecha = String(b.fecha || ""), hora = String(b.hora || "");
    if (!serv || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{1,2}:\d{2}$/.test(hora)) return r({ error: "Clase no válida." }, 400);
    const email = alumna ? alumna.email : correoLimpio(b.email);
    const nombre = limpiar(alumna ? alumna.nombre : b.nombre, 60);
    if (!RE_MAIL.test(email)) return r({ error: "Escribe un correo para avisarte." }, 400);
    const ya = await env.CITAS.prepare("SELECT id FROM espera WHERE slug = ?1 AND fecha = ?2 AND inicio = ?3 AND servicio = ?4 AND email = ?5 AND avisado = 0")
      .bind(cfg.slug, fecha, min2(hora), serv.id, email).first();
    if (ya) return r({ ok: true, mensaje: "Ya estás en la lista de espera de esa clase." });
    await env.CITAS.prepare("INSERT INTO espera (slug, alumno_id, servicio, fecha, inicio, nombre, email, telefono) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)")
      .bind(cfg.slug, alumna ? alumna.id : null, serv.id, fecha, min2(hora), nombre, email, soloTel(alumna ? alumna.telefono : b.telefono)).run();
    const n = await env.CITAS.prepare("SELECT COUNT(*) AS n FROM espera WHERE slug = ?1 AND fecha = ?2 AND inicio = ?3 AND servicio = ?4 AND avisado = 0")
      .bind(cfg.slug, fecha, min2(hora), serv.id).first();
    return r({ ok: true, puesto: n ? n.n : 1, mensaje: `Estás en la lista de espera. Si alguien anula te avisamos por correo.` });
  }

  return null;   // no es una ruta de alumnos
}

/* ---------------------------------------------------------------- mi cuenta */
async function miCuenta(env, cfg, a) {
  const hoy = hoyMadrid();
  const [bonos, proximas, pasadas, pagos] = await Promise.all([
    bonosDe(env, cfg.slug, a.id),
    env.CITAS.prepare("SELECT codigo, servicio, servicio_n, fecha, inicio, fin FROM citas WHERE slug = ?1 AND alumno_id = ?2 AND estado = 'ok' AND fecha >= ?3 ORDER BY fecha, inicio LIMIT 30").bind(cfg.slug, a.id, hoy).all(),
    env.CITAS.prepare("SELECT servicio_n, fecha, inicio, asistio FROM citas WHERE slug = ?1 AND alumno_id = ?2 AND fecha < ?3 ORDER BY fecha DESC, inicio DESC LIMIT 12").bind(cfg.slug, a.id, hoy).all(),
    env.CITAS.prepare("SELECT concepto, importe, estado, fecha FROM pagos WHERE slug = ?1 AND alumno_id = ?2 AND estado = 'pagado' ORDER BY id DESC LIMIT 12").bind(cfg.slug, a.id).all(),
  ]);
  const sem = lunes(hoy);
  const usadas = await env.CITAS.prepare("SELECT COUNT(*) AS n FROM citas WHERE slug = ?1 AND alumno_id = ?2 AND estado = 'ok' AND fecha BETWEEN ?3 AND ?4")
    .bind(cfg.slug, a.id, sem, sumarDias(sem, 6)).first();
  // El cuadro de clases, para poder darle el enlace de sus clases online
  const cfgH = await conHorario(env, cfg).catch(() => cfg);
  return {
    dentro: true,
    alumna: { id: a.id, email: a.email, nombre: a.nombre, telefono: a.telefono, marketing: !!a.marketing, pass: !!a.pass_hash },
    bonos: bonos.map((b) => ({ id: b.id, nombre: b.nombre, fin: b.fin, finTexto: legible(b.fin), sem: b.sem, recurrente: !!(b.recurrente && b.stripe_sub), tipos: b.tipos ? b.tipos.split(",") : [] })),
    semana: { usadas: usadas ? usadas.n : 0, desde: sem },
    proximas: (proximas.results || []).map((c) => ({ ...c, hora: hhmm(c.inicio), dia: legible(c.fecha), ...onlineDeClase(cfgH, c.fecha, c.inicio, c.servicio) })),
    pasadas: (pasadas.results || []).map((c) => ({ ...c, hora: hhmm(c.inicio), dia: legible(c.fecha) })),
    pagos: (pagos.results || []).map((p) => ({ ...p, texto: euros(p.importe) })),
  };
}

/* ---------------------------------------------------------------- Stripe: eventos */
/** La suscripción de una factura, mire donde mire la versión de la API de Stripe. */
function subDeFactura(f) {
  if (!f) return null;
  if (f.subscription) return typeof f.subscription === "string" ? f.subscription : f.subscription.id;
  const p = f.parent && f.parent.subscription_details;
  if (p && p.subscription) return typeof p.subscription === "string" ? p.subscription : p.subscription.id;
  const l = f.lines && f.lines.data && f.lines.data[0];
  const d = l && l.parent && l.parent.subscription_item_details;
  if (d && d.subscription) return d.subscription;
  return null;
}

async function procesaStripe(env, cfg, ev) {
  const t = ev.type;
  if (t === "checkout.session.completed" || t === "checkout.session.async_payment_succeeded") return aplicaPago(env, cfg, ev.data.object);
  if (t === "invoice.paid" || t === "invoice.payment_succeeded") {
    // Renovación mensual de una suscripción: se estira el bono
    const sub = subDeFactura(ev.data.object);
    if (!sub) return;
    const b = await env.CITAS.prepare("SELECT * FROM bonos WHERE stripe_sub = ?1").bind(sub).first();
    if (!b) return;
    const p = producto(cfg, b.producto);
    await env.CITAS.prepare("UPDATE bonos SET fin = ?2, estado = 'activo' WHERE id = ?1").bind(b.id, caduca(p || { meses: 1 }, hoyMadrid())).run();
    await env.CITAS.prepare("INSERT OR IGNORE INTO pagos (slug, alumno_id, bono_id, concepto, importe, estado, stripe_id) VALUES (?1,?2,?3,?4,?5,'pagado',?6)")
      .bind(b.slug, b.alumno_id, b.id, b.nombre + " (renovación)", ev.data.object.amount_paid || 0, ev.data.object.id).run();
    return;
  }
  if (t === "invoice.payment_failed") {
    const sub = subDeFactura(ev.data.object);
    if (sub) await env.CITAS.prepare("UPDATE bonos SET estado = 'impago' WHERE stripe_sub = ?1").bind(sub).run();
    return;
  }
  if (t === "customer.subscription.deleted") {
    await env.CITAS.prepare("UPDATE bonos SET recurrente = 0 WHERE stripe_sub = ?1").bind(ev.data.object.id).run();
  }
}

/** Marca el pago y activa el bono. Idempotente. */
async function aplicaPago(env, cfg, s) {
  const md = s.metadata || {};
  if (md.slug && md.slug !== cfg.slug) return;
  if (md.tipo === "evento") return confirmaEntrada(env, cfg, s);
  const alumnoId = +md.alumno || 0, prodId = md.producto || "";
  if (!alumnoId || !prodId) return;
  const r = await env.CITAS.prepare("UPDATE pagos SET estado = 'pagado', importe = ?2 WHERE stripe_id = ?1 AND estado != 'pagado'")
    .bind(s.id, s.amount_total || 0).run();
  if (!r.meta.changes) {
    const existe = await env.CITAS.prepare("SELECT id FROM pagos WHERE stripe_id = ?1").bind(s.id).first();
    if (existe) return;   // ya estaba aplicado
    await env.CITAS.prepare("INSERT INTO pagos (slug, alumno_id, concepto, importe, estado, stripe_id) VALUES (?1,?2,?3,?4,'pagado',?5)")
      .bind(cfg.slug, alumnoId, (producto(cfg, prodId) || {}).nombre || prodId, s.amount_total || 0, s.id).run();
  }
  const sub = typeof s.subscription === "string" ? s.subscription : (s.subscription && s.subscription.id) || null;
  const cust = typeof s.customer === "string" ? s.customer : (s.customer && s.customer.id) || null;
  if (md.promo) {
    await env.CITAS.prepare("UPDATE promos SET usados = usados + 1 WHERE slug = ?1 AND codigo = ?2").bind(cfg.slug, md.promo).run();
    await env.CITAS.prepare("UPDATE pagos SET promo = ?2 WHERE stripe_id = ?1").bind(s.id, md.promo).run();
  }
  await emitirFactura(env, cfg, { stripeId: s.id });
  const bonoId = await activarBono(env, cfg, alumnoId, prodId, { sub: sub, cust: cust });
  if (bonoId) await env.CITAS.prepare("UPDATE pagos SET bono_id = ?2 WHERE stripe_id = ?1").bind(s.id, bonoId).run();
  const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1").bind(alumnoId).first();
  const b = await env.CITAS.prepare("SELECT * FROM bonos WHERE id = ?1").bind(bonoId).first();
  if (a && b) await correo(env, cfg, a.email, a.nombre, `Bono activado · ${cfg.negocio.nombre}`, correoBono(cfg, b, producto(cfg, prodId) || {}));
  // Y avisamos al negocio: una venta es justo lo que hay que saber en el momento.
  // Hasta ahora solo se enteraba la alumna y el dinero entraba en silencio.
  if (a && b) await avisarVenta(env, cfg, a, b, s.amount_total || 0, !!sub);
}

/** Aviso al estudio de que alguien ha comprado: correo y, en plan Avanzado, al móvil. */
async function avisarVenta(env, cfg, alumna, bono, importe, recurrente) {
  const to = cfg.avisos && cfg.avisos.email;
  const eur = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
  const titulo = `💳 ${eur(importe)} · ${bono.nombre}`;
  const quien = alumna.nombre || alumna.email;
  if (to) {
    await correo(env, cfg, to, cfg.negocio.nombre, `${titulo} · ${quien}`,
      marco(cfg, "Nueva compra", `
        <p style="font-size:15px;line-height:1.7"><b>${esc(quien)}</b> acaba de comprar <b>${esc(bono.nombre)}</b> por <b>${esc(eur(importe))}</b>${recurrente ? " (se renueva sola cada mes)" : ""}.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
         <tr><td style="padding:6px 0;color:#555">Alumna</td><td style="padding:6px 0;text-align:right"><b>${esc(quien)}</b></td></tr>
         <tr><td style="padding:6px 0;color:#555">Correo</td><td style="padding:6px 0;text-align:right">${esc(alumna.email || "")}</td></tr>
         ${alumna.telefono ? `<tr><td style="padding:6px 0;color:#555">Teléfono</td><td style="padding:6px 0;text-align:right">${esc(alumna.telefono)}</td></tr>` : ""}
         <tr><td style="padding:6px 0;color:#555">Válido hasta</td><td style="padding:6px 0;text-align:right">${esc(bono.fin || "")}</td></tr>
        </table>
        <p style="font-size:13px;color:#555">La factura ya está emitida y en el libro del mes.</p>
        ${boton(cfg, "Ver en el panel", `https://agencia-js.com/panel/${cfg.slug}`)}`)).catch(() => {});
  }
  if (avanzado(cfg)) {
    await avisarMoviles(env, cfg.slug, titulo, `${quien}${recurrente ? " · cuota mensual" : ""}. Factura emitida.`).catch(() => {});
  }
}

/* ---------------------------------------------------------------- lista de espera: avisar */
/** Cuando se libera una plaza, avisa por correo a quien esté esperando (por orden). */
export async function avisarEspera(env, cfg, cita) {
  if (!env.CITAS) return 0;
  const { results } = await env.CITAS.prepare(
    "SELECT * FROM espera WHERE slug = ?1 AND fecha = ?2 AND inicio = ?3 AND servicio = ?4 AND avisado = 0 ORDER BY id LIMIT 3"
  ).bind(cfg.slug, cita.fecha, cita.inicio, cita.servicio).all();
  let n = 0;
  for (const e of results || []) {
    const ok = await correo(env, cfg, e.email, e.nombre, `Hay plaza libre · ${cfg.negocio.nombre}`,
      correoEspera(cfg, { nombre_clase: cita.servicio_n, fecha: cita.fecha, inicio: cita.inicio }));
    await env.CITAS.prepare("UPDATE espera SET avisado = 1 WHERE id = ?1").bind(e.id).run();
    if (ok) n++;
  }
  return n;
}

/* ---------------------------------------------------------------- panel del negocio */
export async function atenderPanelAlumnos(request, env, cfg, ruta, url, apuntar) {
  const post = request.method === "POST";
  const cuerpo = async () => { try { return await request.json(); } catch (e) { return {}; } };

  if (ruta === "panel/alumnas" && request.method === "GET") {
    const q = limpiar(url.searchParams.get("q"), 60);
    const like = "%" + q.toLowerCase() + "%";
    const { results } = await env.CITAS.prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM citas c WHERE c.alumno_id = a.id AND c.estado = 'ok') AS clases,
              (SELECT nombre FROM bonos b WHERE b.alumno_id = a.id AND b.estado = 'activo' AND b.fin >= date('now') ORDER BY b.fin DESC LIMIT 1) AS bono,
              (SELECT fin FROM bonos b WHERE b.alumno_id = a.id AND b.estado = 'activo' AND b.fin >= date('now') ORDER BY b.fin DESC LIMIT 1) AS bono_fin
       FROM alumnos a WHERE a.slug = ?1 AND (?2 = '' OR lower(a.nombre) LIKE ?3 OR lower(a.email) LIKE ?3 OR a.telefono LIKE ?3)
       ORDER BY a.creado DESC LIMIT 300`
    ).bind(cfg.slug, q, like).all();
    const tot = await env.CITAS.prepare(
      `SELECT (SELECT COUNT(*) FROM alumnos WHERE slug = ?1) AS alumnas,
              (SELECT COUNT(*) FROM alumnos WHERE slug = ?1 AND marketing = 1) AS ofertas,
              (SELECT COUNT(*) FROM bonos WHERE slug = ?1 AND estado = 'activo' AND fin >= date('now')) AS bonos,
              (SELECT COALESCE(SUM(importe),0) FROM pagos WHERE slug = ?1 AND estado = 'pagado' AND fecha >= date('now','start of month')) AS mes`
    ).bind(cfg.slug).first();
    return res({ alumnas: results || [], totales: tot || {} });
  }

  if (ruta === "panel/alumna" && request.method === "GET") {
    const id = +url.searchParams.get("id") || 0;
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1 AND slug = ?2").bind(id, cfg.slug).first();
    if (!a) return res({ error: "No encontrada" }, 404);
    const [bonos, citas, pagos] = await Promise.all([
      env.CITAS.prepare("SELECT * FROM bonos WHERE slug = ?1 AND alumno_id = ?2 ORDER BY id DESC LIMIT 20").bind(cfg.slug, id).all(),
      env.CITAS.prepare("SELECT codigo, servicio_n, fecha, inicio, estado, asistio FROM citas WHERE slug = ?1 AND alumno_id = ?2 ORDER BY fecha DESC, inicio DESC LIMIT 40").bind(cfg.slug, id).all(),
      env.CITAS.prepare("SELECT id, concepto, importe, estado, metodo, fecha, numero, tipo FROM pagos WHERE slug = ?1 AND alumno_id = ?2 ORDER BY id DESC LIMIT 30").bind(cfg.slug, id).all(),
    ]);
    // Lo facturado de verdad a esta alumna: suma de sus facturas emitidas (las
    // rectificativas van en negativo, así que restan solas)
    const fac = await env.CITAS.prepare(
      "SELECT COALESCE(SUM(importe),0) AS total, COUNT(*) AS n FROM pagos WHERE slug = ?1 AND alumno_id = ?2 AND numero IS NOT NULL").bind(cfg.slug, id).first();
    return res({ alumna: a, bonos: bonos.results || [], citas: (citas.results || []).map((c) => ({ ...c, hora: hhmm(c.inicio) })), pagos: pagos.results || [], facturado: fac || { total: 0, n: 0 } });
  }

  // Quién necesita un toque esta semana: lo que decide si el mes cierra bien
  if (ruta === "panel/atencion" && request.method === "GET") {
    const hoy = hoyMadrid();
    const [cad, frias, sin] = await Promise.all([
      // Bonos que terminan en 10 días y NO se renuevan solos
      env.CITAS.prepare(
        `SELECT a.id, a.nombre, a.email, a.telefono, b.nombre AS bono, b.fin
         FROM bonos b JOIN alumnos a ON a.id = b.alumno_id
         WHERE b.slug = ?1 AND b.estado = 'activo' AND b.recurrente = 0 AND b.fin BETWEEN ?2 AND ?3
         ORDER BY b.fin LIMIT 50`).bind(cfg.slug, hoy, sumarDias(hoy, 10)).all(),
      // Con bono activo y sin pisar el estudio desde hace 21 días
      env.CITAS.prepare(
        `SELECT a.id, a.nombre, a.email, a.telefono,
                (SELECT MAX(fecha) FROM citas c WHERE c.alumno_id = a.id AND c.estado = 'ok' AND c.fecha <= ?2) AS ultima
         FROM alumnos a WHERE a.slug = ?1
           AND EXISTS (SELECT 1 FROM bonos b WHERE b.alumno_id = a.id AND b.estado = 'activo' AND b.fin >= ?2)
           AND NOT EXISTS (SELECT 1 FROM citas c2 WHERE c2.alumno_id = a.id AND c2.estado = 'ok' AND c2.fecha > ?2)
         LIMIT 50`).bind(cfg.slug, hoy).all(),
      // Han venido este mes pero no tienen bono: la venta más fácil que hay
      env.CITAS.prepare(
        `SELECT a.id, a.nombre, a.email, a.telefono, COUNT(c.id) AS clases
         FROM alumnos a JOIN citas c ON c.alumno_id = a.id AND c.estado = 'ok' AND c.fecha >= ?2
         WHERE a.slug = ?1 AND NOT EXISTS (SELECT 1 FROM bonos b WHERE b.alumno_id = a.id AND b.estado = 'activo' AND b.fin >= ?3)
         GROUP BY a.id ORDER BY clases DESC LIMIT 30`).bind(cfg.slug, sumarDias(hoy, -30), hoy).all(),
    ]);
    const corte = sumarDias(hoy, -21);
    return res({
      caducan: cad.results || [],
      frias: (frias.results || []).filter((a) => a.ultima && a.ultima <= corte),
      sinBono: sin.results || [],
    });
  }

  // Nota interna: lo que hay que tener en cuenta de esa alumna (una lesión, un
  // embarazo, una operación reciente). La ve el equipo al pasar lista, nunca ella.
  if (ruta === "panel/alumna/nota" && post) {
    const b = await cuerpo();
    await env.CITAS.prepare("UPDATE alumnos SET nota_interna = ?3 WHERE id = ?1 AND slug = ?2")
      .bind(+b.id || 0, cfg.slug, limpiar(b.nota, 300) || null).run();
    return res({ ok: true });
  }

  if (ruta === "panel/alumna/fiscal" && post) {
    const b = await cuerpo();
    await env.CITAS.prepare("UPDATE alumnos SET nif = ?3, direccion = ?4 WHERE id = ?1 AND slug = ?2")
      .bind(+b.id || 0, cfg.slug, limpiar(b.nif, 20) || null, limpiar(b.direccion, 120) || null).run();
    if (apuntar) await apuntar("alumna", `cambió los datos fiscales de la alumna nº ${+b.id || 0}`);
    return res({ ok: true });
  }

  if (ruta === "panel/bono" && post) {
    const b = await cuerpo();
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1 AND slug = ?2").bind(+b.alumno || 0, cfg.slug).first();
    const p = producto(cfg, String(b.producto || ""));
    if (!a || !p) return res({ error: "Alumna o bono no válidos" }, 400);
    const id = await activarBono(env, cfg, a.id, p.id, null);
    if (b.cobrar) {
      const r = await env.CITAS.prepare("INSERT INTO pagos (slug, alumno_id, bono_id, concepto, importe, estado, metodo) VALUES (?1,?2,?3,?4,?5,'pagado',?6)")
        .bind(cfg.slug, a.id, id, p.nombre, p.precio, limpiar(b.metodo, 20) || "efectivo").run();
      // La factura se emite en el acto: así el libro nunca se queda con cobros sueltos
      await emitirFactura(env, cfg, { id: r.meta.last_row_id });
    }
    if (apuntar) await apuntar("bono", `dio de alta «${p.nombre}» a ${a.nombre || a.email}${b.cobrar ? ` y lo cobró (${(p.precio / 100).toFixed(2)} €, ${limpiar(b.metodo, 20) || "efectivo"})` : " sin cobrar"}`);
    return res({ ok: true, bono: id });
  }

  if (ruta === "panel/bono/baja" && post) {
    const b = await cuerpo();
    const bono = await env.CITAS.prepare("SELECT * FROM bonos WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug).first();
    if (!bono) return res({ error: "No encontrado" }, 404);
    if (bono.stripe_sub && claveStripe(env, cfg)) await stripe(env, cfg, "DELETE", `/subscriptions/${bono.stripe_sub}`, null);
    await env.CITAS.prepare("UPDATE bonos SET estado = 'cancelado', recurrente = 0 WHERE id = ?1").bind(bono.id).run();
    if (apuntar) await apuntar("bono", `dio de baja el bono «${bono.nombre}» (nº ${bono.id})`);
    return res({ ok: true });
  }

  /* ---- lo que el estudio guarda de una alumna: dárselo y borrarlo ----
     Cualquiera puede pedir una copia de sus datos y que se le borren. Hasta
     ahora había que entrar en la base de datos a mano, que es como no poder
     hacerlo. Las facturas emitidas son la excepción: la ley obliga a
     guardarlas, así que se dice claro en vez de prometer un borrado que no
     sería verdad. */
  if (ruta === "panel/alumna/datos" && request.method === "GET") {
    const id = +url.searchParams.get("id") || 0;
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1 AND slug = ?2").bind(id, cfg.slug).first();
    if (!a) return res({ error: "No encontrada" }, 404);
    const [citas, bonos, pagos, espera] = await Promise.all([
      env.CITAS.prepare("SELECT codigo, servicio_n, fecha, inicio, estado, asistio, nota, origen, creada FROM citas WHERE slug=?1 AND alumno_id=?2 ORDER BY fecha").bind(cfg.slug, id).all(),
      env.CITAS.prepare("SELECT nombre, estado, inicio, fin, sem, tipos, recurrente FROM bonos WHERE slug=?1 AND alumno_id=?2 ORDER BY id").bind(cfg.slug, id).all(),
      env.CITAS.prepare("SELECT fecha, concepto, importe, estado, metodo, numero, tipo FROM pagos WHERE slug=?1 AND alumno_id=?2 ORDER BY id").bind(cfg.slug, id).all(),
      env.CITAS.prepare("SELECT servicio, fecha, inicio FROM espera WHERE slug=?1 AND alumno_id=?2").bind(cfg.slug, id).all(),
    ]);
    // Ni el hash de su contraseña ni el token de baja se entregan: no son datos
    // suyos, son cerrojos. Se quitan por nombre exacto y se comprueba al final.
    const { pass_hash, pass_salt, pass_iter, baja_token, ...ficha } = a;
    const doc = {
      estudio: cfg.negocio.nombre,
      sacado: new Date().toISOString(),
      aviso: "Copia de todo lo que el estudio guarda de esta persona. La contraseña no se incluye porque se guarda cifrada y no se puede leer.",
      ficha: Object.fromEntries(Object.entries(ficha).filter(([k]) => !/hash|salt|iter|token|pass/i.test(k))),
      clases: citas.results || [], bonos: bonos.results || [],
      pagos: (pagos.results || []).map((p) => ({ ...p, importe: (p.importe / 100).toFixed(2) + " €" })),
      listaDeEspera: espera.results || [],
    };
    return new Response(JSON.stringify(doc, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="datos-${(a.nombre || "alumna").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json"` },
    });
  }

  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  if (ruta === "panel/alumna/borrar" && post) {
    const b = await cuerpo();
    const id = +b.id || 0;
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1 AND slug = ?2").bind(id, cfg.slug).first();
    if (!a) return res({ error: "No encontrada" }, 404);
    const cuenta = async (t, extra = "") => {
      const r = await env.CITAS.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE slug = ?1 AND alumno_id = ?2 ${extra}`).bind(cfg.slug, id).first().catch(() => null);
      return r ? r.n : 0;
    };
    const [nc, nb, np, nf, ne] = await Promise.all([
      cuenta("citas"), cuenta("bonos"), cuenta("pagos", "AND numero IS NULL"),
      cuenta("pagos", "AND numero IS NOT NULL"), cuenta("espera"),
    ]);
    if (!b.seguro) {
      return res({
        confirmar: true,
        nombre: a.nombre || a.email,
        borra: { clases: nc, bonos: nb, cobros: np, espera: ne },
        guarda: nf,
        mensaje: `Se borra su ficha, sus datos de contacto, su contraseña, ${plural(nc, "clase", "clases")}, ${plural(nb, "bono", "bonos")}, ${plural(np, "cobro sin factura", "cobros sin factura")} y ${plural(ne, "apunte en lista de espera", "apuntes en lista de espera")}. ` +
          (nf ? `Sus ${nf === 1 ? "1 factura emitida se queda" : nf + " facturas emitidas se quedan"}: la ley obliga a guardarlas y llevan su nombre y su NIF tal como se emitieron. Dejan de estar enlazadas con la ficha.` : "No tiene ninguna factura emitida, así que no queda nada suyo.") +
          " Esto no se puede deshacer.",
      }, 409);
    }
    // Las facturas emitidas se quedan como se emitieron; se sueltan de la ficha
    await env.CITAS.batch([
      env.CITAS.prepare("UPDATE pagos SET alumno_id = NULL WHERE slug = ?1 AND alumno_id = ?2 AND numero IS NOT NULL").bind(cfg.slug, id),
      env.CITAS.prepare("DELETE FROM pagos WHERE slug = ?1 AND alumno_id = ?2 AND numero IS NULL").bind(cfg.slug, id),
      env.CITAS.prepare("DELETE FROM citas WHERE slug = ?1 AND alumno_id = ?2").bind(cfg.slug, id),
      env.CITAS.prepare("DELETE FROM bonos WHERE slug = ?1 AND alumno_id = ?2").bind(cfg.slug, id),
      env.CITAS.prepare("DELETE FROM espera WHERE slug = ?1 AND alumno_id = ?2").bind(cfg.slug, id),
      env.CITAS.prepare("DELETE FROM al_sesiones WHERE alumno_id = ?1").bind(id),
      env.CITAS.prepare("DELETE FROM alumnos WHERE id = ?1 AND slug = ?2").bind(id, cfg.slug),
    ]);
    await env.CITAS.prepare("DELETE FROM al_codigos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, a.email || "").run().catch(() => {});
    if (apuntar) await apuntar("alumna", `borró a ${a.nombre || a.email} a petición suya (se quedan ${nf} facturas emitidas, por obligación legal)`);
    return res({ ok: true, facturas: nf });
  }

  // Quién debe dinero y quién va a quedarse colgada: el agujero que no se ve
  // hasta que alguien se planta en recepción sin bono.
  if (ruta === "panel/deudas" && request.method === "GET") {
    const hoy = hoyMadrid();
    const [pend, sin, colgadas] = await Promise.all([
      env.CITAS.prepare(
        `SELECT p.id, p.concepto, p.importe, p.fecha, p.metodo, a.id AS alumna_id, a.nombre AS alumna, a.telefono, a.email
         FROM pagos p LEFT JOIN alumnos a ON a.id = p.alumno_id
         WHERE p.slug = ?1 AND p.estado = 'pendiente' ORDER BY p.fecha LIMIT 100`).bind(cfg.slug).all(),
      // Tiene clase reservada y no tiene ningún bono en vigor: viene sin pagar
      env.CITAS.prepare(
        `SELECT a.id, a.nombre, a.telefono, a.email, COUNT(c.id) AS reservas, MIN(c.fecha) AS proxima
         FROM alumnos a JOIN citas c ON c.alumno_id = a.id AND c.estado = 'ok' AND c.fecha >= ?2
         WHERE a.slug = ?1 AND NOT EXISTS (SELECT 1 FROM bonos b WHERE b.alumno_id = a.id AND b.estado = 'activo' AND b.fin >= ?2)
         GROUP BY a.id ORDER BY proxima LIMIT 60`).bind(cfg.slug, hoy).all(),
      // Tiene bono, pero se le termina antes de las clases que ya tiene cogidas
      env.CITAS.prepare(
        `SELECT a.id, a.nombre, a.telefono, a.email, b.nombre AS bono, b.fin, b.recurrente,
                (SELECT COUNT(*) FROM citas c WHERE c.alumno_id = a.id AND c.estado = 'ok' AND c.fecha > b.fin) AS despues
         FROM bonos b JOIN alumnos a ON a.id = b.alumno_id
         WHERE b.slug = ?1 AND b.estado = 'activo' AND b.fin >= ?2 AND b.recurrente = 0
         ORDER BY b.fin LIMIT 60`).bind(cfg.slug, hoy).all(),
    ]);
    const p = pend.results || [];
    return res({
      pendientes: p,
      pendienteTotal: p.reduce((s, x) => s + (x.importe || 0), 0),
      sinBono: sin.results || [],
      colgadas: (colgadas.results || []).filter((x) => x.despues > 0),
    });
  }

  if (ruta === "panel/pagos" && request.method === "GET") {
    const desde = String(url.searchParams.get("desde") || "").match(/^\d{4}-\d{2}-\d{2}$/) ? url.searchParams.get("desde") : sumarDias(hoyMadrid(), -30);
    const { results } = await env.CITAS.prepare(
      `SELECT p.*, a.nombre AS alumna, a.email FROM pagos p LEFT JOIN alumnos a ON a.id = p.alumno_id
       WHERE p.slug = ?1 AND p.fecha >= ?2 ORDER BY p.id DESC LIMIT 400`).bind(cfg.slug, desde).all();
    const t = await env.CITAS.prepare("SELECT COALESCE(SUM(importe),0) AS total, COUNT(*) AS n FROM pagos WHERE slug = ?1 AND estado = 'pagado' AND fecha >= ?2").bind(cfg.slug, desde).first();
    return res({ pagos: results || [], total: t ? t.total : 0, n: t ? t.n : 0, desde });
  }

  if (ruta === "panel/pago" && post) {   // cobro a mano (efectivo, bizum, transferencia)
    const b = await cuerpo();
    const r = await env.CITAS.prepare("INSERT INTO pagos (slug, alumno_id, concepto, importe, estado, metodo) VALUES (?1,?2,?3,?4,'pagado',?5)")
      .bind(cfg.slug, +b.alumno || null, limpiar(b.concepto, 80) || "Cobro en el estudio", Math.max(0, Math.round(+b.importe || 0)), limpiar(b.metodo, 20) || "efectivo").run();
    const numero = await emitirFactura(env, cfg, { id: r.meta.last_row_id });
    if (apuntar) await apuntar("cobro", `${(Math.max(0, Math.round(+b.importe || 0)) / 100).toFixed(2)} € en ${limpiar(b.metodo, 20) || "efectivo"} · ${limpiar(b.concepto, 80) || "Cobro en el estudio"}${numero ? ` · factura ${numero}` : ""}`);
    return res({ ok: true, numero });
  }

  if (ruta === "panel/asistencia" && post) {
    const b = await cuerpo();
    const marca = b.vino === null || b.vino === undefined ? null : (b.vino ? 1 : 0);
    await env.CITAS.prepare("UPDATE citas SET asistio = ?3 WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug, marca).run();
    return res({ ok: true });
  }

  if (ruta === "panel/espera" && request.method === "GET") {
    const { results } = await env.CITAS.prepare(
      "SELECT * FROM espera WHERE slug = ?1 AND fecha >= date('now') ORDER BY fecha, inicio, id LIMIT 200").bind(cfg.slug).all();
    return res({ espera: (results || []).map((e) => ({ ...e, hora: hhmm(e.inicio) })) });
  }

  if (ruta === "panel/promos" && request.method === "GET") {
    const { results } = await env.CITAS.prepare("SELECT * FROM promos WHERE slug = ?1 ORDER BY id DESC LIMIT 100").bind(cfg.slug).all();
    return res({ promos: results || [] });
  }
  if (ruta === "panel/promo" && post) {
    const b = await cuerpo();
    const cod = limpiar(b.codigo, 32).toUpperCase().replace(/\s+/g, "");
    if (!cod) return res({ error: "Escribe un código" }, 400);
    const valor = Math.max(1, Math.round(+b.valor || 0));
    if (b.tipo === "porcentaje" && valor > 100) return res({ error: "El porcentaje no puede pasar de 100" }, 400);
    await env.CITAS.prepare(
      `INSERT INTO promos (slug, codigo, tipo, valor, meses, caduca, usos_max, productos) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
       ON CONFLICT(slug, codigo) DO UPDATE SET tipo = ?3, valor = ?4, meses = ?5, caduca = ?6, usos_max = ?7, productos = ?8, activo = 1`
    ).bind(cfg.slug, cod, b.tipo === "importe" ? "importe" : "porcentaje", valor, Math.max(0, Math.round(+b.meses || 1)),
      /^\d{4}-\d{2}-\d{2}$/.test(b.caduca || "") ? b.caduca : null, Math.max(0, Math.round(+b.usos || 0)), limpiar(b.productos, 200)).run();
    return res({ ok: true });
  }
  if (ruta === "panel/promo/baja" && post) {
    const b = await cuerpo();
    await env.CITAS.prepare("UPDATE promos SET activo = 0 WHERE slug = ?1 AND id = ?2").bind(cfg.slug, +b.id || 0).run();
    return res({ ok: true });
  }

  if (ruta === "panel/stats" && request.method === "GET") {
    const desde = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("desde") || "") ? url.searchParams.get("desde") : sumarDias(hoyMadrid(), -180);
    const [ing, cls, alt, ocu] = await Promise.all([
      env.CITAS.prepare("SELECT substr(fecha,1,7) AS mes, SUM(importe) AS total, COUNT(*) AS n FROM pagos WHERE slug = ?1 AND estado = 'pagado' AND fecha >= ?2 GROUP BY mes ORDER BY mes DESC LIMIT 12").bind(cfg.slug, desde).all(),
      env.CITAS.prepare("SELECT servicio_n AS clase, COUNT(*) AS n FROM citas WHERE slug = ?1 AND estado = 'ok' AND fecha >= ?2 GROUP BY servicio ORDER BY n DESC LIMIT 12").bind(cfg.slug, desde).all(),
      env.CITAS.prepare("SELECT substr(creado,1,7) AS mes, COUNT(*) AS n FROM alumnos WHERE slug = ?1 AND creado >= ?2 GROUP BY mes ORDER BY mes DESC LIMIT 12").bind(cfg.slug, desde).all(),
      env.CITAS.prepare("SELECT COUNT(*) AS reservas, SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) AS anuladas, SUM(CASE WHEN asistio = 1 THEN 1 ELSE 0 END) AS vinieron, SUM(CASE WHEN asistio = 0 THEN 1 ELSE 0 END) AS faltaron FROM citas WHERE slug = ?1 AND fecha >= ?2").bind(cfg.slug, desde).first(),
    ]);
    return res({ desde, ingresos: ing.results || [], clases: cls.results || [], altas: alt.results || [], asistencia: ocu || {} });
  }

  if (ruta === "panel/exportar" && request.method === "GET") {
    const que = String(url.searchParams.get("que") || "alumnas");
    let filas = [], cab = [];
    if (que === "pagos") {
      cab = ["fecha", "alumna", "email", "concepto", "importe", "estado", "metodo"];
      const { results } = await env.CITAS.prepare(
        "SELECT p.fecha, a.nombre AS alumna, a.email, p.concepto, p.importe, p.estado, p.metodo FROM pagos p LEFT JOIN alumnos a ON a.id = p.alumno_id WHERE p.slug = ?1 ORDER BY p.id DESC LIMIT 5000").bind(cfg.slug).all();
      filas = (results || []).map((r) => [r.fecha, r.alumna, r.email, r.concepto, (r.importe / 100).toFixed(2), r.estado, r.metodo]);
    } else if (que === "citas") {
      cab = ["fecha", "hora", "clase", "nombre", "telefono", "email", "estado", "asistio"];
      const { results } = await env.CITAS.prepare(
        "SELECT fecha, inicio, servicio_n, nombre, telefono, email, estado, asistio FROM citas WHERE slug = ?1 ORDER BY fecha DESC LIMIT 5000").bind(cfg.slug).all();
      filas = (results || []).map((r) => [r.fecha, hhmm(r.inicio), r.servicio_n, r.nombre, r.telefono, r.email || "", r.estado, r.asistio == null ? "" : r.asistio ? "sí" : "no"]);
    } else {
      cab = ["nombre", "email", "telefono", "ofertas", "alta", "bono", "caduca"];
      const { results } = await env.CITAS.prepare(
        `SELECT a.nombre, a.email, a.telefono, a.marketing, a.creado,
                (SELECT nombre FROM bonos b WHERE b.alumno_id = a.id AND b.estado='activo' AND b.fin >= date('now') ORDER BY b.fin DESC LIMIT 1) AS bono,
                (SELECT fin FROM bonos b WHERE b.alumno_id = a.id AND b.estado='activo' AND b.fin >= date('now') ORDER BY b.fin DESC LIMIT 1) AS fin
         FROM alumnos a WHERE a.slug = ?1 ORDER BY a.creado DESC LIMIT 5000`).bind(cfg.slug).all();
      filas = (results || []).map((r) => [r.nombre, r.email, r.telefono, r.marketing ? "sí" : "no", r.creado, r.bono || "", r.fin || ""]);
    }
    const csv = [cab, ...filas].map((f) => f.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    return new Response("﻿" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${cfg.slug}-${que}.csv"`, "Cache-Control": "no-store" } });
  }

  return null;
}

/* ---------------------------------------------------------------- avisos diarios
   Lo que de verdad mueve la caja de un estudio: que un bono no se caiga sin que
   nadie se entere, y que una alumna que lleva semanas sin venir reciba un gesto
   antes de darse de baja. Lo lanza el cron diario de worker.js. */

/** Correo de bono a punto de terminar. */
function correoCaduca(cfg, alumna, bono, dias) {
  const url = (cfg.negocio.web || `https://agencia-js.com/c/${cfg.slug}`).replace(/\/$/, "") + "/mi-cuenta/";
  return marco(cfg, dias === 0 ? "Tu bono termina hoy" : `Tu bono termina en ${dias === 1 ? "1 día" : dias + " días"}`,
    `<p style="font-size:15px;line-height:1.7">Hola ${esc((alumna.nombre || "").split(" ")[0] || "")}, tu <b>${esc(bono.nombre)}</b> termina el <b>${esc(String(bono.fin).slice(0, 10).split("-").reverse().join("/"))}</b>.</p>
     <p style="font-size:15px;line-height:1.7">Si quieres seguir, puedes renovarlo desde tu cuenta en un minuto y no perder tu sitio en las clases de siempre.</p>
     ${boton(cfg, url, "Renovar mi bono")}
     <p style="font-size:13px;color:#555">Si prefieres parar una temporada, no hagas nada: el bono se cierra solo y aquí te esperamos.</p>`);
}

/** Correo para quien lleva tiempo sin venir teniendo bono. */
function correoEchamos(cfg, alumna) {
  const url = (cfg.negocio.web || `https://agencia-js.com/c/${cfg.slug}`).replace(/\/$/, "") + "/reservar/";
  return marco(cfg, "Te echamos de menos",
    `<p style="font-size:15px;line-height:1.7">Hola ${esc((alumna.nombre || "").split(" ")[0] || "")}, hace unas semanas que no te vemos por el estudio y tienes el bono activo.</p>
     <p style="font-size:15px;line-height:1.7">Si se te ha complicado la agenda, dínoslo y buscamos el hueco que mejor te venga. Y si te apetece volver, aquí tienes el horario:</p>
     ${boton(cfg, url, "Ver clases y reservar")}`);
}

/** Petición de reseña, una sola vez y solo a quien ya ha venido varias veces. */
function correoResena(cfg, alumna) {
  const url = cfg.negocio.resenas || cfg.negocio.mapa || "";
  return marco(cfg, "¿Nos dejas tu opinión?",
    `<p style="font-size:15px;line-height:1.7">Hola ${esc((alumna.nombre || "").split(" ")[0] || "")}, gracias por venir a clase estas semanas.</p>
     <p style="font-size:15px;line-height:1.7">Si te está gustando, nos ayuda muchísimo que lo cuentes en Google: es lo que hace que otras personas del barrio nos encuentren. Son dos minutos.</p>
     ${url ? boton(cfg, url, "Escribir mi opinión") : ""}
     <p style="font-size:13px;color:#555">Y si algo no va como esperabas, respóndenos a este correo: preferimos saberlo.</p>`);
}

/**
 * Avisos del día para un negocio. Devuelve cuántos correos ha mandado de cada tipo.
 * Cada aviso se marca en la ficha de la alumna para no repetirlo nunca.
 */
export async function avisosDiarios(env, cfg) {
  const out = { caducan: 0, enfriadas: 0, resenas: 0 };
  if (!env.CITAS || cfg.activo === false) return out;
  const hoy = hoyMadrid();
  const av = { caducaDias: 5, friasDias: 21, resenaClases: 3, ...(cfg.avisosAlumnas || {}) };

  // 1) Bonos que terminan y NO se renuevan solos
  if (av.caducaDias) {
    const limite = sumarDias(hoy, av.caducaDias);
    const { results } = await env.CITAS.prepare(
      `SELECT b.id, b.nombre, b.fin, a.id AS aid, a.nombre AS alumna, a.email, a.avisado_bono
       FROM bonos b JOIN alumnos a ON a.id = b.alumno_id
       WHERE b.slug = ?1 AND b.estado = 'activo' AND b.recurrente = 0
         AND b.fin BETWEEN ?2 AND ?3 AND a.email IS NOT NULL LIMIT 100`
    ).bind(cfg.slug, hoy, limite).all();
    for (const b of results || []) {
      if (b.avisado_bono && b.avisado_bono >= sumarDias(hoy, -20)) continue;   // ya avisada hace poco
      const dias = Math.max(0, Math.round((Date.parse(String(b.fin).slice(0, 10) + "T12:00:00Z") - Date.parse(hoy + "T12:00:00Z")) / 864e5));
      const ok = await correo(env, cfg, b.email, b.alumna, `Tu bono termina pronto · ${cfg.negocio.nombre}`,
        correoCaduca(cfg, { nombre: b.alumna }, b, dias));
      if (ok) { out.caducan++; await env.CITAS.prepare("UPDATE alumnos SET avisado_bono = ?2 WHERE id = ?1").bind(b.aid, hoy).run(); }
    }
  }

  // 2) Con bono activo y sin venir desde hace semanas
  if (av.friasDias) {
    const corte = sumarDias(hoy, -av.friasDias);
    const { results } = await env.CITAS.prepare(
      `SELECT a.id, a.nombre, a.email, a.avisado_bono,
              (SELECT MAX(fecha) FROM citas c WHERE c.alumno_id = a.id AND c.estado = 'ok' AND c.fecha <= ?2) AS ultima
       FROM alumnos a
       WHERE a.slug = ?1 AND a.email IS NOT NULL
         AND EXISTS (SELECT 1 FROM bonos b WHERE b.alumno_id = a.id AND b.estado = 'activo' AND b.fin >= ?2)
       LIMIT 200`).bind(cfg.slug, hoy).all();
    for (const a of results || []) {
      if (!a.ultima || a.ultima > corte) continue;                              // vino hace poco
      if (a.avisado_bono && a.avisado_bono >= sumarDias(hoy, -30)) continue;    // no acribillar
      const futura = await env.CITAS.prepare("SELECT 1 FROM citas WHERE alumno_id = ?1 AND estado = 'ok' AND fecha > ?2 LIMIT 1").bind(a.id, hoy).first();
      if (futura) continue;                                                     // ya tiene clase reservada
      const ok = await correo(env, cfg, a.email, a.nombre, `Te echamos de menos · ${cfg.negocio.nombre}`, correoEchamos(cfg, a));
      if (ok) { out.enfriadas++; await env.CITAS.prepare("UPDATE alumnos SET avisado_bono = ?2 WHERE id = ?1").bind(a.id, hoy).run(); }
    }
  }

  // 3) Reseña, una sola vez, a quien ya ha venido de verdad
  if (av.resenaClases && (cfg.negocio.resenas || cfg.negocio.mapa)) {
    const { results } = await env.CITAS.prepare(
      `SELECT a.id, a.nombre, a.email, (SELECT COUNT(*) FROM citas c WHERE c.alumno_id = a.id AND c.asistio = 1) AS vino
       FROM alumnos a WHERE a.slug = ?1 AND a.email IS NOT NULL AND a.resena IS NULL AND a.marketing = 1 LIMIT 200`
    ).bind(cfg.slug).all();
    for (const a of results || []) {
      if ((a.vino || 0) < av.resenaClases) continue;
      const ok = await correo(env, cfg, a.email, a.nombre, `¿Nos dejas tu opinión? · ${cfg.negocio.nombre}`, correoResena(cfg, a));
      if (ok) { out.resenas++; await env.CITAS.prepare("UPDATE alumnos SET resena = ?2 WHERE id = ?1").bind(a.id, hoy).run(); }
    }
  }
  return out;
}
