// /asistentes/eventos.js — Talleres, retiros y encuentros con venta de entradas.
// Un evento es una actividad suelta con fecha, precio y aforo: el taller de Yoga Nidra,
// un círculo de mujeres, un retiro o un encuentro gratuito.
//
// Público:   GET eventos · POST entrada {evento, cantidad, nombre, email, telefono}
// Panel:     GET panel/eventos · POST panel/evento · POST panel/evento/baja
//            GET panel/entradas?evento= · POST panel/entrada/baja

import { correo, marco, boton, esc } from "./correo.js";

const te = new TextEncoder();
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const limpiar = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const largo = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const correoLimpio = (v) => String(v || "").trim().toLowerCase().slice(0, 254);
const RE_MAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const soloTel = (v) => String(v || "").replace(/[^\d+ ]/g, "").trim().slice(0, 16);
const euros = (c) => c === 0 ? "gratis" : (c / 100).toLocaleString("es-ES", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const legible = (f) => { const d = new Date(f + "T12:00:00Z"); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; };
const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
function codigo() {
  const r = crypto.getRandomValues(new Uint8Array(6));
  return [...r].map((x) => ALFABETO[x % ALFABETO.length]).join("");
}
function res(datos, estado = 200, cabeceras = {}) {
  return new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cabeceras } });
}

/** Plazas que quedan en un evento (cuenta solo las entradas confirmadas). */
async function libres(env, cfg, ev) {
  const r = await env.CITAS.prepare("SELECT COALESCE(SUM(cantidad),0) AS n FROM entradas WHERE slug = ?1 AND evento_id = ?2 AND estado = 'ok'").bind(cfg.slug, ev.id).first();
  return Math.max(0, ev.aforo - (r ? r.n : 0));
}

async function listaPublica(env, cfg) {
  const { results } = await env.CITAS.prepare(
    "SELECT * FROM eventos WHERE slug = ?1 AND estado = 'abierto' AND fecha >= ?2 ORDER BY fecha, hora LIMIT 30"
  ).bind(cfg.slug, hoyMadrid()).all();
  const out = [];
  for (const e of results || []) {
    const n = await libres(env, cfg, e);
    out.push({
      id: e.id, nombre: e.nombre, descripcion: e.descripcion, fecha: e.fecha, dia: legible(e.fecha),
      hora: e.hora, min: e.min, lugar: e.lugar, precio: e.precio, precioTexto: euros(e.precio),
      aforo: e.aforo, libres: n, nota: e.nota, agotado: n <= 0,
    });
  }
  return out;
}

function correoEntrada(cfg, ev, en) {
  return marco(cfg, ev.precio ? "Entrada confirmada" : "Plaza confirmada",
    `<p style="font-size:15px;line-height:1.7">Ya tienes tu sitio en <b>${esc(ev.nombre)}</b>.</p>
     <p style="font-size:15px;line-height:1.7;background:#f6f6f8;padding:14px 16px;border-radius:10px">
      <b>${esc(legible(ev.fecha))}${ev.hora ? " a las " + esc(ev.hora) : ""}</b><br>
      ${esc(ev.lugar || cfg.negocio.direccion)}<br>
      ${en.cantidad > 1 ? en.cantidad + " entradas · " : ""}${esc(euros(en.importe))}<br>
      Código: <b>${esc(en.codigo)}</b></p>
     <p style="font-size:14px;color:#555;line-height:1.6">Enseña este código al llegar. Si al final no puedes venir, avísanos para dejar la plaza libre.</p>
     ${boton(cfg, (cfg.negocio.web || "") + "mi-cuenta/", "Ver en mi cuenta")}`);
}

