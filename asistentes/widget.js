// /asistentes/widget.js — Botón flotante del asistente de citas para la web de un cliente.
// Instalación (una línea antes de </body>):
//   <script src="https://agencia-js.com/asistentes/widget.js" data-negocio="SLUG" async></script>
// Opcional: data-texto="Pedir cita" · data-posicion="izquierda" · data-boton="no" (sin botón flotante).
// Cualquier enlace o botón con el atributo data-pedir-cita abre también el asistente.
(function () {
  "use strict";
  var s = document.currentScript;
  if (!s || window.__ajsCitas) return;
  window.__ajsCitas = true;
  var slug = s.getAttribute("data-negocio");
  if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug)) return;
  var base = new URL(s.src).origin;
  var mod = null;
  function cargar() { return mod || (mod = import(base + "/asistentes/asistente.js")); }
  function abrir(origen) {
    cargar().then(function (m) { return m.abrirNegocio(slug, { alCerrar: function () { if (origen && origen.focus) origen.focus(); } }); })
      .catch(function () { window.location.href = base + "/c/" + slug; });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-pedir-cita]");
    if (t) { e.preventDefault(); abrir(t); }
  });
  if (s.getAttribute("data-boton") === "no") return;

  fetch(base + "/api/as/" + slug + "/config").then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
    if (!cfg || !cfg.activo) return;
    var izq = s.getAttribute("data-posicion") === "izquierda";
    var st = document.createElement("style");
    st.textContent = ".ajs-fab{position:fixed;bottom:max(18px,env(safe-area-inset-bottom));" + (izq ? "left" : "right") + ":18px;z-index:2147483000;display:flex;align-items:center;gap:.5rem;min-height:52px;padding:.7rem 1.1rem;border:0;border-radius:999px;background:" + cfg.color + ";color:#0a0a0a;font:600 15px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.28);cursor:pointer;transition:transform .2s}" +
      ".ajs-fab:hover{transform:translateY(-2px)}.ajs-fab:focus-visible{outline:3px solid #111;outline-offset:3px}.ajs-fab svg{flex:none}" +
      ".ajs-fab:before{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:0 0 0 0 " + cfg.color + ";animation:ajs-p 2.6s 1.5s 3}" +
      "@keyframes ajs-p{to{box-shadow:0 0 0 14px transparent}}@media (prefers-reduced-motion:reduce){.ajs-fab,.ajs-fab:before{transition:none;animation:none}}" +
      "@media print{.ajs-fab{display:none}}html.as-lock .ajs-fab{display:none}";
    document.head.appendChild(st);
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ajs-fab";
    b.setAttribute("aria-label", "Pedir cita en " + cfg.negocio.nombre);
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
    b.appendChild(document.createTextNode(s.getAttribute("data-texto") || "Pedir cita"));
    b.addEventListener("click", function () { abrir(b); });
    b.addEventListener("pointerenter", cargar, { once: true });
    document.body.appendChild(b);
  }).catch(function () { /* sin conexión: no se muestra el botón */ });
})();
