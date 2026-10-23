/* sim3d.js — Simulador en 3D de Tinta Negra.
   Un cuerpo en 3D que se gira con el dedo; el tatuaje se proyecta sobre la piel (calcomanía 3D) y se adapta
   solo a la forma del brazo, la pierna o la espalda, como en los simuladores 3D de los estudios.
   La tinta se multiplica con la piel iluminada, así que coge las sombras y el tono de piel reales.
   Como en las apps 3D de los estudios: varios cuerpos (complexión), modo «envolver» que rodea el brazo o la pierna,
   varios tatuajes a la vez, espejo, pellizcar para escalar y girar, luces de estudio y vídeo 360° para enseñarlo.
   Cuerpo: malla base de MakeHuman (CC0) en pose relajada, con su esqueleto para centrar la cámara en cada zona.
   Se carga solo cuando alguien abre la vista 3D. */
import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { DecalGeometry } from "./vendor/DecalGeometry.js";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

var TN = window.TN = window.TN || {};
var $ = function (s) { return document.querySelector(s); };
var SKINS = [
{ n: "Muy clara", c: "#f6d6c2" }, { n: "Clara", c: "#efc5a6" }, { n: "Media", c: "#d39a74" }, { n: "Oliva", c: "#bf9064" }, { n: "Morena", c: "#a46b48" }, { n: "Oscura", c: "#6a412d" }
];
/* Luces: estudio (foto de producto), natural (luz de día suave) y dramática (lateral, mucho contraste) */
var LIGHTS = {
estudio: { bg: "#18181b", hemi: 0.7, key: 2.4, kc: "#fff1e2", kp: [1.6, 3.2, 2.4], fill: 0.7, rim: 1.3, env: 0.45, exp: 1.05 },
natural: { bg: "#2c2e33", hemi: 1.35, key: 1.3, kc: "#fffaf2", kp: [0.5, 3.6, 2.6], fill: 0.55, rim: 0.5, env: 0.85, exp: 1.0 },
dramatica: { bg: "#0b0b0d", hemi: 0.12, key: 3.6, kc: "#ffe4c8", kp: [2.8, 2.1, 0.5], fill: 0.06, rim: 2.4, env: 0.12, exp: 1.12 }
};
/* Zonas donde el tatuaje rodea el miembro en vez de proyectarse en plano */
var WRAPZ = { Brazo: 1, Antebrazo: 1, Muslo: 1, Gemelo: 1 };
var VIEWS = {}, SEGS = [];
function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }
/* Zonas del cuerpo a partir del esqueleto: cada una con su eje (para centrar la cámara) y su grosor */
function setBones(m) {
var B = m.bones, H = m.H, S = [];
function seg(n, a, b, r, arm, limb) { S.push({ n: n, a: new THREE.Vector3().fromArray(a), b: new THREE.Vector3().fromArray(b), r: r, arm: !!arm, limb: limb || "" }); }
["L", "R"].forEach(function (sd) {
seg("Hombro", B["shoulder01." + sd][0], B["shoulder01." + sd][1], 0.06, true, "arm" + sd);
seg("Brazo", B["upperarm01." + sd][0], B["upperarm02." + sd][1], 0.045, true, "arm" + sd);
seg("Antebrazo", B["lowerarm01." + sd][0], B["lowerarm02." + sd][1], 0.038, true, "arm" + sd);
var w = B["wrist." + sd], d = [w[1][0] - w[0][0], w[1][1] - w[0][1], w[1][2] - w[0][2]];
seg("Mano", w[0], [w[0][0] + d[0] * 4.5, w[0][1] + d[1] * 4.5, w[0][2] + d[2] * 4.5], 0.032, true, "arm" + sd);
seg("Muslo", B["upperleg01." + sd][0], B["upperleg02." + sd][1], 0.085, false, "leg" + sd);
seg("Gemelo", B["lowerleg01." + sd][0], B["lowerleg02." + sd][1], 0.055, false, "leg" + sd);
seg("Pie", B["foot." + sd][0], B["foot." + sd][1], 0.045, false, "leg" + sd);
});
seg("Torso", B.spine05[0], B.spine01[1], 0.14);
seg("Cuello", B.neck01[0], B.neck03[1], 0.06);
seg("Cabeza", B.head[0], B.head[1], 0.1);
SEGS = S;
function V(n, sd) { var q = S.filter(function (x) { return x.n === n; }); return q[sd === "L" ? 0 : q.length - 1]; }
function at(sg, t) { return sg.a.clone().lerp(sg.b, t === undefined ? 0.5 : t).toArray(); }
function from(t, dir, dist) { var d = new THREE.Vector3().fromArray(dir).normalize().multiplyScalar(dist); return { t: t, p: [t[0] + d.x, t[1] + d.y, t[2] + d.z] }; }
var chest = at(V("Torso"), 0.78), ribs = at(V("Torso"), 0.62);
VIEWS = {
frente: from([0, 0.53 * H, 0], [0.18, 0.08, 1], 3.3),
espalda: from(at(V("Torso"), 0.7), [-0.15, 0.08, -1], 1.5),
hombro: from(at(V("Hombro", "R"), 0.8), [-1, 0.25, 0.35], 0.7),
brazo: from(at(V("Brazo", "R")), [-1, 0.08, 0.45], 0.9),
antebrazo: from(at(V("Antebrazo", "R"), 0.55), [-0.55, 0.12, 1], 0.85),
mano: from(at(V("Mano", "R"), 0.35), [-0.6, 0.15, 1], 0.55),
pecho: from([0, chest[1], 0.05], [0.12, 0.05, 1], 0.95),
costillas: from([-0.1, ribs[1], 0], [-0.75, 0.1, 0.7], 0.85),
muslo: from(at(V("Muslo", "R")), [-0.45, 0.06, 1], 0.95),
muslotras: from(at(V("Muslo", "R"), 0.55), [-0.35, 0.06, -1], 0.95),
pierna: from(at(V("Muslo", "R"), 0.95), [-0.6, 0.05, 1], 1.75),
cadera: from(at(V("Muslo", "R"), kind === "mujer" ? 0.05 : 0.3), [-1, 0.1, 0.35], 0.85),
gemelo: from(at(V("Gemelo", "R")), [-0.35, 0.1, -1], 0.85)
};
// al ir a una zona, el tatuaje elegido se coloca ahí (en la piel que mira a la cámara)
var Z = { espalda: ["Torso"], hombro: ["Hombro", "Brazo"], brazo: ["Brazo"], antebrazo: ["Antebrazo"], mano: ["Mano"], pecho: ["Torso"], costillas: ["Torso"], muslo: ["Muslo"], muslotras: ["Muslo"], pierna: ["Muslo", "Gemelo"], cadera: ["Torso", "Muslo"], gemelo: ["Gemelo"] };
Object.keys(Z).forEach(function (k) { VIEWS[k].z = Z[k]; });
}
var tv = new THREE.Vector3(), tw = new THREE.Vector3();
/* Zona más cercana a un punto (distancia al eje dividida por el grosor de la zona) y su punto del eje */
function nearest(p) {
var best = null, bd = Infinity, ax = null, bi = 0;
for (var i = 0; i < SEGS.length; i++) {
var g = SEGS[i]; tv.subVectors(g.b, g.a); var L2 = tv.lengthSq(), t = L2 ? Math.max(0, Math.min(1, tw.subVectors(p, g.a).dot(tv) / L2)) : 0;
tw.copy(g.a).addScaledVector(tv, t); var d = p.distanceTo(tw) / g.r;
if (d < bd) { bd = d; best = g; ax = tw.clone(); bi = i; }
}
return { g: best, axis: ax, i: bi };
}

