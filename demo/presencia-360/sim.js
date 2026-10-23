/* sim.js — Simulador de tatuajes de Tinta Negra.
   Todo se hace en el navegador con <canvas>: las fotos nunca se suben a ningún sitio.
   Funciona como la prueba que hace el tatuador en la tablet: el diseño en modo multiplicar sobre la foto,
   deformado con una malla para seguir el músculo, y la plantilla de calco morada antes de empezar.
   Realismo: la tinta se funde con la piel, los negros se aclaran como en piel real, los brillos y poros
   de la piel quedan por encima de la tinta y la curvatura envuelve el diseño como en un brazo. */
(function () {
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var TN = window.TN = window.TN || {};
var cv = $("#cv"); if (!cv || !cv.getContext) { return; }
var ctx = cv.getContext("2d");
var hasFilter = typeof ctx.filter === "string";

/* ---------- Catálogo ---------- */
var ZONES = [
{ id: "antebrazo", n: "Antebrazo", src: "img/piel-antebrazo.webp", mask: "img/mask-antebrazo.webp", cm: 0.046, at: [0.63, 0.565], w: 0.15, curve: 30, axis: "h" },
{ id: "brazo", n: "Brazo", src: "img/piel-brazo.webp", mask: "img/mask-brazo.webp", cm: 0.05, at: [0.43, 0.43], w: 0.27, curve: 35, axis: "v" },
{ id: "espalda", n: "Espalda", src: "img/piel-espalda.webp", mask: "img/mask-espalda.webp", cm: 0.062, at: [0.5, 0.55], w: 0.4, curve: 10, axis: "v" }
];
var DESIGNS = [
{ id: "rosa-realista", n: "Rosa", st: "Black & grey" },
{ id: "leon-realista", n: "León", st: "Realismo" },
{ id: "serpiente-daga", n: "Serpiente y daga", st: "Black & grey" },
{ id: "mariposa", n: "Mariposa", st: "Fine line" },
{ id: "olivo", n: "Rama de olivo", st: "Fine line" },
{ id: "luna", n: "Luna y estrellas", st: "Fine line" },
{ id: "golondrina", n: "Golondrina", st: "Tradicional" },
{ id: "corazon", n: "Corazón y daga", st: "Tradicional" },
{ id: "pantera", n: "Pantera", st: "Tradicional" },
{ id: "ojo", n: "Ojo", st: "Realismo" },
{ id: "ola", n: "La gran ola", st: "Japonés" },
{ id: "mandala", n: "Mandala", st: "No lo tengo claro" },
// mangas (rodean todo el brazo en 3D), piernas y rellenos para unir tatuajes
{ id: "manga-japonesa-color", n: "Manga japonesa a color", st: "Japonés", k: "manga" },
{ id: "manga-lobo-color", n: "Manga neotradicional a color", st: "Tradicional", k: "manga" },
{ id: "manga-anime-color", n: "Manga anime a color", st: "No lo tengo claro", k: "manga" },
{ id: "manga-japonesa", n: "Manga japonesa", st: "Japonés", k: "manga" },
{ id: "manga-realista", n: "Manga realista", st: "Black & grey", k: "manga" },
{ id: "manga-anime", n: "Manga anime", st: "No lo tengo claro", k: "manga" },
{ id: "manga-geometrica", n: "Manga geométrica", st: "No lo tengo claro", k: "manga" },
{ id: "media-manga-fina", n: "Media manga fine line", st: "Fine line", k: "media" },
// piernas: la pierna entera rodea muslo y gemelo; los muslos cubren media vuelta, delante o detrás
{ id: "pierna-color", n: "Pierna entera a color", st: "Tradicional", k: "pierna" },
{ id: "pierna-japonesa", n: "Pierna entera japonesa", st: "Japonés", k: "pierna" },
{ id: "pierna-realista", n: "Pierna entera black & grey", st: "Black & grey", k: "pierna" },
{ id: "muslo-color", n: "Muslo a color", st: "No lo tengo claro", k: "muslo" },
{ id: "muslo-realista", n: "Muslo por delante", st: "Realismo", k: "muslo" },
{ id: "muslo-fino", n: "Muslo por detrás", st: "Fine line", k: "muslo-tras" },
{ id: "espalda-ornamental", n: "Espalda ornamental", st: "No lo tengo claro", k: "espalda" },
{ id: "relleno-humo", n: "Relleno de humo", st: "Black & grey", k: "relleno" },
{ id: "relleno-olas", n: "Relleno de olas", st: "Japonés", k: "relleno" },
{ id: "relleno-puntillismo", n: "Relleno de puntillismo", st: "No lo tengo claro", k: "relleno" }
];
var cache = {};
function load(src) {
if (cache[src]) { return cache[src]; }
cache[src] = new Promise(function (ok, ko) { var i = new Image(); i.decoding = "async"; i.onload = function () { ok(i); }; i.onerror = ko; i.src = src; });
return cache[src];
}

/* ---------- Estado ---------- */
var base = null;           // { img, W, H, zone, cm, axis }
var layers = [], sel = -1;
var finish = "healed", compare = false, dirty = true;
var lc = document.createElement("canvas"), lx = lc.getContext("2d");   // capa sin curvar
var wc = document.createElement("canvas"), wx = wc.getContext("2d");   // capa curvada
var cc = document.createElement("canvas"), cx = cc.getContext("2d");   // zona cubierta por tinta
var sc = document.createElement("canvas"), sx = sc.getContext("2d");   // brillo de la piel sobre la tinta
var warpMode = false;
var uid = 0;

function setBase(img, zone) {
var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height, k = Math.min(1, 1600 / Math.max(W, H));
W = Math.round(W * k); H = Math.round(H * k);
var old = base;
base = { img: img, W: W, H: H, zone: zone ? zone.n : "Otra", cm: zone ? zone.cm : null, axis: zone ? zone.axis : "v", mask: null, sheen: null };
try { base.sheen = makeSheen(img, W, H); } catch (e) { base.sheen = null; }
// Máscara de piel (fotos del estudio): la tinta no se sale del cuerpo
if (zone && zone.mask) { var b0 = base; load(zone.mask).then(function (m) { b0.mask = m; dirty = true; }).catch(function () {}); }
cv.width = lc.width = wc.width = cc.width = sc.width = W; cv.height = lc.height = wc.height = cc.height = sc.height = H;
if (old && layers.length) {
// Se mantiene la colocación relativa al cambiar de foto
layers.forEach(function (L) { L.x = L.x / old.W * W; L.y = L.y / old.H * H; L.w = L.w / old.W * W; });
if (zone) { var L0 = layers[sel] || layers[0]; L0.x = zone.at[0] * W; L0.y = zone.at[1] * H; L0.w = zone.w * W; L0.curve = zone.curve; }
}
dirty = true; syncUI();
}

/* Desenfoque de caja (dos pasadas ≈ gaussiano) sobre un canal en coma flotante */
function boxBlur(a, w, h, r) {
var t = new Float32Array(a.length), x, y, i, s, n = r * 2 + 1;
for (var pass = 0; pass < 2; pass++) {
for (y = 0; y < h; y++) {
var o = y * w; s = 0;
for (x = -r; x <= r; x++) { s += a[o + clamp(x, 0, w - 1)]; }
for (x = 0; x < w; x++) { t[o + x] = s / n; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; }
}
for (x = 0; x < w; x++) {
s = 0;
for (y = -r; y <= r; y++) { s += t[clamp(y, 0, h - 1) * w + x]; }
for (y = 0; y < h; y++) { a[y * w + x] = s / n; s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; }
}
}
return a;
}
function smooth(e0, e1, v) { var t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
function luma(d, n) { var Y = new Float32Array(n); for (var i = 0; i < n; i++) { Y[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255; } return Y; }

/* Brillo de la piel: poros, arrugas y reflejos de luz que en un tatuaje real se siguen viendo por encima de la tinta */
function makeSheen(img, W, H) {
var c = document.createElement("canvas"); c.width = W; c.height = H;
var x = c.getContext("2d"); x.drawImage(img, 0, 0, W, H);
var im = x.getImageData(0, 0, W, H), d = im.data, n = W * H, Y = luma(d, n);
var B = boxBlur(new Float32Array(Y), W, H, Math.max(2, Math.round(Math.max(W, H) / 110)));
for (var i = 0; i < n; i++) {
var det = Y[i] - B[i], spec = smooth(0.66, 0.95, Y[i]);
var a = clamp(det * 4.5, 0, 1) * 0.55 + spec * spec * 0.55;
d[i * 4] = 255; d[i * 4 + 1] = 247; d[i * 4 + 2] = 238; d[i * 4 + 3] = Math.round(clamp(a, 0, 1) * 255);
}
x.putImageData(im, 0, 0); return c;
}

/* Plantilla de calco (stencil térmico): solo las líneas del dibujo, en morado, como la que sale de la impresora
   térmica del estudio. Se sacan con diferencia de gaussianas: líneas finas enteras y contornos de las zonas negras. */
var stc = typeof Map === "function" ? new Map() : null;
function stencilOf(im) {
if (stc && stc.has(im)) { return stc.get(im); }
var W0 = im.naturalWidth || im.width, H0 = im.naturalHeight || im.height, k = Math.min(1, 1000 / Math.max(W0, H0));
var w = Math.max(1, Math.round(W0 * k)), h = Math.max(1, Math.round(H0 * k)), n = w * h;
var c = document.createElement("canvas"); c.width = w; c.height = h;
var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
var al = document.createElement("canvas"); al.width = w; al.height = h;
var ax = al.getContext("2d"); ax.drawImage(im, 0, 0, w, h);
var A = ax.getImageData(0, 0, w, h).data;
var im2 = x.getImageData(0, 0, w, h), d = im2.data, Y = luma(d, n);
var M = boxBlur(new Float32Array(Y), w, h, Math.max(2, Math.round(Math.max(w, h) / 85)));
var seed = 7;
for (var i = 0; i < n; i++) {
var line = smooth(0.03, 0.13, M[i] - Y[i]);
// los bordes del diseño (si tiene fondo transparente) también se calcan
if (A[i * 4 + 3] > 20 && Y[i] < 0.5) { line = Math.max(line, smooth(0.02, 0.1, M[i] - Y[i] + 0.04)); }
seed = (seed * 16807) % 2147483647;
var grain = 0.78 + 0.22 * (seed / 2147483647);
d[i * 4] = 62; d[i * 4 + 1] = 46; d[i * 4 + 2] = 140; d[i * 4 + 3] = Math.round(line * grain * 245);
}
x.clearRect(0, 0, w, h); x.putImageData(im2, 0, 0);
if (stc) { stc.set(im, c); }
return c;
}

/* Prepara la "tinta": negros algo aclarados (como en piel real) sin apagar los colores */
function ink(L) {
var key = L.d.id + "|" + finish;
if (L.inkKey === key) { return L.ink; }
if (finish === "stencil") { L.ink = stencilOf(L.img); L.inkKey = key; return L.ink; }
var im = L.img, c = document.createElement("canvas"), x = c.getContext("2d");
c.width = im.naturalWidth || im.width; c.height = im.naturalHeight || im.height;
// el color curado bajo la piel pierde algo de saturación
if (hasFilter && finish === "healed") { x.filter = "saturate(0.82)"; }
x.drawImage(im, 0, 0); if (hasFilter) { x.filter = "none"; }
{
var g = finish === "healed" ? "rgb(52,56,64)" : "rgb(26,26,30)";
x.globalCompositeOperation = "screen"; x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
x.globalCompositeOperation = "destination-in"; x.drawImage(im, 0, 0);
}
L.ink = c; L.inkKey = key; return c;
}

function addLayer(d, img, at) {
var z = ZONES.filter(function (q) { return q.n === base.zone; })[0];
var ar = (img.naturalHeight || img.height) / (img.naturalWidth || img.width);
var w = (z ? z.w : 0.32) * base.W;
if (w * ar > base.H * 0.7) { w = base.H * 0.7 / ar; }
var L = { id: ++uid, d: d, img: img, ar: ar, x: at ? at[0] : (z ? z.at[0] : 0.5) * base.W, y: at ? at[1] : (z ? z.at[1] : 0.5) * base.H, w: w, rot: 0, flip: false, op: 0.9, curve: z ? z.curve : 0, mesh: null };
layers.push(L); sel = layers.length - 1; dirty = true; syncUI();
return L;
}

/* ---------- Dibujo ---------- */
function drawLayer(L, target) {
var src = ink(L), h = L.w * L.ar;
lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lc.width, lc.height);
lx.translate(L.x, L.y); lx.rotate(L.rot); lx.scale(L.flip ? -1 : 1, 1);
lx.imageSmoothingQuality = "high";
if (L.mesh && !isId(L.mesh)) { var m = meshRender(L, src, h); lx.drawImage(m.c, m.x, m.y); } else { lx.drawImage(src, -L.w / 2, -h / 2, L.w, h); }
lx.setTransform(1, 0, 0, 1, 0, 0);
var out = lc;
if (L.curve > 0) { out = warp(L); }
if (base.mask) { var ox = out.getContext("2d"); ox.globalCompositeOperation = "destination-in"; ox.drawImage(base.mask, 0, 0, base.W, base.H); ox.globalCompositeOperation = "source-over"; }
cx.globalAlpha = L.op; cx.drawImage(out, 0, 0); cx.globalAlpha = 1;
target.save();
var blur = finish === "healed" ? Math.max(0.5, L.w / 900) : finish === "fresh" ? 0.35 : 0.45;
if (finish === "stencil") {
// el calco deja un velo morado alrededor de las líneas
target.globalCompositeOperation = "multiply"; target.globalAlpha = 0.5;
target.shadowColor = "rgba(95,80,175,.55)"; target.shadowBlur = Math.max(3, L.w / 110);
target.drawImage(out, 0, 0);
target.shadowColor = "transparent"; target.shadowBlur = 0;
}
if (finish === "fresh") {
// Piel recién tatuada: un halo rojizo alrededor de la tinta
target.globalCompositeOperation = "multiply"; target.globalAlpha = 0.55;
target.shadowColor = "rgba(205,55,55,.9)"; target.shadowBlur = Math.max(8, L.w * 0.05);
target.drawImage(out, 0, 0);
target.shadowColor = "transparent"; target.shadowBlur = 0;
}
target.globalCompositeOperation = "multiply";
target.globalAlpha = finish === "stencil" ? Math.min(0.8, L.op) : L.op;
if (hasFilter && blur) { target.filter = "blur(" + blur.toFixed(2) + "px)"; }
target.drawImage(out, 0, 0);
if (finish === "fresh") {
// algo de brillo de la piel recién tatuada
target.filter = "none"; target.globalCompositeOperation = "soft-light"; target.globalAlpha = 0.18; target.drawImage(out, 0, 0);
}
target.restore();
}

/* Curvatura: envuelve el diseño como si estuviera sobre un cilindro (brazo, pierna, costado).
   Se conserva la longitud sobre la piel: los bordes se comprimen y se oscurecen un poco. */
function cyl(L) {
var h = L.w * L.ar, a = L.curve / 100 * 1.35;          // ángulo máximo en los bordes (rad)
var c = Math.cos(L.rot), s = Math.sin(L.rot), hw = L.w / 2, hh = h / 2;
var vert = base.axis === "v";                          // eje del miembro en la foto
var e = vert ? Math.abs(c * hw) + Math.abs(s * hh) : Math.abs(s * hw) + Math.abs(c * hh);
return { a: a, vert: vert, ctr: vert ? L.x : L.y, R: e / a };
}
function warp(L) {
var k = cyl(L), a = k.a, vert = k.vert, ctr = k.ctr, R = k.R, lim = vert ? wc.width : wc.height;
wx.setTransform(1, 0, 0, 1, 0, 0); wx.clearRect(0, 0, wc.width, wc.height);
// Columna a columna en el destino (1 px): sin costuras ni huecos
var p0 = Math.max(0, Math.floor(ctr - R * Math.sin(a))), p1 = Math.min(lim, Math.ceil(ctr + R * Math.sin(a)));
for (var q = p0; q < p1; q++) {
var u0 = clamp((q - ctr) / R, -1, 1), u1 = clamp((q + 1 - ctr) / R, -1, 1);
var s0 = R * Math.asin(u0), s1 = R * Math.asin(u1);
if (vert) { wx.drawImage(lc, ctr + s0, 0, Math.max(0.01, s1 - s0), lc.height, q, 0, 1, lc.height); }
else { wx.drawImage(lc, 0, ctr + s0, lc.width, Math.max(0.01, s1 - s0), 0, q, lc.width, 1); }
}
// La tinta se ve algo más tenue donde la piel se aleja (bordes del cilindro)
var gr = vert ? wx.createLinearGradient(ctr - R * Math.sin(a), 0, ctr + R * Math.sin(a), 0) : wx.createLinearGradient(0, ctr - R * Math.sin(a), 0, ctr + R * Math.sin(a));
for (var k = 0; k <= 10; k++) { var t = (k / 10 * 2 - 1) * a; gr.addColorStop(k / 10, "rgba(0,0,0," + (0.5 + 0.5 * Math.cos(t)).toFixed(3) + ")"); }
wx.globalCompositeOperation = "destination-in"; wx.fillStyle = gr;
if (vert) { wx.fillRect(p0, 0, p1 - p0, wc.height); } else { wx.fillRect(0, p0, wc.width, p1 - p0); }
wx.globalCompositeOperation = "source-over";
return wc;
}

/* ---------- Malla de deformación (como la herramienta «deformar» del tatuador en la tablet) ----------
   9 puntos sobre el diseño; la superficie pasa exactamente por ellos (Bézier bicuadrática interpolada). */
function meshId() { var m = []; for (var j = 0; j < 3; j++) { for (var i = 0; i < 3; i++) { m.push([(i - 1) / 2, (j - 1) / 2]); } } return m; }
function isId(H) { return H.every(function (q, k) { return Math.abs(q[0] - (k % 3 - 1) / 2) < 1e-3 && Math.abs(q[1] - (Math.floor(k / 3) - 1) / 2) < 1e-3; }); }
function ctrls(H, w, h) {
var P = H.map(function (q) { return [q[0] * w, q[1] * h]; }), Rw = [], C = [], j, i;
function mid(a, b, c) { return [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2]; }
for (j = 0; j < 3; j++) { Rw.push([P[j * 3], mid(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]), P[j * 3 + 2]]); }
for (i = 0; i < 3; i++) { C[i] = Rw[0][i]; C[3 + i] = mid(Rw[0][i], Rw[1][i], Rw[2][i]); C[6 + i] = Rw[2][i]; }
return C;
}
function surf(C, u, v) {
var bu = [(1 - u) * (1 - u), 2 * u * (1 - u), u * u], bv = [(1 - v) * (1 - v), 2 * v * (1 - v), v * v], x = 0, y = 0;
for (var j = 0; j < 3; j++) { for (var i = 0; i < 3; i++) { var b = bu[i] * bv[j]; x += b * C[j * 3 + i][0]; y += b * C[j * 3 + i][1]; } }
return [x, y];
}
function meshDraw(x, src, w, h, H) {
var C = ctrls(H, w, h), N = 10, P = [], a, b, sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
for (b = 0; b <= N; b++) { for (a = 0; a <= N; a++) { P.push(surf(C, a / N, b / N)); } }
for (b = 0; b < N; b++) {
for (a = 0; a < N; a++) {
var s00 = [a / N * sw, b / N * sh], s10 = [(a + 1) / N * sw, b / N * sh], s01 = [a / N * sw, (b + 1) / N * sh], s11 = [(a + 1) / N * sw, (b + 1) / N * sh];
var d00 = P[b * (N + 1) + a], d10 = P[b * (N + 1) + a + 1], d01 = P[(b + 1) * (N + 1) + a], d11 = P[(b + 1) * (N + 1) + a + 1];
tri(x, src, s00, s10, s11, d00, d10, d11); tri(x, src, s00, s11, s01, d00, d11, d01);
}
}
}
/* La malla se pinta sobre blanco (los solapes de triángulos opacos no dejan marcas) y luego el blanco
   se vuelve transparente de forma exacta: al multiplicar sobre la piel da lo mismo que el diseño original. */
function meshRender(L, src, h) {
var key = L.inkKey + "|" + Math.round(L.w) + "|" + Math.round(h) + "|" + L.mesh.join(";");
if (L.mcKey === key) { return L.mc; }
var C = ctrls(L.mesh, L.w, h), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
for (var b = 0; b <= 10; b++) { for (var a = 0; a <= 10; a++) { var q = surf(C, a / 10, b / 10); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); } }
x0 = Math.floor(x0 - 2); y0 = Math.floor(y0 - 2);
var c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(x1 + 2 - x0)); c.height = Math.max(1, Math.ceil(y1 + 2 - y0));
var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
if (L.flatKey !== L.inkKey) {
var f = document.createElement("canvas"); f.width = src.width || src.naturalWidth; f.height = src.height || src.naturalHeight;
var fx = f.getContext("2d"); fx.fillStyle = "#fff"; fx.fillRect(0, 0, f.width, f.height); fx.drawImage(src, 0, 0);
L.flat = f; L.flatKey = L.inkKey;
}
x.imageSmoothingQuality = "high"; x.translate(-x0, -y0);
meshDraw(x, L.flat, L.w, h, L.mesh);
var im = x.getImageData(0, 0, c.width, c.height), d = im.data;
for (var i = 0; i < d.length; i += 4) {
var al = 1 - Math.min(d[i], d[i + 1], d[i + 2]) / 255;
if (al > 0.002) { for (var j = 0; j < 3; j++) { d[i + j] = Math.round(clamp((d[i + j] - 255 * (1 - al)) / al, 0, 255)); } } else { al = 0; }
d[i + 3] = Math.round(al * 255);
}
x.putImageData(im, 0, 0);
L.mc = { c: c, x: x0, y: y0 }; L.mcKey = key; return L.mc;
}
function tri(x, src, s0, s1, s2, d0, d1, d2) {
var den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]); if (!den) { return; }
var A = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
var B = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
var Cc = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
var D = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
// el triángulo de destino se agranda un pelín para que no se vean costuras
var mx = (d0[0] + d1[0] + d2[0]) / 3, my = (d0[1] + d1[1] + d2[1]) / 3;
x.save(); x.beginPath();
[d0, d1, d2].forEach(function (p, i) { var dx = p[0] - mx, dy = p[1] - my, l = Math.hypot(dx, dy) || 1, q = [p[0] + dx / l * 0.9, p[1] + dy / l * 0.9]; if (i) { x.lineTo(q[0], q[1]); } else { x.moveTo(q[0], q[1]); } });
x.closePath(); x.clip();
x.transform(A, B, Cc, D, d0[0] - A * s0[0] - Cc * s0[1], d0[1] - B * s0[0] - D * s0[1]);
x.drawImage(src, 0, 0);
x.restore();
}
/* De coordenadas del diseño (normalizadas) a la foto, pasando por giro, espejo y curvatura; y al revés */
function fwd(L, nx, ny) {
var h = L.w * L.ar, lx0 = nx * L.w * (L.flip ? -1 : 1), ly0 = ny * h, c = Math.cos(L.rot), s = Math.sin(L.rot);
var X = L.x + lx0 * c - ly0 * s, Y = L.y + lx0 * s + ly0 * c;
if (L.curve > 0) {
var k = cyl(L);
if (k.vert) { X = k.ctr + k.R * Math.sin(clamp(X - k.ctr, -k.R * k.a, k.R * k.a) / k.R); } else { Y = k.ctr + k.R * Math.sin(clamp(Y - k.ctr, -k.R * k.a, k.R * k.a) / k.R); }
}
return [X, Y];
}
function back(L, p) {
var X = p[0], Y = p[1], h = L.w * L.ar;
if (L.curve > 0) {
var k = cyl(L);
if (k.vert) { X = k.ctr + k.R * Math.asin(clamp((X - k.ctr) / k.R, -1, 1)); } else { Y = k.ctr + k.R * Math.asin(clamp((Y - k.ctr) / k.R, -1, 1)); }
}
var dx = X - L.x, dy = Y - L.y, c = Math.cos(L.rot), s = Math.sin(L.rot);
var x = dx * c + dy * s, y = -dx * s + dy * c;
return [x / L.w * (L.flip ? -1 : 1), y / h];
}
function meshHit(L, p) {
if (!L.mesh) { return -1; }
var best = -1, bd = 30 * px();
L.mesh.forEach(function (q, i) { var r = fwd(L, q[0], q[1]), dd = Math.hypot(p[0] - r[0], p[1] - r[1]); if (dd < bd) { bd = dd; best = i; } });
return best;
}
function meshGuide(L) {
var C = ctrls(L.mesh, 1, 1), k = px(), t, i;
ctx.save();
ctx.lineWidth = 1.3 * k; ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 3 * k;
for (i = 0; i <= 4; i++) {
[0, 1].forEach(function (dir) {
ctx.beginPath();
for (t = 0; t <= 24; t++) { var uv = dir ? [i / 4, t / 24] : [t / 24, i / 4], q = surf(C, uv[0], uv[1]), r = fwd(L, q[0], q[1]); if (t) { ctx.lineTo(r[0], r[1]); } else { ctx.moveTo(r[0], r[1]); } }
ctx.stroke();
});
}
ctx.shadowBlur = 0;
L.mesh.forEach(function (q) { var r = fwd(L, q[0], q[1]); ctx.beginPath(); ctx.arc(r[0], r[1], 6.5 * k, 0, 7); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill(); ctx.lineWidth = 2.2 * k; ctx.strokeStyle = "#e1262f"; ctx.stroke(); });
ctx.restore();
}

