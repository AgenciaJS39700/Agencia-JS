/* experiencia.js — Tinta Negra · «La experiencia»: escena 3D guiada por el scroll.
   Camilla de tatuador, aro de luz, herramientas que flotan y se despliegan, y primer plano de la máquina.
   Todo se modela aquí con three.js (sin modelos ni vídeos externos): pesa poco y se ve nítido en cualquier pantalla.
   Se carga solo al acercarse a la sección (ver index.html) y solo dibuja mientras está a la vista. */
import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const sec = document.getElementById("experiencia");
const pin = sec && sec.querySelector(".xp-pin");
const cv = sec && sec.querySelector(".xp-cv");
const params = new URLSearchParams(location.search);
const POSTER = params.has("xpposter") ? Math.max(0, Math.min(4, +params.get("xpposter") || 0)) : null;
const N = 5; // capítulos

const RED = 0xe1251b, BONE = 0xece6da;
const isTouch = matchMedia("(pointer: coarse)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !isTouch || devicePixelRatio < 2, powerPreference: "high-performance", preserveDrawingBuffer: POSTER !== null });
} catch (e) {
  sec.classList.add("xp-static");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isTouch ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.Fog(0x0a0a0a, 7, 19);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

/* ---------- materiales ---------- */
const M = {
  leather: new THREE.MeshPhysicalMaterial({ color: 0x151515, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.38, sheen: 0.5, sheenColor: new THREE.Color(0x3a3a3a), sheenRoughness: 0.6 }),
  button: new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.5 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.18 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.9, roughness: 0.32 }),
  anod: new THREE.MeshStandardMaterial({ color: 0x111113, metalness: 0.85, roughness: 0.28 }),
  red: new THREE.MeshStandardMaterial({ color: RED, metalness: 0.6, roughness: 0.3, emissive: RED, emissiveIntensity: 0.15 }),
  redGlow: new THREE.MeshBasicMaterial({ color: 0xff3b2f, toneMapped: false }),
  bone: new THREE.MeshStandardMaterial({ color: BONE, roughness: 0.6 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.7 }),
  clear: new THREE.MeshPhysicalMaterial({ color: 0xe8e8e8, roughness: 0.15, transparent: true, opacity: 0.55, clearcoat: 1 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.42, metalness: 0.25 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x121213, roughness: 0.85 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.15, metalness: 0.1 }),
  inkRed: new THREE.MeshStandardMaterial({ color: 0x8e0c08, roughness: 0.15 })
};

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const radialTex = canvasTex(256, 256, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});

/* ---------- suelo, pared y ambiente ---------- */
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), M.floor);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ map: radialTex, color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002;
scene.add(shadow);

const wall = new THREE.Group();
const slatG = new THREE.BoxGeometry(0.32, 6, 0.12);
const slats = new THREE.InstancedMesh(slatG, M.wall, 28);
const dummy = new THREE.Object3D();
for (let i = 0; i < 28; i++) { dummy.position.set(-9 + i * 0.66, 3, -5.2 + (i % 2) * 0.04); dummy.updateMatrix(); slats.setMatrixAt(i, dummy.matrix); }
wall.add(slats);
// tiras de luz cálida entre listones y estanterías con brillos (bokeh)
const stripMat = new THREE.MeshBasicMaterial({ color: 0xffd7b0, transparent: true, opacity: 0.22, toneMapped: false });
for (const x of [-5.6, -2.3, 2.9, 6.2]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 4.2), stripMat); s.position.set(x, 2.4, -5.1); wall.add(s); }
const bokehMat = new THREE.SpriteMaterial({ map: radialTex, color: 0xffc89a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
const rnd = mulberry(7);
for (let i = 0; i < 26; i++) {
  const sp = new THREE.Sprite(bokehMat);
  const s = 0.25 + rnd() * 0.5; sp.scale.set(s, s, 1);
  sp.position.set(-7 + rnd() * 14, 1 + rnd() * 3.2, -4.9);
  wall.add(sp);
}
const redLineMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.55, toneMapped: false });
const redLine = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.012), redLineMat); redLine.position.set(0, 0.42, -5.08); wall.add(redLine);
scene.add(wall);

