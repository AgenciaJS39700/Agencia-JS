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
  return { ok: false, bono: mejor, bloqueo: `Tu ${mejor.nombre} ya tiene las ${mejor.sem} clases de esa semana reservadas. Anula una o amplía el bono.` };
}

/* ---------------------------------------------------------------- Stripe */
async function stripe(env, metodo, ruta, params, idem) {
  const cab = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
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

/** ¿Le toca pagar matrícula? Solo la primera vez y según el bono. */
async function tocaMatricula(env, cfg, alumno, p) {
  const m = cfg.matricula;
  if (!m || !m.precio || (m.exentos || []).includes(p.id)) return false;
  const r = await env.CITAS.prepare("SELECT COUNT(*) AS n FROM pagos WHERE slug = ?1 AND alumno_id = ?2 AND estado = 'pagado'").bind(cfg.slug, alumno.id).first();
  return !(r && r.n);
}

/** Crea el pago en Stripe: suscripción si el bono es recurrente, pago único si no. */
async function crearPago(env, cfg, alumno, p, volverA) {
  if (!env.STRIPE_SECRET_KEY) return { error: "Los pagos online todavía no están activados en este negocio." };
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
  if (await tocaMatricula(env, cfg, alumno, p)) {
    if (p.recurrente) {
      // En una suscripción la matrícula va como cargo de alta, no como línea mensual
      params.set("subscription_data[metadata][matricula]", String(cfg.matricula.precio));
    } else linea(cfg.matricula.nombre, cfg.matricula.precio, false);
  }
  if (p.recurrente) params.set("subscription_data[metadata][slug]", cfg.slug);
  if (p.recurrente) params.set("subscription_data[metadata][alumno]", String(alumno.id));
  if (p.recurrente) params.set("subscription_data[metadata][producto]", p.id);

  const r = await stripe(env, "POST", "/checkout/sessions", params, `${cfg.slug}-${alumno.id}-${p.id}-${Date.now()}`);
  if (!r.ok || !r.datos.url) {
    console.error("Stripe rechazó el pago:", JSON.stringify(r.datos).slice(0, 300));
    return { error: "No se ha podido abrir el pago. Inténtalo otra vez o paga en el estudio." };
  }
  await env.CITAS.prepare(
    "INSERT OR IGNORE INTO pagos (slug, alumno_id, concepto, importe, estado, stripe_id) VALUES (?1, ?2, ?3, ?4, 'pendiente', ?5)"
  ).bind(cfg.slug, alumno.id, p.nombre, p.precio, r.datos.id).run();
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
      pagos: !!env.STRIPE_SECRET_KEY,
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
    if (!(await firmaStripe(crudo, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) return res({ error: "Firma no válida" }, 400);
    let ev; try { ev = JSON.parse(crudo); } catch (e) { return res({ error: "JSON no válido" }, 400); }
    ctx.waitUntil(procesaStripe(env, cfg, ev).catch((e) => console.error("stripe", e && e.message)));
    return res({ recibido: true });
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
      env.CITAS.prepare("UPDATE al_codigos SET usado = 1 WHERE slug = ?1 AND email = ?2 AND usado = 0").bind(cfg.slug, email),
      env.CITAS.prepare("INSERT INTO al_codigos (slug, email, codigo_hash, expira) VALUES (?1, ?2, ?3, datetime('now', ?4))").bind(cfg.slug, email, await sha256(codigo), `+${MIN_CODIGO} minutes`),
    ]);
    const enviado = await correo(env, cfg, email, a.nombre || nombre, `Tu código: ${codigo}`, correoCodigo(cfg, codigo, a.nombre || nombre));
    if (!enviado) console.log(`[${cfg.slug}] código de acceso no enviado por falta de BREVO_API_KEY`);
    return r({ ok: true, enviado, nueva: !a.nombre });
  }

  /* ---- acceso: entrar con el código ---- */
  if (ruta === "entrar" && post) {
    const b = await cuerpo();
    const email = correoLimpio(b.email), codigo = String(b.codigo || "").replace(/\D/g, "").slice(0, 6);
    if (!RE_MAIL.test(email) || codigo.length !== 6) return r({ error: "Falta el correo o el código." }, 400);
    if (await demasiados(env, ["ip:" + ip, "cod:" + email])) return r({ error: "Demasiados intentos. Espera unos minutos." }, 429);
    await apunta(env, ["ip:" + ip, "cod:" + email]);
    const c = await env.CITAS.prepare(
      "SELECT id FROM al_codigos WHERE slug = ?1 AND email = ?2 AND usado = 0 AND expira > datetime('now') AND codigo_hash = ?3 ORDER BY id DESC LIMIT 1"
    ).bind(cfg.slug, email, await sha256(codigo)).first();
    if (!c) return r({ error: "El código no es correcto o ha caducado. Pide uno nuevo." }, 401);
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE slug = ?1 AND email = ?2").bind(cfg.slug, email).first();
    if (!a) return r({ error: "No encontramos esa cuenta." }, 404);
    const tok = alAzar(32);
    await env.CITAS.batch([
      env.CITAS.prepare("UPDATE al_codigos SET usado = 1 WHERE id = ?1").bind(c.id),
      env.CITAS.prepare("INSERT INTO al_sesiones (token_hash, alumno_id, expira) VALUES (?1, ?2, datetime('now', ?3))").bind(await sha256(tok), a.id, `+${DIAS_SESION} days`),
      env.CITAS.prepare("UPDATE alumnos SET visto = datetime('now') WHERE id = ?1").bind(a.id),
    ]);
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
    const a2 = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1").bind(alumna.id).first();
    return r(await miCuenta(env, cfg, a2));
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
    const x = await crearPago(env, cfg, alumna, p, sitio + "mi-cuenta/");
    return x.error ? r({ error: x.error }, 400) : r(x);
  }

  if (ruta === "pago" && request.method === "GET") {
    const sid = String(url.searchParams.get("s") || "").slice(0, 100);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return r({ error: "Pago no válido" }, 400);
    const p = await env.CITAS.prepare("SELECT estado, concepto, importe FROM pagos WHERE stripe_id = ?1 AND slug = ?2").bind(sid, cfg.slug).first();
    if (p && p.estado === "pagado") return r({ estado: "pagado", concepto: p.concepto, importe: p.importe });
    // Aún no ha llegado el webhook: se pregunta a Stripe directamente
    if (env.STRIPE_SECRET_KEY) {
      const s = await stripe(env, "GET", `/checkout/sessions/${sid}`, null);
      if (s.ok && s.datos.payment_status === "paid") {
        await aplicaPago(env, cfg, s.datos);
        return r({ estado: "pagado", concepto: p ? p.concepto : "", importe: s.datos.amount_total || 0 });
      }
    }
    return r({ estado: p ? p.estado : "pendiente" });
  }

  if (ruta === "bono/baja" && post) {
    if (!alumna) return r({ error: "Entra en tu cuenta." }, 401);
    const b = await cuerpo();
    const bono = await env.CITAS.prepare("SELECT * FROM bonos WHERE id = ?1 AND slug = ?2 AND alumno_id = ?3").bind(+b.id || 0, cfg.slug, alumna.id).first();
    if (!bono) return r({ error: "No encontramos ese bono." }, 404);
    if (bono.stripe_sub && env.STRIPE_SECRET_KEY) {
      const pr = new URLSearchParams(); pr.set("cancel_at_period_end", "true");
      await stripe(env, "POST", `/subscriptions/${bono.stripe_sub}`, pr);
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
  return {
    dentro: true,
    alumna: { id: a.id, email: a.email, nombre: a.nombre, telefono: a.telefono, marketing: !!a.marketing },
    bonos: bonos.map((b) => ({ id: b.id, nombre: b.nombre, fin: b.fin, finTexto: legible(b.fin), sem: b.sem, recurrente: !!b.recurrente, tipos: b.tipos ? b.tipos.split(",") : [] })),
    semana: { usadas: usadas ? usadas.n : 0, desde: sem },
    proximas: (proximas.results || []).map((c) => ({ ...c, hora: hhmm(c.inicio), dia: legible(c.fecha) })),
    pasadas: (pasadas.results || []).map((c) => ({ ...c, hora: hhmm(c.inicio), dia: legible(c.fecha) })),
    pagos: (pagos.results || []).map((p) => ({ ...p, texto: euros(p.importe) })),
  };
}

/* ---------------------------------------------------------------- Stripe: eventos */
async function procesaStripe(env, cfg, ev) {
  const t = ev.type;
  if (t === "checkout.session.completed" || t === "checkout.session.async_payment_succeeded") return aplicaPago(env, cfg, ev.data.object);
  if (t === "invoice.paid") {
    // Renovación mensual de una suscripción: se estira el bono
    const sub = ev.data.object.subscription;
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
    const sub = ev.data.object.subscription;
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
  const bonoId = await activarBono(env, cfg, alumnoId, prodId, { sub: s.subscription || null, cust: s.customer || null });
  if (bonoId) await env.CITAS.prepare("UPDATE pagos SET bono_id = ?2 WHERE stripe_id = ?1").bind(s.id, bonoId).run();
  const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1").bind(alumnoId).first();
  const b = await env.CITAS.prepare("SELECT * FROM bonos WHERE id = ?1").bind(bonoId).first();
  if (a && b) await correo(env, cfg, a.email, a.nombre, `Bono activado · ${cfg.negocio.nombre}`, correoBono(cfg, b, producto(cfg, prodId) || {}));
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
export async function atenderPanelAlumnos(request, env, cfg, ruta, url) {
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
      env.CITAS.prepare("SELECT concepto, importe, estado, metodo, fecha FROM pagos WHERE slug = ?1 AND alumno_id = ?2 ORDER BY id DESC LIMIT 30").bind(cfg.slug, id).all(),
    ]);
    return res({ alumna: a, bonos: bonos.results || [], citas: (citas.results || []).map((c) => ({ ...c, hora: hhmm(c.inicio) })), pagos: pagos.results || [] });
  }

  if (ruta === "panel/bono" && post) {
    const b = await cuerpo();
    const a = await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1 AND slug = ?2").bind(+b.alumno || 0, cfg.slug).first();
    const p = producto(cfg, String(b.producto || ""));
    if (!a || !p) return res({ error: "Alumna o bono no válidos" }, 400);
    const id = await activarBono(env, cfg, a.id, p.id, null);
    if (b.cobrar) {
      await env.CITAS.prepare("INSERT INTO pagos (slug, alumno_id, bono_id, concepto, importe, estado, metodo) VALUES (?1,?2,?3,?4,?5,'pagado',?6)")
        .bind(cfg.slug, a.id, id, p.nombre, p.precio, limpiar(b.metodo, 20) || "efectivo").run();
    }
    return res({ ok: true, bono: id });
  }

  if (ruta === "panel/bono/baja" && post) {
    const b = await cuerpo();
    const bono = await env.CITAS.prepare("SELECT * FROM bonos WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug).first();
    if (!bono) return res({ error: "No encontrado" }, 404);
    if (bono.stripe_sub && env.STRIPE_SECRET_KEY) await stripe(env, "DELETE", `/subscriptions/${bono.stripe_sub}`, null);
    await env.CITAS.prepare("UPDATE bonos SET estado = 'cancelado', recurrente = 0 WHERE id = ?1").bind(bono.id).run();
    return res({ ok: true });
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
    await env.CITAS.prepare("INSERT INTO pagos (slug, alumno_id, concepto, importe, estado, metodo) VALUES (?1,?2,?3,?4,'pagado',?5)")
      .bind(cfg.slug, +b.alumno || null, limpiar(b.concepto, 80) || "Cobro en el estudio", Math.max(0, Math.round(+b.importe || 0)), limpiar(b.metodo, 20) || "efectivo").run();
    return res({ ok: true });
  }

  if (ruta === "panel/asistencia" && post) {
    const b = await cuerpo();
    await env.CITAS.prepare("UPDATE citas SET asistio = ?3 WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug, b.vino ? 1 : 0).run();
    return res({ ok: true });
  }

  if (ruta === "panel/espera" && request.method === "GET") {
    const { results } = await env.CITAS.prepare(
      "SELECT * FROM espera WHERE slug = ?1 AND fecha >= date('now') ORDER BY fecha, inicio, id LIMIT 200").bind(cfg.slug).all();
    return res({ espera: (results || []).map((e) => ({ ...e, hora: hhmm(e.inicio) })) });
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