function render(forExport) {
if (!base) { return; }
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; if (hasFilter) { ctx.filter = "none"; }
ctx.drawImage(base.img, 0, 0, base.W, base.H);
if (!compare && layers.length) {
cx.clearRect(0, 0, cc.width, cc.height);
layers.forEach(function (L) { drawLayer(L, ctx); });
if (base.sheen) {
// los brillos y poros de la piel quedan por encima de la tinta, como en un tatuaje de verdad
sx.globalCompositeOperation = "source-over"; sx.clearRect(0, 0, sc.width, sc.height); sx.drawImage(base.sheen, 0, 0);
sx.globalCompositeOperation = "destination-in"; sx.drawImage(cc, 0, 0); sx.globalCompositeOperation = "source-over";
ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = ({ fresh: 0.95, healed: 0.7, stencil: 0.5 })[finish]; ctx.drawImage(sc, 0, 0); ctx.restore();
}
}
if (!forExport && !compare && layers[sel]) { if (warpMode && layers[sel].mesh) { meshGuide(layers[sel]); } else { outline(layers[sel]); } }
if (forExport) {
var fs = Math.round(base.W / 42);
ctx.font = "700 " + fs + "px system-ui,sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillText("Simulación · Tinta Negra", base.W - fs * 0.8 + 1, base.H - fs * 0.6 + 1);
ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText("Simulación · Tinta Negra", base.W - fs * 0.8, base.H - fs * 0.6);
}
}
function px() { var r = cv.getBoundingClientRect(); return r.width ? base.W / r.width : 1; }
function corners(L) {
var h = L.w * L.ar, c = Math.cos(L.rot), s = Math.sin(L.rot);
return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (k) { var x = k[0] * L.w / 2, y = k[1] * h / 2; return [L.x + x * c - y * s, L.y + x * s + y * c]; });
}
function outline(L) {
var p = corners(L), k = px();
ctx.save();
ctx.lineWidth = 1.6 * k; ctx.setLineDash([7 * k, 6 * k]); ctx.strokeStyle = "rgba(255,255,255,.9)";
ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 4 * k;
var path = p;
if (L.mesh && !isId(L.mesh)) {
// con malla, el contorno sigue la forma deformada
var C = ctrls(L.mesh, 1, 1), e = [], t;
for (t = 0; t <= 12; t++) { e.push([t / 12, 0]); } for (t = 1; t <= 12; t++) { e.push([1, t / 12]); }
for (t = 11; t >= 0; t--) { e.push([t / 12, 1]); } for (t = 11; t > 0; t--) { e.push([0, t / 12]); }
path = e.map(function (uv) { var q = surf(C, uv[0], uv[1]); return fwd(L, q[0], q[1]); });
}
ctx.beginPath(); path.forEach(function (q, i) { if (i) { ctx.lineTo(q[0], q[1]); } else { ctx.moveTo(q[0], q[1]); } }); ctx.closePath(); ctx.stroke();
ctx.setLineDash([]);
var hp = p[2], r = 13 * k;
ctx.fillStyle = "#e1262f"; ctx.beginPath(); ctx.arc(hp[0], hp[1], r, 0, 7); ctx.fill();
ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(hp[0], hp[1], r * 0.5, -2.4, 1.2); ctx.stroke();
ctx.restore();
}
(function loop() { if (dirty) { dirty = false; render(false); } requestAnimationFrame(loop); })();