var cloth = null, clothShellMat = null, eyes = null, meta = null;
var cv, renderer, scene, camera, controls, body, skinMat, clothMat, light, hemi, fill, rim, kind = "hombre", build = "medio", bodyH = 1.78;
var tats = [], cur = -1, tat = null;   // cada tatuaje: { d, img, pos, n, size, rot, op, mir, mesh, mat }
var wrapOn = true, turn = null;
var hidden = false, dirty = true, started = null;
var ray = new THREE.Raycaster(), ptr = new THREE.Vector2();

export function start() {
if (started) { return started; }
started = new Promise(function (ok, ko) {
cv = $("#cv3");
try {
renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, alpha: false });
} catch (e) { ko(e); return; }
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene = new THREE.Scene();
scene.background = new THREE.Color("#18181b");
scene.fog = new THREE.Fog("#18181b", 4.5, 9);
camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);

// Luz de estudio: principal cálida, relleno frío y contraluz para marcar el volumen
// Reflejos suaves de estudio (entorno) y luces de foto: principal, relleno y contraluz
var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
hemi = new THREE.HemisphereLight("#fff4ea", "#3a3038", 0.7); scene.add(hemi);
light = new THREE.DirectionalLight("#fff1e2", 2.4); light.position.set(1.6, 3.2, 2.4); light.castShadow = true;
light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -1.2; light.shadow.camera.right = 1.2; light.shadow.camera.top = 2.2; light.shadow.camera.bottom = -0.2; light.shadow.bias = -0.0004; light.shadow.normalBias = 0.02;
scene.add(light);
fill = new THREE.DirectionalLight("#cfe0ff", 0.7); fill.position.set(-2.2, 1.6, 1.2); scene.add(fill);
rim = new THREE.DirectionalLight("#ffffff", 1.3); rim.position.set(-0.6, 2.4, -2.6); scene.add(rim);
var floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.ShadowMaterial({ opacity: 0.35 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

controls = new OrbitControls(camera, cv);
controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.09;
controls.zoomToCursor = true;   // al pellizcar se acerca a donde están los dedos
controls.minDistance = 0.3; controls.maxDistance = 3.6; controls.maxPolarAngle = Math.PI * 0.62; controls.rotateSpeed = 0.8;
controls.addEventListener("change", function () { dirty = true; });

skinMat = new THREE.MeshPhysicalMaterial({ color: SKINS[0].c, roughness: 0.52, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color("#ffd9c2"), clearcoat: 0.08, clearcoatRoughness: 0.6 });
// Ropa interior pintada en el sombreador por zonas del cuerpo: bordes limpios sin tocar la malla
var CU = { uH: { value: 1.78 }, uFem: { value: 0 }, uCloth: { value: new THREE.Color("#2b2b31") }, uHC: { value: new THREE.Vector3() }, uHR: { value: 0.1 },
uEL: { value: new THREE.Vector3() }, uER: { value: new THREE.Vector3() }, uHair: { value: new THREE.Color("#2b1d15") }, uZc: { value: 0.024 }, uBT: { value: new THREE.Vector3(0.105, 1.2, 0.16) } };
clothMat = CU;
var CLOTH = "float cy = vWP.y / uH, cx = abs(vWP.x) / uH;\n" +
"float e = 0.0012;\n" +
"float shorts = smoothstep(0.452 - e, 0.452 + e, cy) * (1.0 - smoothstep(0.571 - e, 0.571 + e, cy)) * (1.0 - smoothstep(0.133, 0.136, cx));\n" +
// mujer: bikini. Espalda, cadera, muslos e ingles al aire, que son zonas muy tatuadas
"float front = smoothstep(uZc - 0.03, uZc + 0.03, vWP.z);\n" +
"float bw = mix(mix(0.03, 0.088, smoothstep(0.455, 0.505, cy)), mix(0.016, 0.078, smoothstep(0.455, 0.53, cy)), front);\n" +
"float btop = mix(0.527, 0.532, front);\n" +
"float bik = smoothstep(0.452 - e, 0.452 + e, cy) * (1.0 - smoothstep(btop - e, btop + e, cy)) * (1.0 - smoothstep(bw - 0.0012, bw + 0.0012, cx));\n" +
"float str = smoothstep(0.52 - e, 0.52 + e, cy) * (1.0 - smoothstep(0.527 - e, 0.527 + e, cy)) * (1.0 - smoothstep(0.133, 0.136, cx));\n" +
"vec2 bq = vec2(abs(vWP.x) - uBT.x + 0.004, vWP.y - uBT.y + 0.008) / vec2(0.064, 0.068);\n" +
"float cup = (1.0 - smoothstep(0.94, 1.0, length(bq))) * step(uBT.z - 0.13, vWP.z);\n" +
"float mid = (1.0 - smoothstep(0.045, 0.048, abs(vWP.x))) * (1.0 - smoothstep(0.006, 0.0075, abs(vWP.y - uBT.y + 0.03))) * step(uBT.z - 0.1, vWP.z);\n" +
"float armK = step(0.5, vArm);\n" +
"float clothK = mix(shorts * (1.0 - armK), max(max(bik, str) * (1.0 - armK), max(cup, mid) * (1.0 - armK * step(0.172, abs(vWP.x)))), uFem);\n";
var VS = function (sh) { sh.vertexShader = "attribute float aArm;\nvarying float vArm;\nvarying vec3 vWP;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvArm = aArm;"); };
var FH = "varying vec3 vWP;\nvarying float vArm;\nuniform float uH;\nuniform float uFem;\nuniform vec3 uCloth;\nuniform vec3 uHC;\nuniform float uHR;\nuniform vec3 uEL;\nuniform vec3 uER;\nuniform vec3 uHair;\nuniform float uZc;\nuniform vec3 uBT;\n" +
"float hsh(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }\n" +
"float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);\n" +
" return mix(mix(mix(hsh(i), hsh(i + vec3(1,0,0)), f.x), mix(hsh(i + vec3(0,1,0)), hsh(i + vec3(1,1,0)), f.x), f.y), mix(mix(hsh(i + vec3(0,0,1)), hsh(i + vec3(1,0,1)), f.x), mix(hsh(i + vec3(0,1,1)), hsh(i + vec3(1,1,1)), f.x), f.y), f.z); }\n" +
"float brow(vec3 q) { float x = q.x / 0.024; float y0 = 0.0175 + 0.004 * (1.0 - x * x) - 0.002 * x; float w = 0.0035 * (1.0 - 0.5 * abs(x));\n" +
" return step(abs(x), 1.0) * step(0.0, q.z) * (1.0 - smoothstep(w * 0.6, w, abs(q.y - y0))); }\n";
clothShellMat = new THREE.MeshStandardMaterial({ color: "#2b2b31", roughness: 0.85 });
clothShellMat.onBeforeCompile = function (sh) {
Object.assign(sh.uniforms, CU); VS(sh);
sh.fragmentShader = FH + sh.fragmentShader.replace("void main() {", "void main() {\n" + CLOTH + "if (clothK < 0.5) discard;");
};
skinMat.onBeforeCompile = function (sh) {
Object.assign(sh.uniforms, CU); VS(sh);
sh.fragmentShader = FH + "float clothK2; float hairK;\n" + sh.fragmentShader
.replace("#include <color_fragment>", "#include <color_fragment>\n" + CLOTH +
// poros y pequeñas variaciones de tono de la piel
"float pn = vn(vWP * 900.0) * 0.6 + vn(vWP * 260.0) * 0.4;\ndiffuseColor.rgb *= 0.965 + pn * 0.06;\n" +
// pelo corto pintado sobre el cuero cabelludo, con la línea del pelo más baja por detrás
"vec3 d = (vWP - uHC) / uHR;\nfloat ph = abs(atan(d.x, d.z));\n" +
// línea del pelo según el ángulo alrededor de la cabeza: frente, sienes, encima de la oreja, detrás y nuca
"float th = mix(0.42, 0.0, smoothstep(0.25, 1.05, ph));\nth = mix(th, -0.2, smoothstep(1.05, 1.4, ph));\nth = mix(th, -0.8, smoothstep(1.65, 2.2, ph));\nth = mix(th, -1.1, smoothstep(2.2, 2.9, ph));\n" +
"th += (vn(vWP * 180.0) - 0.5) * 0.06;\n" +
"hairK = smoothstep(th - 0.035, th + 0.035, d.y) * step(length(d), 2.2);\n" +
"float bk = max(brow(vec3(vWP.x - uEL.x, vWP.y - uEL.y, vWP.z - uEL.z) * vec3(-1.0, 1.0, 1.0)), brow(vWP - uER));\n" +
"hairK = max(hairK, bk * 0.85);\n" +
"diffuseColor.rgb = mix(diffuseColor.rgb, uHair * (0.75 + 0.5 * vn(vWP * vec3(2500.0, 600.0, 2500.0))), hairK * 0.88);\n" +
"clothK2 = clothK;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uCloth * 0.7, clothK);")
.replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.92, max(clothK2, hairK)) + (pn - 0.5) * 0.08;");
};
loadBody(kind, build).then(function () {
buildUI(); resize(); view("antebrazo", true);
if (TN.current3d && !tats.length) { design(TN.current3d.d, TN.current3d.img); }
loop(); ok();
}).catch(ko);
window.addEventListener("resize", resize);
if (window.ResizeObserver) { new ResizeObserver(resize).observe(cv.parentNode); }
bindPointer();
});
return started;
}