/* ---------- luces ---------- */
scene.add(new THREE.HemisphereLight(0xfff1e6, 0x080808, 0.18));
const key = new THREE.SpotLight(0xffeedd, 38, 14, 0.5, 0.65, 1.6);
key.position.set(1.2, 4.6, 2.2); key.target.position.set(0, 0.7, 0); scene.add(key, key.target);
const rim = new THREE.PointLight(RED, 7, 6, 1.8); rim.position.set(-1.6, 1.6, -1.6); scene.add(rim);
const fill = new THREE.PointLight(0xd9e3ff, 2.2, 8, 2); fill.position.set(-2.5, 1.2, 2.6); scene.add(fill);
const ringLight = new THREE.PointLight(0xff4a3a, 0, 5, 1.6); ringLight.position.set(0, 1.05, -0.35); scene.add(ringLight);

/* ---------- camilla de tatuador ---------- */
function pad(len, wid, thick, r = 0.07) {
  const s = new THREE.Shape();
  const x = -len / 2, y = -wid / 2;
  s.moveTo(x + r, y); s.lineTo(x + len - r, y); s.quadraticCurveTo(x + len, y, x + len, y + r);
  s.lineTo(x + len, y + wid - r); s.quadraticCurveTo(x + len, y + wid, x + len - r, y + wid);
  s.lineTo(x + r, y + wid); s.quadraticCurveTo(x, y + wid, x, y + wid - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: thick - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 5, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.03, 0); g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.leather);
  const grp = new THREE.Group(); grp.add(m);
  // capitoné: botones hundidos
  const bg = new THREE.SphereGeometry(0.012, 10, 8);
  const nx = Math.max(2, Math.round(len / 0.17)), nz = 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const b = new THREE.Mesh(bg, M.button);
    b.position.set(-len / 2 + (i + 0.5) * len / nx, thick + 0.004, -wid / 4 + j * wid / 2);
    b.scale.y = 0.35; grp.add(b);
  }
  // ribete rojo a lo largo
  const pip = new THREE.Mesh(new THREE.BoxGeometry(len - 0.08, 0.008, 0.006), M.red);
  pip.position.set(0, thick * 0.5, wid / 2 + 0.031); grp.add(pip);
  const pip2 = pip.clone(); pip2.position.z = -wid / 2 - 0.031; grp.add(pip2);
  // raíl cromado
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len - 0.12, 0.025, wid * 0.55), M.chrome);
  rail.position.y = -0.015; grp.add(rail);
  return grp;
}
const bed = new THREE.Group();
const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.05, 48), M.chrome); base.position.y = 0.025; bed.add(base);
const col = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.5, 32), M.chrome); col.position.y = 0.3; bed.add(col);
const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 32), M.anod); collar.position.y = 0.12; bed.add(collar);
const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.09), M.anod); pedal.position.set(0.38, 0.06, 0.2); pedal.rotation.z = -0.25; bed.add(pedal);
const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.36), M.steelDark); bedFrame.position.y = 0.58; bed.add(bedFrame);
const seat = pad(0.64, 0.6, 0.12); seat.position.y = 0.62; bed.add(seat);
const backH = new THREE.Group(); backH.position.set(-0.33, 0.62, 0); backH.rotation.z = -0.55; bed.add(backH);
const back = pad(0.8, 0.6, 0.12); back.position.x = -0.41; backH.add(back);
const head = pad(0.26, 0.34, 0.1, 0.06); head.position.set(-0.98, 0.02, 0); backH.add(head);
const legH = new THREE.Group(); legH.position.set(0.33, 0.62, 0); legH.rotation.z = -0.12; bed.add(legH);
const leg = pad(0.66, 0.56, 0.12); leg.position.x = 0.34; legH.add(leg);
// reposabrazos lateral para tatuar brazos
const armPost = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 16), M.chrome); armPost.position.set(-0.15, 0.62, 0.42); bed.add(armPost);
const arm = pad(0.5, 0.16, 0.07, 0.05); arm.position.set(-0.22, 0.77, 0.45); arm.rotation.y = 0.18; bed.add(arm);
bed.position.set(0, 0, 0);
scene.add(bed);

