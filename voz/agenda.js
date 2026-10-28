// /voz/agenda.js — Agenda de demostración para el agente de voz (ElevenLabs Agents → herramientas webhook).
// POST /api/voz/huecos  { dia, servicio? }                → huecos libres de ese día
// POST /api/voz/cita    { nombre, telefono, servicio, dia, hora } → confirma la cita
// Demo: no guarda datos personales; los huecos se generan de forma estable para cada fecha.
// Para un cliente real: sustituir huecosDe() por su agenda (D1 o Google Calendar) y guardar la cita.

const TZ = "Europe/Madrid";
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SERVICIOS = ["primera visita", "revisión", "limpieza", "blanqueamiento", "ortodoncia", "empaste", "urgencia", "implantes"];

function hoyMadrid() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(p + "T12:00:00Z");
}
function iso(d) { return d.toISOString().slice(0, 10); }
function legible(d) { return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; }
function limpiar(v, n) { return String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, n); }

// Interpreta «hoy», «mañana», «pasado mañana», «lunes», «el 3», «3 de noviembre» o «2026-11-03»
export function resolverDia(texto) {
  const t = limpiar(texto, 40).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const hoy = hoyMadrid();
  const mas = (n) => new Date(hoy.getTime() + n * 86400000);
  if (!t) return hoy;
  const m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const i = dias.findIndex((d) => t.includes(d));
  if (i >= 0) { let n = (i - hoy.getUTCDay() + 7) % 7; if (n === 0 || t.includes("que viene") || t.includes("proximo")) n = n || 7; return mas(n); }
  const dm = t.match(/(\d{1,2})(?:\s*de\s*([a-z]+))?/);
  if (dm) {
    const dia = +dm[1];
    const mesTxt = dm[2] ? MESES.findIndex((x) => x.normalize("NFD").replace(/[̀-ͯ]/g, "") === dm[2]) : -1;
    let d = new Date(Date.UTC(hoy.getUTCFullYear(), mesTxt >= 0 ? mesTxt : hoy.getUTCMonth(), dia, 12));
    if (d < hoy) d = mesTxt >= 0 ? new Date(Date.UTC(hoy.getUTCFullYear() + 1, mesTxt, dia, 12)) : new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, dia, 12));
    return d;
  }
  // Solo si no hay día de la semana ni número: «hoy», «pasado mañana», «mañana» (no confundir con «por la mañana»)
  if (t.includes("hoy")) return hoy;
  if (t.includes("pasado")) return mas(2);
  if (/(^|\s)manana/.test(t) && !/por la manana|de la manana/.test(t)) return mas(1);
  if (/por la manana|de la manana/.test(t)) return hoy;
  return null;
}

// Horario de la clínica de demo: L–V 9:00–14:00 y 16:00–20:00 · S 10:00–14:00 · D cerrado
function huecosDe(d) {
  const dw = d.getUTCDay();
  if (dw === 0) return [];
  const franjas = dw === 6 ? [[10, 14]] : [[9, 14], [16, 20]];
  const todos = [];
  franjas.forEach(([a, b]) => { for (let h = a; h < b; h += 0.5) todos.push(`${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`); });
  // Ocupación estable por fecha (parece una agenda real y no cambia entre llamadas)
  let s = [...iso(d)].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7);
  const libres = todos.filter(() => { s = (s * 1103515245 + 12345) >>> 0; return (s >> 16) % 100 < 28; });
  // Si es hoy, quitar las horas ya pasadas
  if (iso(d) === iso(hoyMadrid())) {
    const ahora = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    return libres.filter((h) => h > ahora);
  }
  return libres;
}

function res(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function atenderVoz(request, ruta) {
  if (request.method !== "POST") return res({ error: "Método no permitido" }, 405);
  let b = {};
  try { const tx = await request.text(); if (tx.length > 2000) return res({ error: "Petición demasiado grande" }, 413); b = tx ? JSON.parse(tx) : {}; } catch (e) { return res({ error: "JSON no válido" }, 400); }

  const d = resolverDia(b.dia);
  if (!d) return res({ ok: false, mensaje: "No he entendido el día. Pide al paciente un día concreto, por ejemplo «el martes» o «el 5 de noviembre»." });
  if (d < hoyMadrid()) return res({ ok: false, mensaje: "Ese día ya ha pasado. Ofrece otro día." });
  const max = new Date(hoyMadrid().getTime() + 60 * 86400000);
  if (d > max) return res({ ok: false, mensaje: "Solo damos citas con hasta dos meses de antelación." });
  const libres = huecosDe(d);

  if (ruta === "huecos") {
    if (!libres.length) {
      // Proponer el siguiente día con huecos
      for (let k = 1; k <= 7; k++) { const n = new Date(d.getTime() + k * 86400000); const h = huecosDe(n); if (h.length) return res({ ok: true, fecha: iso(d), dia: legible(d), libres: [], mensaje: `El ${legible(d)} no hay huecos (o está cerrado). El primer día con huecos es el ${legible(n)}: ${h.slice(0, 4).join(", ")}.`, alternativa: { fecha: iso(n), dia: legible(n), libres: h.slice(0, 4) } }); }
    }
    const man = libres.filter((h) => h < "14:00").slice(0, 3), tar = libres.filter((h) => h >= "14:00").slice(0, 3);
    return res({ ok: true, fecha: iso(d), dia: legible(d), manana: man, tarde: tar, mensaje: `Huecos libres el ${legible(d)}: por la mañana ${man.join(", ") || "ninguno"}; por la tarde ${tar.join(", ") || "ninguno"}.` });
  }

  if (ruta === "cita") {
    const nombre = limpiar(b.nombre, 60), tel = limpiar(b.telefono, 20).replace(/[^\d+]/g, ""), serv = limpiar(b.servicio, 40).toLowerCase(), hora = limpiar(b.hora, 5);
    if (!nombre || nombre.length < 2) return res({ ok: false, mensaje: "Falta el nombre del paciente." });
    if (tel.replace(/\D/g, "").length < 9) return res({ ok: false, mensaje: "El teléfono no parece completo. Pídelo de nuevo, cifra a cifra." });
    if (!/^\d{1,2}:\d{2}$/.test(hora)) return res({ ok: false, mensaje: "Falta la hora (formato 10:30)." });
    const h = hora.padStart(5, "0");
    if (!libres.includes(h)) return res({ ok: false, mensaje: `Las ${h} del ${legible(d)} ya no está libre. Libres: ${libres.slice(0, 5).join(", ") || "ninguno"}.` });
    const codigo = "CS-" + (([...(nombre + tel + iso(d) + h)].reduce((x, c) => (x * 33 + c.charCodeAt(0)) >>> 0, 5381) % 9000) + 1000);
    return res({ ok: true, codigo, mensaje: `Cita confirmada: ${SERVICIOS.includes(serv) ? serv : serv || "consulta"} el ${legible(d)} a las ${h}, a nombre de ${nombre}. Código ${codigo}.` });
  }
  return res({ error: "No encontrado" }, 404);
}
