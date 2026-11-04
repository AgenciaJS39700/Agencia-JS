/* asistente.js — Asistente de Residencial Mirador del Norte.
   Responde con la base de preguntas frecuentes (faq.json) y con los datos reales de la lista de precios
   (window.CN, que publica la página): viviendas concretas («¿el 3ºA está libre?»), filtros por dormitorios
   o presupuesto y simulación orientativa de hipoteca. Si no entiende, ofrece hablar con una persona.
   Todo funciona en el navegador, sin enviar las preguntas a ningún servidor. */
(function () {
  "use strict";
  var CN = window.CN; if (!CN) return;
  var $ = function (s) { return document.querySelector(s); };
  var ch = $("#ch"), log = $("#chLog"), fab = $("#chFab"), inp = $("#chI");
  var DB = null, cargando = null, hi = 0, fallos = 0;
  var eur = CN.eur, VIV = CN.VIV, WA = CN.WA, TEL = "+34688933308";
  var disp = function () { return VIV.filter(function (v) { return v.e === "d"; }); };

  /* ---------- utilidades de texto ---------- */
  function nrm(t) {
    return (" " + String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[º°ª]/g, "o").replace(/[¿?¡!.,;:()"'«»]/g, " ").replace(/\s+/g, " ") + " ");
  }
  var STOP = " a al algo como con de del el en es esta este hay la las lo los me mi mas no o para pero por que se si su sus te tiene tienen tu un una unos y ya yo vosotros teneis puedo puede quiero saber hola buenas ";
  function tokens(n) { return n.trim().split(" ").filter(function (w) { return w.length > 1 && STOP.indexOf(" " + w + " ") < 0; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function minDe(f) { var l = disp().filter(f); return l.length ? eur(Math.min.apply(null, l.map(function (v) { return v.pr; }))) : "consultar"; }
  function nombre(v) { return (v.pl === 6 ? "Ático " : "Vivienda ") + v.id; }
  var EST = { d: "disponible", r: "reservada", v: "vendida" };

  /* ---------- simulador de hipoteca (orientativo) ---------- */
  var TIPO = 2.9, ANOS = 30, FIN = 0.8;
  function cuota(capital, tipo, anos) { var i = tipo / 100 / 12, n = anos * 12; return capital * i / (1 - Math.pow(1 + i, -n)); }
  function simulacion(precio, etiqueta) {
    var conIva = precio * 1.10, prest = Math.round(precio * FIN / 1000) * 1000, c = Math.round(cuota(prest, TIPO, ANOS));
    var propios = Math.round((conIva - prest + precio * 0.02) / 1000) * 1000;
    return "Ejemplo para " + etiqueta + " de <b>" + eur(precio) + "</b>: con una hipoteca del 80 % (" + eur(prest) + ") a " + ANOS + " años y un tipo fijo del " +
      String(TIPO).replace(".", ",") + " %, la cuota sería de unos <b>" + eur(c) + " al mes</b>. Necesitarías unos <b>" + eur(propios) +
      "</b> de ahorros para la entrada, el IVA y los gastos.<br><small>Simulación orientativa, no es una oferta vinculante: el tipo real depende del banco y de tu perfil.</small>";
  }

  /* ---------- lectura de la pregunta: vivienda concreta, dormitorios, presupuesto ---------- */
  var ORD = { primero: 1, primer: 1, segundo: 2, tercero: 3, tercer: 3, cuarto: 4, quinto: 5, sexto: 6, atico: 6 };
  function vivienda(n) {
    var m = n.match(/ ([1-6]) ?o? ?-?([abcd]) /) || n.match(/ planta ([1-6]) ?([abcd]) /);
    if (m) return VIV.filter(function (v) { return v.pl === +m[1] && v.l === m[2].toUpperCase(); })[0];
    m = n.match(/ (primero|primer|segundo|tercero|tercer|cuarto|quinto|sexto|atico) ([abcd]) /);
    if (m) return VIV.filter(function (v) { return v.pl === ORD[m[1]] && v.l === m[2].toUpperCase(); })[0];
    return null;
  }
  function dormitorios(n) { var m = n.match(/ (2|3|dos|tres) (dormitorios?|habitacion(es)?|hab|cuartos?|dorm) /); return m ? ({ dos: 2, tres: 3 }[m[1]] || +m[1]) : 0; }
  function importe(n) {
    var m = n.match(/ (\d{2,3})[ .]?(000|mil|k) ?(€|e|euros)? /) || n.match(/ (\d{3})\.?(\d{3}) ?(€|e|euros)? /);
    if (!m) return 0;
    var v = /mil|k/.test(m[2]) ? +m[1] * 1000 : +(m[1] + (m[2] === "000" ? "000" : m[2]));
    return v >= 50000 && v <= 2000000 ? v : 0;
  }
  function lista(l, max) {
    return l.slice(0, max || 6).map(function (v) {
      return "• <b>" + nombre(v) + "</b>: " + v.d + " dorm., " + v.m + " m² + terraza " + v.te + " m² · <b>" + eur(v.pr) + "</b>";
    }).join("<br>") + (l.length > (max || 6) ? "<br>…y " + (l.length - (max || 6)) + " más en la lista de precios." : "");
  }

  function dinamica(n) {
    var v = vivienda(n), d = dormitorios(n), imp = importe(n);
    var quiereHip = /hipoteca|letra|financ/.test(n) || /cuota|al mes|mensual/.test(n) && !/comunidad|ibi|alquil|basura/.test(n);
    if (v) {
      if (quiereHip) return { r: simulacion(v.pr, (v.pl === 6 ? "el ático " : "la vivienda ") + v.id), a: ["interes:" + v.id, "visita"], rel: ["financiacion-banco", "gastos-compra"] };
      var r = "<b>" + nombre(v) + "</b> (planta " + v.pl + "): " + v.d + " dormitorios, " + v.m + " m² útiles y terraza de " + v.te + " m². Precio: <b>" + eur(v.pr) + "</b> + IVA, con garaje y trastero. Estado: <b>" + EST[v.e] + "</b>.";
      if (v.e !== "d") { var alt = disp().filter(function (x) { return x.l === v.l || x.d === v.d; }).slice(0, 3); r += alt.length ? "<br>Parecidas y disponibles:<br>" + lista(alt) : ""; }
      return { r: r, a: v.e === "d" ? ["interes:" + v.id, "precios"] : ["precios"], rel: ["hipoteca-cuota", "forma-pago", "reserva"], viv: v };
    }
    if (imp && /hipoteca|cuota|al mes|mensual|letra/.test(n)) return { r: simulacion(imp, "una vivienda"), a: ["visita"], rel: ["financiacion-banco", "financiacion-privada"] };
    if (d || imp || / (mas barat|economic|menos de|hasta|maximo|presupuesto)/.test(n) && / (vivienda|piso|atico|casa|hay|quedan|teneis|tienes|algo)/.test(n)) {
      var l = disp().filter(function (x) { return (!d || x.d === d) && (!imp || x.pr <= imp) && (!/atico/.test(n) || x.pl === 6); }).sort(function (a, b) { return a.pr - b.pr; });
      var desc = (d ? " de " + d + " dormitorios" : "") + (/atico/.test(n) ? " (áticos)" : "") + (imp ? " por " + eur(imp) + " o menos" : "");
      if (!l.length) return { r: "Ahora mismo no queda ninguna vivienda disponible" + desc + ". La más económica disponible cuesta <b>" + minDe(function () { return true; }) + "</b>. Si quieres, te avisamos si se libera alguna.", a: ["whatsapp", "precios"], rel: ["disponibles", "descuento"] };
      return { r: "Viviendas disponibles" + desc + ", de menor a mayor precio:<br>" + lista(l), a: ["precios", "visita"], rel: ["hipoteca-cuota", "superficies", "reserva"] };
    }
    if (quiereHip && /cuanto|cuota|al mes|mensual|letra|simul|calcul/.test(n)) {
      var min = Math.min.apply(null, disp().map(function (x) { return x.pr; }));
      return { r: simulacion(min, "la vivienda más económica disponible") + "<br>Dime el número de una vivienda (por ejemplo «cuota del 2ºB») y te lo calculo para ella.", a: ["visita"], rel: ["financiacion-banco", "financiacion-privada", "ayudas-jovenes"] };
    }
    return null;
  }

  /* ---------- buscador en la base de preguntas ---------- */
  // palabras muy generales: cuentan menos que las que distinguen un tema
  var GEN = " comprar compra precio precios valor cuanto cuando fecha banco hipoteca plaza pago pagos cuotas persona cambiar cambios seguro zona donde cerca mar ";
  function raiz(a, b) { var c = a.length < b.length ? a : b, l = a.length < b.length ? b : a; return c.length >= 5 && l.length - c.length <= 3 && l.slice(0, c.length - 1) === c.slice(0, c.length - 1); }
  function puntua(e, n, tk) {
    var s = 0, usadas = {};
    // 1) frases y palabras exactas; 2) palabras de la misma familia (dormitorio/dormitorios).
    // Cada palabra de la pregunta suma una sola vez por tema.
    e.k.forEach(function (k) {
      if (k.indexOf(" ") > 0) { if (n.indexOf(" " + k + " ") >= 0) s += 2 + k.split(" ").length; return; }
      if (tk.indexOf(k) >= 0 && !usadas[k]) { usadas[k] = 1; s += GEN.indexOf(" " + k + " ") >= 0 ? 1.5 : 2; }
    });
    e.k.forEach(function (k) {
      if (k.indexOf(" ") > 0 || usadas[k]) return;
      var w = tk.filter(function (x) { return !usadas[x] && raiz(x, k); })[0]; if (w) { usadas[w] = 1; s += 1.5; }
    });
    return s;
  }
  function plantilla(r) {
    var dl = disp();
    return r.replace("{min2}", minDe(function (v) { return v.d === 2 && v.pl < 6; })).replace("{min3}", minDe(function (v) { return v.d === 3 && v.pl < 6; }))
      .replace(/\{minA\}/g, minDe(function (v) { return v.pl === 6; })).replace("{disp}", dl.length)
      .replace("{listaDisp}", "Quedan <b>" + dl.length + " viviendas disponibles</b> de 24. Las más económicas:<br>" + lista(dl.slice().sort(function (a, b) { return a.pr - b.pr; }), 5))
      .replace("{simulacion}", simulacion(Math.min.apply(null, dl.map(function (v) { return v.pr; })), "la vivienda más económica disponible") + "<br>Dime el número de una vivienda (por ejemplo «cuota del 2ºB») y te lo calculo para ella.");
  }
  function busca(q) {
    var n = nrm(q), tk = tokens(n);
    var dyn = dinamica(n); if (dyn) return [dyn];
    var res = DB.faq.map(function (e) { return { e: e, s: puntua(e, n, tk) }; }).filter(function (x) { return x.s >= 1.5; }).sort(function (a, b) { return b.s - a.s; });
    if (!res.length) return [];
    var out = [res[0].e];
    // dos temas en la misma pregunta («precio y entrega»): se responden los dos
    if (res[1] && res[1].e.cat !== res[0].e.cat && (res[1].s >= res[0].s * 0.7 || / (y|e|ademas|tambien) /.test(n) && res[1].s >= 1.5)) out.push(res[1].e);
    return out.map(function (e) { return { r: plantilla(e.r), a: e.a, rel: e.rel, id: e.id }; });
  }

  /* ---------- acciones y sugerencias ---------- */
  function boton(a, q) {
    if (a.indexOf("interes:") === 0) { var id = a.slice(8); return '<button type="button" class="ch-l" data-viv="' + id + '">Me interesa el ' + id + " →</button>"; }
    switch (a) {
      case "precios": return '<a href="#precios" class="ch-l">Ver lista de precios →</a>';
      case "visita": return '<a href="#visita" class="ch-l">Pedir visita o consulta →</a>';
      case "recorrido": return '<a href="#recorrido" class="ch-l">Ver el recorrido →</a>';
      case "legal": return '<a href="legal.html" class="ch-l">Información legal →</a>';
      case "llamar": return '<a href="tel:' + TEL + '" class="ch-l">Llamar al 688 93 33 08 →</a>';
      case "whatsapp": return '<a class="ch-l wa" target="_blank" rel="noopener" href="https://wa.me/' + WA + "?text=" + encodeURIComponent("Hola, tengo una pregunta sobre Residencial Mirador del Norte" + (q ? ": " + q : ".")) + '">Preguntar por WhatsApp →</a>';
    }
    return "";
  }
  function sugerencias(ids) {
    var t = (ids || []).map(function (id) { return DB.faq.filter(function (e) { return e.id === id; })[0]; }).filter(Boolean).slice(0, 3);
    return t.length ? '<div class="ch-s"><span>También te puede interesar:</span>' + t.map(function (e) { return '<button type="button" data-q="' + esc(e.t) + '">' + esc(e.t) + "</button>"; }).join("") + "</div>" : "";
  }
  function compone(res, q) {
    var acc = [], rel = [];
    var cuerpo = res.map(function (x) { (x.a || []).forEach(function (a) { if (acc.indexOf(a) < 0) acc.push(a); }); (x.rel || []).forEach(function (r) { if (rel.indexOf(r) < 0 && !res.some(function (y) { return y.id === r; })) rel.push(r); }); return x.r; }).join("<br><br>");
    return cuerpo + (acc.length ? '<div class="ch-acc">' + acc.slice(0, 3).map(function (a) { return boton(a, q); }).join("") + "</div>" : "") + sugerencias(rel);
  }

  /* ---------- conversación ---------- */
  function bub(t, me) { var d = document.createElement("div"); d.className = "ch-m" + (me ? " me" : ""); if (me) d.textContent = t; else d.innerHTML = t; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function bot(h) { var d = bub('<span class="ch-dots" aria-label="Escribiendo"><i></i><i></i><i></i></span>'); setTimeout(function () { d.innerHTML = h; log.scrollTop = log.scrollHeight; }, 450 + Math.random() * 300); }
  function responde(q) {
    var n = nrm(q);
    if (/^ (hola|buenas|buenos dias|buenas tardes|hey|hello|hi) $/.test(n)) return "¡Hola! Pregúntame lo que quieras sobre la promoción: precios, viviendas libres, entrega, financiación, garaje, comunidad o visitas.";
    if (/^ (gracias|muchas gracias|vale|ok|perfecto|genial) $/.test(n)) return "¡A ti! Si te surge cualquier otra duda, aquí estoy." + '<div class="ch-acc">' + boton("visita") + "</div>";
    var res = busca(q);
    if (res.length) { fallos = 0; return compone(res, q); }
    fallos++;
    var temas = '<div class="ch-s"><span>Puedo ayudarte con:</span>' + ["¿Qué precios tienen las viviendas?", "¿Cuándo se entregan las viviendas?", "¿Cómo se paga la vivienda?", "¿Puedo financiar la compra con un banco?", "¿Cuánto será la cuota de comunidad?"].map(function (t) { return '<button type="button" data-q="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + "</div>";
    return (fallos > 1 ? "Prefiero no darte una respuesta inexacta: esta pregunta es mejor que la vea una persona del equipo comercial." : "No estoy seguro de haberte entendido. ¿Puedes decirlo de otra forma?") +
      '<div class="ch-acc">' + boton("whatsapp", q) + boton("llamar") + "</div>" + temas;
  }
  function ask(t) {
    t = String(t || "").trim().slice(0, 200); if (!t) return;
    bub(t, 1);
    var hecho = function () { bot(responde(t)); };
    DB ? hecho() : carga().then(hecho);
  }
  function carga() {
    if (!cargando) cargando = fetch("faq.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { DB = j; }).catch(function () { DB = { faq: [] }; });
    return cargando;
  }
  var MENU = [["Precios", "¿Qué precios tienen las viviendas?"], ["Disponibles", "¿Qué viviendas quedan disponibles?"], ["Entrega", "¿Cuándo se entregan las viviendas?"], ["Forma de pago", "¿Cómo se paga la vivienda?"], ["Financiación", "¿Puedo financiar la compra con un banco?"], ["Cuota hipoteca", "¿Cuánto pagaría al mes de hipoteca?"], ["Garaje", "¿Las viviendas tienen garaje?"], ["Comunidad", "¿Cuánto será la cuota de comunidad?"], ["Visitar el piloto", "¿Puedo visitar el piso piloto?"]];
  function menu() { var q = $("#chQ"); q.innerHTML = ""; MENU.forEach(function (m) { var b = document.createElement("button"); b.type = "button"; b.textContent = m[0]; b.addEventListener("click", function () { ask(m[1]); }); q.appendChild(b); }); }
  function abre() {
    ch.classList.add("on"); fab.classList.add("hide"); carga();
    if (!hi) { hi = 1; bot("¡Hola! Soy el asistente de <b>Residencial Mirador del Norte</b>. Resuelvo dudas sobre precios, viviendas disponibles, plazos, financiación, garaje, comunidad y visitas. ¿Qué te gustaría saber?"); menu(); }
    setTimeout(function () { inp.focus(); }, 300);
  }
  function cierra() { ch.classList.remove("on"); fab.classList.remove("hide"); fab.focus(); }
  fab.addEventListener("click", abre); $("#chX").addEventListener("click", cierra);
  $("#chF").addEventListener("submit", function (e) { e.preventDefault(); ask(inp.value); inp.value = ""; });
  log.addEventListener("click", function (e) {
    var s = e.target.closest("[data-q]"); if (s) { ask(s.getAttribute("data-q")); return; }
    var v = e.target.closest("[data-viv]"); if (v) { CN.interes(v.getAttribute("data-viv")); if (innerWidth < 700) cierra(); return; }
    var a = e.target.closest("a.ch-l"); if (a && a.getAttribute("href").charAt(0) === "#" && innerWidth < 700) cierra();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ch.classList.contains("on")) cierra(); });
  /* ---------- sección de preguntas frecuentes de la página ---------- */
  var FQ = ["precio-desde", "entrega", "forma-pago", "financiacion-banco", "financiacion-privada", "garaje-incluido", "comunidad", "iva", "avales", "personalizar", "visita-piloto"];
  var fqL = $("#fqL");
  if (fqL) {
    var pinta = function () {
      if (!DB.faq.length) { fqL.innerHTML = '<p class="fq-c">No se han podido cargar las preguntas. Pregunta al asistente o llámanos al 688 93 33 08.</p>'; return; }
      fqL.innerHTML = FQ.map(function (id) { return DB.faq.filter(function (e) { return e.id === id; })[0]; }).filter(Boolean).map(function (e) {
        return "<details><summary>" + esc(e.t) + "</summary><div>" + plantilla(e.r).replace(/<br>Dime el número[\s\S]*$/, "") + "</div></details>";
      }).join("");
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en, ob) { if (en[0].isIntersecting) { ob.disconnect(); carga().then(pinta); } }, { rootMargin: "600px 0px" }).observe(fqL);
    else carga().then(pinta);
    var bq = $("#fqChat"); if (bq) bq.addEventListener("click", abre);
  }

  // para las pruebas automáticas
  window.__chat = { responde: function (q) { return DB ? responde(q) : null; }, temas: function (q) { return busca(q).map(function (x) { return x.id || "datos"; }); }, carga: carga };
})();