/* Ropa interior como una capa de tela: copia de la piel en esa zona, separada unos milímetros y alisada
   (suavizado de Taubin, que no encoge), para que la tela no marque los detalles del cuerpo. */
function region(y, x, fem, m) {
return (y > 0.452 - m && y < 0.571 + m && x < 0.136 + m) || (fem && y > 0.68 - m && y < 0.78 + m && x < 0.115 + m);
}
function shell(g, H, fem) {
var P = g.attributes.position.array, N = g.attributes.normal.array, I = g.index.array, ARM = g.attributes.aArm.array, map = new Map(), pos = [], nor = [], arm = [], idx = [], i, j, k;
for (i = 0; i < I.length; i += 3) {
var cy = (P[I[i] * 3 + 1] + P[I[i + 1] * 3 + 1] + P[I[i + 2] * 3 + 1]) / 3 / H, cx = Math.abs(P[I[i] * 3] + P[I[i + 1] * 3] + P[I[i + 2] * 3]) / 3 / H;
var top = fem && cy > 0.62;
if (!region(cy, cx, fem, 0.012) || (ARM[I[i]] > 0.5 && !(top && cx * H < 0.172))) { continue; }
for (j = 0; j < 3; j++) {
var v = I[i + j], n = map.get(v);
if (n === undefined) { n = pos.length / 3; map.set(v, n); var ofs = fem && P[v * 3 + 1] / H > 0.62 ? 0.005 : 0.0035;   // más separada en el pecho para que no se marque
for (k = 0; k < 3; k++) { pos.push(P[v * 3 + k] + N[v * 3 + k] * ofs); nor.push(N[v * 3 + k]); } arm.push(0); }
idx.push(n);
}
}
var nv = pos.length / 3, nb = []; for (i = 0; i < nv; i++) { nb.push([]); }
for (i = 0; i < idx.length; i += 3) { for (j = 0; j < 3; j++) { var a = idx[i + j], b = idx[i + (j + 1) % 3]; if (nb[a].indexOf(b) < 0) { nb[a].push(b); nb[b].push(a); } } }
var p = new Float32Array(pos), t = new Float32Array(pos.length);
function step(f) {
for (var q = 0; q < nv; q++) {
var L = nb[q], sx = 0, sy = 0, sz = 0;
for (var r = 0; r < L.length; r++) { sx += p[L[r] * 3]; sy += p[L[r] * 3 + 1]; sz += p[L[r] * 3 + 2]; }
var c = L.length || 1;
t[q * 3] = p[q * 3] + f * (sx / c - p[q * 3]); t[q * 3 + 1] = p[q * 3 + 1] + f * (sy / c - p[q * 3 + 1]); t[q * 3 + 2] = p[q * 3 + 2] + f * (sz / c - p[q * 3 + 2]);
}
p.set(t);
}
for (i = 0; i < 40; i++) { step(0.5); step(-0.53); }
var s = new THREE.BufferGeometry();
s.setAttribute("position", new THREE.BufferAttribute(p, 3)); s.setAttribute("aArm", new THREE.Float32BufferAttribute(arm, 1)); s.setIndex(idx);
s.computeVertexNormals();
// bikini: la luz se calcula con una versión muy alisada de la tela, así no se marca el pezón
if (fem) {
var keep = p.slice(); for (i = 0; i < 120; i++) { step(0.5); }
var sm = new THREE.BufferGeometry(); sm.setAttribute("position", new THREE.BufferAttribute(p, 3)); sm.setIndex(idx); sm.computeVertexNormals();
var NS = s.attributes.normal.array, NM = sm.attributes.normal.array;
for (i = 0; i < nv; i++) { if (keep[i * 3 + 1] / H > 0.62) { NS[i * 3] = NM[i * 3]; NS[i * 3 + 1] = NM[i * 3 + 1]; NS[i * 3 + 2] = NM[i * 3 + 2]; } }
s.attributes.position.array.set(keep); s.attributes.position.needsUpdate = true;
}
return s;
}

/* La calcomanía solo se calcula con los triángulos cercanos (rejilla de 5 cm): arrastrar va fluido en el móvil */
var CELL = 0.05, grid = null, gridOf = null, nearMeshObj = new THREE.Mesh();
function buildGrid(g) {
var P = g.attributes.position.array, I = g.index.array, m = new Map();
for (var i = 0; i < I.length; i += 3) {
var k = Math.floor((P[I[i] * 3] + P[I[i + 1] * 3] + P[I[i + 2] * 3]) / 3 / CELL) + "," + Math.floor((P[I[i] * 3 + 1] + P[I[i + 1] * 3 + 1] + P[I[i + 2] * 3 + 1]) / 3 / CELL) + "," + Math.floor((P[I[i] * 3 + 2] + P[I[i + 1] * 3 + 2] + P[I[i + 2] * 3 + 2]) / 3 / CELL);
var a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(i);
}
return m;
}
function near(c, rad) {
var g = body.geometry;
if (gridOf !== g) { grid = buildGrid(g); gridOf = g; }
var P = g.attributes.position.array, N = g.attributes.normal.array, I = g.index.array, pos = [], nor = [];
var r = rad + CELL, x0 = Math.floor((c.x - r) / CELL), x1 = Math.floor((c.x + r) / CELL), y0 = Math.floor((c.y - r) / CELL), y1 = Math.floor((c.y + r) / CELL), z0 = Math.floor((c.z - r) / CELL), z1 = Math.floor((c.z + r) / CELL);
for (var x = x0; x <= x1; x++) { for (var y = y0; y <= y1; y++) { for (var z = z0; z <= z1; z++) {
var a = grid.get(x + "," + y + "," + z); if (!a) { continue; }
for (var j = 0; j < a.length; j++) { for (var q = 0; q < 3; q++) { var v = I[a[j] + q] * 3; pos.push(P[v], P[v + 1], P[v + 2]); nor.push(N[v], N[v + 1], N[v + 2]); } }
} } }
var ng = new THREE.BufferGeometry();
ng.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ng.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
if (nearMeshObj.geometry) { nearMeshObj.geometry.dispose(); }
nearMeshObj.geometry = ng; nearMeshObj.updateMatrixWorld(true);
return nearMeshObj;
}

