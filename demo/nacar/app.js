// /demo/nacar/app.js — Nácar Nail Atelier (demo Agencia JS)
import { drawHand, loadLandmarker, setMode } from "./nails.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const eur = n => n.toLocaleString("es-ES", { maximumFractionDigits: 0 }) + " €";
let toastT; function toast(t) { const n = $("#toast"); n.textContent = t; n.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => n.classList.remove("on"), 2800); }
const WA = "34688933308";

/* =================== DATOS =================== */
const SHAPES = [
  ["square", "Cuadrada", "M5 4h10v15H5z"], ["squoval", "Squoval", "M5 4h10v12q0 3-3 3H8q-3 0-3-3z"],
  ["round", "Redonda", "M5 4h10v10a5 5 0 0 1-10 0z"], ["almond", "Almendra", "M5 4h10v7q0 7-5 11q-5-4-5-11z"],
  ["coffin", "Coffin", "M5 4h10v8l-2.5 9h-5L5 12z"], ["stiletto", "Stiletto", "M5 4h10v5q0 6-5 14q-5-8-5-14z"]];
const FINS = [["glossy", "Brillo"], ["matte", "Mate"], ["chrome", "Cromo"], ["cateye", "Cat eye"], ["aura", "Aura"], ["syrup", "Syrup"], ["french", "French"], ["dots", "Lunares"], ["stripes", "Rayas cromo"], ["glitter", "Glitter"]];
const NEEDS2 = { cateye: 1, aura: 1, french: 1, dots: 1, glitter: 1 };
const COLS = [["Perla", "#d9d4dc"], ["Plata", "#c9c9d1"], ["Oro", "#d4af37"], ["Tomato red", "#d2381f"], ["Burdeos", "#5a1a24"], ["Chocolate", "#4a2c21"], ["Mushroom", "#a08f80"], ["Khaki", "#8a8a5c"], ["Milky", "#f4d7d4"], ["Nude", "#e3bfa6"], ["Lila", "#c7b2e6"], ["Rosa", "#f7c6d9"], ["Negro", "#151214"], ["Ámbar", "#b8621b"]];
const COLS2 = [["Blanco", "#ffffff"], ["Oro claro", "#e7cf8c"], ["Lila", "#b48ce8"], ["Negro", "#1c1715"], ["Melocotón", "#f3c6a8"], ["Plata", "#dcdcdc"]];
const LENS = [[0.08, "Natural"], [0.28, "Corto"], [0.55, "Medio"], [0.8, "Largo"], [2, "XL"]];
const REACH = { "mano-clara": 0.3 };

const TRENDS = [
  { id: "gold", n: "Molten chrome", d: "Cromo líquido en oro o plata, del toque sutil al efecto espejo total.", img: "t-gold", vid: "gold", p: { shape: "almond", length: 0.75, finish: "chrome", color: "#d4af37", color2: "#ffffff" } },
  { id: "aura", n: "Aura nails 2.0", d: "Tres tonos fundidos en un halo luminoso en el centro de la uña.", img: "t-aura", p: { shape: "almond", length: 0.6, finish: "aura", color: "#f7c6d9", color2: "#b48ce8" } },
  { id: "cateye", n: "Liquid cat eye", d: "Partículas magnéticas que crean una franja de luz que se mueve.", img: "t-cateye", p: { shape: "round", length: 0.45, finish: "cateye", color: "#5a1a24", color2: "#f3c6a8" } },
  { id: "syrup", n: "Syrup nails", d: "Ámbar translúcido como el sirope, perfecto con detalles en oro.", img: "t-syrup", p: { shape: "squoval", length: 0.25, finish: "syrup", color: "#b8621b", color2: "#e7cf8c" } },
  { id: "tomato", n: "Tomato red corto", d: "El rojo con matiz anaranjado en uñas cortas y pulidas.", img: "t-tomato", p: { shape: "squoval", length: 0.04, finish: "glossy", color: "#d2381f", color2: "#ffffff" } },
  { id: "earth", n: "Earth tones", d: "Mushroom, khaki y topo: neutros con mucha personalidad.", img: "t-earth", p: { shape: "square", length: 0.12, finish: "glossy", color: "#a08f80", color2: "#ffffff" } },
  { id: "french", n: "Micro french", d: "Base lechosa y una línea blanca finísima. Elegancia que no cansa.", img: "t-french", p: { shape: "almond", length: 0.5, finish: "french", color: "#f4d7d4", color2: "#ffffff" } },
  { id: "dots", n: "Polka dots", d: "Lunares mínimos sobre nude: juego y estilo a partes iguales.", img: "t-dots", p: { shape: "round", length: 0.12, finish: "dots", color: "#e3bfa6", color2: "#1c1715" } },
  { id: "stripes", n: "Black chrome", d: "Negro profundo con líneas de cromo: gráfico y moderno.", img: "t-stripes", p: { shape: "almond", length: 0.55, finish: "stripes", color: "#151214", color2: "#dcdcdc" } },
  { id: "plaid", n: "Tailored plaid", d: "Cuadros de sastrería en camel y chocolate. En el probador, su base caramelo.", img: "t-plaid", p: { shape: "square", length: 0.12, finish: "matte", color: "#a0714a", color2: "#ffffff" } }];

