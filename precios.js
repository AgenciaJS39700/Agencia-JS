/* /precios.js — Precios en la moneda del visitante y ajustados a su país (Agencia JS, oct 2026).
   window.GEO lo inyecta el Worker: { pais, grupo, factor, moneda, cambio:{EUR→moneda} }.
   - España (y quien no tenga país) ve los euros tal cual.
   - El resto ve su moneda con el precio de su grupo (A 100 %, B 70 %, C 50 %, D 38 %), redondeado a un número bonito.
   - Selector: solo cambia la MONEDA (local, USD o EUR); el nivel de precio es siempre el del país del visitante.
   - Para revisar cómo se ve en otro país: ?pais=CO (solo cambia la vista, no se guarda).
   Convierte todos los textos «349 €», «29 €/mes»… también los que aparecen después (chat, preguntas, test). */
(function () {
  "use strict";
  if (/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)) { return; }   // Google ve los euros
  var G = window.GEO || null;
  var NOMBRES = { AR: "Argentina", BO: "Bolivia", BR: "Brasil", CL: "Chile", CO: "Colombia", CR: "Costa Rica", CU: "Cuba", DO: "República Dominicana", EC: "Ecuador", GT: "Guatemala", HN: "Honduras", MX: "México", NI: "Nicaragua", PA: "Panamá", PE: "Perú", PY: "Paraguay", SV: "El Salvador", UY: "Uruguay", VE: "Venezuela", US: "Estados Unidos", CA: "Canadá", GB: "Reino Unido", CH: "Suiza", PL: "Polonia", CZ: "Chequia", HU: "Hungría", RO: "Rumanía", AU: "Australia", NZ: "Nueva Zelanda", NO: "Noruega", SE: "Suecia", DK: "Dinamarca", JP: "Japón", PR: "Puerto Rico" };
  // Prueba manual: ?pais=CO (usa las mismas tablas que el Worker)
  var q = (location.search.match(/[?&]pais=([A-Za-z]{2})/) || [])[1];
  if (q && G) {
    q = q.toUpperCase();
    var B = ["CL", "UY", "PA", "CR", "PL", "CZ", "SK", "SI", "HU", "HR", "EE", "LV", "LT", "RO", "BG"], C = ["MX", "CO", "PE", "EC", "BR", "DO"], D = ["AR", "BO", "PY", "VE", "HN", "NI", "GT", "SV", "CU"];
    var M = { US: "USD", PR: "USD", CA: "CAD", AU: "AUD", NZ: "NZD", GB: "GBP", CH: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", JP: "JPY", CL: "CLP", UY: "UYU", PA: "USD", CR: "CRC", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", MX: "MXN", CO: "COP", PE: "PEN", EC: "USD", BR: "BRL", DO: "DOP", AR: "USD", BO: "BOB", PY: "PYG", VE: "USD", HN: "HNL", NI: "NIO", GT: "GTQ", SV: "USD", CU: "USD" };
    var gr = B.indexOf(q) > -1 ? "B" : C.indexOf(q) > -1 ? "C" : D.indexOf(q) > -1 ? "D" : "A";
    var start = function (tabla) { G = { pais: q, grupo: gr, factor: { A: 1, B: 0.7, C: 0.5, D: 0.38 }[gr], moneda: M[q] || "EUR", cambio: tabla }; init(); };
    if (G.cambio && G.cambio.USD) { start(G.cambio); } else { fetch("/api/geo").then(function (r) { return r.json(); }).then(function (d) { start(d.cambio && d.cambio.USD ? d.cambio : { EUR: 1 }); }).catch(function () { start({ EUR: 1 }); }); }
    return;
  }
  init();

  function init() {
    if (!G || !G.pais || G.pais === "ES") { return; }
    var UE = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
    var fuera = UE.indexOf(G.pais) === -1;
    var local = G.moneda || "EUR";
    var moneda = local;
    try { moneda = sessionStorage.getItem("ajs_moneda") || local; } catch (e) { /* sin almacenamiento */ }
    if (moneda !== local && moneda !== "USD" && moneda !== "EUR") { moneda = local; }
    var soloVentajas = G.grupo === "A" && local === "EUR";     // mismo precio y moneda que España: solo el bloque de ventajas

    var RE = /(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?\s?€/g;
    var fmtCache = {};
    function fmt(v) {
      var f = fmtCache[moneda] || (fmtCache[moneda] = new Intl.NumberFormat("es-" + G.pais, { style: "currency", currency: moneda, maximumFractionDigits: 0, minimumFractionDigits: 0 }));
      var s = f.format(v);
      return moneda === "USD" ? s.replace(/^US\$\s?|^\$\s?/, "US$ ").replace(/\s?US\$$/, " US$") : s;
    }
    function bonito(v) {
      if (v <= 0) { return 0; }
      if (v < 100) { return Math.round(v); }
      var paso = Math.pow(10, Math.floor(Math.log10(v)) - 1);
      return Math.round(v / paso) * paso;
    }
    function convierte(eurTxt) {
      var n = parseFloat(eurTxt.replace(/\./g, "").replace(",", "."));
      if (!isFinite(n)) { return null; }
      var r = (G.cambio && G.cambio[moneda]) || (moneda === "EUR" ? 1 : null);
      if (r == null) { return null; }
      return fmt(bonito(n * G.factor * r));
    }
    function cambiaTexto(t) {
      var out = t.replace(RE, function (m, num) { var c = convierte(m.replace(/\s?€$/, "")); return c || m; });
      if (fuera) { out = out.replace(/IVA no incluido/g, "impuestos locales no incluidos").replace(/\(IVA no incluido\)/g, "(impuestos locales no incluidos)"); }
      return out;
    }
    // Se guarda el texto original en euros para poder cambiar de moneda sin perder el dato
    var ORIG = new WeakMap(), ORIG_ATTR = new WeakMap(), PUESTO = new WeakMap();   // PUESTO: lo que escribimos nosotros (para no reconvertirlo)
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, CODE: 1 };
    function nodo(n) {
      var o = ORIG.get(n);
      if (o == null) { if (n.nodeValue.indexOf("€") === -1 && !(fuera && n.nodeValue.indexOf("IVA no incluido") > -1)) { return; } o = n.nodeValue; ORIG.set(n, o); }
      var nv = cambiaTexto(o);
      if (n.nodeValue !== nv) { n.nodeValue = nv; }
      PUESTO.set(n, nv);
    }
    function atributos(el) {
      ["data-wa", "aria-label", "title"].forEach(function (a) {
        if (!el.hasAttribute || !el.hasAttribute(a)) { return; }
        var m = ORIG_ATTR.get(el) || {}; var o = m[a];
        if (o == null) { var v = el.getAttribute(a); if (v.indexOf("€") === -1) { return; } o = m[a] = v; ORIG_ATTR.set(el, m); }
        var nv = cambiaTexto(o); m["_" + a] = nv; if (el.getAttribute(a) !== nv) { el.setAttribute(a, nv); }
      });
    }
    function recorre(root) {
      if (!root) { return; }
      if (root.nodeType === 3) { if (!SKIP[root.parentNode && root.parentNode.nodeName]) { nodo(root); } return; }
      if (root.nodeType !== 1 || SKIP[root.nodeName] || root.id === "ajs-moneda") { return; }
      atributos(root);
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: function (x) { return x.nodeType === 1 ? (SKIP[x.nodeName] || x.id === "ajs-moneda" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT; }
      });
      var t, el = root.querySelectorAll("[data-wa],[aria-label],[title]");
      for (var i = 0; i < el.length; i++) { atributos(el[i]); }
      while ((t = w.nextNode())) { nodo(t); }
    }
    var ocupado = false;
    function todo() { ocupado = true; recorre(document.body); ocupado = false; }

    /* Selector de moneda (solo moneda; el nivel de precio es el del país) */
    function selector() {
      var anc = document.getElementById("planes"); if (!anc || document.getElementById("ajs-moneda")) { return; }
      var box = document.createElement("div"); box.id = "ajs-moneda"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Moneda de los precios");
      var ops = [local]; if (ops.indexOf("USD") === -1) { ops.push("USD"); } if (ops.indexOf("EUR") === -1) { ops.push("EUR"); }
      box.innerHTML = '<span class="am-t">🌎 Precios para <b>' + (NOMBRES[G.pais] || G.pais) + "</b></span>" + ops.map(function (c) { return '<button type="button" data-m="' + c + '" aria-pressed="' + (c === moneda) + '">' + c + "</button>"; }).join("");
      var head = anc.querySelector(".pay-tg") || anc.firstElementChild;
      head.parentNode.insertBefore(box, head);
      box.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-m]"); if (!b) { return; }
        moneda = b.dataset.m; try { sessionStorage.setItem("ajs_moneda", moneda); } catch (x) { /* nada */ }
        [].forEach.call(box.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        todo();
      });
      var st = document.createElement("style");
      st.textContent = "#ajs-moneda{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.45rem;margin:1.2rem auto .4rem;font-size:.85rem;color:#cfcfcf}" +
        "#ajs-moneda .am-t{margin-right:.3rem}#ajs-moneda b{color:#fff}" +
        "#ajs-moneda button{min-height:36px;padding:.3rem .8rem;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#e5e5e5;font-weight:800;font-size:.8rem;cursor:pointer}" +
        "#ajs-moneda button[aria-pressed=true]{background:#e8c766;border-color:#e8c766;color:#111}";
      document.head.appendChild(st);
      var nota = document.createElement("p"); nota.className = "am-n";
      nota.style.cssText = "text-align:center;font-size:.78rem;color:#9a9a9a;margin:.2rem auto 0;max-width:40rem";
      nota.textContent = "Precios orientativos adaptados a tu país. El presupuesto final se confirma contigo antes de empezar.";
      box.parentNode.insertBefore(nota, box.nextSibling);
    }

    /* Ventajas para clientes de fuera de España (31/10/2026): 3 cuotas sin intereses, +1 mes de
       mantenimiento gratis, garantía en el diseño y 1 mes gratis por recomendación. */
    function nombrePais() {
      try { return new Intl.DisplayNames(["es"], { type: "region" }).of(G.pais) || NOMBRES[G.pais] || G.pais; } catch (e) { return NOMBRES[G.pais] || G.pais; }
    }
    function bandera() {
      return /^[A-Z]{2}$/.test(G.pais) ? String.fromCodePoint.apply(null, G.pais.split("").map(function (c) { return 127397 + c.charCodeAt(0); })) : "🌎";
    }
    function cuotas() {
      [].forEach.call(document.querySelectorAll("#planes .pay-one .text-4xl"), function (sp) {
        var eur = parseInt(sp.dataset.precio || sp.textContent.replace(/\D/g, ""), 10);
        var p = sp.closest("p"); if (!eur || !p || p.parentNode.querySelector(".am-cu")) { return; }
        var c = document.createElement("p"); c.className = "am-cu";
        c.textContent = "o 3 cuotas de " + Math.ceil(eur / 3) + " € sin intereses";   // precios.js la pasa a la moneda del país
        p.parentNode.insertBefore(c, p.nextSibling);
      });
    }
    function ventajas() {
      var anc = document.getElementById("ajs-moneda") || (document.querySelector("#planes .pay-tg"));
      if (!anc || document.getElementById("ajs-ventajas")) { return; }
      var v = document.createElement("div"); v.id = "ajs-ventajas";
      v.innerHTML = '<p class="av-t">' + bandera() + " Ventajas para clientes de <b>" + nombrePais() + "</b></p>" +
        '<ul><li><b>3 cuotas</b> sin intereses</li><li><b>+1 mes</b> de mantenimiento gratis</li>' +
        '<li><b>Garantía:</b> si no te gusta el diseño, no pagas la segunda mitad</li>' +
        '<li><b>Recomienda</b> y gana 1 mes gratis por cada cliente</li></ul>';
      anc.parentNode.insertBefore(v, anc);
      var st = document.createElement("style");
      st.textContent = "#ajs-ventajas{max-width:46rem;margin:1.4rem auto .2rem;padding:1rem 1.1rem;border:1px solid rgba(232,199,102,.45);border-radius:18px;background:rgba(232,199,102,.06);color:#d9d9d9;font-size:.86rem}" +
        "#ajs-ventajas .av-t{margin:0 0 .6rem;text-align:center;font-weight:700;color:#e5e5e5}#ajs-ventajas b{color:#fff}" +
        "#ajs-ventajas ul{display:grid;gap:.45rem;margin:0;padding:0;list-style:none}@media(min-width:640px){#ajs-ventajas ul{grid-template-columns:1fr 1fr}}" +
        "#ajs-ventajas li{position:relative;padding-left:1.4rem;line-height:1.35}#ajs-ventajas li::before{content:'✓';position:absolute;left:0;color:#e8c766;font-weight:800}" +
        ".am-cu{margin:.35rem 0 0;font-size:.82rem;font-weight:700;color:#e8c766}";
      document.head.appendChild(st);
    }

    function arranca() {
      cuotas();
      if (!soloVentajas) { selector(); }
      ventajas();
      if (soloVentajas) { return; }
      todo();
      if ("MutationObserver" in window) {
        new MutationObserver(function (ms) {
          if (ocupado) { return; }
          ocupado = true;
          ms.forEach(function (m) {
            if (m.type === "characterData") { if (PUESTO.get(m.target) !== m.target.nodeValue) { ORIG.delete(m.target); nodo(m.target); } }
            else if (m.type === "attributes") { var mm = ORIG_ATTR.get(m.target); if (mm && mm["_" + m.attributeName] === m.target.getAttribute(m.attributeName)) { return; } if (mm) { delete mm[m.attributeName]; } atributos(m.target); }
            else { [].forEach.call(m.addedNodes, recorre); }
          });
          ocupado = false;
        }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["data-wa"] });
      }
    }
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", arranca); } else { arranca(); }
  }
})();
