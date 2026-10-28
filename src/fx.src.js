/* /fx.js — Efectos de scroll con GSAP + ScrollTrigger (cargados en diferido, desde tu propio dominio).
   Si el visitante prefiere menos movimiento, o algo falla, la web se ve igual de completa sin efectos. */
(function () {
"use strict";
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
if (!("IntersectionObserver" in window)) { return; }

function cargar(src) {
return new Promise(function (ok, ko) {
var s = document.createElement("script");
s.src = src; s.async = false;
s.onload = ok; s.onerror = ko;
document.head.appendChild(s);
});
}
function arrancar() {
cargar("/gsap.min.js").then(function () { return cargar("/ScrollTrigger.min.js"); }).then(iniciar).catch(function () {});
}
function enReposo(fn) {
if ("requestIdleCallback" in window) { requestIdleCallback(fn, { timeout: 1800 }); } else { setTimeout(fn, 600); }
}
if (document.readyState === "complete") { enReposo(arrancar); } else { window.addEventListener("load", function () { enReposo(arrancar); }); }

function iniciar() {
var gsap = window.gsap, ST = window.ScrollTrigger;
if (!gsap || !ST) { return; }
gsap.registerPlugin(ST);
ST.config({ ignoreMobileResize: true });
document.documentElement.classList.add("fx-on");

/* Barra de progreso de lectura */
var barra = document.createElement("div");
barra.className = "fx-progress";
barra.setAttribute("aria-hidden", "true");
document.body.appendChild(barra);
gsap.to(barra, { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.documentElement, start: "top top", end: "bottom bottom", scrub: 0.2 } });

var mm = gsap.matchMedia();
mm.add({ desk: "(min-width: 768px)", mob: "(max-width: 767px)" }, function (ctx) {
var desk = ctx.conditions.desk;

/* 1) HERO: parallax suave de la imagen y la rejilla (el texto queda siempre visible) */
var hero = document.getElementById("inicio");
if (hero) {
var himg = hero.querySelector("img");
var grid = hero.querySelector(".grid-bg");
var base = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
if (himg) { gsap.fromTo(himg, { yPercent: 0, scale: 1.12 }, { yPercent: desk ? 8 : 5, scale: 1.22, ease: "none", scrollTrigger: base }); }
if (grid) { gsap.to(grid, { yPercent: 25, ease: "none", scrollTrigger: base }); }
/* El texto del hero ya no se desvanece: con el scroll rápido arriba/abajo podía quedarse semitransparente */
}

/* Recalcular posiciones cuando termina de cargar todo (imágenes, fuentes) para que el pin no se descuadre */
window.addEventListener("load", function () { ST.refresh(); });
if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { ST.refresh(); }); }

/* 3) Entrada escalonada de tarjetas y listas (sustituye al fundido simple en estos bloques) */
["#servicios .grid > a", "#planes article"].forEach(function (sel) {
var nodos = [].slice.call(document.querySelectorAll(sel));
if (!nodos.length) { return; }
nodos.forEach(function (n) { n.classList.remove("reveal"); });
gsap.set(nodos, { opacity: 0, y: 56, scale: 0.97 });
ST.batch(nodos, {
start: "top 90%", once: true,
onEnter: function (lote) {
gsap.to(lote, Object.assign({ opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out", stagger: 0.13, overwrite: true, clearProps: "opacity,transform" }, {
onStart: function () { lote.forEach(function (n) { n.style.transition = "none"; }); },
onComplete: function () { lote.forEach(function (n) { n.style.transition = ""; }); }
}));
}
});
});

/* 4) PLANES: los precios cuentan hasta su valor */
document.querySelectorAll("#planes article .text-4xl").forEach(function (sp) {
if (!sp.dataset.precio) { sp.dataset.precio = String(parseInt(sp.textContent, 10) || 0); }
var final = parseInt(sp.dataset.precio, 10);
if (!final) { return; }
var o = { v: 0 };
sp.textContent = "0 €";
gsap.to(o, { v: final, duration: 1.4, ease: "power2.out", onUpdate: function () { sp.textContent = Math.round(o.v) + " €"; }, onComplete: function () { sp.textContent = final + " €"; }, scrollTrigger: { trigger: sp, start: "top 92%", once: true } });
});

/* 5) NFC y teléfono: capas con distinta velocidad de scroll (profundidad) */
function envolver(n) {
if (n.parentNode.classList.contains("fx-par")) { return n.parentNode; }
var w = document.createElement("div");
w.className = "fx-par";
n.parentNode.insertBefore(w, n);
w.appendChild(n);
return w;
}
var nfc = document.getElementById("nfc-stage");
if (nfc) {
gsap.fromTo(envolver(nfc), { yPercent: desk ? 9 : 4 }, { yPercent: desk ? -9 : -4, ease: "none", scrollTrigger: { trigger: "#nfc", start: "top bottom", end: "bottom top", scrub: true } });
}
var tel = document.querySelector("#video .phone-float");
if (tel) {
gsap.fromTo(envolver(tel), { yPercent: desk ? 8 : 3, rotation: desk ? -5 : -2 }, { yPercent: desk ? -8 : -3, rotation: desk ? 5 : 2, ease: "none", scrollTrigger: { trigger: "#video", start: "top bottom", end: "bottom top", scrub: true } });
}
});

ST.refresh();
}
})();