/* ---------- aro de luz (se dibuja como un trazo) ---------- */
const ringCurve = new THREE.EllipseCurve(0, 0, 1.28, 1.28, Math.PI * 0.5, Math.PI * 2.5, false, 0);
const pts3 = ringCurve.getPoints(220).map((p) => new THREE.Vector3(p.x, p.y, 0));
const ringPath = new THREE.CatmullRomCurve3(pts3, true);
const ringGeo = new THREE.TubeGeometry(ringPath, 220, 0.012, 8, true);
const ring = new THREE.Mesh(ringGeo, M.redGlow);
const ringHalo = new THREE.Mesh(new THREE.TubeGeometry(ringPath, 220, 0.055, 8, true), new THREE.MeshBasicMaterial({ color: 0xff3b2f, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
const ringBack = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: radialTex, color: 0xff2a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
ringBack.position.z = -0.05;
const ringG = new THREE.Group(); ringG.add(ringBack, ringHalo, ring); ringG.position.set(0, 1.05, -0.45);
scene.add(ringG);
const RING_IDX = ringGeo.index.count;

/* ---------- herramientas ---------- */
function lathe(profile, mat, seg = 48) {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
}
// Máquina tipo «pen» (rotativa): aguja, cartucho, grip con estrías, cuerpo anodizado, anilla roja y conector
function makePen() {
  const g = new THREE.Group();
  const needle = new THREE.Group();
  needle.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0003, 0.03, 8), M.chrome));
  needle.children[0].position.y = 0.005;
  g.add(needle);
  const cart = lathe([[0.0001, 0.018], [0.004, 0.02], [0.0085, 0.032], [0.0092, 0.075], [0.0001, 0.075]], M.clear, 32); g.add(cart);
  const gp = []; for (let i = 0; i <= 40; i++) { const y = 0.075 + i * 0.002; gp.push([0.0128 + 0.0012 * Math.sin(i * 1.6), y]); }
  g.add(lathe([[0.0001, 0.075], ...gp, [0.0001, 0.155]], M.steelDark, 40));
  g.add(lathe([[0.0001, 0.155], [0.0155, 0.157], [0.0162, 0.2], [0.0162, 0.262], [0.012, 0.276], [0.0001, 0.278]], M.anod, 48));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0166, 0.0166, 0.008, 40), M.red); band.position.y = 0.21; g.add(band);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 20), M.chrome); plug.position.y = 0.286; g.add(plug);
  g.userData.needle = needle;
  return g;
}
function makeBottle(capMat) {
  const g = new THREE.Group();
  g.add(lathe([[0.0001, 0], [0.026, 0.002], [0.027, 0.07], [0.02, 0.085], [0.011, 0.09], [0.011, 0.1], [0.0001, 0.1]], M.ink, 40));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0275, 0.0275, 0.04, 40, 1, true), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.7 }));
  label.position.y = 0.036; g.add(label);
  g.add(lathe([[0.0001, 0.1], [0.012, 0.1], [0.012, 0.118], [0.007, 0.128], [0.0025, 0.146], [0.0001, 0.148]], capMat, 32));
  return g;
}
const labelTex = canvasTex(512, 96, (x, w, h) => {
  x.fillStyle = "#ece6da"; x.fillRect(0, 0, w, h);
  x.fillStyle = "#0a0a0a"; x.font = "900 44px Arial Black, Arial, sans-serif"; x.textBaseline = "middle"; x.fillText("TINTA NEGRA", 22, h / 2 + 2);
  x.fillStyle = "#e1251b"; x.fillRect(w - 70, 22, 46, 52);
});
function makePower() {
  const g = new THREE.Group();
  const body = pad(0.22, 0.15, 0.07, 0.025); body.children.forEach((c, i) => { if (i === 0) c.material = M.anod; else if (c.geometry.type === "SphereGeometry") c.visible = false; });
  g.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.045), new THREE.MeshBasicMaterial({ map: canvasTex(256, 104, (x, w, h) => {
    x.fillStyle = "#120302"; x.fillRect(0, 0, w, h); x.fillStyle = "#ff3b2f"; x.font = "700 64px monospace"; x.textBaseline = "middle"; x.fillText("8.5 V", 22, h / 2 + 4);
  }), toneMapped: false }));
  scr.rotation.x = -Math.PI / 2; scr.position.set(-0.03, 0.072, 0); g.add(scr);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.02, 32), M.chrome); knob.position.set(0.065, 0.08, 0); g.add(knob);
  return g;
}
function makeCaps() {
  const g = new THREE.Group();
  const capG = new THREE.LatheGeometry([[0.0001, 0], [0.008, 0], [0.011, 0.014], [0.0105, 0.016], [0.0001, 0.012]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
  const pos = [[0, 0], [0.026, 0.006], [-0.024, 0.01], [0.004, 0.028], [0.03, -0.022], [-0.012, -0.026]];
  pos.forEach(([x, z], i) => { const c = new THREE.Mesh(capG, i === 1 || i === 4 ? M.inkRed : M.ink); c.position.set(x, 0, z); g.add(c); });
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.062, 0.006, 40), M.chrome); tray.position.y = -0.004; g.add(tray);
  return g;
}
function makeCartridges() {
  const g = new THREE.Group();
  const cg = new THREE.LatheGeometry([[0.0001, 0], [0.004, 0.003], [0.0085, 0.014], [0.009, 0.056], [0.0001, 0.058]].map(([r, y]) => new THREE.Vector2(r, y)), 24);
  for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(cg, i === 2 ? M.red : M.clear); c.position.set((i - 2) * 0.022, 0, 0); c.rotation.z = Math.PI / 2 * 0; g.add(c); }
  return g;
}