const SVC = [
  { c: "Manicura", id: "semi", n: "Manicura semipermanente", d: "Limado, cutículas y esmalte en gel con acabado espejo.", p: 35, t: 60 },
  { c: "Manicura", id: "rubber", n: "Manicura rusa + rubber base", d: "Cutícula impecable y base niveladora que refuerza tu uña natural.", p: 42, t: 75 },
  { c: "Manicura", id: "spa", n: "Manicura spa sin esmalte", d: "Exfoliación, mascarilla, masaje y aceite de cutículas.", p: 25, t: 40 },
  { c: "Extensiones", id: "gel", n: "Extensiones de gel esculpidas", d: "Largo y forma a medida, construidas a mano.", p: 55, t: 100 },
  { c: "Extensiones", id: "relleno", n: "Relleno de gel", d: "Mantenimiento de tus extensiones cada 3-4 semanas.", p: 45, t: 80 },
  { c: "Extensiones", id: "softgel", n: "Soft gel (tips completos)", d: "Largo instantáneo, ligero y flexible.", p: 50, t: 80 },
  { c: "Nail art", id: "chrome", n: "Cromo o cat eye", d: "Efecto espejo, aurora o franja magnética en todas las uñas.", p: 8, t: 10 },
  { c: "Nail art", id: "artfino", n: "Nail art fino", d: "French, lunares, líneas o detalle en oro.", p: 10, t: 15 },
  { c: "Nail art", id: "aura", n: "Aura / degradado", d: "Halo de color fundido a aerógrafo y pincel.", p: 12, t: 20 },
  { c: "Nail art", id: "artfull", n: "Nail art completo", d: "Diseño de autora en todas las uñas.", p: 18, t: 30 },
  { c: "Pedicura", id: "pedispa", n: "Pedicura spa con esmalte", d: "Baño de pétalos, exfoliación, masaje y semipermanente.", p: 45, t: 60 },
  { c: "Pedicura", id: "pedisemi", n: "Pedicura semipermanente", d: "Cuidado completo y color que dura semanas.", p: 38, t: 50 },
  { c: "Cuidado", id: "retirada", n: "Retirada cuidadosa de gel", d: "Sin limar en exceso tu uña natural.", p: 12, t: 20 },
  { c: "Cuidado", id: "fuerte", n: "Tratamiento fortalecedor", d: "Para uñas finas o que se abren en capas.", p: 15, t: 20 }];
const SVCMAP = Object.fromEntries(SVC.map(s => [s.id, s]));
const ARTISTS = [["lucia", "Lucía", "Nail art fino y cromos"], ["irene", "Irene", "Extensiones esculpidas"], ["sara", "Sara", "Pedicura spa"], ["any", "Cualquiera", "La primera disponible"]];

/* =================== PROBADOR =================== */
const D = { shape: "almond", length: 0.45, finish: "chrome", color: "#d9d4dc", color2: "#ffffff" };
let HANDS = null, hand = "mano-media", mode = "sample", peek = false;
const imgs = {}; let photo = null, photoPts = [], camStream = null, facing = "environment", raf = 0, smooth = [];
const cv = $("#cv"), ctx = cv.getContext("2d"), stage = $("#stage"), cam = $("#cam");

