/* /bento.js — Tarjetas del bloque «Por qué elegirnos» que llevan a algún sitio (Agencia JS, oct 2026).
   Cada tarjeta lleva un enlace .bc-go (toda la tarjeta es pulsable) con:
   - href="#seccion"                → baja a esa sección
   - data-act="tab:plantas"          → abre esa pestaña del catálogo
   - data-act="item:rosas"           → baja al producto y lo resalta
   - data-act="wa:texto"             → abre WhatsApp con el texto */
(function () {
  "use strict";
  var S = window.SITE || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var go = function (el) { if (el) { el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); } };
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".bc-go"); if (!a) { return; }
    var act = a.dataset.act || "";
    if (!act) { return; }                                   // enlace normal a una sección
    e.preventDefault();
    var k = act.slice(0, act.indexOf(":")), v = act.slice(act.indexOf(":") + 1);
    if (k === "tab") {
      var t = document.querySelector('.tab[data-cat="' + v + '"]');
      if (t) { t.click(); go(document.getElementById("cat-grid") || t); }
    } else if (k === "item") {
      var all = document.querySelector('.tab[data-cat="all"]'); if (all && all.getAttribute("aria-selected") !== "true") { all.click(); }
      var c = document.querySelector('.pc[data-id="' + v + '"]');
      if (c) {
        // si está dentro de un carrusel o «Ver todos», se muestra
        var m = c.closest(".mmore"); if (m) { m.classList.add("mmore-on"); }
        go(c); c.classList.remove("bc-flash"); void c.offsetWidth; c.classList.add("bc-flash");
      }
    } else if (k === "wa") {
      window.open("https://wa.me/" + (S.wa || "") + "?text=" + encodeURIComponent(v), "_blank", "noopener");
    }
  });
})();