const S = 2.6; // escala de las herramientas para que se lean en pantalla
// cada herramienta va dentro de un «soporte»: el soporte se coloca y se inclina; la pieza gira sobre su propio eje
function holder(obj) { const h = new THREE.Group(); h.add(obj); scene.add(h); h.userData.inner = obj; return h; }
const penM = makePen();
const pen = holder(penM);
const bottle1 = holder(makeBottle(M.anod));
const bottle2 = holder(makeBottle(M.red));
const power = holder(makePower());
const caps = holder(makeCaps());
const carts = holder(makeCartridges());

// cable de la máquina a la fuente
const cableMat = M.rubber;
let cable = null;
function updateCable(alpha) {
  if (cable) { scene.remove(cable); cable.geometry.dispose(); cable = null; }
  if (alpha < 0.02) return;
  const a = new THREE.Vector3(0, 0.29, 0).applyMatrix4(penM.matrixWorld);
  const b = new THREE.Vector3(-0.1, 0.035, 0).applyMatrix4(power.userData.inner.matrixWorld);
  const mid = a.clone().lerp(b, 0.5); mid.y -= 0.25;
  const c = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, 0.05, 0)), mid, b]);
  cable = new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.007, 8, false), cableMat);
  scene.add(cable);
}

/* ---------- guion: cámara y objetos por capítulo ---------- */
// Cámara: [posición], [mira a]
const CAM = [
  [[2.7, 1.55, 3.3], [0.05, 0.82, 0]],
  [[0.15, 1.2, 4.6], [0, 0.95, 0]],
  [[-3.1, 0.95, 1.5], [0.1, 0.68, 0]],
  [[1.9, 1.7, 3.6], [0.3, 1.08, 0.1]],
  [[0.42, 1.36, 1.32], [0.16, 1.27, 0.4]]
];
// Herramientas: por capítulo [x,y,z, rotX,rotY,rotZ, escala relativa]
const T = {
  pen:     [[-0.35, 1.38, 0.55, 0.3, 0.4, -1.1, 1], [0.78, 1.32, 0.25, 0.2, 0.2, -0.5, 1], [0.6, 1.1, 0.3, 0, 0, -0.4, 0], [-0.4, 1.32, 0.3, 0.2, 0.6, -1.25, 0.9], [0.12, 1.26, 0.4, 0.12, -0.25, 1.2, 0.85]],
  bottle1: [[0.62, 1.05, 0.62, 0.1, 0.3, 0.2, 1], [0.95, 0.66, 0.3, 0, 0.3, 0, 0], [0.6, 0.9, 0.3, 0, 0, 0, 0], [0.12, 1.02, 0.4, 0.15, 0.4, 0.1, 0.9], [0.4, 1.0, 0.3, 0, 0, 0, 0]],
  bottle2: [[0.9, 1.22, 0.35, -0.2, 0.8, -0.25, 1], [0.95, 0.66, 0.2, 0, 0.3, 0, 0], [0.6, 0.9, 0.3, 0, 0, 0, 0], [0.42, 1.12, 0.2, -0.1, 0.9, -0.15, 0.9], [0.4, 1.0, 0.3, 0, 0, 0, 0]],
  power:   [[0.95, 0.45, 0.95, 0, -0.5, 0, 1], [1.1, 0.45, 0.5, 0, -0.3, 0, 0], [1.1, 0.45, 0.5, 0, 0, 0, 0], [0.9, 0.98, 0.2, 0.5, -0.4, 0.1, 0.75], [0.9, 0.6, 0.4, 0, 0, 0, 0]],
  caps:    [[-0.95, 1.18, 0.35, 0.5, 0, 0.2, 1], [-0.9, 0.7, 0.3, 0, 0, 0, 0], [-0.9, 0.7, 0.3, 0, 0, 0, 0], [0.05, 1.5, 0.12, 0.7, 0, 0.1, 0.9], [-0.4, 1.0, 0.3, 0, 0, 0, 0]],
  carts:   [[-0.7, 0.98, 0.7, 0.4, 0.5, 0.5, 1], [-0.8, 0.7, 0.3, 0, 0, 0, 0], [-0.8, 0.7, 0.3, 0, 0, 0, 0], [0.62, 1.55, 0.05, 0.9, 0.4, 0.3, 0.9], [-0.4, 1.0, 0.3, 0, 0, 0, 0]]
};
const TOOL_KEYS = [["pen", pen], ["bottle1", bottle1], ["bottle2", bottle2], ["power", power], ["caps", caps], ["carts", carts]];
// aro: intensidad por capítulo; ángulo del respaldo por capítulo (se reclina en «el estudio»)
const RING = [0, 1, 0.35, 0.15, 0];
const BACK = [-0.55, -0.55, -0.32, -0.55, -0.55];