function fitCanvas() { const r = stage.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
function cover(sw, sh) { const s = Math.max(cv.width / sw, cv.height / sh); return { s, ox: (cv.width - sw * s) / 2, oy: (cv.height - sh * s) / 2 }; }
const designFor = h => ({ ...D, reach: REACH[h] || 0 });

async function loadImg(src) { if (imgs[src]) return imgs[src]; const im = new Image(); im.src = src; await im.decode(); imgs[src] = im; return im; }
async function render() {
  if (mode === "cam") return;
  fitCanvas();
  let im, pts;
  if (mode === "sample") {
    im = await loadImg(`img/${hand}.webp`);
    if (!HANDS) HANDS = await (await fetch("hands.json")).json();
    pts = [HANDS[hand]];
  } else if (photo) { im = photo; pts = photoPts; }
  else { ctx.fillStyle = "#e9e0d6"; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  const { s, ox, oy } = cover(im.naturalWidth || im.width, im.naturalHeight || im.height);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(im, ox, oy, (im.naturalWidth || im.width) * s, (im.naturalHeight || im.height) * s);
  if (peek) return;
  const W = (im.naturalWidth || im.width) * s, H = (im.naturalHeight || im.height) * s;
  for (const p of pts) drawHand(ctx, p.map(q => [ox + q[0] * W, oy + q[1] * H]), designFor(mode === "sample" ? hand : ""), cv.width / 700);
}

function msg(t) { const m = $("#stageMsg"); m.textContent = t || ""; m.classList.toggle("on", !!t); }
function setModeUI(m) {
  mode = m;
  $$("[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
  $("#skins").hidden = m !== "sample"; $("#flip").hidden = m !== "cam";
  $("#stageBadge").textContent = m === "sample" ? "Mano de muestra" : m === "photo" ? "Tu foto · IA en tu dispositivo" : "Cámara en vivo · IA en tu dispositivo";
  if (m !== "cam") stopCam();
  msg("");
}
$$("[data-mode]").forEach(b => b.addEventListener("click", async () => {
  const m = b.dataset.mode;
  if (m === "photo") { setModeUI("photo"); if (!photo) { msg("Elige una foto del dorso de tu mano, con los dedos estirados y buena luz."); $("#file").click(); } else render(); return; }
  if (m === "cam") { setModeUI("cam"); startCam(); return; }
  setModeUI("sample"); render();
}));
$$("#skins button").forEach(b => b.addEventListener("click", () => { hand = b.dataset.h; $$("#skins button").forEach(x => x.setAttribute("aria-pressed", x === b)); render(); }));

$("#file").addEventListener("change", async e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  if (!/^image\//.test(f.type) || f.size > 15e6) { msg("Ese archivo no parece una imagen válida (máx. 15 MB)."); return; }
  const im = new Image(); im.src = URL.createObjectURL(f); await im.decode();
  photo = im; photoPts = []; stage.classList.add("scanning"); msg("Buscando tu mano… (la primera vez tarda unos segundos)");
  render();
  try {
    const lm = await loadLandmarker("IMAGE"); await setMode(lm, "IMAGE");
    const r = lm.detect(im);
    photoPts = (r.landmarks || []).map(h => h.map(p => [p.x, p.y]));
    msg(photoPts.length ? "" : "No encontramos la mano. Prueba con el dorso de la mano, dedos separados y fondo liso.");
  } catch (err) { msg("Tu navegador no ha podido cargar la IA. Prueba con Chrome o Safari actualizados."); }
  stage.classList.remove("scanning"); render(); e.target.value = "";
});

async function startCam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg("Tu navegador no permite usar la cámara aquí."); return; }
  stage.classList.add("scanning"); msg("Preparando la cámara y la IA…");
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    cam.srcObject = camStream; await cam.play();
    const lm = await loadLandmarker("VIDEO"); await setMode(lm, "VIDEO");
    stage.classList.remove("scanning"); msg("Pon la mano con las uñas hacia la cámara y los dedos separados ✋");
    setTimeout(() => mode === "cam" && msg(""), 4000);
    let last = -1;
    const loop = () => {
      if (mode !== "cam" || !camStream) return;
      fitCanvas();
      const vw = cam.videoWidth, vh = cam.videoHeight;
      if (vw) {
        const { s, ox, oy } = cover(vw, vh), mirror = facing === "user";
        ctx.save(); if (mirror) { ctx.translate(cv.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(cam, ox, oy, vw * s, vh * s); ctx.restore();
        if (cam.currentTime !== last) {
          last = cam.currentTime;
          const r = lm.detectForVideo(cam, performance.now());
          const hands = (r.landmarks || []).map(h => h.map(p => [mirror ? 1 - p.x : p.x, p.y]));
          smooth = hands.map((h, i) => h.map((p, j) => { const o = smooth[i] && smooth[i][j]; return o ? [o[0] * 0.55 + p[0] * 0.45, o[1] * 0.55 + p[1] * 0.45] : p; }));
        }
        if (!peek) for (const h of smooth) drawHand(ctx, h.map(q => [ox + q[0] * vw * s, oy + q[1] * vh * s]), D, cv.width / 700);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
  } catch (err) {
    stage.classList.remove("scanning");
    msg(err && err.name === "NotAllowedError" ? "Necesitamos permiso para usar la cámara. Puedes usar «Mi foto» en su lugar." : "No hemos podido abrir la cámara. Prueba con «Mi foto».");
  }
}
function stopCam() { cancelAnimationFrame(raf); if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; smooth = []; stage.classList.remove("scanning"); }
$("#flip").addEventListener("click", () => { facing = facing === "user" ? "environment" : "user"; stopCam(); startCam(); });
const peekOn = e => { e.preventDefault(); peek = true; render(); }, peekOff = () => { if (!peek) return; peek = false; render(); };
$("#peek").addEventListener("pointerdown", peekOn); ["pointerup", "pointerleave", "pointercancel"].forEach(ev => $("#peek").addEventListener(ev, peekOff));
$("#peek").addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") peekOn(e); }); $("#peek").addEventListener("keyup", peekOff);

/* controles */
function lenName(v) { return LENS.find(l => v <= l[0])[1]; }
function svcFor(d) {
  const ids = [d.length < 0.15 ? (d.finish === "matte" || d.finish === "glossy" ? "semi" : "rubber") : "gel"];
  if (d.finish === "chrome" || d.finish === "cateye") ids.push("chrome");
  else if (d.finish === "aura") ids.push("aura");
  else if (["french", "dots", "stripes", "glitter"].includes(d.finish)) ids.push("artfino");
  return ids;
}
function designName(d) { return `${(FINS.find(f => f[0] === d.finish) || [, ""])[1]} ${(COLS.find(c => c[1] === d.color) || ["a medida"])[0].toLowerCase()} · ${(SHAPES.find(s => s[0] === d.shape) || [, ""])[1].toLowerCase()} ${lenName(d.length).toLowerCase()}`; }
function updateUI() {
  $$("#shapes .opt").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === D.shape));
  $$("#fins .opt").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === D.finish));
  $$("#cols button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === D.color));
  $$("#cols2 button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === D.color2));
  $("#len").value = D.length;
  $("#lbShape").textContent = SHAPES.find(s => s[0] === D.shape)[1];
  $("#lbLen").textContent = lenName(D.length);
  $("#lbFin").textContent = FINS.find(f => f[0] === D.finish)[1];
  $("#lbCol").textContent = (COLS.find(c => c[1] === D.color) || ["A medida"])[0];
  $("#lbCol2").textContent = (COLS2.find(c => c[1] === D.color2) || ["A medida"])[0];
  $("#grp2").hidden = !NEEDS2[D.finish];
  const ids = svcFor(D), t = ids.reduce((a, i) => a + SVCMAP[i].t, 0), p = ids.reduce((a, i) => a + SVCMAP[i].p, 0);
  $("#dName").textContent = designName(D).replace(/^./, c => c.toUpperCase());
  $("#dSvc").textContent = ids.map(i => SVCMAP[i].n).join(" + ");
  $("#dTime").textContent = `⏱ ${t} min`; $("#dPrice").textContent = `desde ${eur(p)}`;
  render();
}
$("#shapes").innerHTML = SHAPES.map(s => `<button type="button" class="opt" data-v="${s[0]}" aria-pressed="false"><svg viewBox="0 0 20 24" aria-hidden="true"><path d="${s[2]}" fill="currentColor" opacity=".85"/></svg>${s[1]}</button>`).join("");
$("#fins").innerHTML = FINS.map(f => `<button type="button" class="opt" data-v="${f[0]}" aria-pressed="false">${f[1]}</button>`).join("");
$("#cols").innerHTML = COLS.map(c => `<button type="button" data-v="${c[1]}" style="background:${c[1]}" aria-label="${c[0]}" title="${c[0]}" aria-pressed="false"></button>`).join("") + `<label title="Color a medida"><input type="color" id="cpick" value="#c0272d" aria-label="Elegir color a medida"></label>`;
$("#cols2").innerHTML = COLS2.map(c => `<button type="button" data-v="${c[1]}" style="background:${c[1]}" aria-label="${c[0]}" title="${c[0]}" aria-pressed="false"></button>`).join("");
$("#shapes").addEventListener("click", e => { const b = e.target.closest(".opt"); if (b) { D.shape = b.dataset.v; updateUI(); } });
$("#fins").addEventListener("click", e => { const b = e.target.closest(".opt"); if (b) { D.finish = b.dataset.v; updateUI(); } });
$("#cols").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { D.color = b.dataset.v; updateUI(); } });
$("#cols2").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { D.color2 = b.dataset.v; updateUI(); } });
$("#cpick").addEventListener("input", e => { D.color = e.target.value; updateUI(); });
$("#len").addEventListener("input", e => { D.length = +e.target.value; updateUI(); });
addEventListener("resize", () => { clearTimeout(window.__rt); window.__rt = setTimeout(render, 120); });

