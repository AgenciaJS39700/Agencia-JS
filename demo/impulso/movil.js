/* /movil.js — Optimización móvil común de Agencia JS (oct 2026).
   1) Carruseles (.mcar): puntos de posición + aviso «Desliza para ver más» + pasan solos cada 4,5 s.
   2) Barra de atajos bajo la cabecera, sacada de los enlaces del menú (#secciones). */
(function () {
  "use strict";
  var mq = window.matchMedia("(max-width: 767px)");
  var css = getComputedStyle(document.documentElement);
  var accent = (css.getPropertyValue("--brand") || css.getPropertyValue("--gold") || css.getPropertyValue("--accent") || "").trim() || "#e8c766";
  var onAccent = (css.getPropertyValue("--on-brand") || css.getPropertyValue("--on-gold") || "").trim() || "#111";

  /* 1) Carruseles (además de .mcar, listas que pintan los módulos de las maquetas) */
  [].forEach.call(document.querySelectorAll(".dts"), function (x) { x.classList.add("mcar"); });
  [].forEach.call(document.querySelectorAll(".mcar"), function (c) {
    var n = c.children.length; if (n < 2 || c.dataset.mcarOk) { return; }
    c.dataset.mcarOk = "1";
    var d = document.createElement("div"); d.className = "mdots"; d.setAttribute("aria-hidden", "true");
    for (var i = 0; i < n; i++) { d.appendChild(document.createElement("i")); }
    var h = document.createElement("span"); h.className = "mhint"; h.textContent = "Desliza para ver más →";
    c.parentNode.insertBefore(d, c.nextSibling); d.parentNode.insertBefore(h, d.nextSibling);
    var upd = function () {
      var f = c.firstElementChild, w = f ? f.getBoundingClientRect().width : 1, k = Math.round(c.scrollLeft / ((w || 1) + 12));
      [].forEach.call(d.children, function (x, j) { x.classList.toggle("on", j === Math.min(n - 1, k)); });
      if (c.scrollLeft > 20) { h.style.visibility = "hidden"; }
    };
    c.addEventListener("scroll", function () { window.requestAnimationFrame(upd); }, { passive: true });
    upd();
    autoCar(c);
  });

  /* 1d) Carruseles que pasan solos cada pocos segundos (como en las webs profesionales).
     Solo en móvil y cuando el carrusel se ve; se para al tocarlo y vuelve a los 9 s. Sin movimiento si el usuario lo pide. */
  function autoCar(c) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || c.dataset.autoOk || c.dataset.auto === "0") { return; }
    c.dataset.autoOk = "1";
    var ms = parseInt(c.dataset.auto, 10) || 4500, vis = false, pausa = 0, mqA = window.matchMedia("(max-width: 767px)");
    var idx = function () { var r = c.getBoundingClientRect(), m = r.left + r.width / 2, best = 0, bd = 1e9; [].forEach.call(c.children, function (x, i) { var b = x.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - m); if (d < bd) { bd = d; best = i; } }); return best; };
    var ir = function (i) { var x = c.children[i]; if (!x) { return; } var r = c.getBoundingClientRect(), b = x.getBoundingClientRect(); c.scrollTo({ left: c.scrollLeft + (b.left + b.width / 2) - (r.left + r.width / 2), behavior: "smooth" }); };
    var tick = function () {
      if (!mqA.matches || !vis || document.hidden || Date.now() < pausa || c.scrollWidth <= c.clientWidth + 8) { return; }
      var i = idx() + 1; if (i >= c.children.length || c.scrollLeft + c.clientWidth >= c.scrollWidth - 4) { i = 0; }
      ir(i);
    };
    ["touchstart", "pointerdown", "wheel", "focusin"].forEach(function (ev) { c.addEventListener(ev, function () { pausa = Date.now() + 9000; }, { passive: true }); });
    if ("IntersectionObserver" in window) { new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: 0.5 }).observe(c); } else { vis = true; }
    setInterval(tick, ms);
  }


  /* 1b) Bloques largos plegados en móvil: un botón los abre (formularios de regalo y tarjeta, horario…) */
  var FOLD = [[".rg-pn", "🎁 Regalar una tarjeta"], [".fx-pn", "✨ Crear mi tarjeta gratis"], [".hrs", "🕒 Ver horario completo"], ["#contacto .frm", "✉️ Escríbenos un mensaje"], [".mfold", ""]];
  FOLD.forEach(function (f) {
    [].forEach.call(document.querySelectorAll(f[0]), function (el) {
      if (el.dataset.mfoldOk) { return; }
      el.dataset.mfoldOk = "1"; el.classList.add("mfold-x");
      var b = document.createElement("button"); b.type = "button"; b.className = "mfold-b";
      b.textContent = el.dataset.label || f[1] || "Ver más"; b.setAttribute("aria-expanded", "false");
      b.addEventListener("click", function () { el.classList.add("mfold-on"); b.hidden = true; b.setAttribute("aria-expanded", "true"); var i = el.querySelector("input,select,textarea"); if (i && i.focus) { i.focus({ preventScroll: true }); } });
      el.parentNode.insertBefore(b, el);
    });
  });


  /* 1c) Listas muy largas (.mmore): en móvil se ven las 8 primeras y un botón muestra el resto */
  [].forEach.call(document.querySelectorAll(".mmore"), function (el) {
    if (el.dataset.mmoreOk) { return; }
    el.dataset.mmoreOk = "1";
    var b = document.createElement("button"); b.type = "button"; b.className = "mfold-b mmore-b"; b.textContent = el.dataset.more || "Ver todos";
    b.addEventListener("click", function () { el.classList.add("mmore-on"); b.hidden = true; });
    el.parentNode.insertBefore(b, el.nextSibling);
    var max = parseInt(el.dataset.max, 10) || 8;
    var sync = function () { b.hidden = el.classList.contains("mmore-on") || el.children.length <= max; };
    sync(); if ("MutationObserver" in window) { new MutationObserver(sync).observe(el, { childList: true }); }
  });

  /* 2) Barra de atajos */
  var hdr = document.querySelector("header"); if (!hdr || document.querySelector(".mjump")) { return; }
  var seen = {}, links = [];
  [].forEach.call(hdr.querySelectorAll("nav a[href^='#'], .nav a[href^='#']"), function (a) {
    var id = a.getAttribute("href"); if (id.length < 2 || seen[id] || !document.querySelector(id)) { return; }
    seen[id] = 1; links.push([id, (a.textContent || "").trim()]);
  });
  if (links.length < 3) { return; }
  var bar = document.createElement("nav"); bar.className = "mjump"; bar.setAttribute("aria-label", "Ir a una sección");
  links.slice(0, 8).forEach(function (l) { var a = document.createElement("a"); a.href = l[0]; a.textContent = l[1]; bar.appendChild(a); });
  // La barra va justo debajo de la cabecera, pegada al hacer scroll
  var hs = getComputedStyle(hdr), fixedHdr = hs.position === "sticky" || hs.position === "fixed";
  hdr.parentNode.insertBefore(bar, hdr.nextSibling);
  // Fondo: el de la cabecera; si es transparente o translúcido, el de la página con desenfoque (como la cabecera)
  var bg = hs.backgroundColor, bodyBg = getComputedStyle(document.body).backgroundColor, a = (bg.match(/[\d.]+(?=\)$)/) || ["1"])[0];
  var see = !bg || bg === "transparent" || /rgba|\//.test(bg) && parseFloat(a) < 0.99;
  if (see) { bg = bodyBg && !/rgba\(0, 0, 0, 0\)/.test(bodyBg) ? bodyBg : "rgba(20,20,20,.92)"; }
  bar.style.cssText = "position:sticky;z-index:" + (parseInt(hs.zIndex, 10) || 50) + ";background:" + bg + ";color:" + (see ? getComputedStyle(document.body).color : hs.color) + ";-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)";
  var place = function () { bar.style.top = (fixedHdr ? hdr.getBoundingClientRect().height : 0) + "px"; };
  place(); window.addEventListener("resize", place);
  var as = [].slice.call(bar.querySelectorAll("a"));
  var mark = function (id) {
    as.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("on", on); a.style.background = on ? accent : ""; a.style.color = on ? onAccent : "";
      if (on && mq.matches) { bar.scrollTo({ left: a.offsetLeft - bar.clientWidth / 2 + a.offsetWidth / 2, behavior: "smooth" }); }
    });
  };
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { mark(e.target.id); } }); }, { rootMargin: "-40% 0px -55% 0px" });
    links.forEach(function (l) { io.observe(document.querySelector(l[0])); });
  }
})();
