/* fidelidad.js — Tarjeta de fidelización digital (demo) · Agencia JS
   Uso: <section id="fidelidad" data-brand="Nombre" data-color="#cf3f78" data-icon="🧁"
        data-stamps="8" data-reward="un cupcake de regalo" data-promo="Hoy 2x1 en macarons de 17 a 19 h"
        data-each="compra" data-theme="light|dark"></section>
   Demo sin servidor: los datos se guardan solo en este navegador (localStorage). */
(function () {
  "use strict";
  var sec = document.getElementById("fidelidad");
  if (!sec) return;
  var D = sec.dataset;
  var BRAND = D.brand || "Tu negocio", COLOR = D.color || "#c8653a", ICON = D.icon || "☕";
  var TOTAL = Math.max(4, Math.min(12, parseInt(D.stamps, 10) || 8)), REWARD = D.reward || "un regalo";
  var PROMO = D.promo || "Hoy tienes una sorpresa esperándote";
  var EACH = D.each || "compra", DARK = D.theme === "dark";
  var KEY = "fid_" + BRAND.toLowerCase().replace(/[^a-z0-9]+/g, "");
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(m) { try { if (m) localStorage.setItem(KEY, JSON.stringify(m)); else localStorage.removeItem(KEY); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var M = load();

  /* ---------- estilos ---------- */
  var css = ".fid{--fc:" + COLOR + ";padding:clamp(3.5rem,8vw,6.5rem) 0;position:relative;overflow:hidden}" +
    ".fid .fx-fw{width:min(1120px,100% - 32px);margin-inline:auto;display:grid;gap:clamp(1.5rem,4vw,3.5rem);grid-template-columns:minmax(0,1fr);align-items:center}" +
    "@media(min-width:900px){.fid .fx-fw{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}}" +
    ".fid .fx-fk{display:inline-block;font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--fc)}" +
    ".fid h2{font-family:inherit;font-size:clamp(1.9rem,4.4vw,3rem);line-height:1.05;margin:.4rem 0 .7rem;letter-spacing:-.01em}" +
    ".fid .fx-fl{opacity:.8;max-width:52ch;font-size:1.05rem}" +
    ".fid .fx-fb{display:grid;gap:.6rem;margin:1.3rem 0;padding:0;list-style:none}" +
    ".fid .fx-fb li{display:flex;gap:.7rem;align-items:flex-start;font-weight:600}.fid .fx-fb i{flex:none;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--fc) 14%,transparent);font-style:normal}" +
    ".fid .fx-ph{position:relative;width:min(300px,76vw);aspect-ratio:9/18.5;margin-inline:auto;border-radius:44px;background:#111;padding:12px;box-shadow:0 40px 80px -30px rgba(0,0,0,.55),inset 0 0 0 2px #333}" +
    ".fid .fx-scr{position:relative;height:100%;border-radius:34px;overflow:hidden;background:linear-gradient(160deg,#f4f1ec,#e7e2da);display:flex;flex-direction:column;align-items:center;padding:48px 14px 16px}" +
    ".fid .fx-isl{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:92px;height:26px;border-radius:20px;background:#000;z-index:3}" +
    ".fid .fx-wl{align-self:flex-start;font:700 22px/1 -apple-system,system-ui,sans-serif;color:#111;margin:0 4px 12px}" +
    ".fid .fx-pass{width:100%;border-radius:18px;background:linear-gradient(150deg,var(--fc),color-mix(in srgb,var(--fc) 60%,#000));color:#fff;padding:14px;box-shadow:0 16px 30px -14px rgba(0,0,0,.5);transform-origin:50% 0;transition:transform .5s}" +
    ".fid .fx-pass.fx-pop{animation:fpop .6s cubic-bezier(.2,.9,.3,1.3)}@keyframes fpop{0%{transform:translateY(30px) scale(.9);opacity:0}100%{transform:none;opacity:1}}" +
    ".fid .fx-ph1{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:14px}.fid .fx-ph1 span{display:flex;align-items:center;gap:6px}.fid .fx-ph1 em{font-style:normal;width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,.22);display:grid;place-items:center}" +
    ".fid .fx-pl{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;margin-top:10px}.fid .fx-pv{font-weight:800;font-size:15px}" +
    ".fid .fx-st{display:grid;grid-template-columns:repeat(" + Math.ceil(TOTAL / 2) + ",1fr);gap:6px;margin-top:10px}" +
    ".fid .fx-st b{aspect-ratio:1;border-radius:50%;border:1.5px dashed rgba(255,255,255,.55);display:grid;place-items:center;font-size:14px;transition:background .3s}" +
    ".fid .fx-st b.fx-on{background:#fff;border-style:solid;border-color:#fff}.fid .fx-st b.fx-new{animation:fstamp .7s cubic-bezier(.2,.9,.3,1.4)}@keyframes fstamp{0%{transform:scale(2.2) rotate(-25deg);opacity:0}100%{transform:none;opacity:1}}" +
    ".fid .fx-qr{margin:12px auto 2px;background:#fff;border-radius:10px;padding:8px;width:116px}.fid .fx-qr canvas{display:block;width:100px;height:100px;image-rendering:pixelated}" +
    ".fid .fx-cd{text-align:center;font:600 10px/1.4 ui-monospace,monospace;opacity:.85}" +
    ".fid .fx-empty{margin:auto;align-self:center;text-align:center;color:#555;font-size:14px;padding:0 10px}.fid .fx-empty b{display:block;font-size:42px;margin-bottom:8px}" +
    ".fid .fx-nt{position:absolute;left:10px;right:10px;top:44px;z-index:4;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border-radius:16px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start;box-shadow:0 10px 30px rgba(0,0,0,.2);transform:translateY(-140%);opacity:0;transition:transform .55s cubic-bezier(.2,.9,.3,1.15),opacity .3s;color:#111;font:13px/1.3 -apple-system,system-ui,sans-serif}" +
    ".fid .fx-nt.fx-on{transform:none;opacity:1}.fid .fx-nt i{flex:none;width:34px;height:34px;border-radius:9px;background:var(--fc);display:grid;place-items:center;font-style:normal;font-size:18px}.fid .fx-nt b{display:flex;justify-content:space-between;font-size:12.5px}.fid .fx-nt b small{font-weight:500;opacity:.55}" +
    ".fid .fx-pn{background:var(--fcard,#fff);border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:clamp(1.1rem,3vw,1.6rem);box-shadow:0 30px 60px -40px rgba(0,0,0,.4);color:inherit}" +
    ".fid .fx-pn h3{font-size:1.2rem;margin-bottom:.8rem}.fid label{display:block;font-weight:700;font-size:.85rem;margin:.7rem 0 .3rem}" +
    ".fid input[type=text],.fid input[type=email]{width:100%;min-height:48px;border-radius:14px;border:1.5px solid rgba(0,0,0,.15);padding:0 14px;font:inherit;background:#fff;color:#111}" +
    ".fid input:focus-visible,.fid button:focus-visible{outline:3px solid var(--fc);outline-offset:2px}" +
    ".fid .fx-ck{display:flex;gap:.6rem;align-items:flex-start;font-weight:500;font-size:.85rem;opacity:.85;margin-top:.9rem}.fid .fx-ck input{margin-top:3px;width:18px;height:18px;accent-color:var(--fc);flex:none}" +
    ".fid .fx-bm{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:50px;border:0;border-radius:14px;padding:0 1.2rem;font:inherit;font-weight:800;cursor:pointer;background:var(--fc);color:#fff;width:100%;margin-top:1rem;transition:transform .2s}.fid .fx-bm:active{transform:scale(.97)}" +
    ".fid .fx-wb{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.4rem 0 1rem}.fid .fx-wb button{min-height:50px;border-radius:12px;font:inherit;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.45rem;padding:0 .5rem;line-height:1.1}" +
    ".fid .fx-wa{background:#000;color:#fff;border:0}.fid .fx-wg{background:#fff;color:#111;border:1.5px solid #222}" +
    ".fid .fx-dp{margin-top:1rem;border-top:1px dashed rgba(0,0,0,.18);padding-top:1rem}.fid .fx-dp p{font-size:.85rem;opacity:.75;margin-bottom:.6rem}" +
    ".fid .fx-row{display:flex;gap:.6rem;flex-wrap:wrap}.fid .fx-bs{flex:1;min-height:46px;border-radius:12px;border:1.5px solid rgba(0,0,0,.15);background:#fff;color:#111;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer;padding:0 .8rem}" +
    ".fid .fx-bs.fx-pr{background:#111;color:#fff;border-color:#111}" +
    ".fid .fx-rw{display:none;margin-top:.8rem;padding:.8rem 1rem;border-radius:14px;background:color-mix(in srgb,var(--fc) 14%,#fff);font-weight:800}.fid .fx-rw.fx-on{display:block}" +
    ".fid .fx-lk{background:none;border:0;color:inherit;opacity:.6;text-decoration:underline;font:inherit;font-size:.8rem;cursor:pointer;margin-top:.9rem}" +
    ".fid .fx-dm{font-size:.78rem;opacity:.6;margin-top:.8rem}" +
    ".fid .fx-cf{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden}.fid .fx-cf i{position:absolute;top:-10px;width:8px;height:12px;border-radius:2px;animation:ffall 1.6s ease-in forwards}@keyframes ffall{to{transform:translateY(620px) rotate(540deg);opacity:0}}" +
    ".fid.fx-dark .fx-pn{background:#151515;border-color:rgba(255,255,255,.1);box-shadow:0 30px 60px -40px #000}" +
    ".fid.fx-dark input[type=text],.fid.fx-dark input[type=email]{background:#0d0d0d;color:#f4f4f4;border-color:rgba(255,255,255,.2)}" +
    ".fid.fx-dark .fx-bs{background:#1d1d1d;color:#f4f4f4;border-color:rgba(255,255,255,.2)}.fid.fx-dark .fx-bs.fx-pr{background:#f4f4f4;color:#111;border-color:#f4f4f4}" +
    ".fid.fx-dark .fx-wa{box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)}.fid.fx-dark .fx-dp{border-color:rgba(255,255,255,.18)}" +
    ".fid.fx-dark .fx-rw{background:color-mix(in srgb,var(--fc) 22%,#151515)}" +
    "@media(prefers-reduced-motion:reduce){.fid *{animation:none!important;transition:none!important}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- estructura ---------- */
  sec.classList.add("fid");
  if (DARK) sec.classList.add("fx-dark");
  sec.setAttribute("aria-labelledby", "fid-t");
  sec.innerHTML =
    '<div class="fx-fw">' +
      '<div class="fx-ph" aria-label="Vista previa de la tarjeta en el móvil"><div class="fx-scr"><span class="fx-isl" aria-hidden="true"></span>' +
        '<div class="fx-nt" id="fid-nt" role="status" aria-live="polite"><i aria-hidden="true">' + ICON + '</i><span><b>' + esc(BRAND) + ' <small>ahora</small></b><span id="fid-ntx"></span></span></div>' +
        '<p class="fx-wl" aria-hidden="true">Wallet</p><div id="fid-pass" style="width:100%;flex:1;display:flex;align-items:flex-start"></div></div></div>' +
      '<div>' +
        '<span class="fx-fk">Tarjeta de fidelización</span>' +
        '<h2 id="fid-t">Tu tarjeta ' + esc(BRAND) + ', en el móvil</h2>' +
        '<p class="fx-fl">Sin descargar apps ni llevar cartones: guárdala en Apple Wallet o Google Wallet, suma un sello con cada ' + esc(EACH) + ' y llévate ' + esc(REWARD) + '.</p>' +
        '<ul class="fx-fb"><li><i>📲</i>Se guarda en la cartera del móvil, junto a tus tarjetas.</li><li><i>' + ICON + '</i>' + TOTAL + ' sellos = ' + esc(REWARD) + '.</li><li><i>🔔</i>Avisos de ofertas solo si tú quieres, y te das de baja cuando quieras.</li></ul>' +
        '<div class="fx-pn" id="fid-pn"></div>' +
      '</div>' +
    '</div>';
  var pass = sec.querySelector("#fid-pass"), pn = sec.querySelector("#fid-pn"), nt = sec.querySelector("#fid-nt"), ntx = sec.querySelector("#fid-ntx"), scr = sec.querySelector(".fx-scr");

  /* ---------- código QR decorativo (demo) ---------- */
  function drawQR(cv, seed) {
    var n = 25, c = cv.getContext("2d"), s = 4, x, y, h = 0;
    cv.width = cv.height = n * s;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    function rnd() { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; }
    c.fillStyle = "#fff"; c.fillRect(0, 0, n * s, n * s); c.fillStyle = "#111";
    function finder(ox, oy) { c.fillRect(ox * s, oy * s, 7 * s, 7 * s); c.fillStyle = "#fff"; c.fillRect((ox + 1) * s, (oy + 1) * s, 5 * s, 5 * s); c.fillStyle = "#111"; c.fillRect((ox + 2) * s, (oy + 2) * s, 3 * s, 3 * s); }
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
      var f = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!f && rnd() > .52) c.fillRect(x * s, y * s, s, s);
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  }

  function drawPass(anim, newIdx) {
    if (!M) { pass.innerHTML = '<p class="fx-empty"><b>' + ICON + '</b>Crea tu tarjeta y aparecerá aquí, lista para guardar en tu Wallet.</p>'; return; }
    var dots = "";
    for (var i = 0; i < TOTAL; i++) dots += '<b class="' + (i < M.s ? "fx-on" : "") + (i === newIdx ? " fx-new" : "") + '">' + (i < M.s ? ICON : (i === TOTAL - 1 ? "🎁" : "")) + "</b>";
    pass.innerHTML = '<div class="fx-pass' + (anim ? " fx-pop" : "") + '"><div class="fx-ph1"><span><em>' + ICON + "</em>" + esc(BRAND) + '</span><span style="font-size:11px;opacity:.85">Socio</span></div>' +
      '<p class="fx-pl">Nombre</p><p class="fx-pv">' + esc(M.n) + '</p>' +
      '<p class="fx-pl">Sellos · ' + M.s + " / " + TOTAL + '</p><div class="fx-st">' + dots + "</div>" +
      '<p class="fx-pl">Premio</p><p class="fx-pv" style="font-size:13px">' + esc(REWARD) + "</p>" +
      '<div class="fx-qr"><canvas aria-label="Código de socio"></canvas></div><p class="fx-cd">' + M.id + "</p></div>";
    drawQR(pass.querySelector("canvas"), M.id);
  }

  function notify(txt) {
    ntx.textContent = txt; nt.classList.remove("fx-on"); void nt.offsetWidth; nt.classList.add("fx-on");
    clearTimeout(notify.t); notify.t = setTimeout(function () { nt.classList.remove("fx-on"); }, 4200);
  }
  function confetti() {
    if (RM) return;
    var cf = document.createElement("div"), cols = [COLOR, "#f6c344", "#5cc28a", "#6aa8ff", "#fff"];
    cf.className = "fx-cf";
    for (var i = 0; i < 40; i++) { var e = document.createElement("i"); e.style.left = Math.random() * 100 + "%"; e.style.background = cols[i % cols.length]; e.style.animationDelay = Math.random() * .5 + "s"; cf.appendChild(e); }
    scr.appendChild(cf); setTimeout(function () { cf.remove(); }, 2300);
  }

  function drawPanel() {
    if (!M) {
      pn.innerHTML = '<h3>Crea tu tarjeta gratis</h3><form id="fid-f" novalidate>' +
        '<label for="fid-n">Nombre</label><input type="text" id="fid-n" autocomplete="given-name" maxlength="40" required>' +
        '<label for="fid-e">Correo electrónico</label><input type="email" id="fid-e" autocomplete="email" maxlength="80" required>' +
        '<label class="fx-ck"><input type="checkbox" id="fid-c"><span>Quiero recibir avisos de ofertas de ' + esc(BRAND) + '. Puedo darme de baja cuando quiera.</span></label>' +
        '<button class="fx-bm" type="submit">' + ICON + ' Crear mi tarjeta</button><p class="fx-dm" id="fid-er" role="alert"></p>' +
        '<p class="fx-dm">Demostración: los datos se quedan solo en este navegador, no se envían a ningún sitio.</p></form>';
      pn.querySelector("#fid-f").addEventListener("submit", function (e) {
        e.preventDefault();
        var n = pn.querySelector("#fid-n").value.trim().slice(0, 40), em = pn.querySelector("#fid-e").value.trim();
        if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { pn.querySelector("#fid-er").textContent = "Escribe tu nombre y un correo válido."; return; }
        M = { n: n, e: em, c: pn.querySelector("#fid-c").checked, s: 1, id: BRAND.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase() };
        save(M); drawPass(true); drawPanel();
        setTimeout(function () { notify("¡Bienvenido/a, " + n + "! Te regalamos tu primer sello " + ICON); }, 700);
      });
      return;
    }
    var left = TOTAL - M.s;
    pn.innerHTML = '<h3>¡Hola, ' + esc(M.n) + '! Tu tarjeta está lista</h3>' +
      '<div class="fx-wb"><button type="button" class="fx-wa" data-w="apple"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.6zM14.1 5.6c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z"/></svg>Añadir a Apple Wallet</button>' +
      '<button type="button" class="fx-wg" data-w="google"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M3 7h18v4H3z"/><path fill="#34A853" d="M3 11h18v4H3z"/><path fill="#FBBC04" d="M3 15h18v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path fill="#EA4335" d="M5 4h14a2 2 0 0 1 2 2v1H3V6a2 2 0 0 1 2-2z"/></svg>Guardar en Google Wallet</button></div>' +
      '<p style="font-weight:700">' + (left > 0 ? "Te faltan " + left + " sello" + (left > 1 ? "s" : "") + " para " + esc(REWARD) + "." : "🎉 ¡Premio conseguido!") + "</p>" +
      '<div class="fx-rw' + (left <= 0 ? " fx-on" : "") + '">🎁 Enseña tu tarjeta en ' + esc(BRAND) + ' y te damos ' + esc(REWARD) + '.<button type="button" class="fx-bs fx-pr" data-a="redeem" style="width:100%;margin-top:.6rem">Canjear premio</button></div>' +
      '<div class="fx-dp"><p><b>Pruébalo como si fueras el dependiente:</b> en la tienda se escanea el código de tu tarjeta y se suma el sello al momento.</p>' +
      '<div class="fx-row"><button type="button" class="fx-bs fx-pr" data-a="stamp"' + (left <= 0 ? " disabled" : "") + '>📷 Escanear y sellar</button><button type="button" class="fx-bs" data-a="promo">🔔 Ver aviso de ejemplo</button></div></div>' +
      '<button type="button" class="fx-lk" data-a="reset">Borrar mi tarjeta (demo)</button>';
  }

  pn.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || !M) return;
    if (b.dataset.w) { notify(b.dataset.w === "apple" ? "En la web real tu tarjeta se guarda en Apple Wallet con un toque." : "En la web real tu tarjeta se guarda en Google Wallet con un toque."); return; }
    var a = b.dataset.a;
    if (a === "stamp" && M.s < TOTAL) {
      M.s++; save(M); drawPass(false, M.s - 1); drawPanel();
      var l = TOTAL - M.s;
      if (l === 0) { confetti(); notify("🎉 ¡Tarjeta completa! Ya puedes canjear " + REWARD + "."); }
      else if (l === 1) notify("¡Solo te falta 1 sello para " + REWARD + "! " + ICON);
      else notify("+1 sello " + ICON + " Llevas " + M.s + " de " + TOTAL + ".");
    } else if (a === "redeem") { M.s = 0; save(M); drawPass(false); drawPanel(); notify("Premio canjeado. ¡Que lo disfrutes! Empezamos una tarjeta nueva."); }
    else if (a === "promo") { notify(PROMO); }
    else if (a === "reset") { M = null; save(null); drawPass(false); drawPanel(); }
  });

  drawPass(false); drawPanel();
})();
