/* /extras.js — Cuestionario de auditoría + asistente virtual de Agencia JS.
   Sin dependencias, sin cookies, sin almacenamiento en el navegador. */
(function () {
"use strict";
var WA_NUM = "34628224719";
var EMAIL = "Agencia39700@gmail.com";
var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, cls, text) {
var n = document.createElement(tag);
if (cls) { n.className = cls; }
if (text != null) { n.textContent = text; }
return n;
}
function waUrl(texto) { return "https://wa.me/" + WA_NUM + "?text=" + encodeURIComponent(texto); }

/* =====================================================================
   1) CUESTIONARIO PREVIO A LA AUDITORÍA
   ===================================================================== */
var PREGUNTAS = [
{ k: "sector", t: "¿Qué tipo de negocio tienes?", o: [
"Hostelería (bar, restaurante, cafetería)", "Comercio o tienda", "Belleza y salud", "Servicios y oficios", "Otro tipo de negocio"] },
{ k: "web", t: "¿Cómo está tu presencia online hoy?", o: [
"No tengo web", "Tengo web, pero está antigua o va lenta", "Tengo web, pero no me trae clientes", "Solo uso redes sociales"] },
{ k: "objetivo", t: "¿Qué necesitas conseguir primero?", o: [
"Más llamadas y mensajes", "Reservas o citas online", "Vender por internet", "Más reseñas en Google", "Que me encuentren en mi zona"] },
{ k: "ficha", t: "¿Cómo tienes tu ficha de Google?", o: [
"No la tengo", "No sé si está bien", "La tengo, pero con pocas reseñas", "La tengo y está cuidada"] },
{ k: "cuando", t: "¿Cuándo quieres empezar?", o: [
"Lo antes posible", "En 1 o 2 meses", "Solo me estoy informando"] }
];
var PLANES = {
impulso: { n: "Impulso Digital", p: "desde 349 €", d: "Web responsive con SEO local básico y 1 cambio mensual de contenido." },
nfc: { n: "Acelerador NFC Pro", p: "desde 549 €", d: "Todo Impulso Digital, web multi-idioma y tarjeta NFC para conseguir reseñas en Google." },
p360: { n: "Presencia 360°", p: "desde 849 €", d: "Todo lo anterior, un vídeo publicitario, 2 cambios al mes y soporte prioritario." }
};
function recomendar(r) {
var plan = "impulso";
if (r.objetivo === 3 || r.ficha <= 2) { plan = "nfc"; }
if (r.web === 2) { plan = "p360"; }
var nota = "";
if (r.objetivo === 1 || r.objetivo === 2) {
nota = r.objetivo === 2
? "La venta online se presupuesta a medida; en la auditoría te explicamos cómo encajarla."
: "Las reservas con agenda online se presupuestan a medida; en la auditoría te explicamos cómo encajarlas.";
}
return { plan: PLANES[plan], nota: nota };
}

var dlg, body, titulo, barra, cuenta, atras;
var paso = 0;
var resp = {};

function construirDialogo() {
dlg = document.getElementById("dlg-quiz");
if (!dlg) { return false; }
body = document.getElementById("qz-body");
titulo = document.getElementById("qz-title");
barra = document.getElementById("qz-fill");
cuenta = document.getElementById("qz-count");
atras = document.getElementById("qz-back");
atras.addEventListener("click", function () { if (paso > 0) { pintar(paso - 1); } });
dlg.addEventListener("click", function (e) { if (e.target === dlg) { dlg.close(); } });
dlg.addEventListener("close", function () { document.documentElement.style.overflow = ""; });
dlg.querySelector("[data-close]").addEventListener("click", function () { dlg.close(); });
return true;
}

function progreso(i) {
var total = PREGUNTAS.length + 1;
barra.style.width = Math.round(((i + 1) / total) * 100) + "%";
cuenta.textContent = i < PREGUNTAS.length ? "Pregunta " + (i + 1) + " de " + PREGUNTAS.length : "Último paso";
}

function pintar(i) {
paso = i;
progreso(i);
atras.hidden = i === 0;
body.textContent = "";
body.classList.remove("qz-in");
void body.offsetWidth;
body.classList.add("qz-in");
if (i < PREGUNTAS.length) { pintarPregunta(i); } else { pintarFinal(); }
var foco = body.querySelector("button, input");
if (foco && dlg.open) { foco.focus({ preventScroll: true }); }
}

function pintarPregunta(i) {
var q = PREGUNTAS[i];
titulo.textContent = q.t;
var grupo = el("div", "qz-opts");
grupo.setAttribute("role", "group");
grupo.setAttribute("aria-labelledby", "qz-title");
q.o.forEach(function (txt, idx) {
var b = el("button", "qz-opt");
b.type = "button";
b.setAttribute("aria-pressed", resp[q.k] === idx ? "true" : "false");
var letra = el("span", "qz-letter", String.fromCharCode(65 + idx));
letra.setAttribute("aria-hidden", "true");
b.appendChild(letra);
b.appendChild(el("span", "qz-txt", txt));
b.addEventListener("click", function () {
resp[q.k] = idx;
grupo.querySelectorAll(".qz-opt").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
b.setAttribute("aria-pressed", "true");
setTimeout(function () { pintar(i + 1); }, reducido ? 0 : 220);
});
grupo.appendChild(b);
});
body.appendChild(grupo);
}

function campo(id, etiqueta, tipo, requerido, ac) {
var w = el("div", "qz-field");
var l = el("label", null, etiqueta);
l.setAttribute("for", id);
if (!requerido) { var o = el("span", "qz-opt-l", " (opcional)"); l.appendChild(o); }
var inp = el("input");
inp.id = id; inp.name = id; inp.type = tipo; inp.required = !!requerido; inp.maxLength = 80;
if (ac) { inp.autocomplete = ac; }
w.appendChild(l); w.appendChild(inp);
return w;
}

function textoResumen(d) {
var r = recomendar(resp);
var lineas = [
"Hola, soy " + d.nombre + " (" + d.negocio + "). Quiero la auditoría gratuita de mi ficha de Google y mi web.",
"",
"Mi negocio: " + PREGUNTAS[0].o[resp.sector],
"Presencia online: " + PREGUNTAS[1].o[resp.web],
"Necesito: " + PREGUNTAS[2].o[resp.objetivo],
"Ficha de Google: " + PREGUNTAS[3].o[resp.ficha],
"Cuándo: " + PREGUNTAS[4].o[resp.cuando]
];
if (d.zona) { lineas.push("Zona: " + d.zona); }
lineas.push("Teléfono: " + d.tel, "", "Plan que me encaja: " + r.plan.n + " (" + r.plan.p + ").");
if (r.nota) { lineas.push(r.nota); }
return lineas.join("\n");
}

function pintarFinal() {
titulo.textContent = "Perfecto, ya casi está";
var r = recomendar(resp);
var tarjeta = el("div", "qz-rec");
tarjeta.appendChild(el("p", "qz-rec-k", "Según tus respuestas, te encaja"));
var fila = el("p", "qz-rec-n");
fila.appendChild(document.createTextNode(r.plan.n + " "));
fila.appendChild(el("span", "qz-rec-p", r.plan.p));
tarjeta.appendChild(fila);
tarjeta.appendChild(el("p", "qz-rec-d", r.plan.d + " IVA no incluido."));
if (r.nota) { tarjeta.appendChild(el("p", "qz-rec-d", r.nota)); }
body.appendChild(tarjeta);
body.appendChild(el("p", "qz-lead", "Déjanos tus datos y te enviamos la auditoría. Sin coste y sin compromiso."));
var form = el("form", "qz-form");
form.noValidate = false;
form.appendChild(campo("qz-nombre", "Tu nombre", "text", true, "name"));
form.appendChild(campo("qz-negocio", "Nombre del negocio", "text", true, "organization"));
form.appendChild(campo("qz-tel", "Teléfono", "tel", true, "tel"));
form.appendChild(campo("qz-zona", "Ciudad o zona", "text", false, "address-level2"));
var chk = el("label", "qz-check");
var cb = el("input"); cb.type = "checkbox"; cb.required = true; cb.id = "qz-priv";
var sp = el("span");
sp.appendChild(document.createTextNode("He leído y acepto la "));
var a = el("a", null, "Política de Privacidad");
a.href = "#privacidad";
a.addEventListener("click", function (e) {
e.preventDefault();
var p = document.getElementById("dlg-privacidad");
if (p && p.showModal) { p.showModal(); }
});
sp.appendChild(a); sp.appendChild(document.createTextNode("."));
chk.appendChild(cb); chk.appendChild(sp);
form.appendChild(chk);
var acc = el("div", "qz-actions");
var bwa = el("button", "qz-btn qz-btn-main", "Enviar por WhatsApp");
bwa.type = "button";
var bml = el("button", "qz-btn qz-btn-alt", "Enviar por email");
bml.type = "button";
acc.appendChild(bwa); acc.appendChild(bml);
form.appendChild(acc);
var estado = el("p", "qz-status");
estado.setAttribute("role", "status");
estado.setAttribute("aria-live", "polite");
form.appendChild(estado);
function datos() {
if (!form.reportValidity()) { return null; }
return {
nombre: form.elements["qz-nombre"].value.trim(),
negocio: form.elements["qz-negocio"].value.trim(),
tel: form.elements["qz-tel"].value.trim(),
zona: form.elements["qz-zona"].value.trim()
};
}
bwa.addEventListener("click", function () {
var d = datos(); if (!d) { return; }
estado.textContent = "Se abrirá WhatsApp con tu mensaje listo para enviar.";
window.open(waUrl(textoResumen(d)), "_blank", "noopener");
if (typeof window.gtag === "function") { window.gtag("event", "quiz_enviado", { via: "whatsapp" }); }
});
bml.addEventListener("click", function () {
var d = datos(); if (!d) { return; }
estado.textContent = "Se abrirá tu aplicación de correo con el mensaje preparado.";
window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Auditoría gratuita: " + d.negocio) + "&body=" + encodeURIComponent(textoResumen(d));
if (typeof window.gtag === "function") { window.gtag("event", "quiz_enviado", { via: "email" }); }
});
form.addEventListener("submit", function (e) { e.preventDefault(); });
body.appendChild(form);
}

function abrirQuiz() {
if (!dlg && !construirDialogo()) { return false; }
if (typeof dlg.showModal !== "function") { return false; }
resp = {};
pintar(0);
document.documentElement.style.overflow = "hidden";
dlg.showModal();
if (typeof window.gtag === "function") { window.gtag("event", "quiz_abierto"); }
return true;
}
window.agenciaJsAbrirQuiz = abrirQuiz;

document.querySelectorAll("[data-quiz]").forEach(function (a) {
a.addEventListener("click", function (e) {
if (abrirQuiz()) { e.preventDefault(); }
});
});

/* =====================================================================
   2) ASISTENTE VIRTUAL
   ===================================================================== */
var RESPUESTAS = {
precio: "Las webs empiezan desde 349 € (plan Impulso Digital), IVA no incluido. El presupuesto final se ajusta a tu negocio. Una tienda online o un sistema de reservas con agenda se presupuestan a medida.",
planes: "Tenemos tres planes:\n• Impulso Digital, desde 349 €: web responsive, SEO local básico y 1 cambio mensual.\n• Acelerador NFC Pro, desde 549 €: todo lo anterior, web multi-idioma y tarjeta NFC para reseñas de Google.\n• Presencia 360°, desde 849 €: todo lo anterior, un vídeo publicitario, 2 cambios al mes y soporte prioritario.\nPrecios sin IVA.",
nfc: "Tu cliente acerca el móvil a la tarjeta y se abre directamente tu ficha de Google para que deje su opinión, sin buscar tu negocio ni escribir nada. No necesita batería ni app y funciona con Android y con iPhone XS o posteriores. Hace más fácil dejar la reseña, pero la valoración la decide siempre el cliente.",
plazo: "Depende del contenido que nos facilites (logo, textos, fotos, horarios y servicios). Te indicamos el plazo estimado en el presupuesto, antes de empezar.",
mant: "El mantenimiento incluye la parte técnica de tu web, los cambios de contenido de tu plan y soporte por WhatsApp o email. Son 29 €/mes (39 €/mes en Presencia 360°), IVA no incluido. En NFC Pro el primer mes es gratis y en Presencia 360° los dos primeros.",
video: "Hacemos 1 o 2 vídeos al mes en formato vertical para Reels y TikTok, a la carta y con presupuesto personalizado. El plan Presencia 360° incluye un vídeo de impacto."
};
var CHIPS = [
["¿Cuánto cuesta una web?", "precio"],
["Planes y precios", "planes"],
["Tarjetas NFC", "nfc"],
["¿Cuánto tarda?", "plazo"],
["Mantenimiento", "mant"],
["Vídeo publicitario", "video"]
];
var MAX_MENSAJES = 12;
var enviados = 0;
var historial = [];
var ocupado = false;
var ultimo = 0;
var fab, panel, log, input, chips;

function crearChat() {
fab = el("button", "cb-fab");
fab.type = "button";
fab.id = "cb-fab";
fab.setAttribute("aria-label", "Abrir asistente virtual");
fab.setAttribute("aria-expanded", "false");
fab.setAttribute("aria-controls", "cb-panel");
fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-width="2.4"/></svg>';
fab.appendChild(el("span", "cb-dot"));

panel = el("section", "cb-panel");
panel.id = "cb-panel";
panel.hidden = true;
panel.setAttribute("role", "dialog");
panel.setAttribute("aria-label", "Asistente virtual de Agencia JS");

var cab = el("div", "cb-head");
var av = el("span", "cb-av", "JS");
av.setAttribute("aria-hidden", "true");
var tt = el("div", "cb-ht");
tt.appendChild(el("strong", null, "Asistente de Agencia JS"));
tt.appendChild(el("span", null, "Respuestas automáticas al instante"));
var cerrar = el("button", "cb-x", "×");
cerrar.type = "button";
cerrar.setAttribute("aria-label", "Cerrar asistente");
cab.appendChild(av); cab.appendChild(tt); cab.appendChild(cerrar);

log = el("div", "cb-log");
log.setAttribute("role", "log");
log.setAttribute("aria-live", "polite");
log.setAttribute("aria-label", "Conversación");
log.tabIndex = 0;

chips = el("div", "cb-chips");
CHIPS.forEach(function (c) {
var b = el("button", "cb-chip", c[0]);
b.type = "button";
b.addEventListener("click", function () { preguntaRapida(c[0], c[1]); });
chips.appendChild(b);
});
var bq = el("button", "cb-chip cb-chip-hi", "Pedir auditoría gratis");
bq.type = "button";
bq.addEventListener("click", function () { cerrarChat(); if (!abrirQuiz()) { window.open(waUrl("Hola, quiero la auditoría gratuita de mi ficha de Google y mi web"), "_blank", "noopener"); } });
chips.appendChild(bq);

var form = el("form", "cb-form");
input = el("input", "cb-input");
input.type = "text"; input.maxLength = 300; input.autocomplete = "off";
input.placeholder = "Escribe tu pregunta…";
input.setAttribute("aria-label", "Escribe tu pregunta");
var env = el("button", "cb-send");
env.type = "submit";
env.setAttribute("aria-label", "Enviar");
env.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
form.appendChild(input); form.appendChild(env);

var pie = el("p", "cb-foot");
pie.appendChild(document.createTextNode("Asistente automático. Para algo concreto, "));
var wa = el("a", null, "escríbenos por WhatsApp");
wa.href = waUrl("Hola, tengo una duda sobre los servicios de Agencia JS");
wa.target = "_blank"; wa.rel = "noopener";
pie.appendChild(wa); pie.appendChild(document.createTextNode("."));

panel.appendChild(cab); panel.appendChild(log); panel.appendChild(chips); panel.appendChild(form); panel.appendChild(pie);
document.body.appendChild(fab);
document.body.appendChild(panel);

fab.addEventListener("click", function () { panel.hidden ? abrirChat() : cerrarChat(); });
cerrar.addEventListener("click", function () { cerrarChat(); fab.focus(); });
panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { cerrarChat(); fab.focus(); } });
form.addEventListener("submit", function (e) {
e.preventDefault();
var t = input.value.trim();
if (!t) { return; }
input.value = "";
preguntaLibre(t);
});
mensaje("bot", "¡Hola! Soy el asistente virtual de Agencia JS. Puedo contarte planes, precios y cómo trabajamos. ¿Qué te interesa?");
}