var bodies = {}, malla = null;
/* Alisado (Laplaciano) solo de los vértices cerca de unos puntos, con más fuerza en el centro */
function smoothNear(P, I, cs, rad, it) {
var w = new Map(), i, j;
for (i = 0; i < P.length / 3; i++) { for (j = 0; j < cs.length; j++) { var d = Math.hypot(P[i * 3] - cs[j].x, P[i * 3 + 1] - cs[j].y, P[i * 3 + 2] - cs[j].z); if (d < rad) { w.set(i, { k: 0.5 * (1 - d / rad), nb: [] }); } } }
for (i = 0; i < I.length; i += 3) { for (j = 0; j < 3; j++) { var a = I[i + j], b = I[i + (j + 1) % 3], A = w.get(a), B = w.get(b); if (A && A.nb.indexOf(b) < 0) { A.nb.push(b); } if (B && B.nb.indexOf(a) < 0) { B.nb.push(a); } } }
for (var n = 0; n < it; n++) {
var out = [];
w.forEach(function (o, v) { var sx = 0, sy = 0, sz = 0; o.nb.forEach(function (q) { sx += P[q * 3]; sy += P[q * 3 + 1]; sz += P[q * 3 + 2]; }); var c = o.nb.length || 1;
out.push([v, P[v * 3] + o.k * (sx / c - P[v * 3]), P[v * 3 + 1] + o.k * (sy / c - P[v * 3 + 1]), P[v * 3 + 2] + o.k * (sz / c - P[v * 3 + 2])]); });
out.forEach(function (r) { P[r[0] * 3] = r[1]; P[r[0] * 3 + 1] = r[2]; P[r[0] * 3 + 2] = r[3]; });
}
}
function get(u, t) { return fetch(u).then(function (r) { if (!r.ok) { throw new Error("cuerpo"); } return t === "json" ? r.json() : r.arrayBuffer(); }); }
/* Todos los cuerpos comparten la misma malla (triángulos); de cada complexión solo se baja la forma (≈300 KB) */
function loadBody(k, bt) {
var key = k + "-" + bt;
if (!malla) { malla = get("3d/malla.bin").then(function (b) { var n = new Uint32Array(b, 0, 1)[0]; return new THREE.BufferAttribute(new Uint16Array(b, 4, n * 3).slice(), 1); }); }
if (!bodies[key]) {
bodies[key] = Promise.all([get("3d/" + key + ".bin"), get("3d/" + key + ".json", "json"), malla]).then(function (res) {
var buf = res[0], m = res[1], nV = new Uint32Array(buf, 0, 1)[0], q = new Int16Array(buf, 4, nV * 3), pos = new Float32Array(nV * 3);
for (var i = 0; i < pos.length; i++) { pos[i] = q[i] / 16384; }
var tip = new THREE.Vector3(0.105, 0.73 * m.H, 0.16), bz = -1;
if (k === "mujer") {
// punto más saliente del pecho: centra las copas del bikini, y bajo la tela se alisa el pezón para que no se marque
for (i = 0; i < nV; i++) { var y = pos[i * 3 + 1] / m.H, x = pos[i * 3]; if (y > 0.68 && y < 0.78 && x > 0.02 && x < 0.15 && pos[i * 3 + 2] > bz) { bz = pos[i * 3 + 2]; tip.fromArray(pos, i * 3); } }
smoothNear(pos, res[2].array, [tip, new THREE.Vector3(-tip.x, tip.y, tip.z)], 0.03, 40);
}
var g = new THREE.BufferGeometry();
g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(res[2]);
g.computeVertexNormals(); g.computeBoundingSphere();
// cada vértice sabe a qué zona pertenece: la ropa interior no pinta las manos y el modo envolver no se sale del brazo
setBones(m);
var arm = new Float32Array(nV), sg = new Uint8Array(nV), p = new THREE.Vector3();
for (i = 0; i < nV; i++) { p.fromArray(pos, i * 3); var z = nearest(p); arm[i] = z.g.arm ? 1 : 0; sg[i] = z.i; }
g.setAttribute("aArm", new THREE.BufferAttribute(arm, 1)); g.userData.seg = sg;
return { g: g, H: m.H, m: m, bt: tip };
});
}
// cada tatuaje se recuerda respecto a su zona (qué hueso, a qué altura y en qué lado) para recolocarlo en el cuerpo nuevo
tats.forEach(function (t) {
var z = nearest(t.pos), g = z.g, ab = g.b.clone().sub(g.a);
t.zi = z.i; t.zt = t.pos.clone().sub(g.a).dot(ab) / ab.lengthSq(); t.zd = t.pos.clone().sub(z.axis).normalize();
});
return bodies[key].then(function (r) {
if (body) { scene.remove(body); }
kind = k; build = bt; bodyH = r.H; meta = r.m; setBones(r.m);
clothMat.uH.value = r.H; clothMat.uFem.value = k === "mujer" ? 1 : 0;
clothMat.uZc.value = r.m.bones["pelvis.L"][0][2]; clothMat.uBT.value.copy(r.bt);
var hb = r.m.bones.head; clothMat.uHC.value.fromArray(hb[0]).lerp(new THREE.Vector3().fromArray(hb[1]), 0.5); clothMat.uHR.value = new THREE.Vector3().fromArray(hb[0]).distanceTo(new THREE.Vector3().fromArray(hb[1])) * 0.62;
clothMat.uEL.value.fromArray(r.m.bones["eye.L"][0]); clothMat.uER.value.fromArray(r.m.bones["eye.R"][0]);
body = new THREE.Mesh(r.g, skinMat); body.castShadow = true; body.receiveShadow = true; body.updateMatrixWorld(true);
scene.add(body);
if (cloth) { scene.remove(cloth); }
if (!r.cloth) { r.cloth = shell(r.g, r.H, k === "mujer"); }
cloth = new THREE.Mesh(r.cloth, clothShellMat); cloth.castShadow = true; cloth.receiveShadow = false; scene.add(cloth);   // sin sombras de la piel de debajo sobre la tela
addEyes(r.m);
// los tatuajes que ya había se vuelven a pegar a la piel del cuerpo nuevo
// (en la misma zona: si la mano queda delante del muslo, el tatuaje del muslo no se pasa a la mano)
tats.forEach(function (t) {
var g = SEGS[t.zi], ap = g.a.clone().lerp(g.b, t.zt);
ray.set(ap.addScaledVector(t.zd, 0.4), t.zd.clone().negate());
var h = ray.intersectObject(body, false).filter(function (x) { return nearest(x.point).i === t.zi; })[0];
if (h) { t.pos.copy(h.point); t.n.copy(nrm(h)); }
if (t.full || t.part) { var was = tat; tat = t; fitLimb(t, t.d.k); tat = was; }   // la manga o la pierna se ajustan al cuerpo nuevo
rebuild(t, false);
});
dirty = true;
});
}
/* Punto de partida: cara externa del antebrazo derecho */
function spot() {
var fa = SEGS.filter(function (x) { return x.n === "Antebrazo"; })[1], c = fa.a.clone().lerp(fa.b, 0.45);
var hit = cast(c.clone().add(new THREE.Vector3(-0.6, 0, 0.8)), new THREE.Vector3(0.6, 0, -0.8).normalize());
return hit ? { pos: hit.point.clone(), n: nrm(hit) } : { pos: c, n: new THREE.Vector3(-0.6, 0, 0.8).normalize() };
}
/* Ojos: esfera blanca con iris y pupila, mirando al frente */
function addEyes(m) {
if (eyes) { scene.remove(eyes); }
eyes = new THREE.Group();
var white = new THREE.MeshPhysicalMaterial({ color: "#f2ede6", roughness: 0.15, clearcoat: 1 });
var iris = new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 0.4 }), pup = new THREE.MeshBasicMaterial({ color: "#0b0b0b" });
["eye.L", "eye.R"].forEach(function (k) {
var a = new THREE.Vector3().fromArray(m.bones[k][0]), b = new THREE.Vector3().fromArray(m.bones[k][1]), dir = b.clone().sub(a).normalize(), r = 0.0118;
var gq = new THREE.Group(); gq.position.copy(a); gq.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
gq.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), white));
var ir = new THREE.Mesh(new THREE.CircleGeometry(r * 0.48, 24), iris); ir.position.z = r * 0.985; gq.add(ir);
var pp = new THREE.Mesh(new THREE.CircleGeometry(r * 0.2, 16), pup); pp.position.z = r * 0.99; gq.add(pp);
eyes.add(gq);
});
scene.add(eyes);
}
function setLight(k) {
var L = LIGHTS[k]; if (!L) { return; }
scene.background.set(L.bg); scene.fog.color.set(L.bg); hemi.intensity = L.hemi;
light.intensity = L.key; light.color.set(L.kc); light.position.fromArray(L.kp);
fill.intensity = L.fill; rim.intensity = L.rim; scene.environmentIntensity = L.env; renderer.toneMappingExposure = L.exp;
var st = $("#stage3d"); if (st) { st.style.background = L.bg; }
dirty = true;
}

