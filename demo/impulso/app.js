/* app.js — lógica compartida de las maquetas de Agencia JS (sin dependencias, sin cookies) */
(function () {
"use strict";
var S = window.SITE || {};
var root = document.documentElement;
root.classList.add("js");
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var eur = function (n) { return n.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
var num = function (n) { return (Math.round(n * 100) / 100).toLocaleString("es-ES"); };
function h(tag, attrs, kids) {
var n = document.createElement(tag);
for (var k in (attrs || {})) {
if (k === "class") { n.className = attrs[k]; } else if (k === "html") { n.innerHTML = attrs[k]; } else if (k === "text") { n.textContent = attrs[k]; } else if (attrs[k] !== false && attrs[k] != null) { n.setAttribute(k, attrs[k] === true ? "" : attrs[k]); }
}
(kids || []).forEach(function (c) { if (c != null) { n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); } });
return n;
}
function waLink(text) { return "https://wa.me/" + S.wa + "?text=" + encodeURIComponent(text); }
function openWA(text) { window.open(waLink(text), "_blank", "noopener"); }
var toastEl;
function toast(msg) {
if (!toastEl) { toastEl = h("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.appendChild(toastEl); }
toastEl.textContent = msg; toastEl.classList.add("on");
clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove("on"); }, 2200);
}

/* ---------- Cabecera, menú y revelado ---------- */
var hdr = $(".hdr");
function onScroll() { hdr.classList.toggle("sc", window.scrollY > 8); }
window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
var burger = $("#burger"), sheet = $("#msheet");
if (burger) {
burger.addEventListener("click", function () {
var on = sheet.classList.toggle("on");
burger.setAttribute("aria-expanded", on ? "true" : "false");
});
$$("a", sheet).forEach(function (a) { a.addEventListener("click", function () { sheet.classList.remove("on"); burger.setAttribute("aria-expanded", "false"); }); });
}
if ("IntersectionObserver" in window) {
var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12 });
$$(".rv").forEach(function (n) { io.observe(n); });
var secs = $$("main section[id]");
var navA = $$(".nav a");
var so = new IntersectionObserver(function (es) {
es.forEach(function (e) { if (e.isIntersecting) { navA.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); }); } });
}, { rootMargin: "-45% 0px -50% 0px" });
secs.forEach(function (s) { so.observe(s); });
} else { $$(".rv").forEach(function (n) { n.classList.add("in"); }); }

/* ---------- Horario y estado «abierto ahora» ---------- */
var DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
function mins(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
function hh(m) { return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2); }
function dayIdx(d) { return (d.getDay() + 6) % 7; }
function statusNow() {
if (!S.hours) { return null; }
var now = new Date(), di = dayIdx(now), m = now.getHours() * 60 + now.getMinutes();
var today = S.hours[di] || [];
for (var i = 0; i < today.length; i++) {
var a = mins(today[i][0]), b = mins(today[i][1]);
if (m >= a && m < b) { return { open: true, text: "Abierto ahora · cierra a las " + today[i][1] }; }
if (m < a) { return { open: false, text: "Cerrado · abre hoy a las " + today[i][0] }; }
}
for (var k = 1; k <= 7; k++) {
var d = S.hours[(di + k) % 7] || [];
if (d.length) { return { open: false, text: "Cerrado · abre " + (k === 1 ? "mañana" : "el " + DIAS[(di + k) % 7]) + " a las " + d[0][0] }; }
}
return { open: false, text: "Cerrado" };
}
function paintStatus() {
var st = statusNow(); if (!st) { return; }
$$("[data-status]").forEach(function (p) { p.classList.remove("open", "closed"); p.classList.add(st.open ? "open" : "closed"); var t = $("span", p); if (t) { t.textContent = st.text; } });
}
paintStatus(); setInterval(paintStatus, 60000);
$$("[data-day]").forEach(function (r) { r.classList.toggle("today", +r.dataset.day === dayIdx(new Date())); });
$$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });

/* ---------- Pestañas del catálogo ---------- */
$$("[data-tabs]").forEach(function (tabs) {
var target = $(tabs.dataset.tabs);
$$(".tab", tabs).forEach(function (t) {
t.addEventListener("click", function () {
$$(".tab", tabs).forEach(function (x) { x.setAttribute("aria-selected", x === t ? "true" : "false"); });
var c = t.dataset.cat;
$$(".pc", target).forEach(function (p) { p.hidden = c !== "all" && p.dataset.cat !== c; });
});
});
});

