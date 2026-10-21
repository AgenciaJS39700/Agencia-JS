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

/* 1) HERO: capas con profundidad al hacer scroll + ratón */
var hero = $(".hero");
if (hero) {
var items = $$(".hero-a .it", hero);
items.forEach(function (n, i) {
var d = parseFloat(n.dataset.d || (0.5 + i * 0.35));
gsap.to(n, { yPercent: -18 * d, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
});
var blob = $(".hero-a .blob", hero);
if (blob) { gsap.to(blob, { yPercent: 10, scale: 1.08, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } }); }
var ht = $(".hero-t", hero);
if (ht) { gsap.to(ht, { y: desk ? -60 : -30, opacity: 0.1, ease: "none", scrollTrigger: { trigger: hero, start: "20% top", end: "bottom top", scrub: true } }); }
if (desk && fine) {
var ha = $(".hero-a", hero);
var xs = items.map(function (n) { return gsap.quickTo(n, "x", { duration: 0.8, ease: "power3.out" }); });
var ys = items.map(function (n) { return gsap.quickTo(n, "y", { duration: 0.8, ease: "power3.out" }); });
hero.addEventListener("pointermove", function (e) {
var r = hero.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
items.forEach(function (n, i) { var d = parseFloat(n.dataset.d || (0.5 + i * 0.35)); xs[i](px * 38 * d); ys[i](py * 28 * d); });
});
}
}

/* 2) FRASE: las palabras se iluminan según el scroll */
$$(".st p").forEach(function (p) {
var w = $$(".w", p); if (!w.length) { return; }
gsap.to(w, { opacity: 1, ease: "none", stagger: 0.5, scrollTrigger: { trigger: p, start: "top 82%", end: "bottom 45%", scrub: 0.4 } });
});

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

/* 4) ESCENA QUE SE EXPANDE (Apple-style) */
$$(".xp").forEach(function (xp) {
var frame = $(".xp-f", xp), txt = $$(".xp-t > *", xp), art = $(".xp-p", xp);
xp.classList.add("on");
var ini = desk ? "inset(12% 14% 12% 14% round 36px)" : "inset(9% 5% 13% 5% round 26px)";
var tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: xp, start: "top top", end: "+=140%", pin: true, scrub: 0.7, anticipatePin: 1 } });
tl.fromTo(frame, { clipPath: ini }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1 }, 0);
if (art) { tl.fromTo(art, { scale: 1.35, yPercent: 8, opacity: 0.1 }, { scale: 1, yPercent: -6, opacity: 0.3, duration: 1 }, 0); }
tl.fromTo(txt, { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.14, duration: 0.45, ease: "power2.out" }, 0.45);
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

/* 7) Parallax suave en bloques marcados */
$$("[data-par]").forEach(function (n) {
var v = parseFloat(n.dataset.par) || 8;
gsap.fromTo(n, { yPercent: v }, { yPercent: -v, ease: "none", scrollTrigger: { trigger: n.parentNode, start: "top bottom", end: "bottom top", scrub: true } });
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