function applyPreset(p, scroll) { Object.assign(D, p); updateUI(); if (scroll) $("#probador").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); toast("✦ Diseño cargado en el probador"); }

$("#dl").addEventListener("click", () => {
  const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const x = c.getContext("2d");
  x.drawImage(cv, 0, 0); x.fillStyle = "rgba(28,23,21,.72)"; x.fillRect(0, c.height - 56, c.width, 56);
  x.fillStyle = "#fff"; x.font = `600 ${Math.round(c.width / 26)}px Georgia, serif`; x.fillText("NÁCAR · " + designName(D), 20, c.height - 20);
  c.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "mi-diseno-nacar.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
});
$("#share").addEventListener("click", async () => {
  const text = `Mira el diseño que me he probado en Nácar: ${designName(D)}`;
  if (navigator.share) { try { await navigator.share({ title: "Mi diseño Nácar", text, url: location.href.split("#")[0] + "#probador" }); return; } catch (e) { return; } }
  window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + location.href.split("#")[0] + "#probador"), "_blank", "noopener");
});
$("#bookDesign").addEventListener("click", () => { BK.design = { ...D }; BK.sel = new Set(svcFor(D)); BK.step = 1; drawBook(); drawSvc(); $("#reserva").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); toast("Diseño añadido a tu reserva"); });

/* =================== TENDENCIAS =================== */
$("#trk").innerHTML = TRENDS.map((t, i) => `<article class="tc" role="listitem"><div class="im"><span class="n">${String(i + 1).padStart(2, "0")}</span><img src="img/${t.img}.webp" alt="${esc(t.n)}" loading="lazy" width="800" height="800"></div><div class="bd"><h3>${esc(t.n)}</h3><p>${esc(t.d)}</p><button type="button" class="btn btn-ink" data-t="${t.id}">✦ Pruébalo</button></div></article>`).join("");
$("#trk").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (b) applyPreset(TRENDS.find(t => t.id === b.dataset.t).p, true); });

/* =================== ASESORA =================== */
const Q = [
  { q: "¿Para qué ocasión?", o: [["dia", "Día a día", "Cómodas y que duren"], ["evento", "Evento especial", "Boda, cena, fiesta"], ["vacas", "Vacaciones", "Color y alegría"], ["ofi", "Trabajo", "Pulidas y discretas"]] },
  { q: "¿Cómo es tu estilo?", o: [["min", "Minimal", "Menos es más"], ["glam", "Glam", "Que brillen"], ["rom", "Romántico", "Suave y femenino"], ["edgy", "Atrevido", "Diferente"]] },
  { q: "¿Qué largo te resulta cómodo?", o: [["corto", "Corto", "Natural, práctico"], ["medio", "Medio", "Equilibrado"], ["largo", "Largo", "Me encanta lucirlas"]] },
  { q: "Tu tono de piel, para tu mano de muestra", o: [["mano-clara", "Clara", ""], ["mano-media", "Media", ""], ["mano-oscura", "Oscura", ""]] }];