function resize() {
if (!renderer || turn) { return; }
var w = cv.parentNode.clientWidth, h = Math.round(w * (window.innerWidth < 700 ? 1.15 : 0.75));
renderer.setSize(w, h, false); cv.style.width = w + "px"; cv.style.height = h + "px";
camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true;
}
function loop() {
requestAnimationFrame(loop);
if (turn) { stepTurn(); return; }
if (anim) { stepAnim(); }
if (want) { var t = want; want = null; rebuild(t, false); }   // como mucho una reconstrucción por fotograma
if (controls.update() || dirty) { dirty = false; renderer.render(scene, camera); }
}

/* ---------- Cámara: vistas rápidas con transición suave ---------- */
var anim = null;
function view(k, now, keep) {
var v = VIEWS[k]; if (!v) { return; }
var p = new THREE.Vector3().fromArray(v.p), t = new THREE.Vector3().fromArray(v.t);
if (!now && !keep && v.z && tat && body && !tat.full) {
ray.set(p, t.clone().sub(p).normalize());
var h = ray.intersectObject(body, false).filter(function (x) { return v.z.indexOf(nearest(x.point).g.n) >= 0; })[0];
if (h) { tat.pos.copy(h.point); tat.n.copy(nrm(h)); rebuild(tat, false); off(); }
}
if (now || matchMedia("(prefers-reduced-motion: reduce)").matches) { camera.position.copy(p); controls.target.copy(t); dirty = true; return; }
anim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: t, s: performance.now() };
}
function stepAnim() {
var k = Math.min(1, (performance.now() - anim.s) / 650), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
camera.position.lerpVectors(anim.p0, anim.p1, e); controls.target.lerpVectors(anim.t0, anim.t1, e); dirty = true;
if (k >= 1) { anim = null; }
}

/* ---------- Tatuajes: calcomanía proyectada, o envuelta alrededor del brazo o la pierna ---------- */
function cast(o, d) { ray.set(o, d); var r = ray.intersectObject(body, false); return r[0] || null; }
function nrm(hit) { return hit.face.normal.clone().normalize(); }
function arOf(t) { return t.img.naturalHeight ? t.img.naturalHeight / t.img.naturalWidth : t.img.height / t.img.width; }
function texOf(t) {
// la tinta se pinta sobre blanco: al multiplicar, el blanco no cambia la piel y la tinta coge su tono y sus sombras
var fin = TN.finishNow ? TN.finishNow() : "healed";
var src = TN.inkOf ? TN.inkOf(t.img, fin) : t.img;
var W = src.width || src.naturalWidth, H = src.height || src.naturalHeight, k = Math.min(1, 1024 / Math.max(W, H));
var c = document.createElement("canvas"); c.width = Math.round(W * k) + 16; c.height = Math.round(H * k) + 16;
var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
if (t.mir) { x.translate(c.width, 0); x.scale(-1, 1); }   // espejo: el diseño al revés, como al calcar del otro lado
if (fin === "fresh") { x.save(); x.globalAlpha = 0.5; x.shadowColor = "rgba(205,55,55,.9)"; x.shadowBlur = 14; x.drawImage(src, 8, 8, c.width - 16, c.height - 16); x.restore(); }
if (fin === "healed") { x.filter = "blur(0.7px)"; }
x.globalAlpha = t.op; x.drawImage(src, 8, 8, c.width - 16, c.height - 16);
var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
return tx;
}
function zoneOf(t) { return nearest(t.pos).g; }
function wraps(t) { return (wrapOn || t.full || t.part) && !!WRAPZ[zoneOf(t).n]; }
/* Envolver: coordenadas cilíndricas alrededor del hueso. El ancho del diseño se mide sobre la piel (arco),
   así un brazalete o una manga rodean el brazo sin estirarse por los lados, que es lo que falla en una calcomanía plana. */
var wv = new THREE.Vector3();
/* El brazo y la pierna son una cadena de huesos (brazo → antebrazo → mano, muslo → gemelo): cada vértice se mide
   en su propio hueso y la altura se suma a lo largo de la cadena, así el diseño pasa el codo o la rodilla sin cortarse. */