/* ---------- Formularios genéricos → WhatsApp / correo ---------- */
function formText(form) {
var title = form.dataset.wa || "Consulta desde la web";
var name = ""; var lines = [];
$$("[name]", form).forEach(function (el) {
if (el.type === "checkbox" && !el.dataset.send) { return; }
var v = (el.type === "checkbox" ? (el.checked ? "Sí" : "") : el.value || "").trim();
if (!v) { return; }
var lab = form.querySelector('label[for="' + el.id + '"]');
var l = lab ? lab.textContent.replace(/\(.*?\)/g, "").trim() : el.name;
if (el.name === "nombre") { name = v; } else { lines.push("• " + l + ": " + v); }
});
return "Hola, soy " + (name || "un cliente") + ". " + title + " en " + S.name + ":\n\n" + lines.join("\n");
}
$$("form[data-wa]").forEach(function (f) {
f.addEventListener("submit", function (e) { e.preventDefault(); });
var bw = $('[data-send="wa"]', f), bm = $('[data-send="mail"]', f), st = $(".stt", f);
if (bw) { bw.addEventListener("click", function () { if (!f.reportValidity()) { return; } if (st) { st.textContent = "Se abrirá WhatsApp con tu mensaje listo para enviar."; } openWA(formText(f)); }); }
if (bm) { bm.addEventListener("click", function () { if (!f.reportValidity()) { return; } if (st) { st.textContent = "Se abrirá tu aplicación de correo."; } location.href = "mailto:" + S.email + "?subject=" + encodeURIComponent(f.dataset.wa + " · " + S.name) + "&body=" + encodeURIComponent(formText(f)); }); }
});

