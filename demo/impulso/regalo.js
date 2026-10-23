/* regalo.js — Tarjeta regalo digital (demo) · Agencia JS
   Uso: <section id="regalo" data-brand="Nombre" data-color="#cf3f78" data-icon="🧁"
        data-amounts="20,30,50" data-what="para gastar en tartas, pasteles y cafés"
        data-theme="light|dark" data-validity="12"></section>
   Como las grandes marcas: eliges importe y diseño, escribes una dedicatoria, la envías ahora o en una
   fecha, se descarga como imagen y se consulta el saldo con el código.
   Demo sin servidor ni cobros: las tarjetas se guardan solo en este navegador (localStorage).
   En la web real: pago con Stripe (tarjeta, Apple Pay, Google Pay), código único en D1 y canje en caja. */
(function () {
  "use strict";
  var sec = document.getElementById("regalo");
  if (!sec) return;
  var D = sec.dataset;
  var BRAND = D.brand || "Tu negocio", COLOR = D.color || "#c8653a", ICON = D.icon || "🎁";
  var AMOUNTS = (D.amounts || "20,30,50").split(",").map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; });
  var WHAT = D.what || "para gastar cuando quiera";
  var MONTHS = parseInt(D.validity, 10) || 12, DARK = D.theme === "dark";
  var MIN = 10, MAX = 300;
  var KEY = "rg_" + BRAND.toLowerCase().replace(/[^a-z0-9]+/g, "");
  var PFX = BRAND.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(function (w) { return !/^(el|la|los|las|de|del|y)$/i.test(w); }).map(function (w) { return w[0] || ""; }).join("").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "RG";
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DESIGNS = [
    { id: "clasica", n: "Clásica" },
    { id: "noche", n: "Noche" },
    { id: "fiesta", n: "Celebración" }
  ];

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } }
  function save(l) { try { localStorage.setItem(KEY, JSON.stringify(l.slice(-20))); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clean(s, n) { return String(s || "").replace(/[<>{}\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, n); }
  function eur(n) { return n.toLocaleString("es-ES") + " €"; }
  function code() { var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = ""; var r = new Uint32Array(8); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach(function (v, i) { r[i] = Math.random() * 1e9; }); for (var i = 0; i < 8; i++) s += a[r[i] % a.length]; return PFX + "-" + s.slice(0, 4) + "-" + s.slice(4); }
  function fecha(d) { return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }); }
  function hoyISO() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }

  /* ---------- estilos ---------- */
  var css = ".rg{--rc:" + COLOR + ";padding:clamp(3.5rem,8vw,6.5rem) 0;position:relative;overflow:hidden}" +
    ".rg .rg-w{width:min(1120px,100% - 32px);margin-inline:auto;display:grid;gap:clamp(1.5rem,4vw,3.5rem);grid-template-columns:minmax(0,1fr);align-items:start}" +
    "@media(min-width:900px){.rg .rg-w{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}}" +
    ".rg .rg-k{display:inline-block;font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--rc)}" +
    ".rg h2{font-family:inherit;font-size:clamp(1.9rem,4.4vw,3rem);line-height:1.05;margin:.4rem 0 .7rem;letter-spacing:-.01em}" +
    ".rg .rg-l{opacity:.8;max-width:52ch;font-size:1.05rem}" +
    ".rg .rg-stage{perspective:1000px;width:min(440px,100%);margin-inline:auto}" +
    ".rg .rg-card{position:relative;aspect-ratio:1.586;border-radius:22px;padding:clamp(16px,4.5vw,26px);color:#fff;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;box-shadow:0 30px 60px -28px rgba(0,0,0,.6);transform:rotateX(var(--ry,0deg)) rotateY(var(--rx,0deg));transition:transform .25s ease,background .5s;will-change:transform}" +
    ".rg .rg-card[data-d=clasica]{background:linear-gradient(135deg,color-mix(in srgb,var(--rc) 85%,#fff) 0%,var(--rc) 45%,color-mix(in srgb,var(--rc) 55%,#000) 100%)}" +
    ".rg .rg-card[data-d=noche]{background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--rc) 55%,transparent),transparent 60%),linear-gradient(160deg,#1b1b1f,#050506)}" +
    ".rg .rg-card[data-d=fiesta]{background:radial-gradient(circle at 18% 22%,rgba(255,255,255,.35) 0 3px,transparent 4px) 0 0/46px 46px,radial-gradient(circle at 70% 60%,rgba(255,214,102,.55) 0 2.5px,transparent 3.5px) 0 0/38px 38px,linear-gradient(135deg,var(--rc),color-mix(in srgb,var(--rc) 40%,#f6c344))}" +
    ".rg .rg-card:after{content:'';position:absolute;inset:-60%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.28) 50%,transparent 58%);transform:translateX(var(--sh,-30%));transition:transform .4s;pointer-events:none}" +
    ".rg .rg-c1{display:flex;justify-content:space-between;align-items:center;font-weight:800;letter-spacing:.04em}.rg .rg-c1 span{display:flex;align-items:center;gap:8px}.rg .rg-c1 em{font-style:normal;width:32px;height:32px;border-radius:10px;background:rgba(255,255,255,.2);display:grid;place-items:center}" +
    ".rg .rg-c1 small{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;opacity:.85}" +
    ".rg .rg-am{font-size:clamp(2.6rem,10vw,4rem);font-weight:900;line-height:1;letter-spacing:-.02em;text-shadow:0 2px 20px rgba(0,0,0,.18)}" +
    ".rg .rg-c3{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;font-size:.85rem}.rg .rg-c3 b{display:block;font-size:1rem}.rg .rg-cd{font:600 .78rem/1.2 ui-monospace,monospace;letter-spacing:.08em;opacity:.9;text-align:right}" +
    ".rg .rg-msg{margin:.9rem auto 0;width:min(440px,100%);font-style:italic;opacity:.75;text-align:center;min-height:1.4em;font-size:.95rem}" +
    ".rg .rg-pn{background:var(--rcard,#fff);border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:clamp(1.1rem,3vw,1.6rem);box-shadow:0 30px 60px -40px rgba(0,0,0,.4);color:inherit;margin-top:1.2rem}" +
    ".rg fieldset{border:0;padding:0;margin:0 0 .4rem}.rg legend,.rg label.rg-lb{display:block;font-weight:700;font-size:.85rem;margin:.8rem 0 .35rem}" +
    ".rg .rg-ch{display:flex;flex-wrap:wrap;gap:.45rem}.rg .rg-ch button{min-height:44px;padding:0 1rem;border-radius:999px;border:1.5px solid rgba(0,0,0,.15);background:#fff;color:#111;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;transition:background .2s,border-color .2s}" +
    ".rg .rg-ch button[aria-pressed=true]{background:var(--rc);border-color:var(--rc);color:#fff}" +
    ".rg input[type=text],.rg input[type=number],.rg input[type=date],.rg textarea{width:100%;min-height:48px;border-radius:14px;border:1.5px solid rgba(0,0,0,.15);padding:.7rem 14px;font:inherit;background:#fff;color:#111}" +
    ".rg textarea{min-height:80px;resize:vertical}.rg .rg-2{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}@media(max-width:420px){.rg .rg-2{grid-template-columns:1fr}}" +
    ".rg input:focus-visible,.rg textarea:focus-visible,.rg button:focus-visible,.rg a:focus-visible{outline:3px solid var(--rc);outline-offset:2px}" +
    ".rg .rg-bm{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:52px;border:0;border-radius:14px;padding:0 1.2rem;font:inherit;font-weight:800;cursor:pointer;background:var(--rc);color:#fff;width:100%;margin-top:1.1rem;transition:transform .2s;text-decoration:none}.rg .rg-bm:active{transform:scale(.97)}" +
    ".rg .rg-bs{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;flex:1;min-height:46px;border-radius:12px;border:1.5px solid rgba(0,0,0,.15);background:#fff;color:#111;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer;padding:0 .8rem;text-decoration:none}" +
    ".rg .rg-row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.8rem}" +
    ".rg .rg-er{color:#b42318;font-weight:700;font-size:.85rem;min-height:1.2em;margin-top:.5rem}" +
    ".rg .rg-dm{font-size:.78rem;opacity:.65;margin-top:.8rem}" +
    ".rg .rg-ok{padding:1rem;border-radius:16px;background:color-mix(in srgb,var(--rc) 12%,#fff);margin-bottom:.4rem}.rg .rg-ok b{font-size:1.05rem}" +
    ".rg .rg-code{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.7rem;padding:.7rem .9rem;border-radius:12px;border:1.5px dashed var(--rc);font:700 1.05rem/1 ui-monospace,monospace;letter-spacing:.06em}" +
    ".rg .rg-sal{margin-top:1.1rem;border-top:1px dashed rgba(0,0,0,.18);padding-top:1rem}.rg .rg-sal form{display:flex;gap:.5rem}.rg .rg-sal input{text-transform:uppercase}" +
    ".rg .rg-res{margin-top:.6rem;font-weight:700}" +
    ".rg .rg-perks{display:grid;gap:.5rem;margin:1.1rem 0 0;padding:0;list-style:none;font-weight:600}.rg .rg-perks li{display:flex;gap:.6rem;align-items:center}.rg .rg-perks i{font-style:normal;flex:none;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--rc) 14%,transparent)}" +
    ".rg.rg-dark .rg-pn{background:#151515;border-color:rgba(255,255,255,.1)}.rg.rg-dark input,.rg.rg-dark textarea{background:#0d0d0d;color:#f4f4f4;border-color:rgba(255,255,255,.2)}" +
    ".rg.rg-dark .rg-ch button,.rg.rg-dark .rg-bs{background:#1d1d1d;color:#f4f4f4;border-color:rgba(255,255,255,.2)}.rg.rg-dark .rg-ok{background:color-mix(in srgb,var(--rc) 20%,#151515)}.rg.rg-dark .rg-sal{border-color:rgba(255,255,255,.18)}.rg.rg-dark .rg-er{color:#ff8a80}" +
    ".rg.rg-dark input[type=date]{color-scheme:dark}" +
    "@media(prefers-reduced-motion:reduce){.rg *{animation:none!important;transition:none!important}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* ---------- estructura ---------- */
  sec.classList.add("rg");
  if (DARK) sec.classList.add("rg-dark");
  sec.setAttribute("aria-labelledby", "rg-t");
  var amtBtns = AMOUNTS.map(function (a, i) { return '<button type="button" data-am="' + a + '" aria-pressed="' + (i === 1 || (AMOUNTS.length === 1) ? "true" : "false") + '">' + eur(a) + "</button>"; }).join("") + '<button type="button" data-am="otro" aria-pressed="false">Otro</button>';
  var desBtns = DESIGNS.map(function (d, i) { return '<button type="button" data-ds="' + d.id + '" aria-pressed="' + (i === 0) + '">' + d.n + "</button>"; }).join("");
  sec.innerHTML =
    '<div class="rg-w">' +
      '<div>' +
        '<div class="rg-stage"><div class="rg-card" id="rg-card" data-d="clasica" role="img" aria-label="Vista previa de la tarjeta regalo">' +
          '<div class="rg-c1"><span><em aria-hidden="true">' + ICON + "</em>" + esc(BRAND) + '</span><small>Tarjeta regalo</small></div>' +
          '<div class="rg-am" id="rg-am"></div>' +
          '<div class="rg-c3"><span><small style="opacity:.8">Para</small><b id="rg-para">Alguien especial</b></span><span class="rg-cd" id="rg-cd">•••• ••••<br>Válida ' + MONTHS + ' meses</span></div>' +
        "</div></div>" +
        '<p class="rg-msg" id="rg-msg" aria-live="polite"></p>' +
      "</div>" +
      "<div>" +
        '<span class="rg-k">Tarjeta regalo</span>' +
        '<h2 id="rg-t">Regala ' + esc(BRAND) + "</h2>" +
        '<p class="rg-l">El regalo que siempre acierta: una tarjeta ' + esc(WHAT) + ". Elige el importe y el diseño, añade tu dedicatoria y la recibe en el móvil al momento o el día que tú digas.</p>" +
        '<ul class="rg-perks"><li><i aria-hidden="true">📱</i>Llega por WhatsApp o correo, sin papel.</li><li><i aria-hidden="true">🗓️</i>Programa el envío para su cumpleaños.</li><li><i aria-hidden="true">💳</i>Se gasta poco a poco: el saldo se guarda.</li></ul>' +
        '<div class="rg-pn" id="rg-pn"></div>' +
      "</div>" +
    "</div>";
  var card = sec.querySelector("#rg-card"), am = sec.querySelector("#rg-am"), para = sec.querySelector("#rg-para"), cd = sec.querySelector("#rg-cd"), msgEl = sec.querySelector("#rg-msg"), pn = sec.querySelector("#rg-pn");

  var S = { am: AMOUNTS[1] || AMOUNTS[0] || 30, ds: "clasica", para: "", de: "", msg: "", cuando: "ahora", fecha: "" };

  function preview() {
    am.textContent = eur(S.am);
    para.textContent = S.para || "Alguien especial";
    msgEl.textContent = S.msg ? "«" + S.msg + "»" + (S.de ? " — " + S.de : "") : "";
    card.dataset.d = S.ds;
  }

  function form() {
    pn.innerHTML = '<form id="rg-f" novalidate>' +
      '<fieldset><legend>Importe</legend><div class="rg-ch" id="rg-ams">' + amtBtns + "</div>" +
      '<div id="rg-ow" hidden><label class="rg-lb" for="rg-o">Importe (' + MIN + "–" + MAX + ' €)</label><input type="number" id="rg-o" inputmode="numeric" min="' + MIN + '" max="' + MAX + '" step="5" placeholder="Ej. 40"></div></fieldset>' +
      '<fieldset><legend>Diseño</legend><div class="rg-ch" id="rg-dss">' + desBtns + "</div></fieldset>" +
      '<div class="rg-2"><div><label class="rg-lb" for="rg-p">Para</label><input type="text" id="rg-p" maxlength="24" autocomplete="off" placeholder="Nombre"></div>' +
      '<div><label class="rg-lb" for="rg-d">De</label><input type="text" id="rg-d" maxlength="24" autocomplete="given-name" placeholder="Tu nombre"></div></div>' +
      '<label class="rg-lb" for="rg-m">Dedicatoria <span style="font-weight:500;opacity:.6">(opcional)</span></label><textarea id="rg-m" maxlength="120" placeholder="¡Feliz cumpleaños! Que lo disfrutes."></textarea>' +
      '<fieldset><legend>¿Cuándo la recibe?</legend><div class="rg-ch" id="rg-cu"><button type="button" data-cu="ahora" aria-pressed="true">Ahora</button><button type="button" data-cu="fecha" aria-pressed="false">Elegir fecha</button></div>' +
      '<div id="rg-fw" hidden><label class="rg-lb" for="rg-fe">Fecha de envío</label><input type="date" id="rg-fe" min="' + hoyISO() + '"></div></fieldset>' +
      '<button class="rg-bm" type="submit" id="rg-go"></button><p class="rg-er" id="rg-er" role="alert"></p>' +
      '<p class="rg-dm">Demostración: no se realiza ningún cobro. En la web real se paga con tarjeta, Apple Pay o Google Pay y el código se valida en caja.</p></form>' +
      balanceHTML();
    var f = pn.querySelector("#rg-f"), go = pn.querySelector("#rg-go");
    function upd() { go.textContent = "🎁 Regalar " + eur(S.am); preview(); }
    function press(group, btn) { group.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); }); }
    pn.querySelector("#rg-ams").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; press(this, b);
      var otro = b.dataset.am === "otro"; pn.querySelector("#rg-ow").hidden = !otro;
      if (otro) { var o = pn.querySelector("#rg-o"); o.focus(); if (o.value) S.am = +o.value; } else S.am = +b.dataset.am;
      upd();
    });
    pn.querySelector("#rg-o").addEventListener("input", function () { var v = Math.round(+this.value); if (v >= MIN && v <= MAX) { S.am = v; upd(); } });
    pn.querySelector("#rg-dss").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; press(this, b); S.ds = b.dataset.ds; preview(); });
    pn.querySelector("#rg-cu").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; press(this, b); S.cuando = b.dataset.cu; pn.querySelector("#rg-fw").hidden = S.cuando !== "fecha"; });
    pn.querySelector("#rg-p").addEventListener("input", function () { S.para = clean(this.value, 24); preview(); });
    pn.querySelector("#rg-d").addEventListener("input", function () { S.de = clean(this.value, 24); preview(); });
    pn.querySelector("#rg-m").addEventListener("input", function () { S.msg = clean(this.value, 120); preview(); });
    pn.querySelector("#rg-fe").addEventListener("change", function () { S.fecha = this.value; });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var er = pn.querySelector("#rg-er");
      var otro = pn.querySelector('[data-am="otro"]').getAttribute("aria-pressed") === "true";
      if (otro) { var v = Math.round(+pn.querySelector("#rg-o").value); if (!(v >= MIN && v <= MAX)) { er.textContent = "Elige un importe entre " + MIN + " y " + MAX + " €."; return; } S.am = v; }
      if (!S.para || !S.de) { er.textContent = "Escribe para quién es y quién la regala."; return; }
      if (S.cuando === "fecha" && (!S.fecha || S.fecha < hoyISO())) { er.textContent = "Elige una fecha de envío a partir de hoy."; return; }
      var c = { c: code(), am: S.am, saldo: S.am, ds: S.ds, para: S.para, de: S.de, msg: S.msg, env: S.cuando === "fecha" ? S.fecha : hoyISO(), t: Date.now() };
      var l = load(); l.push(c); save(l);
      done(c);
    });
    bindBalance();
    upd();
  }

  function balanceHTML() {
    return '<div class="rg-sal"><label class="rg-lb" for="rg-q" style="margin-top:0">¿Ya tienes una tarjeta? Consulta tu saldo</label>' +
      '<form id="rg-qf" novalidate><input type="text" id="rg-q" maxlength="14" placeholder="' + PFX + '-XXXX-XXXX" autocomplete="off" spellcheck="false"><button class="rg-bs" type="submit" style="flex:none">Consultar</button></form>' +
      '<div class="rg-res" id="rg-qr" aria-live="polite"></div></div>';
  }
  function bindBalance() {
    var qf = pn.querySelector("#rg-qf"); if (!qf) return;
    qf.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = clean(pn.querySelector("#rg-q").value, 14).toUpperCase(), out = pn.querySelector("#rg-qr");
      var t = load().filter(function (x) { return x.c === v; })[0];
      if (!t) { out.innerHTML = "No encontramos esa tarjeta. Revisa el código (en la demo solo existen las que crees en este navegador)."; return; }
      var cad = new Date(t.t); cad.setMonth(cad.getMonth() + MONTHS);
      out.innerHTML = "Saldo disponible: " + eur(t.saldo) + ' <span style="font-weight:500;opacity:.7">de ' + eur(t.am) + " · válida hasta el " + fecha(cad) + "</span>" +
        (t.saldo > 0 ? '<div class="rg-row"><button type="button" class="rg-bs" data-use="' + esc(t.c) + '">🧾 Simular compra de 10 € en caja</button></div>' : "");
    });
  }
  pn_click = function (e) {
      var b = e.target.closest("[data-use]"); if (!b) return;
      var l = load(), t = l.filter(function (x) { return x.c === b.dataset.use; })[0]; if (!t) return;
      t.saldo = Math.max(0, t.saldo - 10); save(l);
      pn.querySelector("#rg-q").value = t.c; pn.querySelector("#rg-qf").requestSubmit ? pn.querySelector("#rg-qf").requestSubmit() : pn.querySelector("#rg-qf").dispatchEvent(new Event("submit"));
  };

  function shareText(c) {
    return "🎁 " + c.de + " te ha regalado una tarjeta regalo de " + eur(c.am) + " para " + BRAND + "." + (c.msg ? "\n«" + c.msg + "»" : "") + "\nCódigo: " + c.c;
  }
  function done(c) {
    cd.innerHTML = esc(c.c) + "<br>Válida " + MONTHS + " meses";
    var env = c.env === hoyISO() ? "ahora mismo" : "el " + fecha(new Date(c.env + "T12:00:00"));
    pn.innerHTML = '<div class="rg-ok" role="status"><b>¡Tarjeta lista! ' + ICON + "</b><p>" + esc(c.para) + " recibirá su tarjeta de " + eur(c.am) + " " + env + ".</p>" +
      '<div class="rg-code"><span>' + esc(c.c) + '</span><button type="button" class="rg-bs" data-a="copy" style="flex:none;min-height:38px">Copiar</button></div></div>' +
      '<div class="rg-row"><button type="button" class="rg-bs" data-a="png">⬇️ Descargar tarjeta</button>' +
      '<a class="rg-bs" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(shareText(c)) + '">💬 Enviar por WhatsApp</a></div>' +
      '<button type="button" class="rg-bm" data-a="new">Regalar otra tarjeta</button>' +
      '<p class="rg-dm">Demostración: no se ha cobrado nada. En la web real el pago se confirma al momento y la tarjeta se envía sola en la fecha elegida.</p>' +
      balanceHTML();
    bindBalance();
    pn.querySelector("[data-a=copy]").addEventListener("click", function () { var b = this; (navigator.clipboard ? navigator.clipboard.writeText(c.c) : Promise.reject()).then(function () { b.textContent = "Copiado"; }, function () { b.textContent = c.c; }); });
    pn.querySelector("[data-a=png]").addEventListener("click", function () { descargar(c); });
    pn.querySelector("[data-a=new]").addEventListener("click", function () { cd.innerHTML = "•••• ••••<br>Válida " + MONTHS + " meses"; form(); });
    if (!RM) { card.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(360deg)" }], { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)" }); }
    pn.querySelector(".rg-ok").scrollIntoView({ block: "nearest", behavior: RM ? "auto" : "smooth" });
  }

  /* ---------- descarga como imagen (canvas) ---------- */
  function descargar(c) {
    var W = 1200, H = 756, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d"), g;
    function rr(px, py, w, h, r) { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); }
    rr(0, 0, W, H, 56); x.clip();
    if (c.ds === "noche") { g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#1b1b1f"); g.addColorStop(1, "#050506"); x.fillStyle = g; x.fillRect(0, 0, W, H); g = x.createRadialGradient(W, 0, 0, W, 0, W * .9); g.addColorStop(0, COLOR); g.addColorStop(1, "rgba(0,0,0,0)"); x.globalAlpha = .6; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
    else { g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, COLOR); g.addColorStop(1, "#1a1a1a"); x.fillStyle = COLOR; x.fillRect(0, 0, W, H); x.globalAlpha = .45; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
      if (c.ds === "fiesta") { var sd = 7; function rn() { sd = (sd * 16807) % 2147483647; return sd / 2147483647; } for (var i = 0; i < 90; i++) { x.fillStyle = i % 2 ? "rgba(255,255,255,.3)" : "rgba(255,214,102,.55)"; x.beginPath(); x.arc(rn() * W, rn() * H, 3 + rn() * 5, 0, 7); x.fill(); } } }
    x.fillStyle = "#fff"; x.textBaseline = "top";
    x.font = "800 46px system-ui,-apple-system,sans-serif"; x.fillText(ICON + "  " + BRAND, 64, 60);
    x.font = "700 26px system-ui,sans-serif"; x.textAlign = "right"; x.fillText("TARJETA REGALO", W - 64, 72); x.textAlign = "left";
    x.font = "900 170px system-ui,sans-serif"; x.fillText(eur(c.am), 60, 230);
    x.font = "600 30px system-ui,sans-serif"; x.globalAlpha = .85; x.fillText("Para", 64, 560); x.globalAlpha = 1;
    x.font = "800 46px system-ui,sans-serif"; x.fillText(c.para, 64, 600);
    x.font = "700 34px ui-monospace,monospace"; x.textAlign = "right"; x.fillText(c.c, W - 64, 610);
    x.font = "500 24px system-ui,sans-serif"; x.globalAlpha = .85; x.fillText("De " + c.de + " · válida " + MONTHS + " meses", W - 64, 662);
    if (c.msg) { x.textAlign = "left"; x.font = "italic 30px Georgia,serif"; x.fillText("«" + c.msg.slice(0, 60) + (c.msg.length > 60 ? "…" : "") + "»", 64, 430); }
    cv.toBlob(function (b) { if (!b) return; var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "tarjeta-regalo-" + c.c + ".png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }, "image/png");
  }

  /* ---------- inclinación 3D al mover el puntero ---------- */
  if (!RM && window.matchMedia("(hover:hover)").matches) {
    var stg = sec.querySelector(".rg-stage");
    stg.addEventListener("pointermove", function (e) { var r = stg.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5; card.style.setProperty("--rx", (px * 14).toFixed(1) + "deg"); card.style.setProperty("--ry", (-py * 10).toFixed(1) + "deg"); card.style.setProperty("--sh", (px * 60).toFixed(0) + "%"); });
    stg.addEventListener("pointerleave", function () { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); card.style.setProperty("--sh", "-30%"); });
  }

  var pn_click;
  pn.addEventListener("click", function (e) { if (pn_click) pn_click(e); });
  form();
})();
