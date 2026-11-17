// /asistentes/facturas.js — Facturación del negocio: libro de facturas emitidas,
// emisión (automática al cobrar y a mano), rectificativas, resumen mensual,
// descarga en CSV para la asesoría y envío por correo a la gestoría.
//
// Decisiones que importan y por qué:
// · La base y la cuota de IVA se GUARDAN al emitir, no se calculan al imprimir.
//   Si mañana cambia el tipo de IVA, las facturas de ayer tienen que seguir diciendo
//   lo mismo que se entregó al cliente y lo mismo que se declaró.
// · Una factura emitida no se borra ni se cambia nunca: se corrige con una
//   RECTIFICATIVA, en su propia serie y con importe negativo.
// · La numeración es correlativa y sin huecos dentro de cada serie y año, y se saca
//   del contador de forma atómica.

import { correo, marco, boton, esc } from "./correo.js";

const limpiar = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const euros = (c) => (c / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const dec = (c) => (c / 100).toFixed(2).replace(".", ",");
const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dia = (f) => String(f || "").slice(0, 10).split("-").reverse().join("/");
const RE_MES = /^\d{4}-\d{2}$/;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesLargo = (m) => `${MESES[+m.slice(5, 7) - 1]} de ${m.slice(0, 4)}`;

function res(datos, estado = 200, cabeceras = {}) {
  return new Response(JSON.stringify(datos), { status: estado, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cabeceras } });
}

/** Datos fiscales del negocio, con valores por defecto sensatos. */
const fiscal = (cfg) => ({ serie: "F", serieR: "R", iva: 0, ...(cfg.factura || {}) });

/** Siguiente número de una serie, atómico y sin huecos. */
async function siguienteNumero(env, cfg, serie) {
  await env.CITAS.prepare("INSERT INTO contador (slug, serie, n) VALUES (?1, ?2, 0) ON CONFLICT(slug, serie) DO NOTHING").bind(cfg.slug, serie).run();
  await env.CITAS.prepare("UPDATE contador SET n = n + 1 WHERE slug = ?1 AND serie = ?2").bind(cfg.slug, serie).run();
  const c = await env.CITAS.prepare("SELECT n FROM contador WHERE slug = ?1 AND serie = ?2").bind(cfg.slug, serie).first();
  return `${serie}-${String(c.n).padStart(4, "0")}`;
}

/**
 * Emite la factura de un cobro que ya está pagado: le pone número, congela la base
 * y la cuota de IVA y guarda la fecha de expedición. Si ya estaba emitida, no hace nada.
 * Se puede llamar por id del pago o por el id de Stripe (lo usa el webhook).
 */
export async function emitirFactura(env, cfg, { id, stripeId }) {
  if (!env.CITAS) return null;
  const donde = stripeId ? "stripe_id = ?1" : "id = ?1";
  const p = await env.CITAS.prepare(`SELECT * FROM pagos WHERE slug = ?2 AND ${donde}`).bind(stripeId || id, cfg.slug).first();
  if (!p) return null;
  if (p.numero) return p.numero;
  if (p.estado !== "pagado") return null;

  const f = fiscal(cfg);
  const expedicion = hoyMadrid();
  const serie = (p.tipo === "rectificativa" ? f.serieR : f.serie) + expedicion.slice(0, 4);
  const numero = await siguienteNumero(env, cfg, serie);

  // El IVA se congela aquí: a partir de ahora esta factura no depende de la configuración
  const pct = p.iva_pct == null ? +f.iva || 0 : p.iva_pct;
  const base = pct ? Math.round(p.importe / (1 + pct / 100)) : p.importe;
  await env.CITAS.prepare(
    "UPDATE pagos SET numero = ?2, emitida = ?3, base = ?4, iva = ?5, iva_pct = ?6 WHERE id = ?1 AND numero IS NULL"
  ).bind(p.id, numero, expedicion, base, p.importe - base, pct).run();
  return numero;
}

/** Nombre y datos fiscales de a quién se le factura. */
function cliente(pago, alumna) {
  return {
    nombre: pago.cliente || (alumna ? alumna.nombre || alumna.email : "Cliente"),
    nif: pago.cliente_nif || (alumna ? alumna.nif : "") || "",
    dir: pago.cliente_dir || (alumna ? alumna.direccion : "") || "",
    email: alumna ? alumna.email : "",
  };
}