let qa = [];
function score(a) {
  const s = {}; const add = (k, v) => s[k] = (s[k] || 0) + v;
  const [oc, st, ln] = a;
  ({ dia: () => { add("earth", 2); add("tomato", 2); add("syrup", 1); }, evento: () => { add("gold", 3); add("cateye", 2); add("french", 1); }, vacas: () => { add("aura", 3); add("dots", 2); add("syrup", 1); }, ofi: () => { add("french", 3); add("earth", 2); add("tomato", 1); } })[oc]();
  ({ min: () => { add("french", 3); add("earth", 2); add("dots", 1); }, glam: () => { add("gold", 3); add("stripes", 2); add("cateye", 1); }, rom: () => { add("aura", 3); add("french", 2); add("syrup", 1); }, edgy: () => { add("stripes", 3); add("cateye", 2); add("plaid", 2); } })[st]();
  const best = Object.entries(s).sort((x, y) => y[1] - x[1])[0][0];
  const t = TRENDS.find(x => x.id === best); const p = { ...t.p };
  p.length = ln === "corto" ? Math.min(p.length, 0.1) : ln === "medio" ? 0.45 : Math.max(p.length, 0.75);
  if (ln === "largo" && p.shape === "squoval") p.shape = "almond";
  return { t, p };
}
function drawQuiz() {
  const box = $("#qbox"), i = qa.length;
  if (i < Q.length) {
    box.innerHTML = `<div class="prog"><i style="width:${(i / Q.length) * 100}%"></i></div><p class="kick">Pregunta ${i + 1} de ${Q.length}</p><h3>${Q[i].q}</h3><div class="qopts">${Q[i].o.map(o => `<button type="button" data-a="${o[0]}">${o[1]}${o[2] ? `<small>${o[2]}</small>` : ""}</button>`).join("")}</div>`;
    return;
  }
  const { t, p } = score(qa), ids = svcFor(p);
  hand = qa[3]; $$("#skins button").forEach(x => x.setAttribute("aria-pressed", x.dataset.h === hand));
  box.innerHTML = `<div class="prog"><i style="width:100%"></i></div><p class="kick">Tu diseño ideal</p><div class="qres"><img src="img/${t.img}.webp" alt=""><div><h3 style="margin:0">${esc(t.n)}</h3><div class="tags"><span class="tag">${SHAPES.find(s => s[0] === p.shape)[1]}</span><span class="tag">${lenName(p.length)}</span><span class="tag">${ids.reduce((a, x) => a + SVCMAP[x].t, 0)} min</span></div><p style="color:var(--mute);font-size:14px">${esc(t.d)}</p></div></div><div class="acts"><button type="button" class="btn btn-ink" id="qTry">✦ Probármelo</button><button type="button" class="btn btn-ghost" id="qBook">Reservarlo</button><button type="button" class="btn btn-ghost full" id="qAgain" style="min-height:42px">Repetir el test</button></div>`;
  $("#qTry").onclick = () => { setModeUI("sample"); applyPreset(p, true); };
  $("#qBook").onclick = () => { Object.assign(D, p); updateUI(); $("#bookDesign").click(); };
  $("#qAgain").onclick = () => { qa = []; drawQuiz(); };
}
$("#qbox").addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b) { qa.push(b.dataset.a); drawQuiz(); } });
drawQuiz();

/* =================== SERVICIOS =================== */
const CATS = [...new Set(SVC.map(s => s.c))]; let svCat = CATS[0];
function drawSvc() {
  $("#svTabs").innerHTML = CATS.map(c => `<button type="button" class="opt" data-c="${c}" aria-pressed="${c === svCat}">${c}</button>`).join("");
  $("#svList").innerHTML = SVC.filter(s => s.c === svCat).map(s => `<div class="sv${BK.sel.has(s.id) ? " on" : ""}"><h3>${esc(s.n)}</h3><span class="pr">${s.c === "Nail art" ? "+" : ""}${s.p} €</span><p>${esc(s.d)}</p><div class="meta"><small>⏱ ${s.t} min</small><button type="button" class="add" data-s="${s.id}">${BK.sel.has(s.id) ? "✓ Añadido" : "+ Añadir"}</button></div></div>`).join("");
  const n = BK.sel.size; $("#svBar").classList.toggle("on", n > 0);
  $("#svBarTxt").textContent = n ? `${n} servicio${n > 1 ? "s" : ""} · ${tot().t} min · ${eur(tot().p)}` : "";
}
$("#svTabs").addEventListener("click", e => { const b = e.target.closest("[data-c]"); if (b) { svCat = b.dataset.c; drawSvc(); } });
$("#svList").addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (!b) return; const id = b.dataset.s; BK.sel.has(id) ? BK.sel.delete(id) : BK.sel.add(id); drawSvc(); drawBook(); });

