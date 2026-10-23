// /asistentes/asistente.js — Ventana de chat de los asistentes de citas (navegador, módulo ES).
// Uso: import { abrirAsistente } from "/asistentes/asistente.js";  abrirAsistente("dental", { demo: true });
// Las dudas las responde /api/asistente; la reserva es un flujo guiado (servicio → día → hora → nombre → confirmar)
// que no depende de la respuesta del modelo. En la demo la agenda es simulada; en un cliente real se conecta
// a su agenda (D1 / Google Calendar) y a su WhatsApp.

import { SECTORES } from "./sectores.js";

const WA_AGENCIA = "34688933308";
const MAX_PREGUNTAS = 15;
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Iconos (trazo 24×24) de cada sector; los usa también el mercado de la web. */
export const ICONOS = {
  tooth: '<path d="M7 3C4.8 3 3 4.8 3 7.2c0 2.3 1 3.6 1.6 5.3.6 1.8.7 4 1.4 6.2.4 1.3 1.1 2.3 2 2.3 1.4 0 1.6-2 2-3.7.3-1.2 1-2.3 2-2.3s1.7 1.1 2 2.3c.4 1.7.6 3.7 2 3.7.9 0 1.6-1 2-2.3.7-2.2.8-4.4 1.4-6.2.6-1.7 1.6-3 1.6-5.3C21 4.8 19.2 3 17 3c-1.8 0-2.9 1-5 1S8.8 3 7 3z"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
};
export const svg = (k, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONOS[k] || ""}</svg>`;

/* ---------- utilidades ---------- */
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const min2 = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const ymd = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
const hash = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967295; };
const waUrl = (num, txt) => "https://wa.me/" + num + "?text=" + encodeURIComponent(txt);

/** Huecos libres de un día (agenda simulada y estable: los mismos huecos cada vez que se abre). */
function huecos(cfg, dia, duracion) {
  const tramos = cfg.negocio.horario[dia.getDay()] || [];
  const ahora = new Date(), hoy = ymd(dia) === ymd(ahora);
  const limite = ahora.getHours() * 60 + ahora.getMinutes() + 60;
  const out = [];
  for (const [a, b] of tramos) {
    for (let t = min2(a); t + duracion <= min2(b); t += 30) {
      if (hoy && t < limite) continue;
      if (hash(cfg.id + ymd(dia) + t) < 0.38) continue; // ocupado
      out.push(t);
    }
  }
  return out;
}
function proximosDias(cfg, duracion, n = 8) {
  const dias = [], d = new Date(); d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 21 && dias.length < n; i++) {
    const x = new Date(d); x.setDate(d.getDate() + i);
    if (huecos(cfg, x, duracion).length) dias.push(x);
  }
  return dias;
}
function etiquetaDia(d) {
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const dif = Math.round((d - hoy) / 864e5);
  return dif === 0 ? "Hoy" : dif === 1 ? "Mañana" : `${DIAS[d.getDay()]} ${d.getDate()}`;
}
const fechaLarga = (d) => `${DIAS_L[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;

function ics(cfg, cita) {
  const p = (n) => String(n).padStart(2, "0");
  const f = (d, m) => { const x = new Date(d); x.setHours(0, m, 0, 0); return `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`; };
  const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agencia JS//Asistente de citas//ES", "BEGIN:VEVENT",
    "UID:" + Date.now() + "@agencia-js.com", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
    "DTSTART:" + f(cita.dia, cita.hora), "DTEND:" + f(cita.dia, cita.hora + cita.servicio.min),
    "SUMMARY:" + cita.servicio.nombre + " · " + cfg.negocio.nombre, "LOCATION:" + cfg.negocio.direccion.replace(/,/g, "\\,"),
    "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return URL.createObjectURL(new Blob([txt], { type: "text/calendar" }));
}

/* ---------- estilos (se inyectan una vez) ---------- */
const CSS = `
.as-dlg{position:fixed;inset:0;margin:0;padding:0;border:0;background:transparent;max-width:none;max-height:none;width:100vw;height:100dvh;color:#fafafa;overflow:hidden}
.as-dlg::backdrop{background:rgba(0,0,0,.6);backdrop-filter:blur(3px)}
.as-box{position:fixed;inset:0;display:flex;flex-direction:column;background:#0f0f10;font:15px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
@media (min-width:640px){.as-box{inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,calc(100vw - 32px));height:min(680px,calc(100dvh - 48px));border:1px solid rgba(255,255,255,.12);border-radius:1.25rem;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden}}
.as-head{display:flex;align-items:center;gap:.75rem;padding:.8rem .9rem;padding-top:max(.8rem,env(safe-area-inset-top));border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.04),transparent)}
.as-av{display:flex;flex:none;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;color:#0a0a0a;background:var(--as-c)}
.as-ht{min-width:0;flex:1}.as-ht strong{display:block;font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.as-ht span{display:flex;align-items:center;gap:.35rem;font-size:.75rem;color:#a1a1aa}.as-ht span:before{content:"";width:7px;height:7px;border-radius:50%;background:#22c55e}
.as-x{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fafafa;cursor:pointer}
.as-x:hover{border-color:#fff}.as-x:focus-visible,.as-b:focus-visible,.as-chip:focus-visible,.as-send:focus-visible,.as-in:focus-visible{outline:2px solid var(--as-c);outline-offset:2px}
.as-demo{margin:0;padding:.45rem .9rem;font-size:.72rem;color:#d4d4d8;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.06)}
.as-log{flex:1;overflow-y:auto;padding:1rem .9rem;display:flex;flex-direction:column;gap:.6rem;overscroll-behavior:contain;scroll-behavior:smooth}
.as-m{max-width:88%;padding:.6rem .85rem;border-radius:1rem;white-space:pre-line;animation:as-in .25s ease both;word-wrap:break-word}
@keyframes as-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.as-bot{align-self:flex-start;background:#1c1c1f;border-bottom-left-radius:.3rem}
.as-yo{align-self:flex-end;background:var(--as-c);color:#0a0a0a;border-bottom-right-radius:.3rem;font-weight:500}
.as-typing{display:flex;gap:4px;padding:.8rem .9rem}.as-typing i{width:7px;height:7px;border-radius:50%;background:#a1a1aa;animation:as-dot 1s infinite}
.as-typing i:nth-child(2){animation-delay:.15s}.as-typing i:nth-child(3){animation-delay:.3s}
@keyframes as-dot{0%,80%,100%{opacity:.3;transform:none}40%{opacity:1;transform:translateY(-3px)}}
.as-opts{display:flex;flex-wrap:wrap;gap:.45rem;align-self:stretch;animation:as-in .25s ease both}
.as-b{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:44px;padding:.55rem .95rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.16);background:#18181b;color:#fafafa;font:inherit;font-size:.9rem;cursor:pointer;text-decoration:none;transition:border-color .2s,background .2s}
.as-b:hover{border-color:var(--as-c)}.as-b[disabled]{opacity:.45;cursor:default}
.as-b.as-main{background:var(--as-c);color:#0a0a0a;border-color:transparent;font-weight:600}
.as-svc{display:grid;gap:.45rem;align-self:stretch}
.as-svc .as-b{justify-content:space-between;text-align:left;width:100%}
.as-svc small{color:#a1a1aa;font-size:.78rem;white-space:nowrap}
.as-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:.45rem;align-self:stretch}
.as-grid .as-b{padding:.5rem .4rem}
.as-sum{align-self:stretch;padding:.9rem;border-radius:1rem;border:1px solid var(--as-c);background:#141416}
.as-sum dl{display:grid;grid-template-columns:auto 1fr;gap:.25rem .8rem;margin:.5rem 0 .8rem}.as-sum dt{color:#a1a1aa;font-size:.82rem}.as-sum dd{margin:0;font-weight:600}
.as-form{display:flex;gap:.45rem;align-self:stretch}
.as-chips{display:flex;gap:.45rem;overflow-x:auto;padding:.1rem .9rem .6rem;scrollbar-width:none}.as-chips::-webkit-scrollbar{display:none}
.as-chip{flex:none;min-height:38px;padding:.4rem .8rem;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:transparent;color:#e4e4e7;font:inherit;font-size:.82rem;cursor:pointer;white-space:nowrap}
.as-chip:hover{border-color:var(--as-c)}
.as-bar{display:flex;gap:.5rem;padding:.7rem .9rem;padding-bottom:max(.7rem,env(safe-area-inset-bottom));border-top:1px solid rgba(255,255,255,.08)}
.as-in{flex:1;min-width:0;min-height:46px;padding:.6rem .95rem;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:#18181b;color:#fafafa;font:inherit;font-size:16px}
.as-send{display:flex;flex:none;align-items:center;justify-content:center;width:46px;height:46px;border-radius:50%;border:0;background:var(--as-c);color:#0a0a0a;cursor:pointer}
.as-send[disabled]{opacity:.5}
.as-note{align-self:stretch;font-size:.76rem;color:#a1a1aa;text-align:center;margin:.2rem 0}
@media (prefers-reduced-motion:reduce){.as-m,.as-opts{animation:none}.as-log{scroll-behavior:auto}.as-typing i{animation:none}}
html.as-lock{overflow:hidden}html.as-lock .cb-fab,html.as-lock .cb-panel{display:none!important}
`;
let estilos = false;
function ponerEstilos() { if (estilos) return; estilos = true; const s = h("style"); s.textContent = CSS; document.head.appendChild(s); }

/* ---------- ventana ---------- */
/**
 * Abre el asistente de un sector en una ventana modal.
 * @param {string} id  clave de SECTORES
 * @param {{demo?: boolean, waNumero?: string, alCerrar?: () => void}} op
 */
export function abrirAsistente(id, op = {}) {
  const cfg = SECTORES[id];
  if (!cfg) return;
  const demo = op.demo !== false;
  ponerEstilos();

  const dlg = h("dialog", "as-dlg");
  dlg.setAttribute("aria-labelledby", "as-title");
  dlg.style.setProperty("--as-c", cfg.color);
  const box = h("div", "as-box");
  dlg.appendChild(box);

  const head = h("div", "as-head");
  const av = h("span", "as-av"); av.innerHTML = svg(cfg.icono, 22);
  const ht = h("div", "as-ht"); const tt = h("strong", null, cfg.negocio.nombre); tt.id = "as-title";
  ht.append(tt, h("span", null, "Asistente automático · responde al momento"));
  const x = h("button", "as-x"); x.type = "button"; x.setAttribute("aria-label", "Cerrar asistente"); x.innerHTML = svg("x", 20);
  head.append(av, ht, x);
  box.appendChild(head);
  if (demo) box.appendChild(h("p", "as-demo", "Demo con un negocio ficticio: los datos, precios y la agenda son de ejemplo."));

  const log = h("div", "as-log"); log.setAttribute("role", "log"); log.setAttribute("aria-live", "polite");
  const chips = h("div", "as-chips");
  const bar = h("form", "as-bar");
  const input = h("input", "as-in"); input.type = "text"; input.maxLength = 300; input.placeholder = "Escribe tu pregunta…"; input.setAttribute("aria-label", "Escribe tu pregunta"); input.autocomplete = "off"; input.enterKeyHint = "send";
  const send = h("button", "as-send"); send.type = "submit"; send.setAttribute("aria-label", "Enviar"); send.innerHTML = svg("send", 18);
  bar.append(input, send);
  box.append(log, chips, bar);
  document.body.appendChild(dlg);
  document.documentElement.classList.add("as-lock");

  const historial = [];
  let preguntas = 0, ocupado = false;
  const cita = {};

  const bajar = () => { log.scrollTop = log.scrollHeight; };
  function msg(quien, texto) { const m = h("div", "as-m " + (quien === "yo" ? "as-yo" : "as-bot"), texto); log.appendChild(m); bajar(); return m; }
  function opciones(cls) { const o = h("div", cls || "as-opts"); log.appendChild(o); bajar(); return o; }
  function boton(cont, texto, fn, main) { const b = h("button", "as-b" + (main ? " as-main" : "")); b.type = "button"; b.innerHTML = texto; b.addEventListener("click", fn); cont.appendChild(b); return b; }
  const bloquear = (cont) => cont.querySelectorAll("button,input").forEach((b) => { b.disabled = true; });
  function escribiendo() { const t = h("div", "as-m as-bot as-typing"); t.innerHTML = "<i></i><i></i><i></i>"; t.setAttribute("aria-label", "Escribiendo"); log.appendChild(t); bajar(); return t; }

  function contacto(cont) {
    if (demo) {
      const a = h("a", "as-b", "Quiero un asistente así para mi negocio");
      a.href = waUrl(op.waNumero || WA_AGENCIA, `Hola, he probado el asistente de citas de ${cfg.sector.toLowerCase()} y quiero uno para mi negocio`);
      a.target = "_blank"; a.rel = "noopener"; cont.appendChild(a);
    } else if (op.waNumero) {
      const a = h("a", "as-b", "Hablar por WhatsApp"); a.href = waUrl(op.waNumero, "Hola, tengo una consulta"); a.target = "_blank"; a.rel = "noopener"; cont.appendChild(a);
    }
  }

  /* ---- flujo de reserva ---- */
  function empezarCita() {
    msg("bot", "Perfecto, vamos a buscarte cita. ¿Qué servicio necesitas?");
    const o = opciones("as-svc");
    cfg.servicios.forEach((s) => boton(o, `<span>${s.nombre}</span><small>${s.precio} · ${s.min} min</small>`, () => { bloquear(o); cita.servicio = s; msg("yo", s.nombre); elegirDia(); }));
  }
  function elegirDia() {
    const dias = proximosDias(cfg, cita.servicio.min);
    if (!dias.length) { msg("bot", "Ahora mismo no veo huecos libres en las próximas semanas. Te recomiendo contactar con el equipo."); contacto(opciones()); return; }
    msg("bot", "¿Qué día te viene bien?");
    const o = opciones("as-grid");
    dias.forEach((d) => boton(o, etiquetaDia(d), () => { bloquear(o); cita.dia = d; msg("yo", fechaLarga(d)); elegirHora(); }));
  }
  function elegirHora() {
    const hs = huecos(cfg, cita.dia, cita.servicio.min);
    msg("bot", `Estos son los huecos libres del ${fechaLarga(cita.dia)}:`);
    const o = opciones("as-grid");
    hs.forEach((t) => boton(o, hhmm(t), () => { bloquear(o); cita.hora = t; msg("yo", hhmm(t)); pedirNombre(); }));
    boton(o, "Otro día", () => { bloquear(o); elegirDia(); });
  }
  function pedirNombre() {
    msg("bot", "¿A nombre de quién hago la reserva?" + (cfg.id === "veterinaria" ? " (tu nombre y el de tu mascota)" : ""));
    const f = h("form", "as-form");
    const i = h("input", "as-in"); i.type = "text"; i.maxLength = 50; i.required = true; i.autocomplete = "given-name"; i.placeholder = "Nombre"; i.setAttribute("aria-label", "Nombre para la reserva");
    const b = h("button", "as-b as-main", "Seguir"); b.type = "submit";
    f.append(i, b); log.appendChild(f); bajar();
    setTimeout(() => i.focus(), 50);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = i.value.replace(/[<>{}\[\]]/g, "").replace(/\s+/g, " ").trim();
      if (v.length < 2) { i.setCustomValidity("Escribe un nombre"); i.reportValidity(); return; }
      bloquear(f); cita.nombre = v; msg("yo", v); resumen();
    });
    i.addEventListener("input", () => i.setCustomValidity(""));
  }
  function resumen() {
    const s = h("div", "as-sum");
    s.appendChild(h("strong", null, "Revisa tu cita"));
    const dl = h("dl");
    [["Servicio", cita.servicio.nombre], ["Día", fechaLarga(cita.dia)], ["Hora", `${hhmm(cita.hora)} (${cita.servicio.min} min)`], ["Precio", cita.servicio.precio], ["Nombre", cita.nombre]].forEach(([a, b]) => dl.append(h("dt", null, a), h("dd", null, b)));
    s.appendChild(dl);
    const o = h("div", "as-opts"); s.appendChild(o);
    log.appendChild(s); bajar();
    boton(o, svg("cal", 18) + " Confirmar cita", () => { bloquear(o); confirmada(); }, true);
    boton(o, "Cambiar", () => { bloquear(o); elegirDia(); });
  }
  function confirmada() {
    msg("bot", `¡Listo, ${cita.nombre.split(" ")[0]}! Tu cita de ${cita.servicio.nombre.toLowerCase()} queda reservada para el ${fechaLarga(cita.dia)} a las ${hhmm(cita.hora)}.`);
    const o = opciones();
    const a = h("a", "as-b"); a.innerHTML = svg("cal", 18) + " Añadir a mi calendario"; a.href = ics(cfg, cita); a.download = "cita.ics"; o.appendChild(a);
    if (demo) {
      log.appendChild(h("p", "as-note", "En la versión real la cita entra directamente en la agenda del negocio y el cliente recibe la confirmación y un recordatorio."));
      contacto(opciones());
    }
    bajar();
  }

  /* ---- preguntas libres ---- */
  async function preguntar(texto) {
    if (ocupado) return;
    texto = texto.replace(/\s+/g, " ").trim().slice(0, 300);
    if (!texto) return;
    msg("yo", texto);
    if (preguntas >= MAX_PREGUNTAS) { msg("bot", "Para seguir, lo mejor es pedir cita o hablar con el equipo."); acciones(["cita", "wa"]); return; }
    preguntas++; ocupado = true; send.disabled = true;
    historial.push({ role: "user", content: texto });
    const t = escribiendo();
    try {
      const r = await fetch("/api/asistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sector: cfg.id, messages: historial.slice(-8) }) });
      const d = await r.json().catch(() => ({}));
      t.remove();
      if (!r.ok || !d.reply) throw new Error(d.error || "error");
      msg("bot", d.reply);
      historial.push({ role: "assistant", content: d.reply });
      acciones(d.acciones || []);
    } catch (e) {
      t.remove();
      historial.pop();
      msg("bot", "Ahora mismo no puedo responder a eso. Si quieres, te busco cita directamente.");
      acciones(["cita"]);
    } finally { ocupado = false; send.disabled = false; }
  }
  function acciones(a) {
    if (!a.length) return;
    const o = opciones();
    if (a.includes("cita")) boton(o, svg("cal", 18) + " Elegir día y hora", () => { bloquear(o); empezarCita(); }, true);
    if (a.includes("llamar")) o.appendChild(h("span", "as-b", "Teléfono: " + cfg.negocio.telefono));
    if (a.includes("wa")) contacto(o);
    if (!o.children.length) o.remove();
  }

  bar.addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; preguntar(v); });
  const pedir = h("button", "as-chip", "📅 Pedir cita"); pedir.type = "button"; pedir.addEventListener("click", () => empezarCita()); chips.appendChild(pedir);
  cfg.chips.forEach((c) => { const b = h("button", "as-chip", c); b.type = "button"; b.addEventListener("click", () => preguntar(c)); chips.appendChild(b); });

  function cerrar() { dlg.close(); }
  x.addEventListener("click", cerrar);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) cerrar(); });
  dlg.addEventListener("close", () => { document.documentElement.classList.remove("as-lock"); dlg.remove(); if (op.alCerrar) op.alCerrar(); });

  msg("bot", cfg.saludo);
  const o = opciones();
  boton(o, svg("cal", 18) + " Pedir cita", () => { bloquear(o); empezarCita(); }, true);
  boton(o, "Tengo una duda", () => { bloquear(o); input.focus(); });
  dlg.showModal();
  if (window.matchMedia("(min-width:640px)").matches) input.focus(); else x.focus();
  if (typeof window.gtag === "function") window.gtag("event", "asistente_demo", { sector: cfg.id });
  return dlg;
}
