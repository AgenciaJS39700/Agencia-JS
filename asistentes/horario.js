/**
 * El cuadro de clases, editable desde el panel.
 *
 * Hasta ahora el horario vivía en el archivo del cliente: para mover una clase
 * había que tocar código y volver a publicar. Aquí vive en D1, y la regla es
 * simple: **si el negocio tiene aunque sea una fila en `horario`, esa tabla ES
 * su cuadro de clases** y el archivo deja de contar. Así no hay que mezclar dos
 * fuentes ni adivinar cuál manda.
 *
 * El primer paso desde el panel es copiar el cuadro del archivo a la tabla; a
 * partir de ahí se edita sin tocar nada más.
 */

const res = (datos, estado = 200) =>
  new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const RE_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const limpiar = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n);
const normHora = (h) => { const m = RE_HORA.exec(String(h || "").trim()); return m ? String(+m[1]).padStart(2, "0") + ":" + m[2] : ""; };
export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Las filas del cuadro guardado, agrupadas por día como las espera el motor. */
export async function cuadroDe(env, slug) {
  if (!env || !env.CITAS) return null;
  let r;
  try {
    r = await env.CITAS.prepare(
      "SELECT id, dia, hora, servicio, nombre, min, cap, sala, prof, nota FROM horario WHERE slug = ? AND activo = 1 ORDER BY dia, hora").bind(slug).all();
  } catch (e) { return null; }   // si la tabla aún no existe, el archivo sigue mandando
  const filas = r.results || [];
  if (!filas.length) return null;
  const dias = {};
  for (const f of filas) {
    (dias[f.dia] = dias[f.dia] || []).push({
      h: f.hora, s: f.servicio, nombre: f.nombre || "", min: f.min || 0, cap: f.cap || 0,
      sala: f.sala || "", prof: f.prof || "", nota: f.nota || "", id: f.id,
    });
  }
  return dias;
}

/**
 * Devuelve la configuración que vale para ESTA petición: la del archivo, o una
 * copia con el cuadro del panel encima. Nunca se toca el objeto del cliente,
 * que es compartido entre peticiones.
 */
export async function conHorario(env, cfg) {
  if (!cfg || !cfg.negocio || !cfg.negocio.sesiones) return cfg;
  const dias = await cuadroDe(env, cfg.slug);
  if (!dias) return cfg;
  return { ...cfg, negocio: { ...cfg.negocio, sesiones: dias } };
}

/** Cuántas clases hay ya reservadas en ese hueco de aquí en adelante. */
async function reservadas(env, cfg, dia, hora, servicio, hoy) {
  const r = await env.CITAS.prepare(
    `SELECT COUNT(*) AS n FROM citas
     WHERE slug = ?1 AND estado = 'ok' AND fecha >= ?2 AND servicio = ?3 AND inicio = ?4
       AND CAST(strftime('%w', fecha) AS INTEGER) = ?5`
  ).bind(cfg.slug, hoy, servicio, min2(hora), dia).first().catch(() => null);
  return r ? r.n : 0;
}
const min2 = (t) => { const [a, b] = String(t).split(":").map(Number); return a * 60 + b; };