const smooth = (x) => x * x * (3 - 2 * x);
function lerpArr(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
function at(arr, c) {
  const i = Math.min(arr.length - 2, Math.floor(c)), t = smooth(Math.min(1, Math.max(0, c - i)));
  const A = arr[i], B = arr[i + 1];
  return Array.isArray(A) && Array.isArray(A[0]) ? A.map((v, k) => lerpArr(v, B[k], t)) : Array.isArray(A) ? lerpArr(A, B, t) : A + (B - A) * t;
}

/* ---------- encuadre: el sujeto a la derecha en pantallas anchas, arriba en móvil vertical ---------- */
let W = 1, H = 1, alejar = 1;
function resize() {
  const r = pin.getBoundingClientRect();
  W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  const wide = W / H > 1.15, tall = W / H < 0.8;
  alejar = tall ? 1.3 : W / H < 1.15 ? 1.12 : 1;
  camera.fov = tall ? 44 : W / H < 1.4 ? 36 : 30;
  let ox = wide ? -W * 0.16 : 0, oy = tall ? H * 0.17 : 0;
  if (POSTER !== null) ox = oy = 0;
  camera.setViewOffset(W, H, ox, oy, W, H);
  camera.updateProjectionMatrix();
  dirty = true;
}

/* ---------- capítulos (textos) ---------- */
const chs = [...sec.querySelectorAll(".xp-ch")];
const dots = [...sec.querySelectorAll(".xp-dots button")];
let chActual = -1;
const num = sec.querySelector(".xp-n b");
const R = document.documentElement;
const quieto = () => R.classList.contains("a11y-quieto");
function setCh(i) {
  if (i === chActual) return;
  chActual = i;
  chs.forEach((c, k) => { c.classList.toggle("on", k === i); c.setAttribute("aria-hidden", k === i ? "false" : "true"); c.inert = k !== i; });
  dots.forEach((d, k) => { d.classList.toggle("on", k === i); d.setAttribute("aria-current", k === i ? "step" : "false"); });
  if (num) num.textContent = String(i + 1).padStart(2, "0");
}

/* ---------- bucle ---------- */
let target = 0, cur = 0, visible = false, dirty = true, t0 = performance.now(), raf = 0, last = 0;
function progreso() {
  const r = sec.getBoundingClientRect();
  const total = r.height - innerHeight;
  return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
}
function aplicar(c, time) {
  const [cp0, ct] = at(CAM, c);
  const cp = cp0.map((v, i) => ct[i] + (v - ct[i]) * alejar);
  // leve deriva de cámara para que «respire»
  camera.position.set(cp[0] + Math.sin(time * 0.25) * 0.05, cp[1] + Math.sin(time * 0.31) * 0.03, cp[2]);
  camera.lookAt(ct[0], ct[1], ct[2]);
  for (const [k, obj] of TOOL_KEYS) {
    const v = at(T[k], c);
    const ph = k.length * 1.7;
    const bob = Math.sin(time * 1.1 + ph) * 0.012;
    obj.position.set(v[0], v[1] + bob * v[6], v[2]);
    obj.rotation.set(v[3] + Math.sin(time * 0.6 + ph) * 0.04, v[4], v[5] + Math.sin(time * 0.45 + ph) * 0.03);
    obj.userData.inner.rotation.y = time * (k === "pen" ? 0.5 : 0.25) + ph;
    const sc = (k === "power" ? S * 0.9 : S) * Math.max(0.0001, v[6]);
    obj.scale.setScalar(sc);
    obj.visible = v[6] > 0.02;
  }
  // aguja vibrando en el primer plano
  const nd = penM.userData.needle;
  nd.position.y = c > 3.4 ? Math.sin(time * 90) * 0.0015 * Math.min(1, (c - 3.4) * 2) : 0;
  // aro
  const ri = at(RING, c);
  ring.geometry.setDrawRange(0, Math.floor(RING_IDX * Math.min(1, ri * 1.15) / 6) * 6);
  ringHalo.visible = ring.visible = ri > 0.01;
  ringHalo.material.opacity = 0.16 * ri * (0.85 + 0.15 * Math.sin(time * 2.2));
  ringBack.material.opacity = 0.22 * ri;
  ringLight.intensity = 9 * ri;
  rim.intensity = 7 * (1 - ri * 0.5);
  backH.rotation.z = at(BACK, c);
  shadow.material.opacity = 0.85;
  pen.updateMatrixWorld(true); power.updateMatrixWorld(true);
  updateCable(Math.min(at(T.pen, c)[6], at(T.power, c)[6]));
  setCh(Math.min(N - 1, Math.round(c)));
}
function frame(now) {
  raf = 0;
  if (!visible || document.hidden || quieto()) return;
  target = progreso() * (N - 1);
  const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016); last = now;
  cur += (target - cur) * (1 - Math.exp(-dt * 5.5));
  if (Math.abs(target - cur) < 0.0005) cur = target;
  const time = (now - t0) / 1000;
  aplicar(cur, time);
  renderer.render(scene, camera);
  if (sec.classList.contains("xp-ld")) { sec.classList.remove("xp-ld"); sec.classList.add("xp-ok"); }
  raf = requestAnimationFrame(frame);
}
window.__xpCur = () => cur;
function arrancar() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } }

