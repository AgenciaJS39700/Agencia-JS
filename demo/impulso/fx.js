/* fx.js — efectos de scroll tipo Apple/Samsung con GSAP + ScrollTrigger (diferido, autoalojado).
   Sin movimiento reducido ni fallos: la web se ve completa igualmente. */
(function () {
"use strict";
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { return; }
function cargar(src) { return new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = src; s.async = false; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
function arrancar() { cargar("gsap.min.js").then(function () { return cargar("ScrollTrigger.min.js"); }).then(iniciar).catch(function () {}); }
function reposo(fn) { if ("requestIdleCallback" in window) { requestIdleCallback(fn, { timeout: 1500 }); } else { setTimeout(fn, 500); } }
if (document.readyState === "complete") { reposo(arrancar); } else { window.addEventListener("load", function () { reposo(arrancar); }); }
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

function iniciar() {
var gsap = window.gsap, ST = window.ScrollTrigger;
if (!gsap || !ST) { return; }
gsap.registerPlugin(ST);
ST.config({ ignoreMobileResize: true });
var root = document.documentElement;
root.classList.add("fx-on");
var fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

/* Barra de progreso */
var bar = document.createElement("div"); bar.className = "fx-prog"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar);
gsap.to(bar, { scaleX: 1, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.2 } });

var mm = gsap.matchMedia();
mm.add({ desk: "(min-width: 960px)", mob: "(max-width: 959px)" }, function (ctx) {
var desk = ctx.conditions.desk;

/* 1-2) Sin parallax en el hero ni frase que se ilumina (oct 2026: no se ven bien en móvil) */

/* 3) PASOS: scroll horizontal anclado (escritorio) */
$$(".hz").forEach(function (hz) {
var track = $(".hz-t", hz); if (!track) { return; }
if (desk) {
hz.classList.add("on");
var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 80); };
gsap.to(track, { x: function () { return -dist(); }, ease: "none", scrollTrigger: { trigger: hz, start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true } });
} else {
hz.classList.remove("on");
batch($$(".hz-c", hz));
}
});

/* 5) Entrada escalonada de tarjetas */
batch($$(".bc"));
batch($$(".dt"));
batch($$(".rc"));
batch($$(".sx"));
$$(".grid").forEach(function (g) { batch($$(".pc", g)); });

/* 6) Contadores */
$$("[data-count]").forEach(function (n) {
var fin = parseFloat(n.dataset.count), dec = (n.dataset.dec | 0), suf = n.dataset.suf || "", o = { v: 0 };
n.textContent = (0).toFixed(dec).replace(".", ",") + suf;
gsap.to(o, { v: fin, duration: 1.8, ease: "power2.out", onUpdate: function () { n.textContent = o.v.toFixed(dec).replace(".", ",") + suf; }, onComplete: function () { n.textContent = fin.toFixed(dec).replace(".", ",") + suf; }, scrollTrigger: { trigger: n, start: "top 92%", once: true } });
});

/* 8) Botones magnéticos + inclinación 3D (solo con ratón) */
if (desk && fine) {
$$(".hero .btn-main, .hero .btn-wa").forEach(function (b) {
var qx = gsap.quickTo(b, "x", { duration: 0.5, ease: "power3.out" }), qy = gsap.quickTo(b, "y", { duration: 0.5, ease: "power3.out" });
b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * 0.25); qy((e.clientY - r.top - r.height / 2) * 0.35); });
b.addEventListener("pointerleave", function () { qx(0); qy(0); });
});
$$(".bc, .pc").forEach(function (c) {
c.addEventListener("pointermove", function (e) {
var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
gsap.to(c, { rotateY: px * 7, rotateX: -py * 7, transformPerspective: 900, duration: 0.4, ease: "power2.out", overwrite: "auto" });
});
c.addEventListener("pointerleave", function () { gsap.to(c, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" }); });
});
}
});

function batch(nodos) {
if (!nodos.length) { return; }
nodos.forEach(function (n) { n.classList.remove("rv"); n.classList.add("in"); });
gsap.set(nodos, { opacity: 0, y: 50, scale: 0.96 });
ST.batch(nodos, {
start: "top 92%", once: true,
onEnter: function (lote) { gsap.to(lote, { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out", stagger: 0.1, overwrite: true, clearProps: "opacity,transform" }); }
});
}
ST.refresh();
}
})();