/* =================== RESERVA =================== */
const BK = { step: 1, sel: new Set(), design: null, artist: "any", date: null, time: null, month: null, data: {}, pm: "card" };
function tot() { let t = 0, p = 0; BK.sel.forEach(i => { t += SVCMAP[i].t; p += SVCMAP[i].p; }); return { t, p }; }
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DOW = ["L", "M", "X", "J", "V", "S", "D"], MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function hsh(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function slots(dateIso) {
  const dur = Math.max(30, tot().t || 60), out = [];
  for (let m = 600; m + dur <= 1230; m += 30) {
    const busy = (hsh(dateIso + m + BK.artist) % 5) === 0;
    const now = new Date(); const past = dateIso === iso(now) && m <= now.getHours() * 60 + now.getMinutes() + 60;
    out.push([`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, busy || past]);
  }
  return out;
}
function sideUI() {
  const L = [...BK.sel].map(i => `<div class="ln"><span>${esc(SVCMAP[i].n)}</span><span>${SVCMAP[i].p} €</span></div>`).join("") || `<p style="color:#b9aea6;font-size:14px">Aún no has elegido servicios.</p>`;
  const extra = [];
  if (BK.artist !== "any") extra.push(`<div class="ln"><span>Artista</span><span>${ARTISTS.find(a => a[0] === BK.artist)[1]}</span></div>`);
  if (BK.date) extra.push(`<div class="ln"><span>Fecha</span><span>${new Date(BK.date + "T12:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}${BK.time ? " · " + BK.time : ""}</span></div>`);
  $("#sideList").innerHTML = L + extra.join("");
  $("#sideTot").textContent = `${eur(tot().p)} · ${tot().t} min`;
  $("#sideDz").hidden = !BK.design;
  if (BK.design) { $("#sideDzTxt").textContent = "Diseño: " + designName(BK.design); thumbDesign($("#sideCv"), BK.design); }
}
async function thumbDesign(c, d) {
  const x = c.getContext("2d"), im = await loadImg(`img/${hand}.webp`); if (!HANDS) HANDS = await (await fetch("hands.json")).json();
  const s = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight), ox = (c.width - im.naturalWidth * s) / 2, oy = (c.height - im.naturalHeight * s) / 2;
  x.drawImage(im, ox, oy, im.naturalWidth * s, im.naturalHeight * s);
  drawHand(x, HANDS[hand].map(q => [ox + q[0] * im.naturalWidth * s, oy + q[1] * im.naturalHeight * s]), { ...d, reach: REACH[hand] || 0 }, 0.3);
}
function drawBook() {
  const b = $("#bkbox"), S = BK.step;
  const bar = `<div class="steps" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= S ? "on" : ""}"></i>`).join("")}</div>`;
  let h = "";
  if (S === 1) h = `<h3>1 · ¿Qué te hacemos?</h3><div class="bko">${SVC.filter(s => s.c !== "Nail art" || true).map(s => `<button type="button" data-sv="${s.id}" aria-pressed="${BK.sel.has(s.id)}">${esc(s.n)}<small>${s.p} € · ${s.t} min</small></button>`).join("")}</div>`;
  if (S === 2) h = `<h3>2 · ¿Con quién?</h3><div class="bko">${ARTISTS.map(a => `<button type="button" data-ar="${a[0]}" aria-pressed="${BK.artist === a[0]}">${a[1]}<small>${a[2]}</small></button>`).join("")}</div>`;
  if (S === 3) {
    const today = new Date(); today.setHours(0, 0, 0, 0); const m = BK.month || new Date(today.getFullYear(), today.getMonth(), 1); BK.month = m;
    const first = (m.getDay() + 6) % 7, days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), limit = new Date(today); limit.setDate(limit.getDate() + 45);
    let cal = DOW.map(d => `<span class="dh">${d}</span>`).join("") + "<span></span>".repeat(first);
    for (let d = 1; d <= days; d++) { const dt = new Date(m.getFullYear(), m.getMonth(), d), k = iso(dt), dis = dt < today || dt > limit || dt.getDay() === 0; cal += `<button type="button" data-d="${k}" ${dis ? "disabled" : ""} aria-pressed="${BK.date === k}" aria-label="${d} de ${MES[m.getMonth()]}">${d}</button>`; }
    h = `<h3>3 · Día y hora</h3><div class="calh"><button type="button" data-mo="-1" aria-label="Mes anterior">‹</button><span>${MES[m.getMonth()]} ${m.getFullYear()}</span><button type="button" data-mo="1" aria-label="Mes siguiente">›</button></div><div class="cal">${cal}</div>${BK.date ? `<div class="slots">${slots(BK.date).map(s => `<button type="button" data-h="${s[0]}" ${s[1] ? "disabled" : ""} aria-pressed="${BK.time === s[0]}">${s[0]}</button>`).join("")}</div>` : `<p style="color:#b9aea6;margin-top:12px;font-size:14px">Elige un día para ver las horas libres. Domingos cerrado.</p>`}`;
  }
  if (S === 4) h = `<h3>4 · Tus datos</h3><form id="bf" novalidate><div class="fld"><label for="bn">Nombre</label><input id="bn" autocomplete="name" maxlength="50" value="${esc(BK.data.n || "")}"></div><div class="fld"><label for="bp">Móvil</label><input id="bp" type="tel" autocomplete="tel" maxlength="20" value="${esc(BK.data.p || "")}"></div><div class="fld"><label for="be">Correo</label><input id="be" type="email" autocomplete="email" maxlength="80" value="${esc(BK.data.e || "")}"></div><div class="fld"><label for="bo">Notas (alergias, uña dañada, diseño…)</label><textarea id="bo" rows="2" maxlength="300">${esc(BK.data.o || "")}</textarea></div><label class="ck"><input type="checkbox" id="br" checked>Recordatorio por WhatsApp 24 h antes</label><label class="ck"><input type="checkbox" id="bl">Acepto la política de privacidad (demo)</label><p id="berr" style="color:#ffb4a8;font-size:13px" role="alert"></p></form>`;
  if (S === 5) h = `<h3>5 · Confirma con la señal</h3><p style="color:#b9aea6">Pagas 10 € ahora y el resto en el atelier. Cancelación gratis hasta 24 h antes.</p><div class="pay"><b>Señal: 10 €</b><div class="pm">${[["card", "Tarjeta"], ["apple", "Apple Pay"], ["bizum", "Bizum"]].map(p => `<button type="button" data-pm="${p[0]}" aria-pressed="${BK.pm === p[0]}">${p[1]}</button>`).join("")}</div><button type="button" class="btn btn-ink" id="payNow" style="width:100%">🔒 Pagar 10 € y reservar</button><p style="font-size:12px;color:var(--mute);margin-top:8px">Pago de demostración: no se cobra nada. En la web real se usa una pasarela segura (Stripe o Redsys).</p></div>`;
  if (S === 6) { const code = "NC-" + (hsh(BK.date + BK.time + BK.data.n) % 90000 + 10000); h = `<div class="okbox"><div class="ring">✦</div><h3>¡Cita reservada!</h3><p style="color:#b9aea6">${new Date(BK.date + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las ${BK.time} · Código ${code}</p><div class="bnav" style="justify-content:center;flex-wrap:wrap"><button type="button" class="btn btn-l" id="ics">📅 Añadir al calendario</button><a class="btn btn-o" target="_blank" rel="noopener" href="https://wa.me/${WA}?text=${encodeURIComponent(`Hola, he visto la demo de Nácar en agencia-js.com y quiero una web así. (Reserva de ejemplo ${code}: ${[...BK.sel].map(i => SVCMAP[i].n).join(", ")} el ${BK.date} a las ${BK.time}${BK.design ? ", diseño " + designName(BK.design) : ""})`)}">WhatsApp</a><button type="button" class="btn btn-o" id="again">Nueva reserva</button></div></div>`; }
  const nav = S < 5 ? `<div class="bnav">${S > 1 ? `<button type="button" class="btn btn-o" data-nav="-1">← Atrás</button>` : "<span></span>"}<button type="button" class="btn btn-l" data-nav="1">Continuar →</button></div>` : S === 5 ? `<div class="bnav"><button type="button" class="btn btn-o" data-nav="-1">← Atrás</button></div>` : "";
  b.innerHTML = (S < 6 ? bar : "") + h + nav;
  sideUI();
}
$("#bkbox").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.sv) { BK.sel.has(t.dataset.sv) ? BK.sel.delete(t.dataset.sv) : BK.sel.add(t.dataset.sv); BK.time = null; drawBook(); drawSvc(); return; }
  if (t.dataset.ar) { BK.artist = t.dataset.ar; BK.time = null; drawBook(); return; }
  if (t.dataset.mo) { const m = BK.month; BK.month = new Date(m.getFullYear(), m.getMonth() + +t.dataset.mo, 1); drawBook(); return; }
  if (t.dataset.d) { BK.date = t.dataset.d; BK.time = null; drawBook(); return; }
  if (t.dataset.h) { BK.time = t.dataset.h; drawBook(); return; }
  if (t.dataset.pm) { BK.pm = t.dataset.pm; drawBook(); return; }
  if (t.id === "payNow") { t.disabled = true; t.textContent = "Procesando…"; setTimeout(() => { BK.step = 6; drawBook(); toast("✦ Reserva confirmada (demo)"); }, 1400); return; }
  if (t.id === "again") { Object.assign(BK, { step: 1, sel: new Set(), design: null, date: null, time: null, data: {} }); drawBook(); drawSvc(); return; }
  if (t.id === "ics") { icsDl(); return; }
  if (t.dataset.nav) {
    const dir = +t.dataset.nav;
    if (dir > 0) {
      if (BK.step === 1 && !BK.sel.size) return toast("Elige al menos un servicio");
      if (BK.step === 3 && !(BK.date && BK.time)) return toast("Elige día y hora");
      if (BK.step === 4) {
        const n = $("#bn").value.trim(), p = $("#bp").value.trim(), em = $("#be").value.trim();
        BK.data = { n, p, e: em, o: $("#bo").value.trim() };
        if (!n || !/^[+\d\s]{9,}$/.test(p) || (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))) { $("#berr").textContent = "Revisa nombre, móvil y correo."; return; }
        if (!$("#bl").checked) { $("#berr").textContent = "Acepta la política de privacidad para continuar."; return; }
      }
    }
    BK.step = Math.max(1, Math.min(5, BK.step + dir)); drawBook();
    $("#reserva").scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
  }
});
function icsDl() {
  const [y, mo, d] = BK.date.split("-"), [hh, mm] = BK.time.split(":"); const st = new Date(+y, mo - 1, +d, +hh, +mm), en = new Date(st.getTime() + tot().t * 60000);
  const f = x => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}T${String(x.getHours()).padStart(2, "0")}${String(x.getMinutes()).padStart(2, "0")}00`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nacar demo//ES", "BEGIN:VEVENT", "UID:" + Date.now() + "@nacar.demo", "DTSTART:" + f(st), "DTEND:" + f(en), "SUMMARY:Cita en Nácar Nail Atelier", "DESCRIPTION:" + [...BK.sel].map(i => SVCMAP[i].n).join(", "), "LOCATION:Calle del Nácar 8", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "cita-nacar.ics"; a.click();
}

/* =================== REGALO =================== */
let gAm = 50, gSt = "perla";
$("#gAmts").innerHTML = [30, 50, 80, 120].map(a => `<button type="button" class="opt" data-a="${a}" aria-pressed="${a === gAm}">${a} €</button>`).join("");
$("#gStyles").innerHTML = [["perla", "Perla"], ["burdeos", "Burdeos"], ["oro", "Oro"]].map(s => `<button type="button" class="opt" data-st="${s[0]}" aria-pressed="${s[0] === gSt}">${s[1]}</button>`).join("");
function gUI() { $("#gAm").textContent = gAm + " €"; $("#gcard").className = "gcard " + gSt; $("#gTo").textContent = $("#gName").value.trim() || "Alguien especial"; $("#gMsg").textContent = $("#gText").value.trim() || "Un rato solo para ti."; $$("#gAmts .opt").forEach(b => b.setAttribute("aria-pressed", +b.dataset.a === gAm)); $$("#gStyles .opt").forEach(b => b.setAttribute("aria-pressed", b.dataset.st === gSt)); }
$("#gAmts").addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b) { gAm = +b.dataset.a; gUI(); } });
$("#gStyles").addEventListener("click", e => { const b = e.target.closest("[data-st]"); if (b) { gSt = b.dataset.st; gUI(); } });
["gName", "gText"].forEach(id => $("#" + id).addEventListener("input", gUI));
$("#gBuy").addEventListener("click", () => { const code = "NACAR-" + Math.random().toString(36).slice(2, 7).toUpperCase(); toast(`🎁 Tarjeta de ${gAm} € creada · código ${code} (demo)`); });

/* =================== CONCIERGE (IA) =================== */
const chat = $("#chat"), clog = $("#clog"); let hist = [], greeted = false;
function cm(t, who) { const d = document.createElement("div"); d.className = "m " + who; if (who === "u") d.textContent = t; else d.innerHTML = t; clog.appendChild(d); clog.scrollTop = clog.scrollHeight; return d; }
function local(q) {
  const n = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/precio|cuest|vale|tarifa/.test(n)) return `Semipermanente desde 35 €, extensiones de gel desde 55 €, cromo o cat eye +8 € y pedicura spa 45 €. Mira la carta completa en <a href="#servicios">Servicios</a>.`;
  if (/dura|semanas|aguanta/.test(n)) return "El semipermanente dura 2-3 semanas y las extensiones de gel 3-4, con relleno.";
  if (/alerg|hema|embaraz/.test(n)) return "Trabajamos con fórmulas sin HEMA y buena ventilación. Si tienes una alergia, cuéntanoslo en las notas de la reserva y lo adaptamos.";
  if (/reserv|cita|hora|turno/.test(n)) return `Puedes reservar online aquí: <a href="#reserva">Reservar cita</a>. Pagas 10 € de señal que se descuentan del total.`;
  if (/probad|prueb|camara|foto/.test(n)) return `En el <a href="#probador">probador virtual</a> puedes ver el diseño en una mano de muestra, en tu foto o en directo con la cámara.`;
  if (/quitar|retir/.test(n)) return "Retiramos el gel sin limar en exceso tu uña natural: 12 €, unos 20 minutos.";
  if (/horario|abr|cierr/.test(n)) return "Abrimos de lunes a sábado de 10:00 a 20:30. Domingos cerrado.";
  return `Te ayudo con precios, duración, cuidados o reservas. Si prefieres, escríbenos por <a href="https://wa.me/${WA}" target="_blank" rel="noopener">WhatsApp</a>.`;
}
async function ask(q) {
  q = q.trim().slice(0, 300); if (!q) return; cm(q, "u"); hist.push({ role: "user", content: q });
  const t = cm('<span class="dots3"><span></span><span></span><span></span></span>', "b");
  let reply = null;
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 9000);
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bot: "nacar", messages: hist.slice(-6) }), signal: ctl.signal });
    if (r.ok) { const j = await r.json(); reply = j.reply ? esc(j.reply).replace(/\n/g, "<br>").replace(/\[\[WA\]\]/g, `<br><a href="https://wa.me/${WA}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>`) : null; }
  } catch (e) { /* sin IA: respuesta local */ }
  if (!reply) reply = local(q);
  t.innerHTML = reply; hist.push({ role: "assistant", content: t.textContent.slice(0, 400) }); clog.scrollTop = clog.scrollHeight;
}
$("#cq").innerHTML = ["¿Cuánto cuesta el cromo?", "¿Cuánto dura?", "Tengo alergia", "Quiero reservar"].map(q => `<button type="button">${q}</button>`).join("");
$("#cq").addEventListener("click", e => { const b = e.target.closest("button"); if (b) ask(b.textContent); });
$("#cform").addEventListener("submit", e => { e.preventDefault(); ask($("#cin").value); $("#cin").value = ""; });
$("#cfab").addEventListener("click", () => { chat.classList.toggle("on"); if (chat.classList.contains("on")) { if (!greeted) { greeted = true; cm("Hola, soy la concierge de Nácar ✦ ¿Te ayudo a elegir diseño, ver precios o reservar?", "b"); } $("#cin").focus(); } });
$("#cx").addEventListener("click", () => chat.classList.remove("on"));
document.addEventListener("keydown", e => { if (e.key === "Escape") chat.classList.remove("on"); });