var CHAIN = { arm: ["Brazo", "Antebrazo", "Mano"], leg: ["Muslo", "Gemelo"] };
function chain(sg, e1) {
var names = CHAIN[sg.limb.slice(0, 3)], out = {}, L = 0;
names.forEach(function (n) {
for (var i = 0; i < SEGS.length; i++) {
var g = SEGS[i]; if (g.n !== n || g.limb !== sg.limb) { continue; }
var A = g.b.clone().sub(g.a), len = A.length(); A.divideScalar(len);
var f1 = e1.clone().addScaledVector(A, -e1.dot(A)).normalize();
out[i] = { a: g.a, A: A, L: L, e1: f1, e2: new THREE.Vector3().crossVectors(A, f1) }; L += len;
}
});
return out;
}
function wrapGeo(t, w, h) {
var sg = zoneOf(t), A0 = sg.b.clone().sub(sg.a).normalize(), al0 = wv.subVectors(t.pos, sg.a).dot(A0);
var e1 = t.pos.clone().sub(sg.a.clone().addScaledVector(A0, al0)).normalize(), CH = chain(sg, e1), si = nearest(t.pos).i;
if (!CH[si]) { return new THREE.BufferGeometry(); }
var tc = CH[si].L + al0;
var g = body.geometry, P = g.attributes.position.array, I = g.index.array, SG = g.userData.seg;
if (gridOf !== g) { grid = buildGrid(g); gridOf = g; }
var cs = Math.cos(-t.rot), sn = Math.sin(-t.rot), rad = Math.max(Math.hypot(w, h) / 2, sg.r * 2.5) + CELL, c = t.pos;
var pos = [], uv = [], U = [0, 0, 0], V = [0, 0, 0], TH = [0, 0, 0];
var x0 = Math.floor((c.x - rad) / CELL), x1 = Math.floor((c.x + rad) / CELL), y0 = Math.floor((c.y - rad) / CELL), y1 = Math.floor((c.y + rad) / CELL), z0 = Math.floor((c.z - rad) / CELL), z1 = Math.floor((c.z + rad) / CELL);
for (var gx = x0; gx <= x1; gx++) { for (var gy = y0; gy <= y1; gy++) { for (var gz = z0; gz <= z1; gz++) {
var cell = grid.get(gx + "," + gy + "," + gz); if (!cell) { continue; }
for (var j = 0; j < cell.length; j++) {
var ok = true, f = cell[j];
for (var q = 0; q < 3 && ok; q++) {
var v = I[f + q], k = CH[SG[v]]; if (!k) { ok = false; break; }
var A = k.A, px = P[v * 3] - k.a.x, py = P[v * 3 + 1] - k.a.y, pz = P[v * 3 + 2] - k.a.z, al = px * A.x + py * A.y + pz * A.z;
px -= A.x * al; py -= A.y * al; pz -= A.z * al;
var c1 = px * k.e1.x + py * k.e1.y + pz * k.e1.z, c2 = px * k.e2.x + py * k.e2.y + pz * k.e2.z, th = Math.atan2(c2, c1), rho = Math.hypot(c1, c2);
var Y = -(k.L + al - tc);                                   // arriba = hacia el hombro o la cadera
if (t.full) { U[q] = 0.5 - th / (Math.PI * 2); V[q] = 0.5 + Y / h; }   // manga: da la vuelta entera al brazo, sea gordo o fino
else { var X = -th * rho; U[q] = 0.5 + (X * cs + Y * sn) / w; V[q] = 0.5 + (-X * sn + Y * cs) / h; }   // derecha e izquierda vistas desde fuera
TH[q] = th;
}
if (!ok) { continue; }
if (Math.max(TH[0], TH[1], TH[2]) - Math.min(TH[0], TH[1], TH[2]) > Math.PI) { continue; }   // la costura de detrás
if (Math.max(U[0], U[1], U[2]) < 0 || Math.min(U[0], U[1], U[2]) > 1 || Math.max(V[0], V[1], V[2]) < 0 || Math.min(V[0], V[1], V[2]) > 1) { continue; }
for (q = 0; q < 3; q++) { var vv = I[f + q] * 3; pos.push(P[vv], P[vv + 1], P[vv + 2]); uv.push(U[q], V[q]); }
}
} } }
var ng = new THREE.BufferGeometry();
ng.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ng.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
return ng;
}
/* Piezas que ocupan un miembro entero, como las ponen los tatuadores:
   manga (hombro a muñeca) y media manga (codo a muñeca) rodean todo el brazo con la costura por dentro;
   pierna entera (ingle a tobillo) rodea toda la pierna con la costura por la cara interna;
   muslo delante / detrás cubren media vuelta del muslo, de la cadera a la rodilla. */
var LIMB = { manga: 1, media: 1, pierna: 1, muslo: 1, "muslo-tras": 1 };
function fitLimb(t, k) {
var leg = k === "pierna" || k === "muslo" || k === "muslo-tras", limb = leg ? "leg" : "arm";
var side = tat && zoneOf(tat).limb === limb + "L" ? "L" : "R";
var segs = SEGS.filter(function (x) { return x.limb === limb + side; });
var up = segs.filter(function (x) { return x.n === (leg ? "Muslo" : "Brazo"); })[0], fo = segs.filter(function (x) { return x.n === (leg ? "Gemelo" : "Antebrazo"); })[0];
var U0 = up.a.distanceTo(up.b), F0 = fo.a.distanceTo(fo.b), t0, t1;   // de dónde a dónde, en metros desde el hombro o la cadera
if (k === "media") { t0 = U0 + F0 * 0.04; t1 = U0 + F0 * 0.93; }
else if (k === "manga") { t0 = U0 * 0.08; t1 = U0 + F0 * 0.93; }
else if (k === "pierna") { t0 = U0 * 0.1; t1 = U0 + F0 * 0.9; }
else { t0 = U0 * 0.12; t1 = U0 * 0.97; }
function along(d) { return d < U0 ? up.a.clone().lerp(up.b, d / U0) : fo.a.clone().lerp(fo.b, Math.min(1, (d - U0) / F0)); }
var len = t1 - t0, mid = along((t0 + t1) / 2), sx = side === "R" ? -1 : 1;
// la cara que mira el centro del diseño: fuera del brazo, fuera de la pierna, delante o detrás del muslo
var out = new THREE.Vector3(k === "muslo" ? sx * 0.25 : k === "muslo-tras" ? sx * 0.2 : sx, 0, k === "muslo" ? 1 : k === "muslo-tras" ? -1 : leg ? 0.25 : 0.35).normalize();
ray.set(mid.clone().addScaledVector(out, 0.4), out.clone().negate());
var h = ray.intersectObject(body, false).filter(function (x) { var z = nearest(x.point).g; return z.limb === limb + side && (z === up || z === fo); })[0];
if (h) { t.pos.copy(h.point); t.n.copy(nrm(h)); }
var r = nearest(t.pos).axis.distanceTo(t.pos);
t.rot = 0; t.fullH = len;
if (k === "muslo" || k === "muslo-tras") { t.full = false; t.part = true; t.size = Math.min(Math.PI * r * 1.15, len / arOf(t)); }   // media vuelta del muslo, sin deformar el dibujo
else { t.full = true; t.part = false; t.size = 2 * Math.PI * r; }
}
function rebuild(t, texToo) {
if (!t || !t.img || !body) { return; }
if (!t.mat) {
t.mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, toneMapped: false });
}
if (texToo || !t.mat.map) { if (t.mat.map) { t.mat.map.dispose(); } t.mat.map = texOf(t); t.mat.needsUpdate = true; }
if ((t.full || t.part) && !WRAPZ[zoneOf(t).n]) { t.full = false; t.part = false; t.size = 0.12; }   // una manga movida fuera del brazo vuelve a ser un tatuaje normal
var w = t.size, h = t.full ? t.fullH : t.size * arOf(t), geo;
if (wraps(t)) { geo = wrapGeo(t, w, h); }
else {
// el eje z del proyector mira hacia fuera de la piel: así el diseño no sale en espejo
var m = new THREE.Matrix4().lookAt(t.pos.clone().add(t.n), t.pos, new THREE.Vector3(0, 1, 0));
var o = new THREE.Euler().setFromRotationMatrix(m); o.z -= t.rot;   // giro positivo = sentido de las agujas del reloj, como en la vista de foto
var dep = Math.max(w, h) * 0.75;
geo = new DecalGeometry(near(t.pos, Math.hypot(w, h, dep) / 2), t.pos, o, new THREE.Vector3(w, h, dep));
}
if (t.mesh) { t.mesh.geometry.dispose(); t.mesh.geometry = geo; }
else { t.mesh = new THREE.Mesh(geo, t.mat); t.mesh.renderOrder = 2; scene.add(t.mesh); }
t.mesh.visible = !hidden; dirty = true; if (t === tat) { info(); }
}
function select(i) { cur = i; tat = tats[i] || null; if (tat) { TN.current3d = { d: tat.d, img: tat.img }; } syncUI(); info(); }
function addTat(d, img, at) {
var b = at || spot(), base = tat;
var t = { d: d, img: img, pos: b.pos.clone(), n: b.n.clone(), size: base ? base.size * 0.8 : 0.08, rot: 0, op: base ? base.op : 0.9, mir: false };
tats.push(t); select(tats.length - 1); rebuild(t, true); return t;
}
function design(d, img) {
if (!tat) { addTat(d, img); } else { tat.d = d; tat.img = img; }
if (LIMB[d.k]) { fitLimb(tat, d.k); off(); view({ media: "antebrazo", manga: "brazo", pierna: "pierna", muslo: "muslo", "muslo-tras": "muslotras" }[d.k], false, true); }
else if (tat.full || tat.part) { tat.full = false; tat.part = false; tat.size = 0.1; }
if (d.k === "relleno" && tat.size < 0.14) { tat.size = 0.16; }
if (d.k === "espalda") { tat.size = 0.25; tat.rot = 0; tat.pos.y -= 0.05; }   // pieza de espalda: ocupa casi toda la espalda
rebuild(tat, true); syncUI(); info();
}
function removeTat() {
if (!tat) { return; }
if (tat.mesh) { scene.remove(tat.mesh); tat.mesh.geometry.dispose(); }
if (tat.mat) { if (tat.mat.map) { tat.mat.map.dispose(); } tat.mat.dispose(); }
tats.splice(cur, 1); select(tats.length - 1); dirty = true;
}
/* Un tatuaje nuevo en la parte del cuerpo que se ve en el centro de la pantalla, algo desplazado */
function addHere() {
var src = tat || (TN.current3d ? { d: TN.current3d.d, img: TN.current3d.img } : null); if (!src || !body) { return; }
var h = null, gap = tat ? tat.size * 0.75 : 0;
for (var ring = 0; ring < 4 && !h; ring++) {
for (var k = 0; k < 8 && !h; k++) {
var a = k / 8 * Math.PI * 2 + ring * 0.4, rr = ring * 0.14;
ptr.set(Math.sin(a) * rr, -Math.cos(a) * rr); ray.setFromCamera(ptr, camera); var r = ray.intersectObject(body, false)[0];
if (r && tats.every(function (q) { return r.point.distanceTo(q.pos) > gap; })) { h = r; }
if (!ring) { k = 8; }
}
}
addTat(src.d, src.img, h ? { pos: h.point.clone(), n: nrm(h) } : null);
}

