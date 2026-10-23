/* appkit.js — «Modo app» para las demos de Agencia JS: barra inferior en el móvil, instalación como app (PWA)
   y citas al calendario con recordatorios.
   Uso: <script src="appkit.js" defer data-color="#b3600d" data-theme="light|dark" data-hide=".mb"
          data-items='[{"i":"grid","l":"Pan","h":"#catalogo"},{"i":"phone","l":"Llamar","h":"tel:+34600000000"},
                       {"i":"bag","l":"Pedido","c":"[data-opencart]","b":"[data-cartn]"}]'></script>
   · i: icono (grid, book, cake, card, gift, cal, phone, bag, users, sparkles, brush, chat)
   · h: ancla o enlace · c: selector de un botón existente al que «pulsa» · b: selector de un contador a copiar
   Calendario: AJSCal.descargar({ titulo, inicio: Date, minutos, lugar, nota, avisos: [minutos antes],
                                   extra: [{ titulo, inicio, minutos, nota, avisos }] }, "archivo.ics") */
(function () {
  "use strict";
  var me = document.currentScript || document.querySelector('script[src*="appkit.js"]');
  var D = (me && me.dataset) || {};
  var COLOR = D.color || "#111111", DARK = D.theme === "dark", BP = parseInt(D.bp, 10) || 900;

  /* ---------- calendario (.ics con avisos) ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function fmt(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00"; }
  function txt(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1"); }
  function evento(e, n) {
    var fin = new Date(e.inicio.getTime() + (e.minutos || 60) * 60000), L = [
      "BEGIN:VEVENT", "UID:" + Date.now() + "-" + n + "@agencia-js.com", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART:" + fmt(e.inicio), "DTEND:" + fmt(fin), "SUMMARY:" + txt(e.titulo)];
    if (e.lugar) L.push("LOCATION:" + txt(e.lugar));
    if (e.nota) L.push("DESCRIPTION:" + txt(e.nota));
    (e.avisos || []).forEach(function (m) {
      var t = m >= 1440 && m % 1440 === 0 ? "-P" + m / 1440 + "D" : m >= 60 && m % 60 === 0 ? "-PT" + m / 60 + "H" : "-PT" + m + "M";
      L.push("BEGIN:VALARM", "TRIGGER:" + t, "ACTION:DISPLAY", "DESCRIPTION:" + txt(e.titulo), "END:VALARM");
    });
    L.push("END:VEVENT");
    return L.join("\r\n");
  }
  window.AJSCal = {
    ics: function (e) {
      var ev = [evento(e, 0)];
      (e.extra || []).forEach(function (x, i) { ev.push(evento({ titulo: x.titulo, inicio: x.inicio, minutos: x.minutos || 30, lugar: x.lugar || e.lugar, nota: x.nota, avisos: x.avisos }, i + 1)); });
      return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agencia JS//Demo//ES", "CALSCALE:GREGORIAN"].concat(ev, ["END:VCALENDAR"]).join("\r\n");
    },
    descargar: function (e, nombre) {
      var url = URL.createObjectURL(new Blob([this.ics(e)], { type: "text/calendar;charset=utf-8" }));
      var a = document.createElement("a"); a.href = url; a.download = nombre || "cita.ics"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    },
    /** Fecha local a partir de "2026-10-30" y "17:30". */
    fecha: function (dia, hora) { var p = String(dia).split("-"), h = String(hora || "10:00").split(":"); return new Date(+p[0], +p[1] - 1, +p[2], +h[0] || 0, +h[1] || 0); },
    /** Suma días a una fecha. */
    mas: function (d, dias) { var x = new Date(d); x.setDate(x.getDate() + dias); return x; }
  };

  /* ---------- modo app (PWA) ---------- */
  if ("serviceWorker" in navigator && D.sw !== "no" && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    window.addEventListener("load", function () { navigator.serviceWorker.register(D.sw || "sw.js").catch(function () {}); });
  }

  /* ---------- barra inferior ---------- */
  var items = [];
  try { items = JSON.parse(D.items || "[]"); } catch (e) { items = []; }
  if (!items.length) return;
  var P = {
    grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    brush: '<path d="m9.1 11.9 8-8.1a2.9 2.9 0 1 1 4.1 4.1l-8.1 8"/><path d="M7.1 14.9c-1.7 0-3 1.4-3 3 0 1.3-2.5 1.5-2 2 1.1 1.1 2.5 2 4 2 2.2 0 4-1.8 4-4a3 3 0 0 0-3-3z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/>'
  };
  var css = "@media(max-width:" + (BP - 1) + "px){" +
    ".ajs-tab{position:fixed;left:0;right:0;bottom:0;z-index:70;display:grid;grid-template-columns:repeat(" + items.length + ",1fr);padding:6px 6px calc(6px + env(safe-area-inset-bottom));" +
    "background:" + (DARK ? "rgba(12,12,12,.9)" : "rgba(255,255,255,.88)") + ";backdrop-filter:blur(16px) saturate(1.4);-webkit-backdrop-filter:blur(16px) saturate(1.4);border-top:1px solid " + (DARK ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.08)") + ";box-shadow:0 -8px 30px rgba(0,0,0," + (DARK ? ".5" : ".08") + ")}" +
    ".ajs-tab a,.ajs-tab button{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:52px;border:0;background:none;border-radius:14px;color:" + (DARK ? "#a3a3a3" : "#6b6b6b") + ";font:600 11px/1.1 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-decoration:none;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:color .2s,background .2s}" +
    ".ajs-tab svg{width:23px;height:23px;transition:transform .25s cubic-bezier(.2,.9,.3,1.4)}" +
    ".ajs-tab .on{color:" + COLOR + "}.ajs-tab .on svg{transform:translateY(-1px) scale(1.08)}" +
    ".ajs-tab .on:before{content:'';position:absolute;top:2px;width:22px;height:3px;border-radius:3px;background:" + COLOR + "}" +
    ".ajs-tab a:active,.ajs-tab button:active{background:" + (DARK ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)") + "}" +
    ".ajs-tab a:focus-visible,.ajs-tab button:focus-visible{outline:2px solid " + COLOR + ";outline-offset:-2px}" +
    ".ajs-tab .bd{position:absolute;top:5px;left:calc(50% + 6px);min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:" + COLOR + ";color:#fff;font-size:10.5px;line-height:18px;text-align:center}" +
    ".ajs-tab .bd[hidden]{display:none}" +
    "html.ajs-has-tab body{padding-bottom:calc(66px + env(safe-area-inset-bottom))}" +
    "html.ajs-has-tab #ajs-demo{bottom:calc(76px + env(safe-area-inset-bottom))!important}" +
    (D.hide ? "html.ajs-has-tab " + D.hide.split(",").join(",html.ajs-has-tab ") + "{display:none!important}" : "") +
    (D.lift ? "html.ajs-has-tab " + D.lift.split(",").join(",html.ajs-has-tab ") + "{translate:0 calc(-64px - env(safe-area-inset-bottom))}" : "") +
    "}@media(min-width:" + BP + "px){.ajs-tab{display:none}}" +
    "@media(prefers-reduced-motion:reduce){.ajs-tab *{transition:none!important}}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var nav = document.createElement("nav");
  nav.className = "ajs-tab"; nav.setAttribute("aria-label", "Accesos rápidos");
  var watch = [];
  items.forEach(function (it) {
    var el;
    if (it.c) { el = document.createElement("button"); el.type = "button"; el.addEventListener("click", function () { var t = document.querySelector(it.c); if (t) t.click(); }); }
    else { el = document.createElement("a"); el.href = it.h || "#"; if (/^#./.test(it.h || "")) watch.push([it.h.slice(1), el]); }
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[it.i] || P.grid) + "</svg><span>" + it.l + "</span>";
    if (it.b) {
      var bd = document.createElement("span"); bd.className = "bd"; bd.hidden = true; bd.setAttribute("aria-hidden", "true"); el.appendChild(bd);
      var src = document.querySelector(it.b);
      var sync = function () { var n = src ? parseInt(src.textContent, 10) || 0 : 0; bd.textContent = n; bd.hidden = !n; el.setAttribute("aria-label", it.l + (n ? " (" + n + ")" : "")); };
      if (src) { new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true }); }
      sync();
    }
    nav.appendChild(el);
  });
  document.body.appendChild(nav);
  document.documentElement.classList.add("ajs-has-tab");

  /* sección activa */
  if ("IntersectionObserver" in window && watch.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        watch.forEach(function (w) { var on = w[0] === e.target.id; w[1].classList.toggle("on", on); if (on) w[1].setAttribute("aria-current", "true"); else w[1].removeAttribute("aria-current"); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    watch.forEach(function (w) { var t = document.getElementById(w[0]); if (t) io.observe(t); });
  }
})();