/* ---------------------------------------------------------------- público */
export async function atenderEventos(request, env, ctx, cfg, ruta, url, cab, alumna, crearPagoEvento) {
  const r = (d, e = 200) => res(d, e, cab);
  const post = request.method === "POST";
  const cuerpo = async () => { try { return await request.json(); } catch (e) { return {}; } };

  if (ruta === "eventos" && request.method === "GET") {
    return r({ eventos: await listaPublica(env, cfg) });
  }

  if (ruta === "entrada" && post) {
    const b = await cuerpo();
    const ev = await env.CITAS.prepare("SELECT * FROM eventos WHERE id = ?1 AND slug = ?2 AND estado = 'abierto'").bind(+b.evento || 0, cfg.slug).first();
    if (!ev) return r({ error: "Ese evento ya no está disponible." }, 404);
    if (ev.fecha < hoyMadrid()) return r({ error: "Ese evento ya ha pasado." }, 409);
    const cantidad = Math.min(6, Math.max(1, Math.round(+b.cantidad || 1)));
    const quedan = await libres(env, cfg, ev);
    if (quedan < cantidad) return r({ error: quedan ? `Solo quedan ${quedan} plazas.` : "El evento está completo." }, 409);

    const nombre = limpiar(alumna ? alumna.nombre : b.nombre, 60);
    const email = correoLimpio(alumna ? alumna.email : b.email);
    const tel = soloTel(alumna ? alumna.telefono : b.telefono);
    if (nombre.length < 2) return r({ error: "Escribe tu nombre." }, 400);
    if (!RE_MAIL.test(email)) return r({ error: "Escribe un correo para mandarte la entrada." }, 400);

    const cod = codigo();
    const importe = ev.precio * cantidad;
    const ins = await env.CITAS.prepare(
      `INSERT INTO entradas (slug, evento_id, alumno_id, codigo, nombre, email, telefono, cantidad, importe, estado)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10
       WHERE (SELECT COALESCE(SUM(cantidad),0) FROM entradas WHERE slug = ?1 AND evento_id = ?2 AND estado = 'ok') + ?8 <= ?11`
    ).bind(cfg.slug, ev.id, alumna ? alumna.id : null, cod, nombre, email, tel, cantidad, importe,
      ev.precio ? "pendiente" : "ok", ev.aforo).run();
    if (!ins.meta.changes) return r({ error: "Acaban de agotarse las plazas." }, 409);
    const entradaId = ins.meta.last_row_id;

    if (!ev.precio) {
      ctx.waitUntil(correo(env, cfg, email, nombre, `Plaza confirmada · ${ev.nombre}`,
        correoEntrada(cfg, ev, { codigo: cod, cantidad, importe: 0 })).catch(() => {}));
      return r({ ok: true, gratis: true, codigo: cod, mensaje: `Plaza confirmada para ${ev.nombre}. Te hemos mandado el detalle al correo.` });
    }
    const pago = await crearPagoEvento(env, cfg, { id: entradaId, codigo: cod, email, nombre, cantidad, importe }, ev);
    if (pago.error) {
      await env.CITAS.prepare("DELETE FROM entradas WHERE id = ?1").bind(entradaId).run();
      return r({ error: pago.error }, 400);
    }
    return r({ ok: true, url: pago.url });
  }

  return null;
}

/** Confirma una entrada cuando Stripe avisa de que está pagada. Idempotente. */
export async function confirmaEntrada(env, cfg, sesion) {
  const md = sesion.metadata || {};
  const id = +md.entrada || 0;
  if (!id) return false;
  const u = await env.CITAS.prepare("UPDATE entradas SET estado = 'ok', stripe_id = ?2 WHERE id = ?1 AND slug = ?3 AND estado != 'ok'")
    .bind(id, sesion.id, cfg.slug).run();
  if (!u.meta.changes) return false;
  const en = await env.CITAS.prepare("SELECT * FROM entradas WHERE id = ?1").bind(id).first();
  const ev = await env.CITAS.prepare("SELECT * FROM eventos WHERE id = ?1").bind(en.evento_id).first();
  if (!en || !ev) return true;
  await env.CITAS.prepare("INSERT OR IGNORE INTO pagos (slug, alumno_id, concepto, importe, estado, stripe_id) VALUES (?1,?2,?3,?4,'pagado',?5)")
    .bind(cfg.slug, en.alumno_id, `${ev.nombre} · ${en.cantidad} ${en.cantidad === 1 ? "entrada" : "entradas"}`, en.importe, sesion.id).run();
  await correo(env, cfg, en.email, en.nombre, `Entrada confirmada · ${ev.nombre}`, correoEntrada(cfg, ev, en)).catch(() => {});
  return true;
}