function abrirChat() {
panel.hidden = false;
fab.setAttribute("aria-expanded", "true");
fab.setAttribute("aria-label", "Cerrar asistente virtual");
fab.classList.add("is-open");
var d = fab.querySelector(".cb-dot"); if (d) { d.remove(); }
input.focus({ preventScroll: true });
if (typeof window.gtag === "function") { window.gtag("event", "chat_abierto"); }
}
function cerrarChat() {
panel.hidden = true;
fab.setAttribute("aria-expanded", "false");
fab.setAttribute("aria-label", "Abrir asistente virtual");
fab.classList.remove("is-open");
}

function bajar() { log.scrollTop = log.scrollHeight; }
function mensaje(quien, texto, conWa) {
var m = el("div", "cb-msg cb-" + quien);
m.appendChild(el("p", null, texto));
if (conWa) {
var a = el("a", "cb-wa", "Hablar por WhatsApp");
a.href = waUrl("Hola, tengo una duda sobre los servicios de Agencia JS");
a.target = "_blank"; a.rel = "noopener";
m.appendChild(a);
}
log.appendChild(m);
bajar();
return m;
}
function escribiendo() {
var m = el("div", "cb-msg cb-bot cb-typing");
m.setAttribute("aria-label", "Escribiendo");
m.innerHTML = "<span></span><span></span><span></span>";
log.appendChild(m);
bajar();
return m;
}

