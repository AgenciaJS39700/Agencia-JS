/* experiencia.js — Tinta Negra · «La experiencia»: recorrido fotográfico guiado por el scroll.
   Usa fotos realistas del estudio (img/exp/estudio-real.webp, img/exp/carrito.webp, img/material.webp) y el vídeo tatuando (vid/hero.mp4)
   con zoom, desenfoque y fundidos entre escenas, como un anuncio de cine. Sin librerías: ligero en cualquier móvil.
   Se carga solo al acercarse a la sección (ver index.html) y solo se mueve mientras está a la vista. */
const sec = document.getElementById("experiencia");
const pin = sec.querySelector(".xp-pin");
const st = sec.querySelector(".xp-st");
const R = document.documentElement;
const params = new URLSearchParams(location.search);
const POSTER = params.has("xpposter") ? Math.max(0, Math.min(4, +params.get("xpposter") || 0)) : null;
const N = 5;
const movil = Math.min(screen.width, screen.height) < 700;
const quieto = () => R.classList.contains("a11y-quieto");

/* ---------- capas (cada una con su tamaño original para encuadrarla bien en cualquier pantalla) ---------- */
function capa(w, h, html) {
  const el = document.createElement("div");
  el.className = "xp-l";
  el.style.width = w + "px";
  el.style.height = h + "px";
  el.innerHTML = html;
  st.appendChild(el);
  return { el, w, h };
}
// 0 y 1 · El estudio real: la cámara se acerca a la camilla y se dibuja el aro de luz a su alrededor
const L0 = capa(1600, 900, `
  <img src="img/exp/estudio-real.webp" alt="" width="1600" height="900" decoding="async">
  <svg class="xp-aro" viewBox="0 0 1600 900" aria-hidden="true">
    <defs>
      <radialGradient id="xpG" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff3b2f" stop-opacity=".55"/><stop offset="1" stop-color="#ff3b2f" stop-opacity="0"/></radialGradient>
      <filter id="xpB" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="8"/></filter>
    </defs>
    <ellipse class="xp-aro-luz" cx="960" cy="792" rx="420" ry="78" fill="url(#xpG)"/>
    <ellipse class="xp-aro-h" cx="960" cy="792" rx="370" ry="60" fill="none" stroke="#ff3b2f" stroke-width="14" filter="url(#xpB)" pathLength="1"/>
    <ellipse class="xp-aro-l" cx="960" cy="792" rx="370" ry="60" fill="none" stroke="#ffd2c8" stroke-width="3" pathLength="1"/>
  </svg>`);
// 2 · El carrito de trabajo, preparado antes de cada sesión
const L2 = capa(1600, 900, `<img src="img/exp/carrito.webp" alt="" width="1600" height="900" decoding="async">`);
// 3 · El material: la foto se arma con piezas que llegan volando
const L3 = capa(1600, 900, "");
const COLS = 5, FILAS = 3, piezas = [];
for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
  const d = document.createElement("i");
  d.className = "xp-pz";
  const w = 1600 / COLS, h = 900 / FILAS;
  Object.assign(d.style, { left: c * w + "px", top: f * h + "px", width: w + 0.6 + "px", height: h + 0.6 + "px", backgroundPosition: `${-c * w}px ${-f * h}px` });
  const k = f * COLS + c, a = (k * 2.399) % (Math.PI * 2);
  piezas.push({ d, dx: Math.cos(a) * (260 + (k % 4) * 90), dy: Math.sin(a) * (180 + (k % 3) * 70) - 60, r: ((k % 5) - 2) * 9, z: 0.82 + (k % 3) * 0.12 });
  L3.el.appendChild(d);
}
// 4 · El oficio: primer plano tatuando (vídeo en bucle)
const L4 = capa(1280, 732, `<video muted loop playsinline preload="none" poster="img/hero.webp" aria-hidden="true"></video>`);
const vHero = L4.el.querySelector("video");

