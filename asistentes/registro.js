/**
 * Quién hizo qué.
 *
 * Con una sola persona en el panel esto sobra. Con tres —la dueña, recepción y
 * quien entre a echar una mano— es lo que resuelve las discusiones: quién cobró
 * ese bono, quién anuló esa clase, quién emitió esa factura, quién movió esa
 * clase de hora. No sustituye a nada; se apunta al lado de lo que ya se hacía.
 *
 * Reglas: solo se apuntan acciones que cambian algo, nunca lecturas. No se
 * guarda ni la IP ni el navegador: aquí interesa el nombre y poco más.
 */

const res = (datos, estado = 200) =>
  new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const DIAS_GUARDA = 400;   // algo más de un año: lo que dura una discusión

/**
 * Devuelve la función con la que el resto del panel deja constancia.
 * No hace esperar a quien está trabajando: se escribe de fondo.
 */
export function anotador(env, cfg, yo, ctx) {
  return async function apuntar(tipo, detalle) {
    if (!env.CITAS || !yo) return;
    const p = env.CITAS.prepare(
      "INSERT INTO registro (slug, cuando, quien, rol, tipo, detalle) VALUES (?1,?2,?3,?4,?5,?6)"
    ).bind(cfg.slug, new Date().toISOString(), yo.nombre || "?", yo.rol || "", String(tipo).slice(0, 24), String(detalle == null ? "" : detalle).slice(0, 300)).run();
    if (ctx && ctx.waitUntil) ctx.waitUntil(p.catch(() => {}));
    else await p.catch(() => {});
  };
}

export async function atenderRegistro(request, env, cfg, ruta, url, yo) {
  if (ruta !== "panel/registro") return null;
  if (request.method !== "GET") return res({ error: "Método no permitido" }, 405);
  if (yo.rol !== "panel") return res({ error: "El registro lo ve quien gestiona el estudio." }, 403);
  const quien = String(url.searchParams.get("quien") || "");
  const tipo = String(url.searchParams.get("tipo") || "");
  const { results } = await env.CITAS.prepare(
    `SELECT id, cuando, quien, rol, tipo, detalle FROM registro
     WHERE slug = ?1 AND (?2 = '' OR quien = ?2) AND (?3 = '' OR tipo = ?3)
     ORDER BY id DESC LIMIT 300`).bind(cfg.slug, quien, tipo).all();
  const gente = await env.CITAS.prepare("SELECT DISTINCT quien FROM registro WHERE slug = ?1 ORDER BY quien").bind(cfg.slug).all();
  // Limpieza perezosa: se tira lo viejo cuando alguien mira, sin tarea aparte
  env.CITAS.prepare("DELETE FROM registro WHERE slug = ?1 AND cuando < ?2")
    .bind(cfg.slug, new Date(Date.now() - DIAS_GUARDA * 86400000).toISOString()).run().catch(() => {});
  return res({
    apuntes: results || [],
    gente: (gente.results || []).map((g) => g.quien),
    tipos: ["cobro", "cita", "factura", "gestoria", "horario", "equipo", "alumna", "bono", "cierre", "sustitucion", "recado", "promo"],
  });
}