function preguntaRapida(txt, clave) {
if (ocupado) { return; }
mensaje("user", txt);
historial.push({ role: "user", content: txt });
var t = escribiendo();
setTimeout(function () {
t.remove();
mensaje("bot", RESPUESTAS[clave]);
historial.push({ role: "assistant", content: RESPUESTAS[clave] });
}, reducido ? 0 : 450);
}

function preguntaLibre(txt) {
if (ocupado) { return; }
var ahora = Date.now();
if (ahora - ultimo < 1500) { return; }
ultimo = ahora;
mensaje("user", txt);
if (enviados >= MAX_MENSAJES) {
mensaje("bot", "Para seguir hablando de tu caso, lo mejor es que nos escribas por WhatsApp y te atendemos personalmente.", true);
return;
}
enviados++;
historial.push({ role: "user", content: txt });
ocupado = true;
var t = escribiendo();
var ctrl = typeof AbortController === "function" ? new AbortController() : null;
var to = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, 25000);
fetch("/api/chat", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ messages: historial.slice(-6) }),
signal: ctrl ? ctrl.signal : undefined
})
.then(function (r) { if (!r.ok) { throw new Error("http " + r.status); } return r.json(); })
.then(function (j) {
var r = (j && typeof j.reply === "string") ? j.reply.trim() : "";
if (!r) { throw new Error("vacío"); }
var wa = /\[\[WA\]\]/.test(r);
r = r.replace(/\[\[WA\]\]/g, "").trim();
t.remove();
mensaje("bot", r, wa);
historial.push({ role: "assistant", content: r });
})
.catch(function () {
t.remove();
mensaje("bot", "Ahora mismo no puedo responderte desde aquí. Escríbenos por WhatsApp y te contestamos lo antes posible.", true);
historial.pop();
})
.then(function () { clearTimeout(to); ocupado = false; });
}

function iniciarChat() { if (!fab) { crearChat(); } }
if ("requestIdleCallback" in window) { requestIdleCallback(iniciarChat, { timeout: 2500 }); } else { setTimeout(iniciarChat, 1200); }
})();
