/* Recorrido fotográfico con scroll — Residencial Mirador del Norte
   Una sola escena continua hecha con fotografías realistas: al bajar, la cámara «camina»
   (acercamiento, desplazamiento y fundido con desenfoque hacia el siguiente punto),
   el edificio se levanta planta a planta sobre la foto de la obra y el ascensor sube al ático.
   Sin librerías. Se desactiva con «Sin animaciones» (queda la versión estática con las fotos). */

const R = document.documentElement;
const sec = document.getElementById("recorrido");
const pin = sec.querySelector(".rc-pin");
const capa = sec.querySelector(".rc-ph");
const chs = [...sec.querySelectorAll(".rc-ch")];
const dots = [...sec.querySelectorAll(".rc-dots button")];
const ind = sec.querySelector(".rc-asc"), indN = ind && ind.querySelector("b");
const POSTER = (() => { const m = /[?&]rcposter=([\d.]+)/.exec(location.search); return m ? parseFloat(m[1]) : null; })();

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const rango = (p, a, b) => sm((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;

/* Capítulos de texto: el progreso (0..1) en el que empieza cada uno */
const CAP = [0, 0.06, 0.17, 0.28, 0.39, 0.5, 0.61, 0.71, 0.8, 0.89];

/* Fotos de la escena.
   a..b: tramo en el que se ve; fi/fo: duración del fundido de entrada/salida;
   o: punto hacia el que camina la cámara (en % de la foto); s0→s1 y x/y: acercamiento y desplazamiento (en %). */
const FOTOS = [
  { id: "obra",   a: 0.00, b: 0.17, fi: 0,     fo: 0,    o: [46, 72], op: [28, 60], k: [0, 0.27], s0: 1.12, s1: 1.36, x0: 5, x1: 12, y0: 0, y1: -5 },
  { id: "aerea",  a: 0.06, b: 0.27, fi: 0,     fo: 0.05, o: [46, 72], op: [28, 60], k: [0, 0.27], s0: 1.12, s1: 1.36, x0: 5, x1: 12, y0: 0, y1: -5, wipe: [0.065, 0.155] },
  { id: "piscina",a: 0.22, b: 0.38, fi: 0.05,  fo: 0.05, o: [50, 62], s0: 1.16, s1: 1.34, x0: 6, x1: 2, y0: 0, y1: 0 },
  { id: "portal", a: 0.33, b: 0.51, fi: 0.05,  fo: 0.05, o: [50, 55], s0: 1.05, s1: 1.45, x0: 0, x1: 0,  y0: 0, y1: 0 },
  { id: "ascensor",a: 0.46, b: 0.63, fi: 0.05, fo: 0.04, o: [50, 52], s0: 1.05, s1: 1.4,  x0: 0, x1: 0,  y0: 0, y1: 0 },
  { id: "salon",  a: 0.59, b: 0.74, fi: 0.03,  fo: 0.04, o: [45, 58], op: [40, 60], s0: 1.06, s1: 1.18, x0: 4, x1: 0, y0: 0, y1: 0 },
  { id: "dormitorio", a: 0.70, b: 0.83, fi: 0.04, fo: 0.04, o: [70, 62], op: [72, 60], s0: 1.06, s1: 1.2, x0: 2, x1: 6, y0: 0, y1: 0 },
  { id: "bano",   a: 0.79, b: 0.92, fi: 0.04,  fo: 0.04, o: [62, 52], op: [62, 52], s0: 1.06, s1: 1.2,  x0: 2, x1: 5, y0: 0, y1: 0 },
  { id: "terraza",a: 0.88, b: 1.01, fi: 0.04,  fo: 0,    o: [82, 58], op: [80, 55], s0: 1.2, s1: 1.06, x0: 2, x1: 4,  y0: 5, y1: -4 }
];
const RUTA = "img/rc/f-";
/* Ascensor: tramo del viaje (la cabina se cierra, sube y se abre en el ático) */
const VIAJE = [0.585, 0.63];
const PLANTAS = ["0", "1", "2", "3", "4", "5", "Á"];

/* ---------- construir las capas ---------- */
const ancho = () => innerWidth <= 700 ? 1280 : 1920;
FOTOS.forEach((f) => {
  const d = document.createElement("div"); d.className = "rc-f rc-f-" + f.id;
  const im = new Image(); im.alt = ""; im.decoding = "async"; im.draggable = false;
  im.src = `${RUTA}${f.id}-${ancho()}.webp`;
  d.appendChild(im); capa.appendChild(d); f.el = d; f.img = im;
  if (f.wipe) { d.classList.add("rc-wipe"); }
});
/* vida: pájaros sobre los exteriores, reflejos del agua y cortinas de la cabina del ascensor */
const vida = document.createElement("div"); vida.className = "rc-vida"; vida.setAttribute("aria-hidden", "true");
vida.innerHTML = '<i class="rc-ave"></i><i class="rc-ave"></i><i class="rc-ave"></i><i class="rc-ave"></i><i class="rc-ave"></i>';
capa.appendChild(vida);
const cab = document.createElement("div"); cab.className = "rc-cab"; cab.setAttribute("aria-hidden", "true");
cab.innerHTML = "<i></i><i></i>"; capa.appendChild(cab);
const [hojaI, hojaD] = cab.children;

/* ---------- capítulos ---------- */
let chActual = -1;
function setCh(i) {
  if (i === chActual) return; chActual = i;
  chs.forEach((c, k) => { c.classList.toggle("on", k === i); c.setAttribute("aria-hidden", k === i ? "false" : "true"); c.inert = k !== i; });
  dots.forEach((d, k) => { d.classList.toggle("on", k === i); d.setAttribute("aria-current", k === i ? "step" : "false"); });
}

/* en pantallas anchas el texto va a la izquierda: el motivo se desplaza a la derecha */
let AX = 1; const medir = () => {
  AX = innerWidth / innerHeight > 1.15 ? 1 : 0;
  // en vertical la foto se recorta mucho: se centra en el motivo (op) en lugar del punto de avance (o)
  for (const f of FOTOS) { const o = !AX && f.op ? f.op : f.o; f.img.style.objectPosition = `${o[0]}% ${o[1]}%`; f.el.style.transformOrigin = `${o[0]}% ${o[1]}%`; }
};
medir(); addEventListener("resize", () => { medir(); aplicar(cur); });

/* ---------- aplicar el guion ---------- */
function aplicar(P) {
  for (const f of FOTOS) {
    const on = P >= f.a - 0.001 && P <= f.b + 0.001;
    if (!on) { if (f.vis !== false) { f.el.style.visibility = "hidden"; f.vis = false; } continue; }
    if (f.vis !== true) { f.el.style.visibility = "visible"; f.vis = true; }
    const ka = f.k ? f.k[0] : f.a, kb = f.k ? f.k[1] : f.b, t = Math.min(1, Math.max(0, (P - ka) / (kb - ka)));
    const ent = f.fi ? rango(P, f.a, f.a + f.fi) : 1;
    const sal = f.fo ? rango(P, f.b - f.fo, f.b) : 0;
    // caminar: acercamiento continuo y, al salir, un paso más hacia el punto de interés
    let s = 1 + (lerp(f.s0, f.s1, sm(t)) - 1) * (AX ? 1 : 0.35) * (1 + sal * 0.45) * (1 + (1 - ent) * 0.06);
    const x = lerp(f.x0, f.x1, sm(t)) * AX, y = lerp(f.y0, f.y1, sm(t));
    f.el.style.transform = `translate3d(${x}%,${y}%,0) scale(${s.toFixed(4)})`;
    f.el.style.opacity = (ent * (1 - sal)).toFixed(3);
    const bl = (1 - ent) * 6 + sal * 8;
    f.el.style.filter = bl > 0.3 ? `blur(${bl.toFixed(1)}px)` : "none";
    if (f.wipe) {
      // el edificio terminado se levanta planta a planta sobre la foto de la obra
      const w = rango(P, f.wipe[0], f.wipe[1]), escalon = Math.floor(w * 7.999) / 7, suave = w >= 1 ? 1 : lerp(escalon, w, 0.35);
      // del pie del edificio (≈90 %) hasta la cubierta (≈14 %), con borde suave
      const h = lerp(103, 12, suave), m = w >= 1 ? "none" : `linear-gradient(to top,#000 ${(100 - h).toFixed(2)}%,transparent ${(100 - h + 3).toFixed(2)}%)`;
      f.el.style.maskImage = m; f.el.style.webkitMaskImage = m;
      f.el.style.opacity = (1 - sal).toFixed(3);
    }
  }
  // pájaros solo en exteriores
  vida.style.opacity = (1 - rango(P, 0.36, 0.4) + rango(P, 0.9, 0.95)).toFixed(2);
  // ascensor: se cierran las puertas, sube y se abren en el ático
  const cierra = rango(P, VIAJE[0] - 0.03, VIAJE[0]), abre = rango(P, VIAJE[1], VIAJE[1] + 0.03);
  const c = Math.max(0, cierra - abre);
  cab.style.visibility = c > 0.001 ? "visible" : "hidden";
  hojaI.style.transform = `translateX(${(-100 + c * 100).toFixed(2)}%)`;
  hojaD.style.transform = `translateX(${(100 - c * 100).toFixed(2)}%)`;
  if (ind) {
    const enAsc = P > VIAJE[0] - 0.05 && P < VIAJE[1] + 0.035;
    ind.classList.toggle("on", enAsc);
    const v = rango(P, VIAJE[0], VIAJE[1]);
    ind.classList.toggle("sube", v > 0 && v < 1);
    if (indN) indN.textContent = PLANTAS[Math.min(6, Math.round(v * 6))];
  }
  let ci = 0; for (let i = 0; i < CAP.length; i++) if (P >= CAP[i]) ci = i; setCh(ci);
}

/* ---------- bucle (solo mientras la escena se ve) ---------- */
const quieto = () => R.classList.contains("a11y-quieto");
let target = 0, cur = 0, visible = false, raf = 0, last = 0;
function progreso() { const r = sec.getBoundingClientRect(); const total = r.height - innerHeight; return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0; }
function frame(now) {
  raf = 0;
  if (!visible || document.hidden || quieto()) return;
  target = progreso();
  const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now;
  cur += (target - cur) * (1 - Math.exp(-dt * 5));
  if (Math.abs(target - cur) < 0.00005) cur = target;
  aplicar(cur);
  if (cur !== target) raf = requestAnimationFrame(frame); else last = 0;
}
function arrancar() { if (!raf && visible && !quieto()) raf = requestAnimationFrame(frame); }
window.__rcCur = () => cur;

const listo = () => { sec.classList.remove("rc-ld"); sec.classList.add("rc-ok"); };
const primera = FOTOS[0].img, aerea = FOTOS[1].img;
Promise.all([primera, aerea].map((im) => im.decode().catch(() => {}))).then(listo);

if (POSTER !== null) {
  sec.classList.add("rc-poster");
  aplicar(POSTER);
  Promise.all(FOTOS.map((f) => f.img.decode().catch(() => {}))).then(() => { listo(); window.__rcReady = true; });
} else {
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) { cur = target = progreso(); aplicar(cur); arrancar(); } }, { rootMargin: "100px" }).observe(sec);
  document.addEventListener("visibilitychange", arrancar);
  addEventListener("scroll", arrancar, { passive: true });
  const enEscena = () => { const r = sec.getBoundingClientRect(); R.classList.toggle("rc-in", r.top <= 60 && r.bottom >= innerHeight * 0.6); };
  addEventListener("scroll", enEscena, { passive: true }); addEventListener("resize", enEscena); enEscena();
  new MutationObserver(() => {
    chActual = -1;
    if (quieto()) chs.forEach((c) => { c.inert = false; c.removeAttribute("aria-hidden"); c.classList.remove("on"); });
    else { aplicar(cur); arrancar(); }
  }).observe(R, { attributes: true, attributeFilter: ["class"] });
  dots.forEach((d, k) => d.addEventListener("click", () => {
    const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + total * (CAP[k] + 0.012) + 2, behavior: "smooth" });
  }));
  aplicar(progreso());
}