/* ---------------------------------------------------------------- panel */
export async function atenderPanelEventos(request, env, cfg, ruta, url) {
  const post = request.method === "POST";
  const cuerpo = async () => { try { return await request.json(); } catch (e) { return {}; } };

  if (ruta === "panel/eventos" && request.method === "GET") {
    const { results } = await env.CITAS.prepare(
      `SELECT e.*, (SELECT COALESCE(SUM(cantidad),0) FROM entradas t WHERE t.evento_id = e.id AND t.estado = 'ok') AS vendidas,
              (SELECT COALESCE(SUM(importe),0) FROM entradas t WHERE t.evento_id = e.id AND t.estado = 'ok') AS recaudado
       FROM eventos e WHERE e.slug = ?1 ORDER BY e.fecha DESC LIMIT 100`).bind(cfg.slug).all();
    return res({ eventos: (results || []).map((e) => ({ ...e, dia: legible(e.fecha), precioTexto: euros(e.precio) })) });
  }

  if (ruta === "panel/evento" && post) {
    const b = await cuerpo();
    const nombre = limpiar(b.nombre, 100);
    if (!nombre || !RE_FECHA.test(b.fecha || "")) return res({ error: "Falta el nombre o la fecha" }, 400);
    const campos = [nombre, largo(b.descripcion, 600), b.fecha, limpiar(b.hora, 5), Math.max(15, Math.round(+b.min || 90)),
      limpiar(b.lugar, 120), Math.max(0, Math.round(+b.precio || 0)), Math.max(1, Math.round(+b.aforo || 20)), limpiar(b.nota, 120)];
    if (+b.id) {
      await env.CITAS.prepare(
        "UPDATE eventos SET nombre=?2, descripcion=?3, fecha=?4, hora=?5, min=?6, lugar=?7, precio=?8, aforo=?9, nota=?10 WHERE id=?1 AND slug=?11"
      ).bind(+b.id, ...campos, cfg.slug).run();
      return res({ ok: true, id: +b.id });
    }
    const ins = await env.CITAS.prepare(
      "INSERT INTO eventos (slug, nombre, descripcion, fecha, hora, min, lugar, precio, aforo, nota) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)"
    ).bind(cfg.slug, ...campos).run();
    return res({ ok: true, id: ins.meta.last_row_id });
  }

  if (ruta === "panel/evento/baja" && post) {
    const b = await cuerpo();
    await env.CITAS.prepare("UPDATE eventos SET estado = ?3 WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug, b.abrir ? "abierto" : "cerrado").run();
    return res({ ok: true });
  }

  if (ruta === "panel/entradas" && request.method === "GET") {
    const ev = +url.searchParams.get("evento") || 0;
    const { results } = await env.CITAS.prepare(
      "SELECT * FROM entradas WHERE slug = ?1 AND evento_id = ?2 ORDER BY id DESC LIMIT 300").bind(cfg.slug, ev).all();
    return res({ entradas: (results || []).map((e) => ({ ...e, importeTexto: euros(e.importe) })) });
  }

  if (ruta === "panel/entrada/baja" && post) {
    const b = await cuerpo();
    await env.CITAS.prepare("UPDATE entradas SET estado = 'anulada' WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug).run();
    return res({ ok: true });
  }

  return null;
}