/* ---------- Gestos: arrastrar, esquina, pellizco, rueda y teclado ---------- */
var ptrs = {}, mode = null, g0 = null;
function pos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * base.W / r.width, (e.clientY - r.top) * base.H / r.height]; }
function hit(p) {
for (var i = layers.length - 1; i >= 0; i--) {
var L = layers[i], dx = p[0] - L.x, dy = p[1] - L.y, c = Math.cos(-L.rot), s = Math.sin(-L.rot);
var x = dx * c - dy * s, y = dx * s + dy * c;
if (Math.abs(x) <= L.w / 2 && Math.abs(y) <= L.w * L.ar / 2) { return i; }
}
return -1;
}
function onHandle(p) { var L = layers[sel]; if (!L) { return false; } var q = corners(L)[2]; return Math.hypot(p[0] - q[0], p[1] - q[1]) < 26 * px(); }
function used() { var t = $("#tip"); if (t) { t.classList.add("off"); } }
cv.addEventListener("pointerdown", function (e) {
if (!base) { return; }
cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = pos(e);
var ids = Object.keys(ptrs);
var L = layers[sel];
if (ids.length === 2 && L) {
var a = ptrs[ids[0]], b = ptrs[ids[1]];
mode = "pinch"; g0 = { d: Math.hypot(b[0] - a[0], b[1] - a[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), w: L.w, rot: L.rot, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, x: L.x, y: L.y };
return;
}
var p = ptrs[e.pointerId], mi = warpMode && L ? meshHit(L, p) : -1;
if (mi >= 0) { mode = "mesh"; g0 = { k: mi }; }
else if (!warpMode && onHandle(p)) { L = layers[sel]; mode = "handle"; g0 = { d: Math.hypot(p[0] - L.x, p[1] - L.y), ang: Math.atan2(p[1] - L.y, p[0] - L.x), w: L.w, rot: L.rot }; }
else {
var i = hit(p);
if (i < 0 && layers[sel] && e.pointerType !== "mouse") { i = sel; }  // en móvil, arrastrar en cualquier sitio mueve el diseño elegido
if (i >= 0) { sel = i; L = layers[i]; mode = "move"; g0 = { dx: p[0] - L.x, dy: p[1] - L.y }; syncUI(); }
else { mode = null; }
}
if (mode) { cv.classList.add("drag"); used(); }
dirty = true;
});
cv.addEventListener("pointermove", function (e) {
if (!(e.pointerId in ptrs)) { return; }
ptrs[e.pointerId] = pos(e);
var L = layers[sel]; if (!L || !mode) { return; }
var ids = Object.keys(ptrs);
if (mode === "pinch" && ids.length >= 2) {
var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
L.w = clampW(g0.w * d / g0.d); L.rot = g0.rot + Math.atan2(b[1] - a[1], b[0] - a[0]) - g0.ang;
L.x = g0.x + (a[0] + b[0]) / 2 - g0.mx; L.y = g0.y + (a[1] + b[1]) / 2 - g0.my;
} else if (mode === "mesh") {
var bp = back(L, ptrs[e.pointerId]); L.mesh[g0.k] = [clamp(bp[0], -1.5, 1.5), clamp(bp[1], -1.5, 1.5)];
} else if (mode === "handle") {
var p = ptrs[e.pointerId];
L.w = clampW(g0.w * Math.hypot(p[0] - L.x, p[1] - L.y) / g0.d); L.rot = g0.rot + Math.atan2(p[1] - L.y, p[0] - L.x) - g0.ang;
if (e.shiftKey) { L.rot = Math.round(L.rot / (Math.PI / 12)) * (Math.PI / 12); }
} else if (mode === "move") {
var q = ptrs[e.pointerId]; L.x = clamp(q[0] - g0.dx, 0, base.W); L.y = clamp(q[1] - g0.dy, 0, base.H);
}
dirty = true; syncUI(true);
});
function up(e) {
delete ptrs[e.pointerId];
var ids = Object.keys(ptrs);
if (ids.length === 1 && layers[sel]) { var p = ptrs[ids[0]], L = layers[sel]; mode = "move"; g0 = { dx: p[0] - L.x, dy: p[1] - L.y }; }
else if (!ids.length) { mode = null; cv.classList.remove("drag"); }
}
cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
cv.addEventListener("wheel", function (e) {
var L = layers[sel]; if (!L || document.activeElement !== cv) { return; }
e.preventDefault();
if (e.shiftKey) { L.rot += e.deltaY * 0.004; } else { L.w = clampW(L.w * Math.exp(-e.deltaY * 0.0015)); }
dirty = true; syncUI(true); used();
}, { passive: false });
cv.addEventListener("keydown", function (e) {
var L = layers[sel]; if (!L) { return; }
var st = e.shiftKey ? 20 : 5, k = e.key, done = true;
if (k === "ArrowLeft") { L.x -= st; } else if (k === "ArrowRight") { L.x += st; } else if (k === "ArrowUp") { L.y -= st; } else if (k === "ArrowDown") { L.y += st; }
else if (k === "+" || k === "=") { L.w = clampW(L.w * 1.05); } else if (k === "-") { L.w = clampW(L.w / 1.05); }
else if (k === "q" || k === "Q") { L.rot -= 0.05; } else if (k === "e" || k === "E") { L.rot += 0.05; }
else if (k === "Delete" || k === "Backspace") { removeSel(); } else { done = false; }
if (done) { e.preventDefault(); dirty = true; syncUI(true); used(); }
});
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function clampW(w) { return clamp(w, base.W * 0.04, base.W * 1.3); }

/* ---------- Panel ---------- */
var designsBox = $("#designs");
var R = { size: $("#r-size"), rot: $("#r-rot"), op: $("#r-op"), curve: $("#r-curve") };
function syncUI(fromCanvas) {
if (mode3d) { if (TN.s3d) { TN.s3d.sync(); } return; }
var L = layers[sel];
var mine = !!(base && base.zone === "Otra");   // en «Tu foto» solo se usa la foto del cliente
$("#up1").hidden = mine; $("#b-photo-t").textContent = mine ? "Cambiar foto" : "Subir mi foto";
$$(".ds", designsBox).forEach(function (b) { b.classList.toggle("in", layers.some(function (q) { return q.d.id === b.dataset.d; })); b.setAttribute("aria-pressed", L && L.d.id === b.dataset.d ? "true" : "false"); b.style.borderColor = L && L.d.id === b.dataset.d ? "var(--brand)" : ""; });
[R.size, R.rot, R.op, R.curve, $("#b-flip"), $("#b-del"), $("#b-center"), $("#b-add"), $("#b-warp")].forEach(function (n) { n.disabled = !L; });
if (!L && warpMode) { setWarp(false); }
$("#b-wreset").hidden = !(L && L.mesh);
if (!L) { $("#simsz").textContent = ""; return; }
var deg = Math.round(((L.rot * 180 / Math.PI) % 360 + 540) % 360 - 180);
R.size.value = Math.round(L.w / base.W * 100); R.rot.value = deg; R.op.value = Math.round(L.op * 100); R.curve.value = L.curve;
$("#o-size").textContent = R.size.value + " %"; $("#o-rot").textContent = deg + "°"; $("#o-op").textContent = R.op.value + " %"; $("#o-curve").textContent = L.curve ? L.curve + " %" : "plano";
$("#simsz").textContent = base.cm ? "≈ " + cmText(L) : L.d.n;
}
function cmText(L) { return Math.max(1, Math.round(L.w * base.cm)) + " × " + Math.max(1, Math.round(L.w * L.ar * base.cm)) + " cm"; }
R.size.addEventListener("input", function () { if (mode3d) { if (TN.s3d) { TN.s3d.size(+R.size.value); } return; } var L = layers[sel]; if (L) { L.w = base.W * R.size.value / 100; dirty = true; syncUI(); } });
R.rot.addEventListener("input", function () { if (mode3d) { if (TN.s3d) { TN.s3d.rot(+R.rot.value); } return; } var L = layers[sel]; if (L) { L.rot = R.rot.value * Math.PI / 180; dirty = true; syncUI(); } });
R.op.addEventListener("input", function () { if (mode3d) { if (TN.s3d) { TN.s3d.op(+R.op.value); } return; } var L = layers[sel]; if (L) { L.op = R.op.value / 100; dirty = true; syncUI(); } });
R.curve.addEventListener("input", function () { var L = layers[sel]; if (L) { L.curve = +R.curve.value; dirty = true; syncUI(); } });
$$("#finish button").forEach(function (b) {
b.addEventListener("click", function () { finish = b.dataset.f; $$("#finish button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); dirty = true; if (mode3d && TN.s3d) { TN.s3d.finish(); } });
});
$("#b-flip").addEventListener("click", function () { if (mode3d) { if (TN.s3d) { TN.s3d.mirror(); } return; } var L = layers[sel]; if (L) { L.flip = !L.flip; dirty = true; } });
$("#b-center").addEventListener("click", function () { var L = layers[sel]; if (L) { L.x = base.W / 2; L.y = base.H / 2; L.rot = 0; dirty = true; syncUI(); } });
function removeSel() { if (sel < 0) { return; } layers.splice(sel, 1); sel = layers.length - 1; dirty = true; syncUI(); }
$("#b-del").addEventListener("click", function () { if (mode3d) { if (TN.s3d) { TN.s3d.del(); } return; } removeSel(); });
$("#b-add").addEventListener("click", function () {
if (mode3d) { if (TN.s3d && TN.s3d.ready()) { TN.s3d.add(); TN.toast("Elige abajo el diseño de este tatuaje"); } return; }
var L = layers[sel]; if (!L) { return; }
var n = addLayer(L.d, L.img, [clamp(L.x + base.W * 0.12, 0, base.W), clamp(L.y + base.H * 0.08, 0, base.H)]);
n.w = L.w * 0.7; n.curve = L.curve; syncUI(); TN.toast("Elige abajo el segundo diseño");
});
function setWarp(on) {
warpMode = on; var b = $("#b-warp"); b.setAttribute("aria-pressed", on ? "true" : "false"); b.lastChild.textContent = on ? "Listo" : "Deformar";
var L = layers[sel]; if (on && L && !L.mesh) { L.mesh = meshId(); }
$("#b-wreset").hidden = !(L && L.mesh); dirty = true;
}
$("#b-warp").addEventListener("click", function () { setWarp(!warpMode); if (warpMode) { used(); TN.toast("Arrastra los puntos blancos para adaptar el diseño al músculo"); } });
$("#b-wreset").addEventListener("click", function () { var L = layers[sel]; if (L) { L.mesh = warpMode ? meshId() : null; dirty = true; syncUI(); } });
$("#b-wrap").addEventListener("click", function () { if (TN.s3d) { TN.toast(TN.s3d.wrap() ? "El tatuaje rodea el brazo o la pierna" : "Tatuaje en plano, como una calcomanía"); } });
$("#b-360").addEventListener("click", function () {
var b = this; if (!TN.s3d || !TN.s3d.ready() || b.disabled) { return; }
b.disabled = true; TN.toast("Grabando el vídeo 360°…");
TN.s3d.video().then(function (v) {
var ext = /mp4/.test(v.type) ? "mp4" : "webm", f = new File([v], "tinta-negra-360." + ext, { type: v.type });
if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: "Mi tatuaje en 3D" }).catch(function () { save(v, f.name); }); }
else { save(v, f.name); TN.toast("Vídeo descargado"); }
}).catch(function () { TN.toast("Tu navegador no puede grabar el vídeo"); }).then(function () { b.disabled = false; });
});
var cmp = $("#b-cmp");
cmp.addEventListener("click", function () { compare = !compare; cmp.setAttribute("aria-pressed", compare); cmp.lastChild.textContent = compare ? "Ver con tatuaje" : "Ver sin tatuaje"; dirty = true; if (TN.s3d) { TN.s3d.hide(mode3d && compare); } });

/* ---------- Vista 3D: un cuerpo que se gira, con el tatuaje proyectado sobre la piel (sim3d.js) ---------- */
var mode3d = false, cur3d = null;
TN.finishNow = function () { return finish; };
TN.inkOf = function (img, fin) { var was = finish; finish = fin; var c = ink({ d: { id: "3d" }, img: img }); finish = was; return c; };
function setMode(m) {
mode3d = m === "3d";
$$("#mode button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.m === m ? "true" : "false"); });
$("#stage").hidden = mode3d; $("#stage3d").hidden = !mode3d; $("#p-zone").hidden = mode3d; $("#p-body").hidden = !mode3d; $("#rg-curve").hidden = mode3d;
// en 3D: comparar, espejo, envolver, añadir, quitar y vídeo; en foto: todas menos las de 3D
var ON3 = { "b-cmp": 1, "b-flip": 1, "b-wrap": 1, "b-add": 1, "b-del": 1, "b-360": 1 }, ONLY3 = { "b-wrap": 1, "b-360": 1 };
$$(".bar .tb").forEach(function (b) { b.hidden = mode3d ? !ON3[b.id] : !!ONLY3[b.id] || (b.id === "b-wreset" && !(layers[sel] && layers[sel].mesh)); });
if (!mode3d) { $("#b-flip").setAttribute("aria-pressed", "false"); }
if (compare) { cmp.click(); }
R.size.min = mode3d ? 2 : 5; R.size.max = mode3d ? 45 : 120;
if (mode3d) {
if (warpMode) { setWarp(false); }
var L = layers[sel] || layers[0];
TN.current3d = cur3d || (L ? { d: L.d, img: L.img } : null);
$("#st3").hidden = false;
import("./sim3d.js").then(function (m) { return m.start(); }).then(function () {
$("#st3").hidden = true;
if (TN.current3d && TN.s3d && !TN.s3d.ready()) { TN.s3d.design(TN.current3d.d, TN.current3d.img); }
TN.s3d.sync(); $("#b-add").disabled = false; $("#b-360").hidden = !TN.s3d.canVideo();
}).catch(function (er) { if (window.console) { console.error(er); } $("#st3").textContent = "Tu navegador no puede mostrar la vista 3D. Prueba con «Sobre foto»."; });
} else { syncUI(); }
}
var chose = false;
$$("#mode button").forEach(function (b) { b.addEventListener("click", function () { chose = true; setMode(b.dataset.m); }); });
function ready() { return mode3d ? !!(TN.s3d && TN.s3d.ready()) : layers.length > 0 && !!base && base.zone === "Otra"; }
var Z3 = { "Mano": "Mano o dedos", "Costado": "Costillas", "Gemelo": "Pierna", "Pie": "Pierna", "Nuca": "Espalda", "Espalda baja": "Espalda" };

["#b-up", "#b-photo"].forEach(function (q) { $(q).addEventListener("click", function () { $("#f-body").click(); }); });

DESIGNS.forEach(function (d) {
var b = document.createElement("button"); b.type = "button"; b.className = "ds"; b.dataset.d = d.id; b.setAttribute("aria-label", d.n);
b.title = d.n;
b.innerHTML = '<img src="img/cat/t/' + d.id + '.webp" alt="" width="80" height="80" decoding="async" loading="lazy"><small>✓</small>';
b.addEventListener("click", function () { pick(d, "img/cat/" + d.id + ".webp"); });
designsBox.appendChild(b);
});
var up2 = document.createElement("button"); up2.type = "button"; up2.className = "ds up";
up2.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>Sube tu diseño';
up2.addEventListener("click", function () { $("#f-design").click(); });
designsBox.insertBefore(up2, designsBox.firstChild);

/* Desde el catálogo y la idea con IA de la página: elegir un diseño por su nombre de archivo */
TN.pickId = function (id) { var d = DESIGNS.filter(function (x) { return x.id === id; })[0]; if (d) { pick(d, "img/cat/" + d.id + ".webp"); } };
function pick(d, src) {
var p = typeof src === "string" ? load(src) : Promise.resolve(src);
p.then(function (img) {
if (mode3d) {
cur3d = TN.current3d = { d: d, img: img };
$$(".ds", designsBox).forEach(function (b) { var on = b.dataset.d === d.id; b.setAttribute("aria-pressed", on ? "true" : "false"); b.style.borderColor = on ? "var(--brand)" : ""; });
if (TN.s3d) { TN.s3d.design(d, img); }
return;
}
var L = layers[sel];
if (L) { var ar = (img.naturalHeight || img.height) / (img.naturalWidth || img.width); L.d = d; L.img = img; L.ar = ar; L.inkKey = null; if (L.w * ar > base.H * 0.9) { L.w = base.H * 0.9 / ar; } dirty = true; syncUI(); }
else { addLayer(d, img); }
});
}

/* ---------- Subidas (se procesan en el navegador) ---------- */
function readImage(file, max) {
return new Promise(function (ok, ko) {
if (!file || !/^image\//.test(file.type)) { ko(new Error("tipo")); return; }
var url = URL.createObjectURL(file), im = new Image();
im.onload = function () {
var W = im.naturalWidth, H = im.naturalHeight, k = Math.min(1, max / Math.max(W, H));
var c = document.createElement("canvas"); c.width = Math.round(W * k); c.height = Math.round(H * k);
c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c);
};
im.onerror = function () { URL.revokeObjectURL(url); ko(new Error("img")); };
im.src = url;
});
}
$("#f-body").addEventListener("change", function () {
var f = this.files[0]; this.value = "";
readImage(f, 1600).then(function (c) { setBase(c, null); if (!layers.length) { pick(DESIGNS[0], "img/cat/" + DESIGNS[0].id + ".webp"); } TN.toast("Foto lista: coloca el diseño donde quieras"); })
.catch(function () { TN.toast("No hemos podido abrir esa foto"); });
});
var rawDesign = null;
function hasAlpha(c) {
var d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, n = 0;
for (var i = 3; i < d.length; i += 16) { if (d[i] < 250) { n++; } }
return n > d.length / 16 * 0.02;
}
/* Quita el fondo blanco conservando el color (método «color a transparencia») */
function whiteToAlpha(src) {
var c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
var x = c.getContext("2d"); x.drawImage(src, 0, 0);
var im = x.getImageData(0, 0, c.width, c.height), d = im.data;
for (var i = 0; i < d.length; i += 4) {
var mn = Math.min(d[i], d[i + 1], d[i + 2]), a = 1 - mn / 255;
a = a < 0.06 ? 0 : Math.min(1, (a - 0.06) / 0.94 * 1.1);
if (a > 0) { for (var j = 0; j < 3; j++) { d[i + j] = clamp(Math.round((d[i + j] - 255 * (1 - a)) / a), 0, 255); } }
d[i + 3] = Math.round(a * 255 * (d[i + 3] / 255));
}
x.putImageData(im, 0, 0); return c;
}
function useUpload() {
if (!rawDesign) { return; }
var img = rawDesign.alpha || !$("#f-wb").checked ? rawDesign.c : whiteToAlpha(rawDesign.c);
pick({ id: "propio-" + (++uid), n: "Diseño propio", st: "No lo tengo claro" }, img);
}
$("#f-design").addEventListener("change", function () {
var f = this.files[0]; this.value = "";
readImage(f, 1200).then(function (c) {
rawDesign = { c: c, alpha: hasAlpha(c) };
$("#wb-row").hidden = rawDesign.alpha;
useUpload(); TN.toast("Diseño cargado");
}).catch(function () { TN.toast("No hemos podido abrir ese diseño"); });
});
$("#f-wb").addEventListener("change", function () { if (rawDesign && layers[sel] && /^propio/.test(layers[sel].d.id)) { useUpload(); } });

/* ---------- Exportar, compartir y pedir cita ---------- */
function exportBlob() {
if (mode3d && TN.s3d) { return TN.s3d.blob(); }
return new Promise(function (ok) {
var was = compare; compare = false; render(true);
cv.toBlob(function (b) { compare = was; dirty = true; ok(b); }, "image/jpeg", 0.9);
});
}
function save(b, name) {
var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name || "tinta-negra-prueba.jpg";
document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
}
TN.download = function () { exportBlob().then(save); };
$("#b-dl").addEventListener("click", function () { if (!ready()) { TN.toast("Elige primero un diseño"); return; } TN.download(); });
$("#b-share").addEventListener("click", function () {
if (!ready()) { TN.toast("Elige primero un diseño"); return; }
exportBlob().then(function (b) {
var f = new File([b], "tinta-negra-prueba.jpg", { type: "image/jpeg" });
if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: "Mi prueba de tatuaje", text: "¿Qué te parece? Probado en el simulador de Tinta Negra" }).catch(function () {}); }
else { save(b); TN.toast("Tu navegador no comparte imágenes: te la hemos descargado"); }
});
});
$("#b-book").addEventListener("click", function () {
if (!ready()) { TN.toast("Elige primero un diseño"); return; }
exportBlob().then(function (b) {
if (mode3d) {
var q = TN.s3d.info(), zz = Z3[q.zone] || q.zone;
if (TN.attach) { TN.attach({ url: URL.createObjectURL(b), file: new File([b], "tinta-negra-prueba.jpg", { type: "image/jpeg" }), zone: zz, style: q.st, cm: q.cm, summary: q.names + " en " + q.zone.toLowerCase() + ", ≈ " + q.cmText + ", vista 3D", idea: q.names + " de unos " + q.cmText + " en " + q.zone.toLowerCase() + "." }); }
var c3 = $("#reserva"); if (c3) { c3.scrollIntoView({ behavior: "smooth" }); }
return;
}
var names = layers.map(function (L) { return L.d.n; }).join(" + "), L = layers[sel] || layers[0];
var cm = base.cm ? Math.round(Math.max(L.w, L.w * L.ar) * base.cm) : 0;
var summary = names + " en " + (base.zone === "Otra" ? "la zona de la foto" : base.zone.toLowerCase()) + (base.cm ? ", ≈ " + cmText(L) : "") + ", " + ({ fresh: "recién hecho", healed: "curado", stencil: "plantilla" })[finish];
if (TN.attach) {
TN.attach({ url: URL.createObjectURL(b), file: new File([b], "tinta-negra-prueba.jpg", { type: "image/jpeg" }), zone: base.zone, style: L.d.st, cm: cm, summary: summary, idea: names + (base.cm ? " de unos " + cmText(L) : "") + " en " + (base.zone === "Otra" ? "la zona de la foto" : base.zone.toLowerCase()) + "." });
}
var c = $("#reserva"); if (c) { c.scrollIntoView({ behavior: "smooth" }); }

});
});

/* ---------- Inicio: el cuerpo 3D con una rosa. El modo «Tu foto» espera a que el cliente suba su foto
   (por debajo queda una foto de ejemplo para que todo funcione, pero no se enseña). ---------- */
Promise.all([load(ZONES[0].src), load("img/cat/" + DESIGNS[0].id + ".webp")]).then(function (r) {
setBase(r[0], ZONES[0]); addLayer(DESIGNS[0], r[1]);
}).catch(function () {});
syncUI();
// el 3D pesa: se carga cuando el simulador está a punto de verse
var simSec = $("#simulador");
function go3d() { if (!chose) { chose = true; setMode("3d"); } }
if (simSec && "IntersectionObserver" in window) {
new IntersectionObserver(function (es, ob) { if (es.some(function (e) { return e.isIntersecting; })) { ob.disconnect(); go3d(); } }, { rootMargin: "600px 0px" }).observe(simSec);
} else { go3d(); }
})();
