/* /efectos/orbita.js — «Órbita de producto» · Agencia JS
   Disco de color + texto circular que gira + productos recortados que entran y salen en órbita.
   Uso (sin dependencias):
   <div class="orbita" data-ring="HECHO CADA MAÑANA ✦ CON MASA MADRE ✦ " data-auto="4200">
     <figure data-color="#f0a14a" data-name="Croissant" data-desc="Mantequilla de verdad">
       <img src="img/croissant.webp" alt="Croissant" width="720" height="510">
       <img src="img/napolitana.webp" alt="" data-sat>   ← opcional: producto satélite
     </figure>
     ...más <figure>
   </div>
   <script src="orbita.js" defer></script>
   Accesible: botones con nombre, teclado (← →), pausa al pasar el ratón / fuera de pantalla,
   y con «reducir movimiento» solo hace fundidos. */
(function () {
"use strict";
var CSS = ".orbita{--c:#f0a14a;position:relative;width:min(100%,560px);aspect-ratio:1;margin-inline:auto;perspective:1100px;touch-action:pan-y;user-select:none;-webkit-user-select:none}" +
".orbita>figure{display:none}" +
".orb-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.2,.8,.2,1)}" +
".orb-glow{position:absolute;inset:-22%;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--c) 38%,transparent) 0,transparent 62%);transition:background 1s;pointer-events:none}" +
".orb-disc{position:absolute;inset:17%;border-radius:50%;background:var(--c);box-shadow:0 46px 90px -34px var(--c),inset 0 -26px 50px rgba(0,0,0,.12),inset 0 18px 40px rgba(255,255,255,.18);transition:background-color .9s cubic-bezier(.4,0,.2,1),box-shadow .9s,transform .7s cubic-bezier(.3,1.4,.5,1)}" +
".orbita.chg .orb-disc{transform:scale(.93)}" +
".orb-ring{position:absolute;inset:1%;width:98%;height:98%;overflow:visible;animation:orbspin 40s linear infinite;pointer-events:none}" +
".orb-ring text{font:800 20px/1 system-ui,sans-serif;letter-spacing:6px;text-transform:uppercase;fill:var(--c);transition:fill .9s}" +
".orb-st{position:absolute;inset:16%;transform:translateZ(60px)}" +
".orb-it{position:absolute;inset:0;opacity:0;pointer-events:none}" +
".orb-it img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 34px 30px rgba(30,15,5,.38))}" +
".orb-it img[data-sat]{inset:auto auto -6% -14%;width:46%;height:46%;filter:drop-shadow(0 20px 18px rgba(30,15,5,.35));animation:orbbob 4.5s ease-in-out infinite}" +
".orb-it.on{opacity:1}" +
".orb-lab{position:absolute;left:50%;bottom:-2%;transform:translate(-50%,0) translateZ(80px);min-width:11rem;max-width:88%;padding:.6rem 1.1rem .75rem;border-radius:18px;background:rgba(255,255,255,.92);color:#1d1410;text-align:center;box-shadow:0 18px 44px -18px rgba(0,0,0,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}" +
".orb-lab small{display:block;font:800 .66rem/1.4 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:color-mix(in srgb,var(--c) 70%,#000);transition:color .9s}" +
".orb-lab b{display:block;font-size:1.15rem;line-height:1.2}" +
".orb-lab span{display:block;font-size:.82rem;line-height:1.35;opacity:.72}" +
".orb-lab i{position:absolute;left:14px;right:14px;bottom:6px;height:3px;border-radius:3px;background:color-mix(in srgb,var(--c) 25%,transparent);overflow:hidden}" +
".orb-lab i::after{content:'';position:absolute;inset:0;background:var(--c);transform-origin:left;transform:scaleX(var(--p,0))}" +
".orb-nav{position:absolute;left:50%;bottom:-15%;transform:translateX(-50%);display:flex;align-items:center;gap:.55rem}" +
".orb-nav button{cursor:pointer;border:0;padding:0}" +
".orb-dot{width:15px;height:15px;border-radius:50%;background:var(--d);border:2px solid #fff !important;box-shadow:0 2px 8px rgba(0,0,0,.25);transition:transform .3s}" +
".orb-dot[aria-pressed=true]{transform:scale(1.5)}" +
".orb-ar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.9);color:#1d1410;display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.2);font:700 18px/1 system-ui}" +
".orb-nav button:focus-visible{outline:3px solid var(--c);outline-offset:3px}" +
"@keyframes orbspin{to{transform:rotate(360deg)}}@keyframes orbbob{50%{transform:translateY(-7%) rotate(-4deg)}}" +
"@media (prefers-reduced-motion:reduce){.orb-ring,.orb-it img[data-sat]{animation:none}.orb-in{transition:none}}";

function el(t, c, h) { var e = document.createElement(t); if (c) { e.className = c; } if (h != null) { e.innerHTML = h; } return e; }
var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var FINE = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
var uid = 0;

function montar(root) {
if (root.dataset.ok) { return; } root.dataset.ok = "1";
var figs = [].slice.call(root.querySelectorAll(":scope>figure"));
if (!figs.length) { return; }
var n = figs.length, cur = 0, timer = null, t0 = 0, dur = +root.dataset.auto || 4200, visible = true, hover = false, busy = false;
var ring = root.dataset.ring || "";
var inn = el("div", "orb-in");
inn.appendChild(el("div", "orb-glow"));
inn.appendChild(el("div", "orb-disc"));
if (ring) {
var id = "orbp" + (++uid);
var rep = ring; while (rep.length < 64) { rep += ring; }
inn.insertAdjacentHTML("beforeend", '<svg class="orb-ring" viewBox="0 0 500 500" aria-hidden="true"><defs><path id="' + id + '" d="M250,250 m-226,0 a226,226 0 1,1 452,0 a226,226 0 1,1 -452,0"/></defs><text><textPath href="#' + id + '" textLength="1410">' + rep.replace(/</g, "&lt;") + "</textPath></text></svg>");
}
var st = el("div", "orb-st");
var items = figs.map(function (f, i) {
var it = el("div", "orb-it" + (i === 0 ? " on" : ""));
[].slice.call(f.querySelectorAll("img")).forEach(function (im, k) { var c = im.cloneNode(true); if (i > 0 || k > 0) { c.loading = "lazy"; } c.decoding = "async"; if (k > 0) { c.setAttribute("aria-hidden", "true"); c.alt = ""; } it.appendChild(c); });
st.appendChild(it); return it;
});
inn.appendChild(st);
var lab = el("div", "orb-lab", "<small></small><b></b><span></span><i></i>");
lab.setAttribute("aria-live", "polite");
inn.appendChild(lab);
root.appendChild(inn);
var nav = el("div", "orb-nav"); nav.setAttribute("role", "group"); nav.setAttribute("aria-label", "Elegir producto");
var prev = el("button", "orb-ar", "&#8249;"); prev.type = "button"; prev.setAttribute("aria-label", "Anterior");
var next = el("button", "orb-ar", "&#8250;"); next.type = "button"; next.setAttribute("aria-label", "Siguiente");
nav.appendChild(prev);
var dots = figs.map(function (f, i) {
var b = el("button", "orb-dot"); b.type = "button"; b.style.setProperty("--d", f.dataset.color || "#999");
b.setAttribute("aria-label", f.dataset.name || ("Producto " + (i + 1))); b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
b.addEventListener("click", function () { ir(i, i > cur ? 1 : -1, true); });
nav.appendChild(b); return b;
});
nav.appendChild(next);
root.appendChild(nav);
root.setAttribute("aria-roledescription", "carrusel");

function etiqueta(i) {
var f = figs[i];
root.style.setProperty("--c", f.dataset.color || "#f0a14a");
lab.children[0].textContent = (i + 1) + " / " + n;
lab.children[1].textContent = f.dataset.name || "";
lab.children[2].textContent = f.dataset.desc || "";
dots.forEach(function (d, k) { d.setAttribute("aria-pressed", k === i ? "true" : "false"); });
}
etiqueta(0);

function anim(node, frames, ms, ease) {
if (!node.animate) { return { finished: Promise.resolve() }; }
return node.animate(frames, { duration: ms, easing: ease, fill: "forwards" });
}
function ir(i, dir, manual) {
if (busy || i === cur) { return; }
i = (i + n) % n; dir = dir || 1; busy = true;
var out = items[cur], inc = items[i];
root.classList.add("chg"); setTimeout(function () { root.classList.remove("chg"); }, 520);
etiqueta(i);
if (RM) {
out.classList.remove("on"); inc.classList.add("on"); out.style.opacity = ""; cur = i; busy = false;
} else {
var a = 72 * dir;
inc.classList.add("on");
anim(out, [{ transform: "rotate(0deg) translateX(0) scale(1)", opacity: 1 }, { transform: "rotate(" + (-a) + "deg) translateX(" + (-48 * dir) + "%) scale(.5)", opacity: 0 }], 700, "cubic-bezier(.55,0,.8,.35)");
var aIn = anim(inc, [{ transform: "rotate(" + a + "deg) translateX(" + (48 * dir) + "%) scale(.5)", opacity: 0 }, { transform: "rotate(" + (-6 * dir) + "deg) translateX(0) scale(1.04)", opacity: 1, offset: 0.78 }, { transform: "rotate(0deg) translateX(0) scale(1)", opacity: 1 }], 980, "cubic-bezier(.2,.75,.25,1)");
var prevIt = out; cur = i;
aIn.finished.then(function () { prevIt.classList.remove("on"); if (prevIt.getAnimations) { prevIt.getAnimations().forEach(function (x) { x.cancel(); }); } busy = false; });
}
if (manual) { reiniciar(); }
}
prev.addEventListener("click", function () { ir(cur - 1, -1, true); });
next.addEventListener("click", function () { ir(cur + 1, 1, true); });
root.tabIndex = 0;
root.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { ir(cur + 1, 1, true); } if (e.key === "ArrowLeft") { ir(cur - 1, -1, true); } });

/* Deslizar con el dedo */
var sx = null;
root.addEventListener("pointerdown", function (e) { sx = e.clientX; });
root.addEventListener("pointerup", function (e) { if (sx == null) { return; } var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) { ir(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, true); } });

