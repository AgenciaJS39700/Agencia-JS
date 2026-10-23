/* amigos.js — Programa «Trae a un amigo» (demo) · Agencia JS
   Uso: <section id="amigos" data-brand="Tinta Negra" data-color="#e1251b" data-pct="15" data-min-sessions="2"
        data-cap="80" data-goal="3" data-goal-reward="una sesión de retoque y un kit de cuidados" data-wa="34600000000"
        data-theme="dark"></section>
   Mecánica tipo «da y recibe» de las grandes marcas: el amigo nuevo tiene descuento en su primer trabajo y quien
   invita lo recibe cuando el amigo termina; con varios amigos se desbloquea un premio extra.
   Rentable: solo en trabajos de varias sesiones, se descuenta en la última sesión (el trabajo ya está hecho),
   con tope por persona y sin acumular. Demo sin servidor: los datos se guardan solo en este navegador. */
(function () {
  "use strict";
  var sec = document.getElementById("amigos");
  if (!sec) return;
  var D = sec.dataset;
  var BRAND = D.brand || "Tu negocio", COLOR = D.color || "#e1251b", PCT = parseInt(D.pct, 10) || 15;
  var MINS = parseInt(D.minSessions, 10) || 2, CAP = parseInt(D.cap, 10) || 80, GOAL = parseInt(D.goal, 10) || 3;
  var GOALR = D.goalReward || "un regalo especial", WA = D.wa || "", DARK = D.theme === "dark";
  var PFX = BRAND.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(function (w) { return !/^(el|la|los|las|de|del|y)$/i.test(w); }).map(function (w) { return w[0] || ""; }).join("").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || "AM";
  var KEY = "am_" + BRAND.toLowerCase().replace(/[^a-z0-9]+/g, "");
  var RE = new RegExp("^" + PFX + "-[A-Z]{2,8}-[A-Z0-9]{2}$");

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(m) { try { if (m) localStorage.setItem(KEY, JSON.stringify(m)); else localStorage.removeItem(KEY); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function eur(n) { return Math.round(n).toLocaleString("es-ES") + " €"; }
  function slug(n) { return n.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8); }
  var M = load();

  var css = ".am{--ac:" + COLOR + ";padding:clamp(3.5rem,8vw,6.5rem) 0;position:relative;overflow:hidden}" +
    ".am .am-w{width:min(1120px,100% - 32px);margin-inline:auto;display:grid;gap:clamp(1.5rem,4vw,3.5rem);grid-template-columns:minmax(0,1fr);align-items:start}" +
    "@media(min-width:900px){.am .am-w{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}}" +
    ".am .am-k{display:inline-block;font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--ac)}" +
    ".am h2{font-family:inherit;font-size:clamp(1.9rem,4.6vw,3.2rem);line-height:1.02;margin:.4rem 0 .8rem;letter-spacing:-.01em}.am h2 span{color:var(--ac)}" +
    ".am .am-l{opacity:.8;max-width:54ch;font-size:1.05rem}" +
    ".am .am-steps{display:grid;gap:.7rem;margin:1.4rem 0;padding:0;list-style:none;counter-reset:s}" +
    ".am .am-steps li{display:flex;gap:.8rem;align-items:flex-start;counter-increment:s}.am .am-steps li:before{content:counter(s);flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:900;background:var(--ac);color:#fff}" +
    ".am .am-steps b{display:block}.am .am-steps span{opacity:.75;font-size:.92rem}" +
    ".am .am-calc{border:1px solid var(--line,rgba(0,0,0,.12));border-radius:20px;padding:1.1rem}" +
    ".am .am-calc h3{font-size:1.05rem;margin-bottom:.6rem}.am .am-cr{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}@media(max-width:480px){.am .am-cr{grid-template-columns:1fr}}" +
    ".am label{display:block;font-weight:700;font-size:.85rem;margin:.5rem 0 .35rem}" +
    ".am input[type=range]{width:100%;accent-color:var(--ac);min-height:32px}" +
    ".am .am-out{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.8rem}.am .am-out div{border-radius:14px;padding:.8rem;background:color-mix(in srgb,var(--ac) 12%,transparent)}.am .am-out small{display:block;opacity:.75;font-size:.78rem}.am .am-out b{font-size:1.5rem;line-height:1.1}" +
    ".am .am-pn{background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:clamp(1.1rem,3vw,1.6rem);box-shadow:0 30px 60px -40px rgba(0,0,0,.4)}" +
    ".am .am-tabs{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;padding:.3rem;border-radius:14px;background:rgba(0,0,0,.06);margin-bottom:1rem}" +
    ".am .am-tabs button{min-height:44px;border:0;border-radius:11px;background:transparent;color:inherit;font:inherit;font-weight:800;font-size:.9rem;cursor:pointer}.am .am-tabs button[aria-selected=true]{background:var(--ac);color:#fff}" +
    ".am input[type=text],.am select{width:100%;min-height:48px;border-radius:14px;border:1.5px solid rgba(0,0,0,.15);padding:0 14px;font:inherit;background:#fff;color:#111}" +
    ".am input:focus-visible,.am button:focus-visible,.am a:focus-visible,.am select:focus-visible{outline:3px solid var(--ac);outline-offset:2px}" +
    ".am .am-bm{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:52px;border:0;border-radius:14px;padding:0 1.2rem;font:inherit;font-weight:800;cursor:pointer;background:var(--ac);color:#fff;width:100%;margin-top:1rem;text-decoration:none}" +
    ".am .am-bs{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;flex:1;min-height:46px;border-radius:12px;border:1.5px solid rgba(0,0,0,.15);background:#fff;color:#111;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer;padding:0 .8rem;text-decoration:none}" +
    ".am .am-row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.8rem}" +
    ".am .am-code{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.6rem;padding:.8rem 1rem;border-radius:14px;border:2px dashed var(--ac);font:800 1.15rem/1 ui-monospace,monospace;letter-spacing:.06em}" +
    ".am .am-pr{margin-top:1.1rem}.am .am-bar{height:10px;border-radius:99px;background:rgba(0,0,0,.08);overflow:hidden;margin:.5rem 0}.am .am-bar i{display:block;height:100%;background:var(--ac);border-radius:99px;transition:width .6s cubic-bezier(.2,.8,.2,1)}" +
    ".am .am-ok{padding:.9rem 1rem;border-radius:14px;background:color-mix(in srgb,var(--ac) 12%,#fff);font-weight:700;margin-top:.8rem}" +
    ".am .am-er{color:#b42318;font-weight:700;font-size:.85rem;min-height:1.2em;margin-top:.5rem}" +
    ".am .am-dm{font-size:.78rem;opacity:.65;margin-top:.8rem}.am .am-lk{background:none;border:0;color:inherit;opacity:.6;text-decoration:underline;font:inherit;font-size:.8rem;cursor:pointer;margin-top:.8rem}" +
    ".am details{margin-top:1rem;font-size:.85rem}.am details summary{cursor:pointer;font-family:inherit;font-weight:700;font-size:.9rem;line-height:1.4;text-transform:none;letter-spacing:0;min-height:32px;padding:.3rem 0}.am details ul{margin:.5rem 0 0 1.1rem;display:grid;gap:.3rem;opacity:.85}" +
    ".am.am-dark .am-pn{background:#151515;border-color:rgba(255,255,255,.1)}.am.am-dark .am-calc{border-color:rgba(255,255,255,.12)}" +
    ".am.am-dark input[type=text],.am.am-dark select{background:#0d0d0d;color:#f4f4f4;border-color:rgba(255,255,255,.2)}.am.am-dark .am-tabs{background:rgba(255,255,255,.06)}" +
    ".am.am-dark .am-bs{background:#1d1d1d;color:#f4f4f4;border-color:rgba(255,255,255,.2)}.am.am-dark .am-ok{background:color-mix(in srgb,var(--ac) 20%,#151515)}.am.am-dark .am-bar{background:rgba(255,255,255,.1)}.am.am-dark .am-er{color:#ff8a80}" +
    "@media(prefers-reduced-motion:reduce){.am *{animation:none!important;transition:none!important}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  sec.classList.add("am");
  if (DARK) sec.classList.add("am-dark");
  sec.setAttribute("aria-labelledby", "am-t");
  sec.innerHTML =
    '<div class="am-w"><div>' +
      '<span class="am-k">Trae a un amigo</span>' +
      '<h2 id="am-t"><span>' + PCT + ' %</span> para ti.<br><span>' + PCT + ' %</span> para tu amigo.</h2>' +
      '<p class="am-l">Los mejores clientes nos llegan de vuestra mano. Si tu amigo se hace con nosotros un trabajo de ' + MINS + ' sesiones o más, los dos ganáis.</p>' +
      '<ol class="am-steps"><li><p><b>Comparte tu código</b><span>Lo creas aquí en un momento y se lo mandas por WhatsApp.</span></p></li>' +
      '<li><p><b>Tu amigo reserva con tu código</b><span>Tiene un ' + PCT + ' % en su tatuaje de ' + MINS + ' o más sesiones.</span></p></li>' +
      '<li><p><b>Cuando termina, te toca a ti</b><span>Se activa tu ' + PCT + ' % para tu próxima sesión. Con ' + GOAL + ' amigos te llevas ' + esc(GOALR) + '.</span></p></li></ol>' +
      '<div class="am-calc"><h3>¿Cuánto ahorráis?</h3><div class="am-cr">' +
        '<div><label for="am-s">Sesiones del tatuaje de tu amigo: <b id="am-sv"></b></label><input type="range" id="am-s" min="' + MINS + '" max="6" value="' + Math.max(MINS, 3) + '"></div>' +
        '<div><label for="am-p">Precio por sesión</label><select id="am-p"><option value="150">150 €</option><option value="200" selected>200 €</option><option value="250">250 €</option><option value="300">300 €</option></select></div>' +
      '</div><div class="am-out" aria-live="polite"><div><small>Ahorra tu amigo</small><b id="am-o1"></b></div><div><small>Ahorras tú (próxima sesión)</small><b id="am-o2"></b></div></div>' +
      '<p class="am-dm" style="margin-top:.6rem">Descuento máximo de ' + CAP + ' € por persona y trabajo.</p></div>' +
    '</div><div>' +
      '<div class="am-pn"><div class="am-tabs" role="tablist" aria-label="Programa de amigos"><button type="button" role="tab" id="am-ta" aria-selected="true" aria-controls="am-pa">Invitar a un amigo</button><button type="button" role="tab" id="am-tb" aria-selected="false" aria-controls="am-pb">Tengo un código</button></div>' +
        '<div role="tabpanel" id="am-pa" aria-labelledby="am-ta"></div>' +
        '<div role="tabpanel" id="am-pb" aria-labelledby="am-tb" hidden></div>' +
        '<details><summary>Condiciones</summary><ul>' +
          '<li>Para amigos que nunca se han tatuado en ' + esc(BRAND) + '.</li>' +
          '<li>Válido en trabajos de ' + MINS + ' sesiones o más. El descuento se aplica en la última sesión; la señal no se descuenta.</li>' +
          '<li>Máximo ' + CAP + ' € de descuento por persona y trabajo. No acumulable con otras promociones.</li>' +
          '<li>Tu ' + PCT + ' % se activa cuando tu amigo termina su tatuaje y es válido durante 12 meses.</li>' +
          '<li>Premio de ' + GOAL + ' amigos: una vez al año.</li></ul></details>' +
      '</div>' +
    '</div></div>';

  var pa = sec.querySelector("#am-pa"), pb = sec.querySelector("#am-pb"), ta = sec.querySelector("#am-ta"), tb = sec.querySelector("#am-tb");

  /* ---------- calculadora ---------- */
  var sR = sec.querySelector("#am-s"), pS = sec.querySelector("#am-p");
  function calc() {
    var s = +sR.value, p = +pS.value;
    sec.querySelector("#am-sv").textContent = s;
    sec.querySelector("#am-o1").textContent = eur(Math.min(CAP, s * p * PCT / 100));
    sec.querySelector("#am-o2").textContent = eur(Math.min(CAP, p * PCT / 100));
  }
  sR.addEventListener("input", calc); pS.addEventListener("change", calc); calc();

  /* ---------- pestañas ---------- */
  function tab(b) {
    var a = b === ta; ta.setAttribute("aria-selected", String(a)); tb.setAttribute("aria-selected", String(!a)); pa.hidden = !a; pb.hidden = a;
  }
  ta.addEventListener("click", function () { tab(ta); }); tb.addEventListener("click", function () { tab(tb); });
  sec.querySelector(".am-tabs").addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { var n = document.activeElement === ta ? tb : ta; tab(n); n.focus(); } });

  /* ---------- invitar ---------- */
  function shareTxt() { return "¡Te invito a " + BRAND + "! Con mi código " + M.c + " tienes un " + PCT + " % en tu tatuaje (trabajos de " + MINS + " sesiones o más). " + location.href.split("#")[0] + "#amigos"; }
  function drawInvite() {
    if (!M) {
      pa.innerHTML = '<form id="am-f" novalidate><label for="am-n">Tu nombre</label><input type="text" id="am-n" maxlength="24" autocomplete="given-name" required>' +
        '<button class="am-bm" type="submit">Crear mi código</button><p class="am-er" id="am-e" role="alert"></p></form>' +
        '<p class="am-dm">Demostración: tu código se guarda solo en este navegador.</p>';
      pa.querySelector("#am-f").addEventListener("submit", function (e) {
        e.preventDefault();
        var n = pa.querySelector("#am-n").value.trim(), s = slug(n);
        if (s.length < 2) { pa.querySelector("#am-e").textContent = "Escribe tu nombre (al menos 2 letras)."; return; }
        var r = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        M = { n: n.slice(0, 24), c: PFX + "-" + s + "-" + r[Math.floor(Math.random() * r.length)] + r[Math.floor(Math.random() * r.length)], k: 0 };
        save(M); drawInvite();
      });
      return;
    }
    var k = Math.min(M.k, GOAL), left = GOAL - k;
    pa.innerHTML = '<p style="font-weight:700">¡Hola, ' + esc(M.n) + '! Este es tu código:</p>' +
      '<div class="am-code"><span>' + esc(M.c) + '</span><button type="button" class="am-bs" data-a="copy" style="flex:none;min-height:38px">Copiar</button></div>' +
      '<a class="am-bm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(shareTxt()) + '">💬 Enviar por WhatsApp</a>' +
      '<div class="am-pr"><p><b>' + k + " de " + GOAL + "</b> amigos tatuados" + (left > 0 ? " · te falta" + (left > 1 ? "n " : " ") + left + " para " + esc(GOALR) : "") + '</p><div class="am-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + GOAL + '" aria-valuenow="' + k + '"><i style="width:' + (k / GOAL * 100) + '%"></i></div></div>' +
      (M.k > 0 ? '<div class="am-ok">🎉 Tienes ' + M.k + ' descuento' + (M.k > 1 ? "s" : "") + ' del ' + PCT + ' % para tus próximas sesiones.' + (k >= GOAL ? "<br>🏆 ¡Premio desbloqueado: " + esc(GOALR) + "!" : "") + "</div>" : "") +
      '<div class="am-row"><button type="button" class="am-bs" data-a="sim">🧪 Simular que un amigo termina su tatuaje</button></div>' +
      '<button type="button" class="am-lk" data-a="reset">Borrar mi código (demo)</button>';
  }
  pa.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || !M) return;
    if (b.dataset.a === "copy") { (navigator.clipboard ? navigator.clipboard.writeText(M.c) : Promise.reject()).then(function () { b.textContent = "Copiado"; }, function () {}); }
    else if (b.dataset.a === "sim") { M.k++; save(M); drawInvite(); }
    else if (b.dataset.a === "reset") { M = null; save(null); drawInvite(); }
  });

  /* ---------- tengo un código ---------- */
  pb.innerHTML = '<form id="am-g" novalidate><label for="am-c">Código de tu amigo</label><input type="text" id="am-c" maxlength="16" placeholder="' + PFX + '-NOMBRE-XX" autocomplete="off" spellcheck="false" style="text-transform:uppercase">' +
    '<button class="am-bm" type="submit">Aplicar código</button><p class="am-er" id="am-ge" role="alert"></p></form><div id="am-gr" aria-live="polite"></div>';
  pb.querySelector("#am-g").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = pb.querySelector("#am-c").value.trim().toUpperCase(), er = pb.querySelector("#am-ge"), out = pb.querySelector("#am-gr");
    er.textContent = ""; out.innerHTML = "";
    if (!RE.test(v)) { er.textContent = "Ese código no es válido. Tiene esta forma: " + PFX + "-NOMBRE-XX."; return; }
    if (M && M.c === v) { er.textContent = "No puedes usar tu propio código 😉"; return; }
    var msg = "Hola, quiero reservar un tatuaje en " + BRAND + " con el código de amigo " + v + " (" + PCT + " % de descuento).";
    out.innerHTML = '<div class="am-ok">✓ Código aplicado: ' + PCT + ' % en tu tatuaje de ' + MINS + ' o más sesiones (hasta ' + CAP + ' €).</div>' +
      (WA ? '<a class="am-bm" target="_blank" rel="noopener" href="https://wa.me/' + encodeURIComponent(WA) + "?text=" + encodeURIComponent(msg) + '">Reservar con este código</a>' : "");
  });

  drawInvite();
})();
