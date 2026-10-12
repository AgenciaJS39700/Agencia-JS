/* /servicios.js — Escaparate interactivo de "Qué hacemos por tu negocio".
   Sin dependencias ni almacenamiento. Respeta prefers-reduced-motion. */
(function () {
"use strict";
var sec = document.getElementById("servicios");
if (!sec) { return; }
var items = [].slice.call(sec.querySelectorAll(".sv-item"));
var tabs = items.map(function (it) { return it.querySelector("[role=tab]"); });
var panels = items.map(function (it) { return it.querySelector("[role=tabpanel]"); });
var screens = [].slice.call(sec.querySelectorAll(".sv-scr"));
if (!tabs.length || tabs.length !== screens.length) { return; }
var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var actual = 0, timer = null, detenido = reduce, visible = false, encima = false;
var DURACION = 7000;
var vid = sec.querySelector(".sv-vid");
var VIDEO_SRC = "/video-muestra.mp4";
function video(activo) {
if (!vid) { return; }
if (activo && visible) {
if (!vid.getAttribute("src")) { vid.src = VIDEO_SRC; }
var pr = vid.play();
if (pr && pr.catch) { pr.catch(function () {}); }
} else { vid.pause(); }
}

function mostrar(i) {
actual = i;
items.forEach(function (it, k) {
var on = k === i;
tabs[k].setAttribute("aria-selected", on ? "true" : "false");
tabs[k].tabIndex = on ? 0 : -1;
panels[k].hidden = !on;
it.classList.remove("act");
if (on) { void it.offsetWidth; it.classList.add("act"); }
screens[k].classList.remove("on");
});
void sec.offsetWidth;
screens[i].classList.add("on");
video(screens[i].contains(vid));
sec.classList.toggle("sv-auto", !detenido);
}
function siguiente() { mostrar((actual + 1) % tabs.length); }
function programar() {
clearTimeout(timer);
if (detenido || !visible || encima) { return; }
timer = setTimeout(function () { siguiente(); programar(); }, DURACION);
}
tabs.forEach(function (t, k) {
t.addEventListener("click", function () { detenido = true; clearTimeout(timer); mostrar(k); });
t.addEventListener("keydown", function (e) {
var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
var destino = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : d ? (k + d + tabs.length) % tabs.length : -1;
if (destino < 0) { return; }
e.preventDefault();
detenido = true; clearTimeout(timer);
mostrar(destino);
tabs[destino].focus();
});
});
sec.addEventListener("pointerenter", function () { encima = true; clearTimeout(timer); });
sec.addEventListener("pointerleave", function () { encima = false; programar(); });
mostrar(0);
if ("IntersectionObserver" in window) {
new IntersectionObserver(function (en) {
visible = en[0].isIntersecting;
if (visible) { mostrar(actual); programar(); } else { clearTimeout(timer); video(false); }
}, { threshold: 0.35 }).observe(sec);
}
})();
