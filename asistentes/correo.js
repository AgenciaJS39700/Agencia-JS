// /asistentes/correo.js — Envío de correo (Brevo) y plantilla común de los asistentes.
// Lo usan agenda.js (citas y recordatorios) y alumnos.js (acceso, bonos y ofertas).
// Si falta el secreto BREVO_API_KEY o MAIL_FROM, no se envía nada y se deja aviso en el log.

export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Envía un correo. Devuelve true solo si Brevo lo aceptó. */
export async function correo(env, cfg, a, nombre, asunto, html, opciones) {
  if (!env.BREVO_API_KEY || !env.MAIL_FROM || !a) { console.log("Correo no enviado (falta BREVO_API_KEY, MAIL_FROM o destinatario):", asunto); return false; }
  const cuerpo = {
    sender: { name: cfg.negocio.nombre.slice(0, 60), email: env.MAIL_FROM },
    to: [{ email: a, name: nombre || undefined }],
    subject: asunto, htmlContent: html,
  };
  // Los envíos comerciales llevan baja en un clic, como exige la ley y piden Gmail y Outlook
  if (opciones && opciones.baja) cuerpo.headers = { "List-Unsubscribe": `<${opciones.baja}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  if (opciones && opciones.responder) cuerpo.replyTo = { email: opciones.responder };
  // Adjuntos: [{ nombre, contenido }] con el contenido ya en base64 (lo usa el envío a la gestoría)
  if (opciones && opciones.adjuntos && opciones.adjuntos.length) {
    cuerpo.attachment = opciones.adjuntos.map((x) => ({ name: x.nombre, content: x.contenido }));
  }
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(cuerpo),
  });
  if (!r.ok) console.error("Brevo rechazó el correo:", r.status, (await r.text().catch(() => "")).slice(0, 200));
  return r.ok;
}

/** Marco visual del correo, con el color y los datos del negocio. */
export function marco(cfg, titulo, dentro, pie) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;color:#141414"><div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:16px;padding:28px;border-top:6px solid ${esc(cfg.color)}">
<p style="font-size:13px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin:0 0 16px;color:#555">${esc(cfg.negocio.nombre)}</p><h1 style="font-size:22px;margin:0 0 12px">${esc(titulo)}</h1>${dentro}</div>
<p style="font-size:12px;color:#8d8c88;text-align:center;margin:14px 0 0">${esc(cfg.negocio.direccion)} · ${esc(cfg.negocio.telefono)}</p>${pie || ""}</div></body></html>`;
}

/** Botón grande, para los correos con una acción clara. */
export const boton = (cfg, url, texto) =>
  `<p style="margin:20px 0"><a href="${esc(url)}" style="display:inline-block;background:${esc(cfg.color)};color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:999px">${esc(texto)}</a></p>`;