/* ---------- Carrito → WhatsApp ---------- */
var cart = {};
var byId = {};
(S.items || []).forEach(function (it) { byId[it.id] = it; });
var dr = $("#cart"), ov = $("#ov"), cb = $("#cart-body"), cn = $$("[data-cartn]");
function qtyLabel(it, q) { return it.u === "kg" ? num(q) + " kg" : q + " " + (it.u === "pack" ? (q === 1 ? "pack" : "packs") : "ud"); }
function cartTotal() { var t = 0; for (var id in cart) { t += cart[id] * byId[id].p; } return t; }
function cartCount() { var c = 0; for (var id in cart) { c++; } return c; }
function slots() {
var out = ["Lo antes posible"];
var now = new Date(), start = now.getHours() * 60 + now.getMinutes() + 30;
for (var d = 0; d < 3 && out.length < 14; d++) {
var date = new Date(now.getTime() + d * 864e5), hrs = (S.hours || [])[dayIdx(date)] || [];
hrs.forEach(function (r) {
var a = mins(r[0]), b = mins(r[1]) - 15, t = d === 0 ? Math.max(a, Math.ceil(start / 20) * 20) : a;
for (; t <= b && out.length < 14; t += 20) { out.push((d === 0 ? "Hoy " : d === 1 ? "Mañana " : DIAS[dayIdx(date)] + " ") + hh(t)); }
});
}
return out;
}
function renderCart() {
if (!dr) { return; }
var n = cartCount();
cn.forEach(function (b) { b.textContent = n; b.classList.toggle("on", n > 0); });
cb.textContent = "";
if (!n) {
cb.appendChild(h("div", { class: "empty" }, [h("div", { html: S.art && S.art.empty || "" }), h("p", { text: "Tu pedido está vacío. Añade productos desde el catálogo." })]));
$("#cart-foot").hidden = true; return;
}
$("#cart-foot").hidden = false;
Object.keys(cart).forEach(function (id) {
var it = byId[id], q = cart[id];
var src = $('.pc[data-id="' + id + '"] .im svg');
var ti = h("div", { class: "ti" }); if (src) { ti.appendChild(src.cloneNode(true)); }
var minus = h("button", { type: "button", "aria-label": "Quitar " + (it.u === "kg" ? "medio kilo" : "uno"), text: "−" });
var plus = h("button", { type: "button", "aria-label": "Añadir " + (it.u === "kg" ? "medio kilo" : "uno"), text: "+" });
minus.addEventListener("click", function () { var s = it.s || 1; cart[id] = Math.round((cart[id] - s) * 100) / 100; if (cart[id] < (it.m || s)) { delete cart[id]; } renderCart(); });
plus.addEventListener("click", function () { cart[id] = Math.round((cart[id] + (it.s || 1)) * 100) / 100; renderCart(); });
cb.appendChild(h("div", { class: "ci" }, [ti, h("div", {}, [h("b", { text: it.n }), h("small", { text: eur(it.p) + (it.u === "kg" ? "/kg" : "") + " · " + eur(it.p * q) })]), h("div", { class: "qt" }, [minus, h("span", { text: qtyLabel(it, q) }), plus])]));
});
$("#cart-total").textContent = eur(cartTotal());
}
function addToCart(id) {
var it = byId[id]; if (!it) { return; }
cart[id] = Math.round(((cart[id] || 0) + (cart[id] ? (it.s || 1) : (it.m || it.s || 1))) * 100) / 100;
renderCart(); toast("Añadido: " + it.n);
var b = cn[0]; if (b && b.parentNode && b.parentNode.animate && !reduce) { b.parentNode.animate([{ transform: "scale(1)" }, { transform: "scale(1.2)" }, { transform: "scale(1)" }], { duration: 320 }); }
}
function openCart(on) {
if (!dr) { return; }
dr.classList.toggle("on", on); ov.classList.toggle("on", on); dr.setAttribute("aria-hidden", on ? "false" : "true");
document.documentElement.style.overflow = on ? "hidden" : "";
if (on) { var c = $(".dr-h button", dr); if (c) { c.focus(); } }
}
if (dr) {
$$("[data-add]").forEach(function (b) { b.addEventListener("click", function () { addToCart(b.dataset.add); }); });
$$("[data-opencart]").forEach(function (b) { b.addEventListener("click", function () { openCart(true); }); });
$$("[data-closecart]").forEach(function (b) { b.addEventListener("click", function () { openCart(false); }); });
ov.addEventListener("click", function () { openCart(false); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { openCart(false); } });
var sel = $("#cart-when"); if (sel) { slots().forEach(function (s) { sel.appendChild(h("option", { value: s, text: s })); }); }
$("#cart-send").addEventListener("click", function () {
var nm = $("#cart-name"); if (!nm.value.trim()) { nm.focus(); toast("Escribe tu nombre para el pedido"); return; }
var lines = Object.keys(cart).map(function (id) { var it = byId[id]; return "• " + qtyLabel(it, cart[id]) + " · " + it.n + " (≈ " + eur(it.p * cart[id]) + ")"; });
var msg = "Hola, soy " + nm.value.trim() + ". Quiero hacer este pedido en " + S.name + ":\n\n" + lines.join("\n") + "\n\nTotal aproximado: " + eur(cartTotal());
var mode = $("#cart-mode"); if (mode) { msg += "\n" + (mode.dataset.label || "Entrega") + ": " + mode.value; }
var when = $("#cart-when"); if (when && when.value) { msg += "\nCuándo: " + when.value; }
$$("[data-extra]", dr).forEach(function (x) { if (x.value.trim()) { msg += "\n" + x.dataset.extra + ": " + x.value.trim(); } });
var notes = $("#cart-notes"); if (notes && notes.value.trim()) { msg += "\nNotas: " + notes.value.trim(); }
msg += "\n\n(Precio orientativo; se confirma al preparar el pedido.)";
openWA(msg);
});
renderCart();
}

/* ---------- Módulos específicos de cada negocio ---------- */
var mod = $("#mod");
function chips(wrap, list, sel, cb2, multi) {
wrap.textContent = "";
list.forEach(function (o) {
var b = h("button", { type: "button", class: "op", "aria-pressed": "false", disabled: o.off }, [o.l, o.s ? h("small", { text: o.s }) : null]);
b.addEventListener("click", function () {
if (multi) { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); } else { $$(".op", wrap).forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); }
cb2(o, b);
});
if (sel != null && sel === o.v) { b.setAttribute("aria-pressed", "true"); }
wrap.appendChild(b);
});
}
function group(title, id) { var w = h("div", { class: "opts", id: id }); return { box: h("div", {}, [h("h4", { text: title }), w]), w: w }; }
function hash(s) { var x = 0; for (var i = 0; i < s.length; i++) { x = (x * 31 + s.charCodeAt(i)) >>> 0; } return x; }