/* Reproducción automática con barra de progreso */
function tick(now) {
if (!t0) { t0 = now; }
var activo = visible && !hover && !document.hidden;
if (!activo) { t0 = now - (parseFloat(lab.style.getPropertyValue("--p") || 0) * dur); }
var p = Math.min(1, (now - t0) / dur);
lab.style.setProperty("--p", p.toFixed(3));
if (p >= 1 && activo) { t0 = now; ir(cur + 1, 1, false); }
timer = requestAnimationFrame(tick);
}
function reiniciar() { t0 = 0; }
if (dur > 0) { timer = requestAnimationFrame(tick); }
root.addEventListener("pointerenter", function () { hover = true; });
root.addEventListener("pointerleave", function () { hover = false; inn.style.transform = ""; });
if ("IntersectionObserver" in window) { new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root); }

/* Inclinación 3D con el ratón */
if (FINE && !RM) {
root.addEventListener("pointermove", function (e) {
var r = root.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
inn.style.transform = "rotateY(" + (x * 14) + "deg) rotateX(" + (-y * 12) + "deg)";
});
}
/* El texto circular acelera con la velocidad del scroll */
var svg = root.querySelector(".orb-ring");
if (svg && svg.getAnimations && !RM) {
var ly = window.scrollY, boost = 1;
window.addEventListener("scroll", function () { var v = Math.abs(window.scrollY - ly); ly = window.scrollY; boost = Math.min(9, 1 + v / 6); }, { passive: true });
(function decay() { boost += (1 - boost) * 0.06; var an = svg.getAnimations()[0]; if (an) { an.playbackRate = boost; } requestAnimationFrame(decay); })();
}
}

function init() {
if (!document.getElementById("orbita-css")) { var s = el("style"); s.id = "orbita-css"; s.textContent = CSS; document.head.appendChild(s); }
[].slice.call(document.querySelectorAll(".orbita")).forEach(montar);
}
if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();
