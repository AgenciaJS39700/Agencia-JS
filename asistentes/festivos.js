/**
 * Calendario de festivos y vacaciones.
 *
 * Cerrar un día suelto ya se podía; lo que faltaba era no tener que acordarse.
 * Aquí se proponen los festivos del año y se cierran de un clic. Los nacionales
 * y los de la comunidad están fijados por ley y se calculan solos (incluida la
 * Semana Santa, que se mueve). **Los dos locales los decide cada ayuntamiento
 * año a año**, así que se proponen marcados para confirmar: se enseñan, pero no
 * se dan por buenos.
 *
 * No inventa nada: lo que no se puede calcular con certeza va avisado.
 */

const res = (datos, estado = 200) =>
  new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const iso = (d) => d.toISOString().slice(0, 10);
const dia = (a, m, d) => iso(new Date(Date.UTC(a, m - 1, d)));
const mas = (f, n) => iso(new Date(Date.parse(f + "T12:00:00Z") + n * 86400000));

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function pascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), diaM = ((h + l - 7 * m + 114) % 31) + 1;
  return dia(anio, mes, diaM);
}

/**
 * Los festivos propuestos de un año. `cfg.festivos` puede traer los de la
 * comunidad y el municipio del negocio; si no, se usan los de Andalucía y
 * Málaga capital, que es de donde es el estudio.
 */
export function festivosDe(anio, cfg) {
  const p = pascua(anio);
  const prop = (cfg && cfg.festivos) || {};
  const l = [
    { fecha: dia(anio, 1, 1), nombre: "Año Nuevo", tipo: "nacional" },
    { fecha: dia(anio, 1, 6), nombre: "Reyes", tipo: "nacional" },
    { fecha: mas(p, -3), nombre: "Jueves Santo", tipo: "autonomico" },
    { fecha: mas(p, -2), nombre: "Viernes Santo", tipo: "nacional" },
    { fecha: dia(anio, 5, 1), nombre: "Fiesta del Trabajo", tipo: "nacional" },
    { fecha: dia(anio, 8, 15), nombre: "Asunción de la Virgen", tipo: "nacional" },
    { fecha: dia(anio, 10, 12), nombre: "Fiesta Nacional de España", tipo: "nacional" },
    { fecha: dia(anio, 11, 1), nombre: "Todos los Santos", tipo: "nacional" },
    { fecha: dia(anio, 12, 6), nombre: "Día de la Constitución", tipo: "nacional" },
    { fecha: dia(anio, 12, 8), nombre: "Inmaculada Concepción", tipo: "nacional" },
    { fecha: dia(anio, 12, 25), nombre: "Navidad", tipo: "nacional" },
  ];
  const auto = prop.comunidad || [{ mes: 2, dia: 28, nombre: "Día de Andalucía" }];
  for (const x of auto) l.push({ fecha: dia(anio, x.mes, x.dia), nombre: x.nombre, tipo: "autonomico" });
  // Los dos del municipio los fija el ayuntamiento cada año: se proponen, no se afirman
  const loc = prop.locales || [
    { mes: 8, dia: 19, nombre: "Feria de Málaga (incorporación a la Corona de Castilla)" },
    { mes: 9, dia: 8, nombre: "Virgen de la Victoria" },
  ];
  for (const x of loc) l.push({ fecha: dia(anio, x.mes, x.dia), nombre: x.nombre, tipo: "local", confirmar: true });

  const SEM = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return l
    .filter((x) => x.fecha.slice(0, 4) === String(anio))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((x) => ({ ...x, semana: SEM[new Date(x.fecha + "T12:00:00Z").getUTCDay()] }));
}

export async function atenderFestivos(request, env, cfg, ruta, url, yo, apuntar) {
  if (!ruta.startsWith("panel/festivos")) return null;
  const anio = Math.min(2100, Math.max(2000, +((url.searchParams.get("anio")) || (new Date()).getUTCFullYear())));

  if (ruta === "panel/festivos" && request.method === "GET") {
    const lista = festivosDe(anio, cfg);
    // Un día «cerrado» es un bloqueo de día entero; los cierres de unas horas no cuentan
    const { results } = await env.CITAS.prepare(
      "SELECT fecha, motivo FROM bloqueos WHERE slug = ?1 AND fecha LIKE ?2 AND inicio <= 0 AND fin >= 1440").bind(cfg.slug, anio + "-%").all();
    const cerrados = new Set((results || []).map((b) => b.fecha));
    return res({
      anio,
      festivos: lista.map((x) => ({ ...x, cerrado: cerrados.has(x.fecha) })),
      cerrados: [...cerrados].sort(),
      aviso: "Los dos festivos del municipio los fija el ayuntamiento cada año. Confírmalos en su calendario antes de darlos por buenos.",
    });
  }

  if (request.method !== "POST") return null;
  let b; try { b = await request.json(); } catch (e) { return res({ error: "JSON no válido" }, 400); }

  if (ruta === "panel/festivos/cerrar") {
    const fechas = (Array.isArray(b.fechas) ? b.fechas : []).filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f)).slice(0, 60);
    if (!fechas.length) return res({ error: "No has marcado ningún día." }, 400);
    const lista = festivosDe(+fechas[0].slice(0, 4), cfg);
    const nombre = (f) => { const x = lista.find((y) => y.fecha === f); return x ? x.nombre : "Festivo"; };
    if (b.abrir) {
      await env.CITAS.batch(fechas.map((f) =>
        env.CITAS.prepare("DELETE FROM bloqueos WHERE slug = ?1 AND fecha = ?2 AND inicio <= 0 AND fin >= 1440").bind(cfg.slug, f)));
      if (apuntar) await apuntar("cierre", `volvió a abrir ${fechas.length === 1 ? "el " + fechas[0] : fechas.length + " festivos"}`);
      return res({ ok: true, abiertos: fechas.length });
    }
    // Sin repetir: si ya estaba cerrado el día entero, se deja como está
    const { results } = await env.CITAS.prepare(
      "SELECT fecha FROM bloqueos WHERE slug = ?1 AND inicio <= 0 AND fin >= 1440").bind(cfg.slug).all();
    const ya = new Set((results || []).map((x) => x.fecha));
    const nuevas = fechas.filter((f) => !ya.has(f));
    if (!nuevas.length) return res({ ok: true, cerrados: 0 });
    await env.CITAS.batch(nuevas.map((f) =>
      env.CITAS.prepare("INSERT INTO bloqueos (slug, fecha, inicio, fin, motivo) VALUES (?1,?2,0,1440,?3)").bind(cfg.slug, f, nombre(f))));
    if (apuntar) await apuntar("cierre", `cerró ${nuevas.length === 1 ? "el " + nuevas[0] + " (" + nombre(nuevas[0]) + ")" : nuevas.length + " festivos del " + nuevas[0].slice(0, 4)}`);
    return res({ ok: true, cerrados: nuevas.length });
  }

  return null;
}
