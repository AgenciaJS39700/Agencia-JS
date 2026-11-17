// /asistentes/equipo-extra.js — Lo que necesita un equipo de verdad para usar el panel:
// recuperar la contraseña, dejarse recados y cubrir una clase cuando alguien falla.
//
// Decisiones que importan:
// · El enlace para recuperar la contraseña sale SIEMPRE al correo del estudio
//   (`cfg.avisos.email`), nunca a uno que escriba quien lo pide. Si no, cualquiera
//   que supiera el nombre de usuario se haría con el panel.
// · La respuesta es la misma exista o no el usuario: así no se puede averiguar
//   quién tiene acceso probando nombres.
// · Un recado no es un chat: es un tablón con acuse de lectura, para que la jefa
//   vea de un vistazo quién se ha enterado.

import { correo, marco, boton, esc } from "./correo.js";
import { equipo, hashClave, salNueva } from "./agenda.js";

const limpiar = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const ITER_EQ = 100000;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function igual(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
const token = () => [...crypto.getRandomValues(new Uint8Array(24))].map((x) => x.toString(16).padStart(2, "0")).join("");

/* ---------------------------------------------------------------- contraseña olvidada */

/** Devuelve { cuerpo, estado } para las dos rutas públicas de recuperación. */
export async function recuperarAcceso(env, cfg, ruta, b) {
  const mismo = { cuerpo: { ok: true, mensaje: "Si ese usuario existe, le hemos mandado un enlace al correo del estudio." }, estado: 200 };

  if (ruta === "panel/olvidada") {
    const u = String(b.usuario || "").trim().toLowerCase();
    const destino = (cfg.avisos && cfg.avisos.email) || "";
    if (!u || !destino) return mismo;
    const l = await equipo(env, cfg);
    const p = l.find((x) => x.activo && x.usuario === u);
    if (!p) return mismo;                                  // misma respuesta: no se puede sondear

    const tok = token();
    const exp = new Date(Date.now() + 36e5).toISOString();  // una hora
    await env.CITAS.prepare(
      `INSERT INTO accesos (slug, nombre, usuario, rol, hash, pass_salt, pass_iter, activo, creado, reset_tok, reset_exp)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10)
       ON CONFLICT(slug, nombre) DO UPDATE SET reset_tok = ?9, reset_exp = ?10`
    ).bind(cfg.slug, p.nombre, p.usuario, p.rol, p.hash, p.sal, p.iter, new Date().toISOString(), tok, exp).run();

    const base = (cfg.negocio.web || `https://agencia-js.com`).replace(/\/$/, "");
    const url = `${base}/panel/${cfg.slug}?nueva=${tok}&u=${encodeURIComponent(p.usuario)}`;
    await correo(env, cfg, destino, cfg.negocio.nombre, `Recuperar el acceso de ${p.nombre} · ${cfg.negocio.nombre}`,
      marco(cfg, "Poner una contraseña nueva",
        `<p style="font-size:15px;line-height:1.7">Alguien ha pedido recuperar el acceso de <b>${esc(p.nombre)}</b> (usuario <b>${esc(p.usuario)}</b>) al panel del estudio.</p>
         <p style="font-size:15px;line-height:1.7">Si has sido tú, abre este enlace y pon una contraseña nueva. Vale durante una hora.</p>
         ${boton(cfg, url, "Poner contraseña nueva")}
         <p style="font-size:13px;color:#555;line-height:1.7">Si no has pedido nada, no hagas nada: el enlace caduca solo y la contraseña de ahora sigue valiendo. Este correo llega siempre aquí, al correo del estudio, nunca a quien lo pide.</p>`)
    ).catch(() => false);
    return mismo;
  }

  // panel/nueva-clave
  const tok = String(b.token || "");
  const clave = String(b.clave == null ? "" : b.clave).replace(/\s+/g, "");
  if (!/^[0-9a-f]{48}$/.test(tok)) return { cuerpo: { error: "Ese enlace no vale. Pide otro." }, estado: 400 };
  if (clave.length < 8 || clave.length > 60) return { cuerpo: { error: "La contraseña tiene que tener entre 8 y 60 caracteres, sin espacios." }, estado: 400 };
  const fila = await env.CITAS.prepare("SELECT * FROM accesos WHERE slug = ?1 AND reset_tok = ?2").bind(cfg.slug, tok).first();
  if (!fila || !fila.reset_exp || fila.reset_exp < new Date().toISOString()) {
    return { cuerpo: { error: "Ese enlace ha caducado. Pide otro desde «He olvidado mi contraseña»." }, estado: 400 };
  }
  const sal = salNueva();
  await env.CITAS.prepare(
    "UPDATE accesos SET hash = ?2, pass_salt = ?3, pass_iter = ?4, activo = 1, reset_tok = NULL, reset_exp = NULL WHERE id = ?1"
  ).bind(fila.id, await hashClave(clave, sal, ITER_EQ), sal, ITER_EQ).run();
  return { cuerpo: { ok: true, usuario: fila.usuario, nombre: fila.nombre }, estado: 200 };
}

/* ---------------------------------------------------------------- recados del equipo */

/** ¿Este recado va dirigido a esta persona? (lo que cuenta como «sin leer»). */
const dirigidoA = (r, yo) =>
  r.para === "todos" ||
  (r.para === "profes" && yo.rol === "profe") ||
  (r.para === "gestion" && (yo.rol === "panel" || yo.rol === "recepcion")) ||
  r.para === yo.nombre;

/** ¿Lo ve en el tablón? Quien gestiona el estudio ve el tablón entero, porque lo
    administra; y cualquiera ve siempre lo que ha escrito él. */
const paraMi = (r, yo) => yo.rol === "panel" || r.autor === yo.nombre || dirigidoA(r, yo);

/** Los recados vivos que le tocan a esta persona, con si ya los ha leído. */
export async function recadosDe(env, cfg, yo) {
  const hoy = hoyMadrid();
  const { results } = await env.CITAS.prepare(
    `SELECT r.*, (SELECT leido FROM recados_leidos l WHERE l.recado_id = r.id AND l.nombre = ?2) AS leido
     FROM recados r WHERE r.slug = ?1 AND (r.caduca IS NULL OR r.caduca >= ?3)
     ORDER BY r.fijado DESC, r.id DESC LIMIT 60`).bind(cfg.slug, yo.nombre, hoy).all();
  return (results || []).filter((r) => paraMi(r, yo));
}

export async function atenderRecados(request, env, cfg, ruta, url, yo) {
  const post = request.method === "POST";
  const cuerpo = async () => { try { return await request.json(); } catch (e) { return {}; } };
  const res = (d, e = 200) => new Response(JSON.stringify(d), { status: e, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

  // Ver los míos (lo usan el panel y el acceso de profesor)
  if ((ruta === "panel/recados" || ruta === "profe/recados") && request.method === "GET") {
    const mios = await recadosDe(env, cfg, yo);
    let gente = [];
    if (yo.rol === "panel") {
      // La jefa ve además quién ha leído cada uno
      const { results } = await env.CITAS.prepare(
        "SELECT recado_id, nombre FROM recados_leidos WHERE recado_id IN (SELECT id FROM recados WHERE slug = ?1)").bind(cfg.slug).all();
      gente = results || [];
    }
    // Para el desplegable de «¿para quién?» del panel
    const l = yo.rol === "panel" || yo.rol === "recepcion" ? (await equipo(env, cfg)).filter((p) => p.activo).map((p) => p.nombre) : [];
    return res({
      equipo: l,
      recados: mios.map((r) => ({
        id: r.id, texto: r.texto, autor: r.autor, para: r.para, fijado: !!r.fijado, caduca: r.caduca, creado: r.creado,
        leido: !!r.leido, mio: dirigidoA(r, yo),
        leidoPor: gente.filter((g) => g.recado_id === r.id).map((g) => g.nombre),
      })),
      sinLeer: mios.filter((r) => !r.leido && dirigidoA(r, yo)).length,
      yo: { nombre: yo.nombre, rol: yo.rol },
    });
  }

  // Escribir uno
  if ((ruta === "panel/recado" || ruta === "profe/recado") && post) {
    const b = await cuerpo();
    const texto = limpiar(b.texto, 600);
    if (texto.length < 2) return res({ error: "Escribe el recado." }, 400);
    // Una profesora solo puede escribir al equipo entero; elegir destinatario es de gestión
    const para = yo.rol === "panel" || yo.rol === "recepcion"
      ? (["todos", "profes", "gestion"].includes(b.para) ? b.para : limpiar(b.para, 40) || "todos")
      : "todos";
    await env.CITAS.prepare(
      "INSERT INTO recados (slug, texto, autor, para, fijado, caduca, creado) VALUES (?1,?2,?3,?4,?5,?6,?7)"
    ).bind(cfg.slug, texto, yo.nombre, para, yo.rol === "panel" && b.fijado ? 1 : 0,
      RE_FECHA.test(b.caduca || "") ? b.caduca : null, new Date().toISOString()).run();
    return res({ ok: true });
  }

  // Enterado
  if ((ruta === "panel/recado/leido" || ruta === "profe/recado/leido") && post) {
    const b = await cuerpo();
    await env.CITAS.prepare(
      "INSERT INTO recados_leidos (recado_id, nombre, leido) VALUES (?1,?2,?3) ON CONFLICT(recado_id, nombre) DO NOTHING"
    ).bind(+b.id || 0, yo.nombre, new Date().toISOString()).run();
    return res({ ok: true });
  }

  // Borrar: el suyo o, si gestiona el estudio, cualquiera
  if (ruta === "panel/recado/baja" && post) {
    const b = await cuerpo();
    const r = await env.CITAS.prepare("SELECT * FROM recados WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug).first();
    if (!r) return res({ error: "No encontrado" }, 404);
    if (yo.rol !== "panel" && r.autor !== yo.nombre) return res({ error: "Ese recado no es tuyo." }, 403);
    await env.CITAS.batch([
      env.CITAS.prepare("DELETE FROM recados_leidos WHERE recado_id = ?1").bind(r.id),
      env.CITAS.prepare("DELETE FROM recados WHERE id = ?1").bind(r.id),
    ]);
    return res({ ok: true });
  }

  return null;
}

/* ---------------------------------------------------------------- sustituciones */

/** Los cambios de profesor de un tramo de días, listos para consultar. */
export async function cambiosDe(env, cfg, desde, hasta) {
  try {
    const { results } = await env.CITAS.prepare(
      "SELECT fecha, inicio, servicio, prof, nota FROM cambios WHERE slug = ?1 AND fecha BETWEEN ?2 AND ?3"
    ).bind(cfg.slug, desde, hasta).all();
    const m = {};
    for (const c of results || []) m[`${c.fecha}|${c.inicio}|${c.servicio}`] = c;
    return m;
  } catch (e) { return {}; }
}

export async function atenderSustituciones(request, env, cfg, ruta, url, yo) {
  const res = (d, e = 200) => new Response(JSON.stringify(d), { status: e, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

  if (ruta === "panel/sustituciones" && request.method === "GET") {
    const desde = RE_FECHA.test(url.searchParams.get("desde") || "") ? url.searchParams.get("desde") : hoyMadrid();
    const { results } = await env.CITAS.prepare(
      "SELECT * FROM cambios WHERE slug = ?1 AND fecha >= ?2 ORDER BY fecha, inicio LIMIT 100").bind(cfg.slug, desde).all();
    return res({ cambios: (results || []).map((c) => ({ ...c, hora: hhmm(c.inicio) })) });
  }

  if (ruta === "panel/sustitucion" && request.method === "POST") {
    let b; try { b = await request.json(); } catch (e) { return res({ error: "JSON no válido" }, 400); }
    if (!RE_FECHA.test(b.fecha || "")) return res({ error: "Fecha no válida" }, 400);
    const inicio = Math.max(0, Math.round(+b.inicio || 0));
    const servicio = limpiar(b.servicio, 40);
    if (!servicio) return res({ error: "Falta la clase" }, 400);
    const prof = limpiar(b.prof, 40);
    if (!prof) {   // sin profesor: se quita la sustitución y vuelve el del horario
      await env.CITAS.prepare("DELETE FROM cambios WHERE slug = ?1 AND fecha = ?2 AND inicio = ?3 AND servicio = ?4")
        .bind(cfg.slug, b.fecha, inicio, servicio).run();
      return res({ ok: true, quitada: true });
    }
    const l = await equipo(env, cfg);
    if (!l.some((p) => p.activo && p.nombre === prof)) return res({ error: "Esa persona no está en el equipo." }, 400);
    await env.CITAS.prepare(
      `INSERT INTO cambios (slug, fecha, inicio, servicio, prof, nota, creado) VALUES (?1,?2,?3,?4,?5,?6,?7)
       ON CONFLICT(slug, fecha, inicio, servicio) DO UPDATE SET prof = ?5, nota = ?6`
    ).bind(cfg.slug, b.fecha, inicio, servicio, prof, limpiar(b.nota, 200) || null, new Date().toISOString()).run();
    return res({ ok: true });
  }
  return null;
}