/** Factura imprimible: el navegador la guarda como PDF con Imprimir → Guardar como PDF. */
export function facturaHTML(cfg, pago, alumna) {
  const f = fiscal(cfg);
  const c = cliente(pago, alumna);
  const rect = pago.tipo === "rectificativa";
  // Las emitidas traen la base guardada; las antiguas se calculan como antes
  const pct = pago.iva_pct == null ? +f.iva || 0 : pago.iva_pct;
  const base = pago.base == null ? (pct ? Math.round(pago.importe / (1 + pct / 100)) : pago.importe) : pago.base;
  const cuota = pago.iva == null ? pago.importe - base : pago.iva;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${rect ? "Factura rectificativa" : "Factura"} ${esc(pago.numero || "")}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f4f6;font:15px/1.6 -apple-system,system-ui,"Segoe UI",sans-serif;color:#1a1a1a}
.h{max-width:760px;margin:0 auto;padding:28px 20px}
.p{background:#fff;border-radius:14px;padding:34px;box-shadow:0 10px 40px -24px rgba(0,0,0,.5)}
.top{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;border-bottom:3px solid ${esc(cfg.color)};padding-bottom:18px;margin-bottom:22px}
h1{font-size:22px;margin:0 0 4px}.mu{color:#666;font-size:13px}
.n{text-align:right}.n b{font-size:18px;display:block}
.rec{background:#fdf0ef;color:#8d2f28;border-radius:8px;padding:8px 12px;font-size:13px;margin:0 0 18px}
.dos{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin:22px 0}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #e6e6ea;font-size:14px}
th{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#666}
td.r,th.r{text-align:right}
.tot{display:flex;justify-content:flex-end}.tot table{width:auto;min-width:280px}
.tot td{border:0;padding:5px 8px}.tot tr:last-child td{border-top:2px solid #1a1a1a;font-weight:800;font-size:17px;padding-top:10px}
.pie{margin-top:26px;font-size:12px;color:#666;line-height:1.6}
.btn{display:inline-block;margin:0 0 16px;background:${esc(cfg.color)};color:#fff;border:0;border-radius:999px;padding:11px 22px;font:inherit;font-weight:700;cursor:pointer}
@media print{body{background:#fff}.h{padding:0}.p{box-shadow:none;border-radius:0;padding:0}.btn{display:none}}
</style></head><body><div class="h">
<button class="btn" onclick="window.print()">Imprimir o guardar en PDF</button>
<div class="p">
 <div class="top">
  <div><h1>${esc(f.nombre || cfg.negocio.nombre)}</h1>
   <p class="mu">${esc(f.nif ? "NIF " + f.nif : "")}<br>${esc(f.direccion || cfg.negocio.direccion)}<br>${esc(cfg.negocio.telefono)}</p></div>
  <div class="n"><span class="mu">${rect ? "Factura rectificativa" : "Factura"}</span><b>${esc(pago.numero || "—")}</b>
   <span class="mu">Fecha: ${esc(dia(pago.emitida || pago.fecha))}</span></div>
 </div>
 ${rect ? `<p class="rec">Rectifica la factura <b>${esc(pago.rectifica || "")}</b>${pago.nota ? ". " + esc(pago.nota) : "."}</p>` : ""}
 <div class="dos">
  <div><p class="mu">Facturar a</p>
   <p><b>${esc(c.nombre)}</b>${c.nif ? `<br><span class="mu">NIF ${esc(c.nif)}</span>` : ""}${c.dir ? `<br><span class="mu">${esc(c.dir)}</span>` : ""}${c.email ? `<br><span class="mu">${esc(c.email)}</span>` : ""}</p></div>
  ${pago.emitida && String(pago.emitida).slice(0, 10) !== String(pago.fecha).slice(0, 10)
    ? `<div><p class="mu">Fecha de operación</p><p>${esc(dia(pago.fecha))}</p></div>` : ""}
 </div>
 <table><thead><tr><th>Concepto</th><th class="r">Importe</th></tr></thead>
  <tbody><tr><td>${esc(pago.concepto)}${pago.promo ? ` <span class="mu">(código ${esc(pago.promo)})</span>` : ""}</td><td class="r">${euros(base)}</td></tr></tbody></table>
 <div class="tot"><table>
  ${pct ? `<tr><td>Base imponible</td><td class="r">${euros(base)}</td></tr><tr><td>IVA ${pct} %</td><td class="r">${euros(cuota)}</td></tr>` : ""}
  <tr><td>Total</td><td class="r">${euros(pago.importe)}</td></tr></table></div>
 <p class="pie">Forma de pago: ${esc(pago.metodo === "tarjeta" ? "tarjeta" : pago.metodo)}.
 ${rect ? "" : `Pagada el ${esc(dia(pago.fecha))}.`}
 ${!pct && f.exento ? "<br>" + esc(f.exento) : ""}</p>
</div></div></body></html>`;
}

/* ---------------------------------------------------------------- libro y resumen */

/** Todas las facturas de un mes (por fecha de expedición), con su cliente. */
async function libro(env, cfg, mes) {
  const { results } = await env.CITAS.prepare(
    `SELECT p.*, a.nombre AS alumna, a.email, a.nif AS alumna_nif, a.direccion AS alumna_dir
     FROM pagos p LEFT JOIN alumnos a ON a.id = p.alumno_id
     WHERE p.slug = ?1 AND p.numero IS NOT NULL AND substr(COALESCE(p.emitida, p.fecha),1,7) = ?2
     ORDER BY p.numero`).bind(cfg.slug, mes).all();
  return (results || []).map((p) => {
    const c = cliente(p, p.alumna ? { nombre: p.alumna, email: p.email, nif: p.alumna_nif, direccion: p.alumna_dir } : null);
    return { ...p, cliente_n: c.nombre, cliente_f: c.nif, cliente_d: c.dir };
  });
}

/** Totales del mes, listos para cuadrar con la asesoría. */
function totales(filas) {
  const t = { n: filas.length, base: 0, iva: 0, total: 0, rectificativas: 0, metodos: {} };
  for (const p of filas) {
    const base = p.base == null ? p.importe : p.base;
    t.base += base; t.iva += p.iva || 0; t.total += p.importe;
    if (p.tipo === "rectificativa") t.rectificativas++;
    t.metodos[p.metodo || "otro"] = (t.metodos[p.metodo || "otro"] || 0) + p.importe;
  }
  return t;
}

function csvLibro(cfg, mes, filas) {
  const cab = ["Fecha expedicion", "Numero", "Tipo", "Rectifica a", "Cliente", "NIF", "Concepto",
               "Base imponible", "% IVA", "Cuota IVA", "Total", "Forma de pago", "Fecha operacion"];
  const cuerpo = filas.map((p) => [
    dia(p.emitida || p.fecha), p.numero, p.tipo === "rectificativa" ? "Rectificativa" : "Ordinaria", p.rectifica || "",
    p.cliente_n, p.cliente_f, p.concepto,
    dec(p.base == null ? p.importe : p.base), String(p.iva_pct == null ? "" : p.iva_pct).replace(".", ","), dec(p.iva || 0),
    dec(p.importe), p.metodo, dia(p.fecha),
  ]);
  const t = totales(filas);
  const pie = ["", "TOTALES " + mes, "", "", "", "", "", dec(t.base), "", dec(t.iva), dec(t.total), "", ""];
  return [cab, ...cuerpo, pie].map((f) => f.map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

/* ---------------------------------------------------------------- panel */

export async function atenderPanelFacturas(request, env, cfg, ruta, url, apuntar) {
  if (!ruta.startsWith("panel/factura")) return null;
  const post = request.method === "POST";
  const cuerpo = async () => { try { return await request.json(); } catch (e) { return {}; } };
  const f = fiscal(cfg);

  /* ---- resumen del mes + libro ---- */
  if (ruta === "panel/facturacion" && request.method === "GET") {
    const mes = RE_MES.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes") : hoyMadrid().slice(0, 7);
    const filas = await libro(env, cfg, mes);
    // Cobros del mes que todavía no tienen factura: lo que de verdad hay que vigilar
    const { results: pend } = await env.CITAS.prepare(
      `SELECT p.id, p.concepto, p.importe, p.fecha, p.metodo, a.nombre AS alumna
       FROM pagos p LEFT JOIN alumnos a ON a.id = p.alumno_id
       WHERE p.slug = ?1 AND p.estado = 'pagado' AND p.numero IS NULL AND substr(p.fecha,1,7) = ?2
       ORDER BY p.fecha`).bind(cfg.slug, mes).all();
    // Los doce meses con movimiento, para el selector
    const { results: meses } = await env.CITAS.prepare(
      `SELECT substr(COALESCE(emitida, fecha),1,7) AS mes, COUNT(*) AS n FROM pagos
       WHERE slug = ?1 AND estado = 'pagado' GROUP BY mes ORDER BY mes DESC LIMIT 24`).bind(cfg.slug).all();
    return res({
      mes, mesTexto: mesLargo(mes), facturas: filas, totales: totales(filas),
      pendientes: pend || [], meses: (meses || []).map((m) => m.mes),
      fiscal: { nombre: f.nombre || cfg.negocio.nombre, nif: f.nif || "", direccion: f.direccion || "", iva: +f.iva || 0, exento: f.exento || "" },
      gestoria: (cfg.gestoria && cfg.gestoria.email) || "",
    });
  }

  /* ---- ver una factura ---- */
  if (ruta === "panel/factura" && request.method === "GET") {
    const id = +url.searchParams.get("id") || 0;
    let p = await env.CITAS.prepare("SELECT * FROM pagos WHERE id = ?1 AND slug = ?2").bind(id, cfg.slug).first();
    if (!p) return res({ error: "No encontrada" }, 404);
    if (!p.numero && p.estado === "pagado") {
      await emitirFactura(env, cfg, { id: p.id });
      p = await env.CITAS.prepare("SELECT * FROM pagos WHERE id = ?1").bind(p.id).first();
    }
    const a = p.alumno_id ? await env.CITAS.prepare("SELECT * FROM alumnos WHERE id = ?1").bind(p.alumno_id).first() : null;
    return new Response(facturaHTML(cfg, p, a), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  /* ---- emitir las pendientes de un mes ---- */
  if (ruta === "panel/facturar" && post) {
    const b = await cuerpo();
    const mes = RE_MES.test(b.mes || "") ? b.mes : hoyMadrid().slice(0, 7);
    const { results } = await env.CITAS.prepare(
      "SELECT id FROM pagos WHERE slug = ?1 AND estado = 'pagado' AND numero IS NULL AND substr(fecha,1,7) = ?2 ORDER BY fecha, id"
    ).bind(cfg.slug, mes).all();
    let n = 0;
    for (const p of results || []) if (await emitirFactura(env, cfg, { id: p.id })) n++;
    if (apuntar && n) await apuntar("factura", `emitió de golpe ${n === 1 ? "1 factura" : n + " facturas"} de ${mes}`);
    return res({ ok: true, emitidas: n });
  }

  /* ---- factura nueva a mano (a una alumna o a quien sea) ---- */
  if (ruta === "panel/factura/nueva" && post) {
    const b = await cuerpo();
    const importe = Math.round(+b.importe || 0);
    const concepto = limpiar(b.concepto, 120);
    if (!concepto) return res({ error: "Escribe el concepto de la factura." }, 400);
    if (!(importe > 0)) return res({ error: "El importe tiene que ser mayor que cero." }, 400);
    const alumnoId = +b.alumno || null;
    let nombre = limpiar(b.cliente, 90);
    if (alumnoId) {
      const a = await env.CITAS.prepare("SELECT nombre, email FROM alumnos WHERE id = ?1 AND slug = ?2").bind(alumnoId, cfg.slug).first();
      if (!a) return res({ error: "Esa alumna no existe." }, 404);
      if (!nombre) nombre = a.nombre || a.email;
    }
    if (!nombre) return res({ error: "Pon a nombre de quién va la factura." }, 400);
    const pct = b.iva == null || b.iva === "" ? +f.iva || 0 : Math.max(0, Math.min(21, +b.iva || 0));
    const r = await env.CITAS.prepare(
      `INSERT INTO pagos (slug, alumno_id, concepto, importe, estado, metodo, fecha, iva_pct, cliente, cliente_nif, cliente_dir, nota)
       VALUES (?1,?2,?3,?4,'pagado',?5,?6,?7,?8,?9,?10,?11)`
    ).bind(cfg.slug, alumnoId, concepto, importe, limpiar(b.metodo, 20) || "efectivo",
      /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || "") ? b.fecha : hoyMadrid(),
      pct, nombre, limpiar(b.nif, 20), limpiar(b.direccion, 120), limpiar(b.nota, 200)).run();
    const id = r.meta.last_row_id;
    const numero = await emitirFactura(env, cfg, { id });
    if (apuntar) await apuntar("factura", `emitió a mano la factura ${numero || "(sin número)"} a ${nombre} por ${(importe / 100).toFixed(2)} €`);
    return res({ ok: true, id, numero });
  }

  /* ---- rectificativa: la original no se toca nunca ---- */
  if (ruta === "panel/factura/rectificar" && post) {
    const b = await cuerpo();
    const o = await env.CITAS.prepare("SELECT * FROM pagos WHERE id = ?1 AND slug = ?2").bind(+b.id || 0, cfg.slug).first();
    if (!o || !o.numero) return res({ error: "Esa factura no existe o todavía no está emitida." }, 404);
    if (o.tipo === "rectificativa") return res({ error: "Una rectificativa no se rectifica: emite otra factura." }, 400);
    const ya = await env.CITAS.prepare("SELECT numero FROM pagos WHERE slug = ?1 AND rectifica = ?2").bind(cfg.slug, o.numero).first();
    if (ya) return res({ error: `Esa factura ya está rectificada por la ${ya.numero}.` }, 400);
    const motivo = limpiar(b.motivo, 200) || "Anulación de la factura.";
    const r = await env.CITAS.prepare(
      `INSERT INTO pagos (slug, alumno_id, concepto, importe, estado, metodo, fecha, iva_pct, tipo, rectifica, cliente, cliente_nif, cliente_dir, nota)
       VALUES (?1,?2,?3,?4,'pagado',?5,?6,?7,'rectificativa',?8,?9,?10,?11,?12)`
    ).bind(cfg.slug, o.alumno_id, "Rectificación de " + o.concepto, -Math.abs(o.importe), o.metodo, hoyMadrid(),
      o.iva_pct, o.numero, o.cliente, o.cliente_nif, o.cliente_dir, motivo).run();
    const numero = await emitirFactura(env, cfg, { id: r.meta.last_row_id });
    if (apuntar) await apuntar("factura", `rectificó la factura ${o.numero} con la ${numero || "(sin número)"} · ${motivo}`);
    return res({ ok: true, numero });
  }

  /* ---- libro del mes en CSV ---- */
  if (ruta === "panel/facturacion/csv" && request.method === "GET") {
    const mes = RE_MES.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes") : hoyMadrid().slice(0, 7);
    const csv = csvLibro(cfg, mes, await libro(env, cfg, mes));
    return new Response("﻿" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="facturas-${cfg.slug}-${mes}.csv"` },
    });
  }

  /* ---- enviar el mes a la gestoría ---- */
  if (ruta === "panel/facturacion/enviar" && post) {
    const b = await cuerpo();
    const mes = RE_MES.test(b.mes || "") ? b.mes : hoyMadrid().slice(0, 7);
    const para = limpiar(b.email, 120) || (cfg.gestoria && cfg.gestoria.email) || "";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(para)) return res({ error: "Escribe el correo de la gestoría." }, 400);
    const filas = await libro(env, cfg, mes);
    if (!filas.length) return res({ error: "Ese mes no tiene ninguna factura emitida." }, 400);
    const t = totales(filas);
    const csv = csvLibro(cfg, mes, filas);
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode("﻿" + csv)));
    const fila = (k, v) => `<tr><td style="padding:6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;text-align:right"><b>${esc(v)}</b></td></tr>`;
    const metodos = Object.entries(t.metodos).map(([m, v]) => fila("Cobrado por " + m, euros(v))).join("");
    const ok = await correo(env, cfg, para, (cfg.gestoria && cfg.gestoria.nombre) || "Asesoría",
      `Facturación de ${mesLargo(mes)} · ${f.nombre || cfg.negocio.nombre}`,
      marco(cfg, `Facturación de ${mesLargo(mes)}`,
        `<p style="font-size:15px;line-height:1.7">Adjunto el libro de facturas emitidas de <b>${esc(mesLargo(mes))}</b> de ${esc(f.nombre || cfg.negocio.nombre)}${f.nif ? ` (NIF ${esc(f.nif)})` : ""}.</p>
         <table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0">
          ${fila("Facturas emitidas", String(t.n))}
          ${t.rectificativas ? fila("De ellas, rectificativas", String(t.rectificativas)) : ""}
          ${fila("Base imponible", euros(t.base))}
          ${t.iva ? fila("Cuota de IVA", euros(t.iva)) : ""}
          ${metodos}
          <tr><td style="padding:10px 0;border-top:2px solid #141414">Total facturado</td><td style="padding:10px 0;border-top:2px solid #141414;text-align:right;font-size:17px"><b>${esc(euros(t.total))}</b></td></tr>
         </table>
         <p style="font-size:13px;color:#555;line-height:1.7">El adjunto es un CSV con una línea por factura: fecha de expedición, número, cliente, NIF, base, IVA, total y forma de pago. Las rectificativas van con importe negativo.${!t.iva && f.exento ? "<br>" + esc(f.exento) : ""}</p>`),
      { responder: (cfg.avisos && cfg.avisos.email) || undefined, adjuntos: [{ nombre: `facturas-${cfg.slug}-${mes}.csv`, contenido: b64 }] });
    if (!ok) return res({ error: "No se ha podido enviar el correo. Inténtalo en un momento." }, 502);
    if (apuntar) await apuntar("gestoria", `mandó la facturación de ${mes} a ${para} (${t.n} facturas, ${euros(t.total)})`);
    return res({ ok: true, enviadas: t.n, para });
  }

  return null;
}