if (POSTER !== null) {
  // modo captura (genera las imágenes fijas para reloj y movimiento reducido)
  resize();
  aplicar(POSTER, 1.2);
  renderer.render(scene, camera);
  window.__xpReady = true;
} else {
  new ResizeObserver(resize).observe(pin);
  resize();
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; R.classList.toggle("xp-in", visible); if (visible) { cur = target = progreso() * (N - 1); arrancar(); } }, { rootMargin: "100px" }).observe(sec);
  document.addEventListener("visibilitychange", arrancar);
  addEventListener("scroll", arrancar, { passive: true });
  // si el visitante activa «Sin animaciones», se para la escena y los textos se muestran todos (versión fija)
  new MutationObserver(() => {
    if (quieto()) { chActual = -1; chs.forEach((c) => { c.inert = false; c.removeAttribute("aria-hidden"); c.classList.remove("on"); }); }
    else { chActual = -1; arrancar(); }
  }).observe(R, { attributes: true, attributeFilter: ["class"] });
  // los puntos llevan a cada capítulo
  dots.forEach((d, k) => d.addEventListener("click", () => {
    const r = sec.getBoundingClientRect(), total = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + total * (k / (N - 1)) + 2, behavior: "smooth" });
  }));
}

function mulberry(a) { return function () { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