/* ---------- Gestos: girar con un dedo, tocar para colocar, arrastrar el tatuaje y pellizcarlo ---------- */
var down = null, dragging = null, pinch = null, pinched = false, want = null, lastTap = 0, ptrs = new Map();
/* Centrar: la cámara gira alrededor del eje de la zona donde está el tatuaje (brazo, pierna...), no del cuerpo entero */
function center(zoom) {
if (!tat || !body) { return; }
var ax = nearest(tat.pos).axis, off = camera.position.clone().sub(controls.target);
if (zoom) { off.setLength(Math.min(off.length(), 0.7)); }
anim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: ax.clone().add(off), t1: ax, s: performance.now() };
}
function focusOn(p) {
var ax = nearest(p).axis, dir = p.clone().sub(ax); if (dir.lengthSq() < 1e-6) { dir.set(0, 0, 1); }
dir.normalize().multiplyScalar(0.6).add(new THREE.Vector3(0, 0.08, 0));
anim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: ax.clone().add(dir), t1: ax, s: performance.now() };
}
function setPtr(e) { var r = cv.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); }
function hitBody(e) { setPtr(e); var r = ray.intersectObject(body, false); return r[0] || null; }
/* ¿Qué tatuaje hay bajo el dedo? (el que esté encima de la piel en ese punto) */
function hitTat(e) {
var hb = hitBody(e); if (!hb) { return -1; }
var best = -1, bd = Infinity;
tats.forEach(function (t, i) {
if (!t.mesh || !t.mesh.visible) { return; }
var r = ray.intersectObject(t.mesh, false)[0];
if (r && r.distance < hb.distance + 0.004) { var d = r.point.distanceTo(t.pos); if (d < bd) { bd = d; best = i; } }
});
return best;
}
function two() { var a = Array.from(ptrs.values()); return { d: Math.hypot(a[1].x - a[0].x, a[1].y - a[0].y), a: Math.atan2(a[1].y - a[0].y, a[1].x - a[0].x) }; }
function bindPointer() {
cv.addEventListener("pointerdown", function (e) {
ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (turn) { return; }
if (ptrs.size === 1) {
down = { x: e.clientX, y: e.clientY, t: performance.now() }; pinched = false;
var i = tats.length && body ? hitTat(e) : -1;
if (i >= 0) { if (i !== cur) { select(i); } dragging = tat; controls.enabled = false; cv.classList.add("drag"); off(); }
} else if (ptrs.size === 2 && dragging) {
// dos dedos sobre el tatuaje: pellizcar cambia el tamaño y girar los dedos lo gira
var g = two(); pinch = { d: g.d, a: g.a, s: dragging.size, r: dragging.rot }; pinched = true;
}
}, true);
cv.addEventListener("pointermove", function (e) {
if (ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); }
if (!dragging) { return; }
if (pinch && ptrs.size >= 2) {
if (dragging.full) { return; }
var g = two();
dragging.size = Math.max(0.02, Math.min(0.45, pinch.s * g.d / Math.max(10, pinch.d)));
var r = pinch.r + (g.a - pinch.a); r = Math.atan2(Math.sin(r), Math.cos(r)); dragging.rot = r;
want = dragging; syncUI(); return;
}
if (pinched) { return; }   // al soltar un dedo del pellizco, el tatuaje no salta al otro dedo
var h = hitBody(e); if (h) { dragging.pos.copy(h.point); dragging.n.copy(nrm(h)); want = dragging; }
}, true);
function up(e) {
ptrs.delete(e.pointerId);
if (pinch) { if (ptrs.size < 2) { pinch = null; } if (ptrs.size) { return; } }
if (dragging) { if (ptrs.size) { return; } dragging = null; controls.enabled = true; cv.classList.remove("drag"); if (!pinched) { center(false); } down = null; return; }
if (down && body && !ptrs.size && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 600) {   // margen para el temblor del dedo en el móvil
var h = hitBody(e);
if (h && lastTap && performance.now() - lastTap < 350) { focusOn(h.point); lastTap = 0; }
else if (h && tat) { tat.pos.copy(h.point); tat.n.copy(nrm(h)); rebuild(tat, false); off(); center(false); lastTap = performance.now(); }
else if (h && TN.current3d) { addTat(TN.current3d.d, TN.current3d.img, { pos: h.point.clone(), n: nrm(h) }); off(); lastTap = performance.now(); }
}
if (!ptrs.size) { down = null; }
}
cv.addEventListener("pointerup", up, true);
cv.addEventListener("pointercancel", function (e) { ptrs.delete(e.pointerId); if (!ptrs.size) { dragging = null; pinch = null; controls.enabled = true; cv.classList.remove("drag"); } }, true);
}
function off() { var t = $("#tip3"); if (t) { t.classList.add("off"); } }

