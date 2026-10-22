/* /demo/nacar/nails.js — Probador virtual de uñas · Nácar (demo Agencia JS)
   Dibuja uñas sobre una mano a partir de los 21 puntos de MediaPipe Hand Landmarker.
   - Manos de muestra: puntos precalculados (hands.json), sin descargar ningún modelo.
   - Foto propia y cámara en vivo: MediaPipe Tasks Vision alojado en /vendor (todo se procesa en el dispositivo). */

const TIPS = [4, 8, 12, 16, 20], DIPS = [3, 7, 11, 15, 19], PIPS = [2, 6, 10, 14, 18];

/* ---------- utilidades de color ---------- */
function hexToRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
function shade(h, k) { const [r, g, b] = hexToRgb(h); const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

/* ---------- forma de la uña en coordenadas locales (x: ancho, y: hacia la punta) ---------- */
function nailPath(ctx, shape, w, L) {
  const hw = w / 2, cu = w * 0.16; // curva de la cutícula
  ctx.beginPath();
  ctx.moveTo(-hw, cu);
  ctx.quadraticCurveTo(0, -cu * 0.6, hw, cu);
  switch (shape) {
    case "square": {
      const r = w * 0.12;
      ctx.lineTo(hw * 1.02, L - r); ctx.quadraticCurveTo(hw * 1.02, L, hw - r, L);
      ctx.lineTo(-hw + r, L); ctx.quadraticCurveTo(-hw * 1.02, L, -hw * 1.02, L - r);
      break;
    }
    case "squoval": {
      const r = w * 0.3;
      ctx.lineTo(hw, L - r); ctx.quadraticCurveTo(hw, L, hw - r, L);
      ctx.lineTo(-hw + r, L); ctx.quadraticCurveTo(-hw, L, -hw, L - r);
      break;
    }
    case "round": {
      const r = hw;
      ctx.lineTo(hw, L - r); ctx.bezierCurveTo(hw, L - r * 0.45, hw * 0.55, L, 0, L);
      ctx.bezierCurveTo(-hw * 0.55, L, -hw, L - r * 0.45, -hw, L - r);
      break;
    }
    case "almond": {
      const s = Math.max(cu * 2, L * 0.48);
      ctx.lineTo(hw, s); ctx.bezierCurveTo(hw, s + (L - s) * 0.55, hw * 0.35, L * 0.98, 0, L);
      ctx.bezierCurveTo(-hw * 0.35, L * 0.98, -hw, s + (L - s) * 0.55, -hw, s);
      break;
    }
    case "coffin": {
      const s = Math.max(cu * 2, L * 0.45), t = w * 0.26;
      ctx.lineTo(hw, s); ctx.lineTo(t, L - w * 0.03); ctx.quadraticCurveTo(t, L, t - w * 0.05, L);
      ctx.lineTo(-t + w * 0.05, L); ctx.quadraticCurveTo(-t, L, -t, L - w * 0.03); ctx.lineTo(-hw, s);
      break;
    }
    case "stiletto": {
      const s = Math.max(cu * 2, L * 0.32);
      ctx.lineTo(hw, s); ctx.bezierCurveTo(hw, s + (L - s) * 0.4, w * 0.08, L * 0.94, 0, L);
      ctx.bezierCurveTo(-w * 0.08, L * 0.94, -hw, s + (L - s) * 0.4, -hw, s);
      break;
    }
  }
  ctx.closePath();
}

/* ---------- pintura de cada acabado (ya recortado a la forma) ---------- */
function paintFinish(ctx, d, w, L, seed, natural) {
  const c = d.color, c2 = d.color2 || "#ffffff", R = rnd(seed);
  const fillAll = (s) => { ctx.fillStyle = s; ctx.fillRect(-w, -w, w * 2, L + w * 2); };
  switch (d.finish) {
    case "chrome": {
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, L * 0.12);
      g.addColorStop(0, shade(c, -0.55)); g.addColorStop(0.22, shade(c, 0.15)); g.addColorStop(0.36, "#ffffff");
      g.addColorStop(0.5, shade(c, -0.25)); g.addColorStop(0.68, shade(c, 0.45)); g.addColorStop(0.85, shade(c, -0.45)); g.addColorStop(1, shade(c, 0.2));
      fillAll(g); break;
    }
    case "cateye": {
      fillAll(shade(c, -0.35));
      const g = ctx.createLinearGradient(-w / 2, L * 0.56, w / 2, L * 0.44);
      g.addColorStop(0, rgba(c2, 0)); g.addColorStop(0.3, rgba(c2, 0.08)); g.addColorStop(0.5, rgba(c2, 0.7)); g.addColorStop(0.7, rgba(c2, 0.08)); g.addColorStop(1, rgba(c2, 0));
      ctx.fillStyle = g; ctx.fillRect(-w, -w, w * 2, L + w * 2);
      for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * w, y = L * (0.25 + R() * 0.5); ctx.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.5})`; ctx.fillRect(x, y, w * 0.025, w * 0.025); }
      break;
    }
    case "aura": {
      fillAll(c);
      const g = ctx.createRadialGradient(0, L * 0.5, 0, 0, L * 0.5, Math.max(w, L) * 0.5);
      g.addColorStop(0, rgba(c2, 1)); g.addColorStop(0.45, rgba(c2, 0.55)); g.addColorStop(1, rgba(c2, 0));
      ctx.fillStyle = g; ctx.fillRect(-w, -w, w * 2, L + w * 2); break;
    }
    case "syrup": {
      const g = ctx.createLinearGradient(0, 0, 0, L);
      g.addColorStop(0, rgba(c, 0.42)); g.addColorStop(1, rgba(c, 0.88));
      ctx.fillStyle = g; ctx.fillRect(-w, -w, w * 2, L + w * 2);
      ctx.fillStyle = rgba(c, 0.35); ctx.fillRect(-w, L * 0.55, w * 2, L);
      break;
    }
    case "french": {
      fillAll(rgba(c, 0.82));
      const t = L - Math.max(L * 0.22, d.ext * 0.9 + w * 0.12);
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-w, t + w * 0.12); ctx.quadraticCurveTo(0, t - w * 0.22, w, t + w * 0.12); ctx.lineTo(w, L + w); ctx.lineTo(-w, L + w); ctx.closePath(); ctx.fill();
      break;
    }
    case "dots": {
      fillAll(rgba(c, 0.9)); ctx.fillStyle = c2;
      const r = w * 0.09, step = w * 0.34;
      for (let y = w * 0.35, row = 0; y < L; y += step, row++) for (let x = -w / 2 + (row % 2 ? step / 2 : step / 4); x < w / 2; x += step) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      break;
    }
    case "stripes": {
      fillAll(c);
      const g = ctx.createLinearGradient(0, 0, 0, L); g.addColorStop(0, "#f4f4f4"); g.addColorStop(0.5, "#9a9a9a"); g.addColorStop(1, "#ffffff");
      ctx.fillStyle = g; for (let i = -1; i <= 1; i++) ctx.fillRect(i * w * 0.22 - w * 0.025, 0, w * 0.05, L);
      break;
    }
    case "glitter": {
      fillAll(c);
      for (let i = 0; i < 160; i++) { const x = (R() - 0.5) * w, y = R() * L, s = w * (0.02 + R() * 0.04); ctx.fillStyle = R() > 0.5 ? `rgba(255,255,255,${0.4 + R() * 0.6})` : rgba(c2, 0.9); ctx.fillRect(x, y, s, s); }
      break;
    }
    default: fillAll(c);
  }
}

function drawNail(ctx, P, i, d, scale) {
  const T = P[TIPS[i]], D = P[DIPS[i]], Pp = P[PIPS[i]];
  let vx = T[0] - D[0], vy = T[1] - D[1];
  const seg = Math.hypot(vx, vy); if (seg < 2) return;
  vx /= seg; vy /= seg;
  const thumb = i === 0;
  const phal = Math.max(seg, Math.hypot(D[0] - Pp[0], D[1] - Pp[1]) * (thumb ? 0.9 : 0.75));
  const w = phal * (thumb ? 0.6 : 0.54) * (d.width || 1);
  const start = thumb ? 0.24 : 0.32;              // cutícula entre DIP y la punta
  const reach = (d.reach || 0) * seg;
  const Cx = D[0] + (T[0] - D[0]) * start + vx * reach, Cy = D[1] + (T[1] - D[1]) * start + vy * reach;
  const natural = seg * (1 - start) + phal * (thumb ? 0.1 : 0.16);
  const ext = phal * d.length;                       // borde libre extra
  const L = natural + ext;
  ctx.save();
  ctx.translate(Cx, Cy);
  ctx.rotate(Math.atan2(vy, vx) - Math.PI / 2);
  // sombra y relieve
  ctx.save(); nailPath(ctx, d.shape, w, L); ctx.shadowColor = "rgba(40,20,20,.35)"; ctx.shadowBlur = 6 * scale; ctx.shadowOffsetY = 2 * scale; ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fill(); ctx.restore();
  ctx.save(); nailPath(ctx, d.shape, w, L); ctx.clip();
  paintFinish(ctx, { ...d, ext }, w, L, i * 97 + 13, natural);
  // volumen: oscurece laterales
  const side = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  side.addColorStop(0, "rgba(0,0,0,.28)"); side.addColorStop(0.18, "rgba(0,0,0,0)"); side.addColorStop(0.82, "rgba(0,0,0,0)"); side.addColorStop(1, "rgba(0,0,0,.3)");
  ctx.fillStyle = side; ctx.fillRect(-w, -w, w * 2, L + w * 2);
  if (d.finish !== "matte") {
    const hl = ctx.createLinearGradient(-w * 0.3, 0, -w * 0.05, 0);
    hl.addColorStop(0, "rgba(255,255,255,0)"); hl.addColorStop(0.5, `rgba(255,255,255,${d.finish === "chrome" ? 0.75 : 0.55})`); hl.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hl; ctx.beginPath(); ctx.ellipse(-w * 0.18, L * 0.45, w * 0.08, L * 0.32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(w * 0.2, L * 0.2, w * 0.05, L * 0.08, 0, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(-w, -w, w * 2, L + w * 2);
  }
  ctx.restore();
  // borde fino
  nailPath(ctx, d.shape, w, L); ctx.lineWidth = Math.max(0.6, 0.9 * scale); ctx.strokeStyle = "rgba(60,30,30,.35)"; ctx.stroke();
  ctx.restore();
}

/** Dibuja las 5 uñas. pts = 21 puntos en píxeles del canvas. */
export function drawHand(ctx, pts, design, scale = 1) {
  if (!pts || pts.length < 21) return;
  for (let i = 0; i < 5; i++) drawNail(ctx, pts, i, design, scale);
}

/* ---------- MediaPipe bajo demanda ---------- */
let landmarkerPromise = null;
export function loadLandmarker(mode = "IMAGE") {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const base = new URL("./vendor/", import.meta.url).href;
      const { FilesetResolver, HandLandmarker } = await import(base + "vision_bundle.mjs");
      const files = { wasmLoaderPath: base + "wasm/vision_wasm_internal.js", wasmBinaryPath: base + "wasm/vision_wasm_internal.wasm" };
      const lm = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: base + "hand_landmarker.task", delegate: "GPU" },
        runningMode: mode, numHands: 2, minHandDetectionConfidence: 0.4, minTrackingConfidence: 0.4
      });
      lm._mode = mode;
      return lm;
    })().catch(e => { landmarkerPromise = null; throw e; });
  }
  return landmarkerPromise;
}
export async function setMode(lm, mode) { if (lm._mode !== mode) { await lm.setOptions({ runningMode: mode }); lm._mode = mode; } }