var M = {};
/* Reservas con selección de servicio, profesional, día y hora */
M.book = function (c) {
var st = { s: null, p: c.pros[0], d: null, t: null };
var out = h("div", { class: "two" });
var left = h("div", { class: "stp" });
var g1 = group("1 · Servicio"), g2 = group("2 · Profesional"), g3 = group("3 · Día"), g4 = group("4 · Hora");
left.appendChild(g1.box); left.appendChild(g2.box); left.appendChild(g3.box); left.appendChild(g4.box);
var right = h("form", { class: "frm", "data-wa": "Quiero reservar una cita" });
var sum = h("div", { class: "res" });
var nm = h("input", { id: "b-n", name: "nombre", required: true, autocomplete: "name" }), tl = h("input", { id: "b-t", name: "telefono", type: "tel", required: true, autocomplete: "tel" }), nt = h("textarea", { id: "b-o", name: "nota" });
var wa = h("button", { type: "button", class: "btn btn-wa", "data-send": "wa", html: S.icons.wa + "Reservar por WhatsApp" });
right.appendChild(h("h3", { text: "Tu cita" })); right.appendChild(sum);
right.appendChild(h("div", { class: "fl" }, [h("label", { for: "b-n", text: "Nombre" }), nm]));
right.appendChild(h("div", { class: "fl" }, [h("label", { for: "b-t", text: "Teléfono" }), tl]));
right.appendChild(h("div", { class: "fl" }, [h("label", { for: "b-o", text: "Nota (opcional)" }), nt]));
right.appendChild(wa); right.appendChild(h("p", { class: "stt", role: "status" }));
function summary() {
sum.textContent = "";
sum.appendChild(h("div", {}, [h("small", { text: st.s ? st.s.l : "Elige un servicio" }), h("b", { text: st.d && st.t ? st.d.label + " · " + st.t : "Elige día y hora" })]));
if (st.s && st.s.p) { sum.appendChild(h("div", { style: "text-align:right" }, [h("small", { text: "desde" }), h("b", { text: eur(st.s.p) })])); }
}
chips(g1.w, c.services.map(function (s) { return { v: s.id, l: s.n, s: s.d + (s.p ? " · desde " + eur(s.p) : ""), p: s.p, id: s.id }; }), null, function (o) { st.s = o; summary(); });
chips(g2.w, c.pros.map(function (p) { return { v: p, l: p }; }), c.pros[0], function (o) { st.p = o.v; });
var days = [], d0 = new Date(), nowM0 = d0.getHours() * 60 + d0.getMinutes(); d0.setHours(0, 0, 0, 0);
for (var i = 0; i < 14 && days.length < 8; i++) {
var d = new Date(d0.getTime() + i * 864e5), di = dayIdx(d), hr = S.hours[di] || [];
if (hr.length && (i > 0 || hr.some(function (r) { return mins(r[1]) - (c.step || 30) >= nowM0 + 30; }))) { days.push({ v: i, l: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][di] + " " + d.getDate(), date: d, hr: hr, label: (i === 0 ? "Hoy" : i === 1 ? "Mañana" : DIAS[di] + " " + d.getDate()) }); }
}
chips(g3.w, days, null, function (o) { st.d = o; st.t = null; drawTimes(); summary(); });
function drawTimes() {
if (!st.d) { g4.w.textContent = ""; g4.w.appendChild(h("small", { text: "Primero elige un día.", style: "color:var(--mute)" })); return; }
var list = [], nowM = new Date().getHours() * 60 + new Date().getMinutes();
st.d.hr.forEach(function (r) { for (var t = mins(r[0]); t <= mins(r[1]) - (c.step || 30); t += (c.step || 30)) { list.push(t); } });
chips(g4.w, list.map(function (t) { var past = st.d.v === 0 && t < nowM + 30; var busy = hash(st.d.date.toDateString() + t) % 4 === 0; return { v: t, l: hh(t), off: past || busy, cls: "tm" }; }), null, function (o) { st.t = o.l; summary(); });
$$(".op", g4.w).forEach(function (b) { b.classList.add("tm"); });
}
drawTimes(); summary();
wa.addEventListener("click", function () {
if (!st.s || !st.d || !st.t) { toast("Elige servicio, día y hora"); return; }
if (!right.reportValidity()) { return; }
openWA("Hola, soy " + nm.value.trim() + ". Quiero reservar cita en " + S.name + ":\n\n• Servicio: " + st.s.l + "\n• Con: " + st.p + "\n• Cuándo: " + st.d.label + " a las " + st.t + "\n• Teléfono: " + tl.value.trim() + (nt.value.trim() ? "\n• Nota: " + nt.value.trim() : "") + "\n\n(Pendiente de confirmación.)");
});
out.appendChild(left); out.appendChild(right); return out;
};
/* Configurador de tarta */
M.tarta = function (c) {
var st = { size: c.sizes[1], fl: c.flavors[0], fill: c.fills[0], txt: "", date: "" };
var out = h("div", { class: "two" });
var pre = h("div", { class: "pre", style: "--tint:" + st.fl.c }), svgBox = h("div", { html: S.art.tarta });
pre.appendChild(svgBox);
var left = h("div", { class: "stp" });
var g1 = group("Raciones"), g2 = group("Sabor del bizcocho"), g3 = group("Relleno");
left.appendChild(g1.box); left.appendChild(g2.box); left.appendChild(g3.box);
var res = h("div", { class: "res" });
var txt = h("input", { id: "t-txt", name: "dedicatoria", maxlength: 40, placeholder: "Ej.: Feliz cumple, Lucía" });
var dt = h("input", { id: "t-d", name: "fecha", type: "date", required: true });
var nm = h("input", { id: "t-n", name: "nombre", required: true, autocomplete: "name" });
var form = h("form", { "data-wa": "Quiero encargar una tarta", class: "stp" });
var wa = h("button", { type: "button", class: "btn btn-wa", html: S.icons.wa + "Encargar por WhatsApp" });
form.appendChild(h("div", { class: "fl" }, [h("label", { for: "t-txt", text: "Mensaje en la tarta (opcional)" }), txt]));
form.appendChild(h("div", { class: "row2" }, [h("div", { class: "fl" }, [h("label", { for: "t-d", text: "Fecha de recogida" }), dt]), h("div", { class: "fl" }, [h("label", { for: "t-n", text: "Tu nombre" }), nm])]));
left.appendChild(form); left.appendChild(res); left.appendChild(wa);
var mn = new Date(Date.now() + (c.days || 3) * 864e5); dt.min = mn.toISOString().slice(0, 10);
function price() { return Math.round(st.size.p * (st.fl.m || 1) + (st.fill.x || 0)); }
function upd(bump) {
res.textContent = ""; res.appendChild(h("div", {}, [h("small", { text: st.size.l + " · " + st.fl.l + " · " + st.fill.l }), h("small", { text: "Precio orientativo (se confirma al encargar)" })])); res.appendChild(h("b", { text: eur(price()) }));
pre.style.setProperty("--tint", st.fl.c);
var s = $("svg", svgBox); if (s) { s.style.filter = "hue-rotate(" + (st.fl.h || 0) + "deg) saturate(" + (st.fl.sat || 1) + ")"; }
if (bump) { pre.classList.add("bump"); setTimeout(function () { pre.classList.remove("bump"); }, 280); }
}
chips(g1.w, c.sizes.map(function (s) { return { v: s.l, l: s.l, s: s.d, o: s }; }), st.size.l, function (o) { st.size = o.o; upd(true); });
chips(g2.w, c.flavors.map(function (s) { return { v: s.l, l: s.l, o: s }; }), st.fl.l, function (o) { st.fl = o.o; upd(true); });
chips(g3.w, c.fills.map(function (s) { return { v: s.l, l: s.l, s: s.x ? "+" + eur(s.x) : "incluido", o: s }; }), st.fill.l, function (o) { st.fill = o.o; upd(true); });
upd();
wa.addEventListener("click", function () {
if (!form.reportValidity()) { return; }
openWA("Hola, soy " + nm.value.trim() + ". Quiero encargar una tarta en " + S.name + ":\n\n• Raciones: " + st.size.l + "\n• Sabor: " + st.fl.l + "\n• Relleno: " + st.fill.l + (txt.value.trim() ? "\n• Mensaje: " + txt.value.trim() : "") + "\n• Recogida: " + dt.value + "\n• Precio orientativo: " + eur(price()) + "\n\n(Pendiente de confirmación.)");
});
out.appendChild(pre); out.appendChild(left); return out;
};
/* Fruta de temporada por mes */
M.temporada = function (c) {
var box = h("div"); var m = new Date().getMonth() + 1;
var mw = h("div", { class: "mths", role: "group", "aria-label": "Mes" });
var grid = h("div", { class: "grid", style: "margin-top:1.4rem" });
var names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
function draw(mm) {
grid.textContent = "";
(c.seasons[mm] || []).forEach(function (k, i) {
var f = c.fruits[k];
grid.appendChild(h("div", { class: "pc" }, [h("div", { class: "im", html: S.art[k] || "" }), h("h3", { text: f.n }), h("p", { text: f.d }), i === 0 ? h("span", { class: "tg", text: "En su mejor momento" }) : null]));
});
}
chips(mw, names.map(function (n, i) { return { v: i + 1, l: n.slice(0, 3) }; }), m, function (o) { draw(o.v); });
box.appendChild(mw); box.appendChild(grid); draw(m); return box;
};
/* Cesta semanal */
M.cesta = function (c) {
var st = { size: c.sizes[1], freq: c.freqs[0], zone: c.zones[0], prefs: [] };
var out = h("div", { class: "two" });
var left = h("div", { class: "stp" });
var g1 = group("Tamaño de la cesta"), g2 = group("Frecuencia"), g3 = group("Preferencias (opcional)"), g4 = group("Zona de reparto");
[g1, g2, g3, g4].forEach(function (g) { left.appendChild(g.box); });
var right = h("form", { class: "frm", "data-wa": "Quiero suscribirme a la cesta" });
var res = h("div", { class: "res" }), nm = h("input", { id: "c-n", name: "nombre", required: true, autocomplete: "name" }), ad = h("input", { id: "c-a", name: "direccion", required: true, autocomplete: "street-address" });
var wa = h("button", { type: "button", class: "btn btn-wa", html: S.icons.wa + "Pedir mi cesta por WhatsApp" });
right.appendChild(h("div", { class: "pre", style: "--tint:" + c.tint + ";aspect-ratio:16/10", html: S.art.cesta }));
right.appendChild(res);
right.appendChild(h("div", { class: "fl" }, [h("label", { for: "c-n", text: "Tu nombre" }), nm]));
right.appendChild(h("div", { class: "fl" }, [h("label", { for: "c-a", text: "Dirección de entrega" }), ad]));
right.appendChild(wa);
function total() { return st.size.p * st.freq.k + (st.zone.f || 0); }
function upd() { res.textContent = ""; res.appendChild(h("div", {}, [h("small", { text: st.size.l + " · " + st.freq.l }), h("small", { text: st.zone.l + (st.zone.f ? " (+" + eur(st.zone.f) + " envío)" : " (envío gratis)") })])); res.appendChild(h("b", { text: eur(total()) })); }
chips(g1.w, c.sizes.map(function (s) { return { v: s.l, l: s.l, s: s.d + " · " + eur(s.p), o: s }; }), st.size.l, function (o) { st.size = o.o; upd(); });
chips(g2.w, c.freqs.map(function (s) { return { v: s.l, l: s.l, o: s }; }), st.freq.l, function (o) { st.freq = o.o; upd(); });
chips(g3.w, c.prefs.map(function (s) { return { v: s, l: s }; }), null, function (o, b) { var i = st.prefs.indexOf(o.v); if (i > -1) { st.prefs.splice(i, 1); } else { st.prefs.push(o.v); } }, true);
chips(g4.w, c.zones.map(function (s) { return { v: s.l, l: s.l, s: s.f ? "+" + eur(s.f) : "gratis", o: s }; }), st.zone.l, function (o) { st.zone = o.o; upd(); });
upd();
wa.addEventListener("click", function () {
if (!right.reportValidity()) { return; }
openWA("Hola, soy " + nm.value.trim() + ". Quiero la cesta de " + S.name + ":\n\n• Cesta: " + st.size.l + "\n• Frecuencia: " + st.freq.l + "\n• Zona: " + st.zone.l + "\n• Dirección: " + ad.value.trim() + (st.prefs.length ? "\n• Preferencias: " + st.prefs.join(", ") : "") + "\n• Precio orientativo: " + eur(total()) + "\n\n(Se confirma con la disponibilidad de temporada.)");
});
out.appendChild(left); out.appendChild(right); return out;
};
/* Hornadas del día */
M.hornadas = function (c) {
var box = h("div", { class: "two" });
var tl = h("div", { class: "tl", role: "list" });
var info = h("div", { class: "stp" });
var big = h("div", { class: "res" });
info.appendChild(big);
info.appendChild(h("div", { class: "pre", style: "--tint:" + c.tint, html: S.art.horno }));
function draw() {
var now = new Date(), m = now.getHours() * 60 + now.getMinutes(), next = null;
tl.textContent = "";
c.bakes.forEach(function (b) { var t = mins(b.t); if (next == null && t > m) { next = b; } });
c.bakes.forEach(function (b) {
var t = mins(b.t), cls = "hr" + (b === next ? " next" : t <= m ? " past" : "");
tl.appendChild(h("div", { class: cls, role: "listitem" }, [h("time", { text: b.t }), h("div", {}, [h("b", { text: b.n }), h("small", { text: " " + b.d, style: "display:block;color:var(--mute)" })]), h("em", { text: b === next ? "Próxima" : t <= m ? "Ya salió" : "Hoy" })]));
});
big.textContent = "";
if (next) { var d = mins(next.t) - m; big.appendChild(h("div", {}, [h("small", { text: "Próxima hornada" }), h("b", { text: d >= 60 ? "en " + Math.floor(d / 60) + " h " + (d % 60) + " min" : "en " + d + " min" })])); big.appendChild(h("div", { style: "text-align:right" }, [h("small", { text: next.t + " h" }), h("b", { text: next.n, style: "font-size:1.1rem" })])); }
else { big.appendChild(h("div", {}, [h("small", { text: "Hoy ya no hay más hornadas" }), h("b", { text: "Mañana, desde las " + c.bakes[0].t })])); }
}
draw(); setInterval(draw, 30000);
box.appendChild(tl); box.appendChild(info); return box;
};
/* Fechas clave con cuenta atrás */
M.fechas = function (c) {
var box = h("div", { class: "dts" });
function nextDate(f) {
var now = new Date(), y = now.getFullYear(), d;
for (var k = 0; k < 2; k++) {
if (f.rule === "madre") { d = new Date(y + k, 4, 1); while (d.getDay() !== 0) { d.setDate(d.getDate() + 1); } } else { d = new Date(y + k, f.m - 1, f.d); }
d.setHours(23, 59, 59); if (d >= now) { return d; }
}
}
c.dates.forEach(function (f) {
var d = nextDate(f), left = Math.max(0, Math.ceil((d - new Date()) / 864e5));
var b = h("button", { type: "button", class: "btn btn-main btn-sm", text: "Reservar mis flores" });
b.addEventListener("click", function () { openWA("Hola, quiero reservar flores en " + S.name + " para " + f.n + " (" + d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + "). ¿Qué opciones tenéis?"); });
box.appendChild(h("div", { class: "dt rv" }, [h("div", { html: S.art[f.art] || "" }), h("div", { class: "d" }, [String(left) + " ", h("small", { text: left === 1 ? "día" : "días" })]), h("b", { text: f.n }), h("p", { text: f.t, style: "color:var(--mute);font-size:.92rem" }), b]));
});
return box;
};
/* Calculadora de mantenimiento (taller) */
M.taller = function (c) {
var out = h("div", { class: "two" });
var left = h("div", { class: "stp" });
var km = h("input", { id: "k-km", type: "number", min: 0, max: 600000, step: 1000, inputmode: "numeric", value: 62000 });
var ag = h("input", { id: "k-ag", type: "number", min: 0, max: 40, step: 1, inputmode: "numeric", value: 5 });
left.appendChild(h("div", { class: "row2" }, [h("div", { class: "fl" }, [h("label", { for: "k-km", text: "Kilómetros del coche" }), km]), h("div", { class: "fl" }, [h("label", { for: "k-ag", text: "Antigüedad (años)" }), ag])]));
var list = h("div", { class: "tl" }); left.appendChild(list);
var right = h("div", { class: "frm" });
var sum = h("div", { class: "stp" });
right.appendChild(h("h3", { text: "Tu próxima revisión" })); right.appendChild(sum);
var go = h("a", { class: "btn btn-main", href: "#cita", text: "Pedir cita con esta revisión" }); right.appendChild(go);
function upd() {
var k = Math.max(0, +km.value || 0), a = Math.max(0, +ag.value || 0), soon = [];
list.textContent = "";
c.rules.forEach(function (r) {
var rem, label, p;
if (r.every) { var nx = Math.ceil((k + 1) / r.every) * r.every; rem = nx - k; p = 1 - rem / r.every; label = "faltan " + num(Math.round(rem / 100) * 100) + " km"; }
else { var per = r.years, now0 = a > 0 && a % per === 0; var due = now0 ? 0 : per - (a % per); p = 1 - due / per; rem = due * 1e4; label = now0 ? "toca ahora" : "en " + due + (due === 1 ? " año" : " años"); }
var urgent = p > .85; if (urgent) { soon.push(r.n); }
var row = h("div", { class: "hr" + (urgent ? " next" : ""), style: "grid-template-columns:56px 1fr auto" }, [h("div", { html: S.art[r.art] || "", style: "width:48px" }), h("div", {}, [h("b", { text: r.n }), h("div", { style: "height:6px;border-radius:6px;background:var(--chip);margin-top:.4rem;overflow:hidden" }, [h("i", { style: "display:block;height:100%;width:" + Math.round(p * 100) + "%;background:var(--brand);border-radius:6px" })])]), h("em", { text: label })]);
list.appendChild(row);
});
sum.textContent = "";
sum.appendChild(h("p", { text: soon.length ? "Con " + num(k) + " km y " + a + " años, te recomendamos revisar pronto:" : "Con " + num(k) + " km y " + a + " años, tu coche va al día. Una revisión preventiva nunca sobra." }));
if (soon.length) { sum.appendChild(h("ul", { style: "display:grid;gap:.4rem" }, soon.map(function (s) { return h("li", { text: "✓ " + s, style: "font-weight:700" }); }))); }
var f = $("#f-serv"); if (f && soon.length) { f.value = soon.join(", "); }
}
km.addEventListener("input", upd); ag.addEventListener("input", upd); upd();
out.appendChild(left); out.appendChild(right); return out;
};
/* Calculadora de cantidades (barbacoa, comidas, eventos) → rellena el pedido */
M.calc = function (c) {
var st = { n: c.def || 8, big: false };
var out = h("div", { class: "two" });
var left = h("div", { class: "stp" });
var rng = h("input", { id: "q-n", type: "range", min: c.min || 2, max: c.max || 30, value: st.n, "aria-label": c.label });
var val = h("b", { style: "font-family:var(--display);font-size:3rem;line-height:1" });
var g = group("Apetito"); var list = h("div", { class: "tl" });
var res = h("div", { class: "res" });
var go = h("button", { type: "button", class: "btn btn-main", text: "Añadir todo a mi pedido" });
left.appendChild(h("div", {}, [h("h4", { text: c.label }), h("div", { style: "display:flex;align-items:baseline;gap:.6rem" }, [val, h("span", { text: c.unit || "personas", style: "color:var(--mute);font-weight:700" })]), rng]));
left.appendChild(g.box); left.appendChild(res); left.appendChild(go);
function qty(p) { var it = byId[p.id], f = st.big ? (c.big || 1.3) : 1, raw = p.per * st.n * f, s = it.s || 1, m = it.m || s; return Math.max(m, Math.ceil(raw / s - 1e-9) * s); }
function upd() {
val.textContent = st.n; list.textContent = ""; var tot = 0;
c.parts.forEach(function (p) {
var it = byId[p.id], q = qty(p); tot += q * it.p;
var im = $('.pc[data-id="' + p.id + '"] .im svg');
list.appendChild(h("div", { class: "hr", style: "grid-template-columns:56px 1fr auto" }, [h("div", { style: "width:48px", html: im ? im.outerHTML : "" }), h("div", {}, [h("b", { text: it.n }), h("small", { text: " " + p.why, style: "display:block;color:var(--mute)" })]), h("em", { text: qtyLabel(it, q) })]));
});
res.textContent = ""; res.appendChild(h("div", {}, [h("small", { text: "Total aproximado" }), h("small", { text: "Cantidades orientativas" })])); res.appendChild(h("b", { text: eur(tot) }));
}
chips(g.w, [{ v: 0, l: "Normal", s: "Plato de siempre" }, { v: 1, l: "Buen comer", s: "Se repite" }], 0, function (o) { st.big = !!o.v; upd(); });
rng.addEventListener("input", function () { st.n = +rng.value; upd(); });
go.addEventListener("click", function () { c.parts.forEach(function (p) { cart[p.id] = qty(p); }); renderCart(); openCart(true); });
upd();
out.appendChild(left); out.appendChild(list); return out;
};
if (mod && S.module && M[S.module.type]) { mod.appendChild(M[S.module.type](S.module)); }
var mod2 = $("#mod2"); if (mod2 && S.module2 && M[S.module2.type]) { mod2.appendChild(M[S.module2.type](S.module2)); }
})();