/* ---------------------------------------------------------------- rutas del panel */
export async function atenderHorario(request, env, cfg, cfgArchivo, ruta, url, yo, apuntar) {
  if (!ruta.startsWith("panel/horario")) return null;
  if (yo.rol !== "panel") return res({ error: "El cuadro de clases lo lleva quien gestiona el estudio." }, 403);
  if (!cfgArchivo.negocio || !cfgArchivo.negocio.sesiones) return res({ error: "Este negocio no trabaja con cuadro de clases." }, 400);
  const post = request.method === "POST";
  const hoy = new Date(Date.now() + 3600000).toISOString().slice(0, 10);

  if (ruta === "panel/horario" && request.method === "GET") {
    const dias = await cuadroDe(env, cfg.slug);
    const fuente = dias ? "panel" : "archivo";
    const base = dias || cfgArchivo.negocio.sesiones || {};
    // Salas y profesores que ya se usan: para ofrecerlos en vez de hacer escribir
    const salas = new Set(), profes = new Set();
    for (const l of Object.values(base)) for (const x of l || []) { if (x.sala) salas.add(x.sala); if (x.prof) profes.add(x.prof); }
    return res({
      fuente,
      dias: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, (base[d] || []).map((x) => {
        const sv = cfgArchivo.servicios.find((s) => s.id === x.s);
        return {
          id: x.id || null, hora: x.h, servicio: x.s,
          nombre: x.nombre || (sv && sv.nombre) || x.s,
          min: x.min || (sv && sv.min) || 60, cap: x.cap || 1,
          sala: x.sala || "", prof: x.prof || "", nota: x.nota || "",
          servicioOk: !!sv,
        };
      }).sort((p, q) => p.hora.localeCompare(q.hora))])),
      servicios: cfgArchivo.servicios.map((s) => ({ id: s.id, nombre: s.nombre, min: s.min || 60 })),
      salas: [...salas].sort(), profes: [...profes].sort(),
      clases: Object.values(base).reduce((n, l) => n + (l || []).length, 0),
    });
  }

  if (!post) return null;
  let b; try { b = await request.json(); } catch (e) { return res({ error: "JSON no válido" }, 400); }

  // Copiar el cuadro del archivo a la tabla: el paso de «esto es mío» de antes de editar
  if (ruta === "panel/horario/copiar") {
    if (await cuadroDe(env, cfg.slug)) return res({ error: "El cuadro ya se lleva desde el panel." }, 400);
    const ahora = new Date().toISOString();
    const filas = [];
    for (const [d, l] of Object.entries(cfgArchivo.negocio.sesiones || {})) {
      for (const x of l || []) {
        const sv = cfgArchivo.servicios.find((s) => s.id === x.s);
        filas.push(env.CITAS.prepare(
          "INSERT INTO horario (slug, dia, hora, servicio, nombre, min, cap, sala, prof, nota, activo, creado) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,1,?11)"
        ).bind(cfg.slug, +d, normHora(x.h), x.s, x.nombre || (sv && sv.nombre) || x.s,
          x.min || (sv && sv.min) || 60, x.cap || 1, x.sala || "", x.prof || "", x.nota || "", ahora));
      }
    }
    if (!filas.length) return res({ error: "El archivo no tiene ninguna clase que copiar." }, 400);
    await env.CITAS.batch(filas);
    if (apuntar) await apuntar("horario", `copió el cuadro de clases al panel (${filas.length} clases)`);
    return res({ ok: true, clases: filas.length });
  }

  // Alta y cambio de una clase
  if (ruta === "panel/horario/clase") {
    const dias = await cuadroDe(env, cfg.slug);
    if (!dias) return res({ error: "Primero copia el cuadro al panel." }, 400);
    const dia = Math.min(6, Math.max(0, Math.round(+b.dia)));
    const hora = normHora(b.hora);
    if (!hora) return res({ error: "La hora tiene que ser como 10:00." }, 400);
    const sv = cfgArchivo.servicios.find((s) => s.id === b.servicio);
    if (!sv) return res({ error: "Elige una actividad de la lista." }, 400);
    const min = Math.min(300, Math.max(5, Math.round(+b.min || sv.min || 60)));
    const cap = Math.min(200, Math.max(1, Math.round(+b.cap || 1)));
    const id = +b.id || 0;
    // Dos clases de la misma actividad a la misma hora el mismo día no pueden existir:
    // la reserva las distingue por día + hora + actividad.
    const choca = (dias[dia] || []).find((x) => x.h === hora && x.s === sv.id && x.id !== id);
    if (choca) return res({ error: `Ya hay ${choca.nombre || sv.nombre} ese día a las ${hora}.` }, 400);

    const campos = [cfg.slug, dia, hora, sv.id, limpiar(b.nombre, 80) || sv.nombre,
      min, cap, limpiar(b.sala, 60), limpiar(b.prof, 40), limpiar(b.nota, 120)];
    if (id) {
      const antes = Object.values(dias).flat().find((x) => x.id === id);
      await env.CITAS.prepare(
        "UPDATE horario SET dia=?2, hora=?3, servicio=?4, nombre=?5, min=?6, cap=?7, sala=?8, prof=?9, nota=?10 WHERE id=?11 AND slug=?1"
      ).bind(...campos, id).run();
      // Si la clase se mueve de hueco, las reservas que ya había se quedan donde estaban
      const movida = antes && (antes.h !== hora || antes.s !== sv.id);
      let colgadas = 0;
      if (movida) colgadas = await reservadas(env, cfg, dia, antes.h, antes.s, hoy);
      if (apuntar) await apuntar("horario", `cambió ${limpiar(b.nombre, 80) || sv.nombre} del ${DIAS[dia]} a las ${hora}`);
      return res({ ok: true, colgadas, movida: !!movida });
    }
    const r = await env.CITAS.prepare(
      "INSERT INTO horario (slug, dia, hora, servicio, nombre, min, cap, sala, prof, nota, activo, creado) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,1,?11)"
    ).bind(...campos, new Date().toISOString()).run();
    if (apuntar) await apuntar("horario", `añadió ${limpiar(b.nombre, 80) || sv.nombre} el ${DIAS[dia]} a las ${hora}`);
    return res({ ok: true, id: r.meta.last_row_id });
  }

  // Quitar una clase del cuadro. Avisa antes si hay gente apuntada de aquí en adelante.
  if (ruta === "panel/horario/baja") {
    const dias = await cuadroDe(env, cfg.slug);
    if (!dias) return res({ error: "Primero copia el cuadro al panel." }, 400);
    const id = +b.id || 0;
    const x = Object.values(dias).flat().find((c) => c.id === id);
    if (!x) return res({ error: "Esa clase no está en el cuadro." }, 404);
    const dia = +Object.entries(dias).find(([, l]) => l.some((c) => c.id === id))[0];
    const n = await reservadas(env, cfg, dia, x.h, x.s, hoy);
    if (n && !b.aunque) {
      return res({ confirmar: true, reservadas: n, mensaje: `Hay ${n === 1 ? "1 alumna apuntada" : n + " alumnas apuntadas"} a esa clase de aquí en adelante. Si la quitas del cuadro, sus reservas se quedan en la agenda y habrá que avisarlas a mano.` }, 409);
    }
    await env.CITAS.prepare("DELETE FROM horario WHERE id = ?1 AND slug = ?2").bind(id, cfg.slug).run();
    if (apuntar) await apuntar("horario", `quitó ${x.nombre || x.s} del ${DIAS[dia]} a las ${x.h}${n ? ` (${n} reservas en pie)` : ""}`);
    return res({ ok: true, reservadas: n });
  }

  // Volver al cuadro del archivo (deshacer todo lo del panel)
  if (ruta === "panel/horario/archivo") {
    if (!b.seguro) return res({ confirmar: true, mensaje: "Esto borra el cuadro que has montado en el panel y vuelve al que viene de fábrica. No se puede deshacer." }, 409);
    await env.CITAS.prepare("DELETE FROM horario WHERE slug = ?1").bind(cfg.slug).run();
    if (apuntar) await apuntar("horario", "devolvió el cuadro de clases al de fábrica");
    return res({ ok: true });
  }

  return null;
}