/* =================== GENERAL =================== */
const hdr = $("#hdr"); addEventListener("scroll", () => hdr.classList.toggle("sc", scrollY > 20), { passive: true });
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
$$(".rv").forEach(n => io.observe(n));
const vo = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting && !RM) { v.preload = "auto"; const p = v.play(); if (p && p.catch) p.catch(() => { }); } else v.pause(); }), { threshold: .2 });
$$("video.lv").forEach(v => vo.observe(v));
const co = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; co.unobserve(e.target); const b = e.target, n = +b.dataset.n, dec = +(b.dataset.d || 0), suf = b.dataset.s || ""; const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 1400), v = n * (1 - Math.pow(1 - k, 3)); b.textContent = v.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }), { threshold: .5 });
$$("[data-n]").forEach(b => co.observe(b));
const glow = $("#glow"); addEventListener("pointermove", e => { glow.style.transform = `translate(${e.clientX - 190}px,${e.clientY - 190}px)`; }, { passive: true });
const H = [["Lunes", "10:00 – 20:30"], ["Martes", "10:00 – 20:30"], ["Miércoles", "10:00 – 20:30"], ["Jueves", "10:00 – 20:30"], ["Viernes", "10:00 – 20:30"], ["Sábado", "10:00 – 20:30"], ["Domingo", "Cerrado"]];
const di = (new Date().getDay() + 6) % 7; $("#hrs").innerHTML = H.map((h, i) => `<div class="${i === di ? "today" : ""}"><span>${h[0]}</span><span>${h[1]}</span></div>`).join("");
$("#yr").textContent = new Date().getFullYear();
/* cookies */
const ckb = $("#ckb"); let ck = null; try { ck = localStorage.getItem("nc_ck"); } catch (e) { }
if (!ck) setTimeout(() => ckb.classList.add("on"), 1200);
ckb.addEventListener("click", e => { const b = e.target.closest("[data-ck]"); if (!b) return; try { localStorage.setItem("nc_ck", b.dataset.ck); } catch (er) { } ckb.classList.remove("on"); });
$("#ckOpen").addEventListener("click", e => { e.preventDefault(); ckb.classList.add("on"); });

updateUI(); drawSvc(); drawBook();