/* Encuadre por escena: [capa, foco x, foco y (px de la imagen), zoom] */
const ESC_ANCHO = [
  [L0, 900, 430, 1.0],
  [L0, 940, 560, 1.32],
  [L2, 980, 470, 1.04],
  [L3, 820, 470, 1.04],
  [L4, 614, 360, 1.12]
];
// móvil en vertical: encuadres más abiertos y el sujeto (camilla y aro) por encima de los textos
const ESC_ALTO = [
  [L0, 930, 470, 1.0],
  [L0, 940, 600, 1.18],
  [L2, 1000, 480, 1.0],
  [L3, 900, 430, 1.0],
  [L4, 660, 330, 1.0]
];
let ESC = ESC_ANCHO;

/* ---------- textos y puntos ---------- */
const chs = [...sec.querySelectorAll(".xp-ch")];
const dots = [...sec.querySelectorAll(".xp-dots button")];
const num = sec.querySelector(".xp-n b");
let chActual = -1;
function setCh(i) {
  if (i === chActual) return;
  chActual = i;
  chs.forEach((c, k) => { c.classList.toggle("on", k === i); c.setAttribute("aria-hidden", k === i ? "false" : "true"); c.inert = k !== i; });
  dots.forEach((d, k) => { d.classList.toggle("on", k === i); d.setAttribute("aria-current", k === i ? "step" : "false"); });
  if (num) num.textContent = String(i + 1).padStart(2, "0");
  // el vídeo del primer plano solo se reproduce cuando se ve
  if (i === 4 && !quieto()) { vHero.play().catch(() => {}); } else { vHero.pause(); }
}

/* ---------- colocación ---------- */
let W = 1, H = 1, sx = 0.5, sy = 0.5;
function medir() {
  const rp = pin.getBoundingClientRect(), r = st.getBoundingClientRect();
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  const a = rp.width / rp.height;
  ESC = a < 0.8 && POSTER === null ? ESC_ALTO : ESC_ANCHO;
  // dónde queremos ver el sujeto: a la derecha si hay texto a la izquierda, arriba en móvil vertical
  if (POSTER !== null) { sx = 0.5; sy = 0.5; }
  else if (a < 0.8) { sx = 0.5; sy = 0.55; }
  else if (a < 1.15) { sx = 0.55; sy = 0.4; }
  else { sx = 0.66; sy = 0.52; }
}
function colocar(L, fx, fy, z, extra = 1) {
  const s = Math.max(W / L.w, H / L.h) * z * extra;
  let tx = sx * W - fx * s, ty = sy * H - fy * s;
  tx = Math.min(0, Math.max(W - L.w * s, tx));
  ty = Math.min(0, Math.max(H - L.h * s, ty));
  L.el.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
}
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const CAPAS = [L0, L2, L3, L4];

function aplicar(c, time) {
  // escena entera más cercana y fundido con la siguiente en los cambios (desenfoque + zoom, como el vídeo de referencia)
  const peso = new Map(CAPAS.map((l) => [l, 0]));
  const i = Math.min(N - 2, Math.floor(c)), t = c - i;
  const A = ESC[i], B = ESC[i + 1];
  if (A[0] === B[0]) {
    const k = sm(t);
    colocar(A[0], lerp(A[1], B[1], k), lerp(A[2], B[2], k), lerp(A[3], B[3], k));
    peso.set(A[0], 1);
  } else {
    // cambio de escena entre 0,35 y 0,65 del tramo
    const k = sm((t - 0.35) / 0.3);
    colocar(A[0], A[1], A[2], A[3], 1 + 0.1 * k + 0.03 * sm(t / 0.35));
    colocar(B[0], B[1], B[2], B[3], 1.1 - 0.1 * k);
    // la escena que se va se queda debajo (desenfocándose) y la nueva aparece encima: nunca se ve un hueco
    peso.set(A[0], k < 0.999 ? 1 : 0);
    peso.set(B[0], k);
    A[0].el.style.setProperty("--salida", k.toFixed(3));
  }
  for (const l of CAPAS) {
    const p = peso.get(l);
    l.el.style.opacity = p.toFixed(3);
    l.el.style.visibility = p > 0.002 ? "visible" : "hidden";
    const sal = parseFloat(l.el.style.getPropertyValue("--salida") || 0);
    const blur = p > 0.002 && p < 0.998 ? (1 - p) * 14 : p >= 0.998 && sal > 0.001 && sal < 0.999 ? sal * 12 : 0;
    l.el.style.setProperty("--salida", "0");
    l.el.style.filter = blur ? `blur(${blur.toFixed(1)}px)` : "";
  }
  // aro de luz: se dibuja al llegar a la escena 2 y se apaga al salir
  const ar = sm((c - 0.45) / 0.45) * (1 - sm((c - 1.35) / 0.3));
  L0.el.style.setProperty("--aro", ar.toFixed(3));
  L0.el.style.setProperty("--pulso", (0.85 + 0.15 * Math.sin(time * 2.4)).toFixed(3));
  // material: las piezas llegan y encajan
  const ka = sm((c - 2.45) / 0.55);
  for (const p of piezas) {
    const q = 1 - ka;
    p.d.style.transform = q > 0.001 ? `translate3d(${(p.dx * q).toFixed(1)}px,${(p.dy * q).toFixed(1)}px,0) rotate(${(p.r * q).toFixed(2)}deg) scale(${lerp(1, p.z, q).toFixed(3)})` : "";
    p.d.style.opacity = (0.25 + 0.75 * sm(ka * 1.6)).toFixed(3);
  }
  L3.el.classList.toggle("xp-junto", ka > 0.98);
  setCh(Math.min(N - 1, Math.max(0, Math.round(c))));
}

