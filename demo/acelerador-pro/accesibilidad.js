/* accesibilidad.js — Agencia JS (común a la web de la agencia y a las demos)
   - Activa solo .a11y-contraste si el sistema pide más contraste o colores forzados, y .a11y-quieto si pide menos movimiento.
   - Añade un botón «Accesibilidad» con: letra más grande, alto contraste y sin animaciones.
   - Lo que elige cada visitante se recuerda solo en su navegador (sin cookies ni envío de datos). */
(function () {
  "use strict";
  var raiz = document.documentElement;
  var CLAVE = "ajs-a11y";
  var OPCIONES = [
    { id: "grande", txt: "Letra más grande" },
    { id: "contraste", txt: "Alto contraste" },
    { id: "quieto", txt: "Sin animaciones" }
  ];
  var elegido = {};
  try { elegido = JSON.parse(localStorage.getItem(CLAVE) || "{}") || {}; } catch (e) { elegido = {}; }

  function mq(q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; }
  var sisContraste = mq("(prefers-contrast: more)"), sisForzado = mq("(forced-colors: active)"), sisMono = mq("(monochrome)");
  var sisQuieto = mq("(prefers-reduced-motion: reduce)");

  function aplicar() {
    var c = elegido.contraste === undefined ? (sisContraste.matches || sisForzado.matches || sisMono.matches) : elegido.contraste;
    var q = elegido.quieto === undefined ? sisQuieto.matches : elegido.quieto;
    raiz.classList.toggle("a11y-contraste", !!c);
    raiz.classList.toggle("a11y-quieto", !!q);
    raiz.classList.toggle("a11y-grande", !!elegido.grande);
    if (q) { document.querySelectorAll("video[autoplay], video.lv").forEach(function (v) { try { v.pause(); } catch (e) {} }); }
    botones.forEach(function (b) {
      var id = b.getAttribute("data-a11y");
      b.setAttribute("aria-pressed", raiz.classList.contains("a11y-" + id) ? "true" : "false");
    });
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(elegido)); } catch (e) { /* modo privado: solo para esta visita */ } }
  [sisContraste, sisForzado, sisMono, sisQuieto].forEach(function (m) {
    if (m.addEventListener) { m.addEventListener("change", aplicar); } else if (m.addListener) { m.addListener(aplicar); }
  });

  var botones = [];
  aplicar();

  function montar() {
    if (document.querySelector(".a11y-btn")) { return; }
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "a11y-btn";
    btn.setAttribute("aria-label", "Opciones de accesibilidad");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "a11yPan");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M4 8l8 2 8-2M12 10v5m0 0l-3 6m3-6l3 6"/></svg>';
    var pan = document.createElement("div");
    pan.className = "a11y-pan";
    pan.id = "a11yPan";
    pan.setAttribute("role", "dialog");
    pan.setAttribute("aria-label", "Accesibilidad");
    pan.hidden = true;
    var html = '<h2>Accesibilidad</h2><p>Esta web ya sigue el tamaño de letra, el contraste y las animaciones que tengas en tu móvil u ordenador. Aquí puedes ajustarlo solo para esta web.</p>';
    OPCIONES.forEach(function (o) { html += '<button type="button" data-a11y="' + o.id + '" aria-pressed="false">' + o.txt + "</button>"; });
    html += '<button type="button" class="a11y-x" data-a11y-reset>Volver a lo de mi dispositivo</button><button type="button" class="a11y-x" data-a11y-cerrar>Cerrar</button>';
    pan.innerHTML = html;
    document.body.appendChild(btn);
    document.body.appendChild(pan);
    botones = [].slice.call(pan.querySelectorAll("[data-a11y]"));
    function abrir(si) {
      pan.hidden = !si;
      btn.setAttribute("aria-expanded", si ? "true" : "false");
      if (si) { botones[0].focus(); } else { btn.focus(); }
    }
    btn.addEventListener("click", function () { abrir(pan.hidden); });
    pan.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) { return; }
      if (b.hasAttribute("data-a11y-cerrar")) { abrir(false); return; }
      if (b.hasAttribute("data-a11y-reset")) { elegido = {}; guardar(); aplicar(); return; }
      var id = b.getAttribute("data-a11y");
      elegido[id] = !raiz.classList.contains("a11y-" + id);
      guardar();
      aplicar();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pan.hidden) { abrir(false); } });
    aplicar();
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", montar); } else { montar(); }
})();