/* ---------- Vídeo 360°: el cuerpo da una vuelta completa alrededor del tatuaje ---------- */
function videoType() {
if (!window.MediaRecorder || !cv.captureStream) { return null; }
var L = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
for (var i = 0; i < L.length; i++) { if (MediaRecorder.isTypeSupported(L[i])) { return L[i]; } }
return null;
}
function stepTurn() {
var k = Math.min(1, (performance.now() - turn.s) / turn.dur), a = k * Math.PI * 2;
var o = turn.off.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
camera.position.copy(turn.t).add(o); camera.lookAt(turn.t); renderer.render(scene, camera);
if (k >= 1 && !turn.done) { turn.done = true; setTimeout(function () { if (turn) { turn.rec.stop(); } }, 120); }
}
function video() {
var type = videoType();
if (!type || !tats.length) { return Promise.reject(new Error("video")); }
return new Promise(function (ok, ko) {
anim = null; controls.update();
var stream = cv.captureStream(30), rec, parts = [];
try { rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6000000 }); } catch (e) { ko(e); return; }
var back = { p: camera.position.clone(), t: controls.target.clone() };
rec.ondataavailable = function (e) { if (e.data && e.data.size) { parts.push(e.data); } };
rec.onstop = function () {
stream.getTracks().forEach(function (tr) { tr.stop(); });
turn = null; camera.position.copy(back.p); controls.target.copy(back.t); controls.enabled = true; controls.update(); dirty = true;
var b = new Blob(parts, { type: type.split(";")[0] });
b.size ? ok(b) : ko(new Error("vacio"));
};
controls.enabled = false;
turn = { s: performance.now() + 150, dur: 6000, t: controls.target.clone(), off: camera.position.clone().sub(controls.target), rec: rec };
rec.start(250);
});
}

/* ---------- Panel ---------- */
function press(sel, el) { document.querySelectorAll(sel).forEach(function (x) { x.setAttribute("aria-pressed", x === el ? "true" : "false"); }); }
function buildUI() {
document.querySelectorAll("#sex button").forEach(function (b) {
b.addEventListener("click", function () { press("#sex button", b); loadBody(b.dataset.k, build).then(function () { if (!tat) { view("antebrazo"); } info(); }); });
});
document.querySelectorAll("#build button").forEach(function (b) {
b.addEventListener("click", function () { press("#build button", b); loadBody(kind, b.dataset.b).then(info); });
});
document.querySelectorAll("#light button").forEach(function (b) {
b.addEventListener("click", function () { press("#light button", b); setLight(b.dataset.l); });
});
var box = $("#skins");
SKINS.forEach(function (s, i) {
var b = document.createElement("button"); b.type = "button"; b.className = "skin"; b.style.background = s.c; b.setAttribute("aria-label", "Piel " + s.n.toLowerCase()); b.title = s.n;
b.setAttribute("aria-pressed", i === 1 ? "true" : "false");
b.addEventListener("click", function () { skinMat.color.set(s.c); box.querySelectorAll(".skin").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); dirty = true; });
box.appendChild(b);
});
document.querySelectorAll("#views button").forEach(function (b) { b.addEventListener("click", function () { view(b.dataset.v); }); });
}
function zoneName() {
if (!tat) { return "Cuerpo"; }
var z = nearest(tat.pos).g.n, y = tat.pos.y / bodyH, front = tat.n.z >= 0;
if (z === "Muslo") { return "Pierna"; }
if (z === "Cabeza") { return front ? "Cara" : "Cabeza"; }
if (z === "Cuello") { return front ? "Cuello" : "Nuca"; }
if (z !== "Torso") { return z; }
if (Math.abs(tat.n.x) > 0.7 && y < 0.78) { return "Costado"; }
if (y > 0.69) { return front ? "Pecho" : "Espalda"; }
return front ? "Abdomen" : "Espalda baja";
}
function cmText() { return tat.full ? Math.round(tat.fullH * 100) + " cm de largo" : Math.round(tat.size * 100) + " × " + Math.round(tat.size * arOf(tat) * 100) + " cm"; }
function info() {
var s = $("#sz3"); if (!s) { return; }
s.textContent = tat && tat.img ? (tats.length > 1 ? "Tatuaje " + (cur + 1) + " de " + tats.length + " · " : "") + (tat.full ? ({ media: "Media manga", pierna: "Pierna entera" }[tat.d.k] || "Manga entera") + " · ≈ " + Math.round(tat.fullH * 100) + " cm de largo" : (tat.part ? (tat.d.k === "muslo" ? "Muslo por delante" : "Muslo por detrás") : zoneName()) + " · ≈ " + cmText() + (wraps(tat) ? " · envuelto" : "")) : "";
}
function syncUI() {
var R = { size: $("#r-size"), rot: $("#r-rot"), op: $("#r-op") };
[R.size, R.rot, R.op, $("#b-flip"), $("#b-del")].forEach(function (n) { if (n) { n.disabled = !tat; } });
if (tat && tat.full) { R.size.disabled = true; R.rot.disabled = true; }   // la manga ya ocupa todo el brazo
var bw = $("#b-wrap"); if (bw) { bw.disabled = !(tat && WRAPZ[zoneOf(tat).n]); bw.setAttribute("aria-pressed", wrapOn ? "true" : "false"); }
var bf = $("#b-flip"); if (bf) { bf.setAttribute("aria-pressed", tat && tat.mir ? "true" : "false"); }
if (!tat) { return; }
R.size.value = Math.round(tat.size * 100); R.rot.value = Math.round(tat.rot * 180 / Math.PI); R.op.value = Math.round(tat.op * 100);
$("#o-size").textContent = R.size.value + " cm"; $("#o-rot").textContent = R.rot.value + "°"; $("#o-op").textContent = R.op.value + " %";
}

/* ---------- API para sim.js ---------- */
TN.s3d = {
design: design,
size: function (cm) { if (tat) { tat.size = cm / 100; rebuild(tat, false); syncUI(); } },
rot: function (deg) { if (tat) { tat.rot = deg * Math.PI / 180; rebuild(tat, false); syncUI(); } },
op: function (p) { if (tat) { tat.op = p / 100; rebuild(tat, true); syncUI(); } },
mirror: function () { if (tat) { tat.mir = !tat.mir; rebuild(tat, true); syncUI(); } },
wrap: function () { wrapOn = !wrapOn; tats.forEach(function (t) { rebuild(t, false); }); syncUI(); info(); return wrapOn; },
add: addHere,
del: removeTat,
finish: function () { tats.forEach(function (t) { rebuild(t, true); }); },
hide: function (h) { hidden = h; tats.forEach(function (t) { if (t.mesh) { t.mesh.visible = !h; } }); dirty = true; },
sync: syncUI,
ready: function () { return !!(tat && tat.img && body); },
info: function () { return { zone: zoneName(), cm: Math.round(tat.size * 100), cmText: cmText(), names: tats.map(function (t) { return t.d.n; }).join(" + "), st: tat.d.st, n: tats.length }; },
canVideo: function () { return !!videoType(); },
video: video,
_cam: function (pp, tt) { anim = null; camera.position.fromArray(pp); controls.target.fromArray(tt); dirty = true; },
_scr: function () { var v = tat.pos.clone().project(camera), r = cv.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; },
_state: function () { return { n: tats.length, cur: cur, wrap: tat ? wraps(tat) : false, tris: tat && tat.mesh ? tat.mesh.geometry.attributes.position.count / 3 : 0, size: tat ? tat.size : 0, rot: tat ? tat.rot : 0, mir: tat ? tat.mir : false, body: kind + "-" + build, pos: tat ? tat.pos.toArray() : null }; },
blob: function () {
return new Promise(function (ok) {
renderer.render(scene, camera);
var c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
var x = c.getContext("2d"); x.drawImage(cv, 0, 0);
var fs = Math.round(c.width / 36); x.font = "700 " + fs + "px system-ui,sans-serif"; x.textAlign = "right"; x.textBaseline = "bottom";
x.fillStyle = "rgba(255,255,255,.85)"; x.fillText("Simulación 3D · Tinta Negra", c.width - fs * 0.8, c.height - fs * 0.6);
c.toBlob(ok, "image/jpeg", 0.9);
});
}
};