/* ---------- bucle ---------- */
let target = 0, cur = 0, visible = false, raf = 0, last = 0, cargado = false;
const t0 = performance.now();
function progreso() {
  const r = sec.getBoundingClientRect();
  const total = r.height - innerHeight;
  return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
}
function cargarMedios() {
  if (cargado) return;
  cargado = true;
  vHero.src = "vid/hero.mp4";
  vHero.preload = "metadata";
}
function frame(now) {
  raf = 0;
  if (!visible || document.hidden || quieto()) return;
  target = progreso() * (N - 1);
  const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now;
  cur += (target - cur) * (1 - Math.exp(-dt * 6));
  if (Math.abs(target - cur) < 0.0005) cur = target;
  aplicar(cur, (now - t0) / 1000);
  if (sec.classList.contains("xp-ld")) { sec.classList.remove("xp-ld"); sec.classList.add("xp-ok"); }
  raf = requestAnimationFrame(frame);
}
function arrancar() { if (!raf && visible && !quieto()) { last = 0; raf = requestAnimationFrame(frame); } }
window.__xpCur = () => cur;

medir();
if (POSTER !== null) {
  // modo captura: genera las imágenes fijas (versión sin animaciones)
  sec.classList.add("xp-poster", "xp-ok"); sec.classList.remove("xp-ld");
  cargarMedios();
  vHero.preload = "auto"; vHero.load();
  const listo = (v) => new Promise((ok) => { if (v.readyState >= 2) ok(); else { v.addEventListener("loadeddata", ok, { once: true }); setTimeout(ok, 6000); } });
  listo(vHero).then(() => {
    aplicar(POSTER, 1);
    const fin = () => setTimeout(() => { window.__xpReady = true; }, 700);
    fin();
  });
} else {
  new ResizeObserver(() => { medir(); aplicar(cur, (performance.now() - t0) / 1000); }).observe(st);
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    R.classList.toggle("xp-in", visible);
    if (visible) { cargarMedios(); cur = target = progreso() * (N - 1); arrancar(); } else { vHero.pause(); }
  }, { rootMargin: "100px" }).observe(sec);
  document.addEventListener("visibilitychange", arrancar);
  addEventListener("scroll", arrancar, { passive: true });
  // «Sin animaciones»: se para y se ven todos los textos con sus fotos
  new MutationObserver(() => {
    chActual = -1;
    if (quieto()) { vHero.pause(); chs.forEach((c) => { c.inert = false; c.removeAttribute("aria-hidden"); c.classList.remove("on"); }); }
    else arrancar();
  }).observe(R, { attributes: true, attributeFilter: ["class"] });
  dots.forEach((d, k) => d.addEventListener("click", () => {
    const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + total * (k / (N - 1)) + 2, behavior: "smooth" });
  }));
  aplicar(0, 0);
}
