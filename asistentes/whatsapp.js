// /asistentes/whatsapp.js — Avisos por WhatsApp (API oficial de Meta, WhatsApp Cloud API). Solo servidor.
// Un único número de WhatsApp de Agencia JS envía los avisos a todos los negocios (y, si se activa, la confirmación
// al cliente). Sin estos secretos del Worker no se envía nada y todo lo demás sigue funcionando:
//   WA_TOKEN     token permanente de un usuario del sistema (Meta Business → Usuarios del sistema)
//   WA_PHONE_ID  «Phone number ID» del número en WhatsApp Manager
//   (opcional) WA_API_VERSION, por defecto v23.0
// Plantillas que hay que crear y aprobar en WhatsApp Manager (categoría «Utilidad», idioma español «es»):
//   cita_nueva     «📅 Nueva cita en {{1}}: {{2}}, {{3}}, {{4}}. Teléfono del cliente: {{5}}.»
//   cita_anulada   «❌ Cita anulada en {{1}}: {{2}}, {{3}}, {{4}}. El hueco vuelve a estar libre.»
//   cita_cliente   «Hola {{1}}, tu cita en {{2}} está confirmada: {{3}}, {{4}}. Tu código es {{5}}. Si no puedes venir, anúlala en agencia-js.com/c/{{6}}»

const limpio = (t) => String(t == null ? "" : t).replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 200) || "-";

/** Envía una plantilla. Devuelve true/false; nunca lanza (un fallo de WhatsApp no debe romper la reserva). */
export async function plantillaWhatsApp(env, para, nombre, parametros) {
  const to = String(para || "").replace(/\D/g, "");
  if (!env.WA_TOKEN || !env.WA_PHONE_ID || to.length < 10) {
    if (to) console.log("WhatsApp no enviado (faltan WA_TOKEN / WA_PHONE_ID):", nombre);
    return false;
  }
  try {
    const r = await fetch(`https://graph.facebook.com/${env.WA_API_VERSION || "v23.0"}/${encodeURIComponent(env.WA_PHONE_ID)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to, type: "template",
        template: { name: nombre, language: { code: "es" }, components: [{ type: "body", parameters: parametros.map((p) => ({ type: "text", text: limpio(p) })) }] },
      }),
    });
    if (!r.ok) console.error("WhatsApp rechazó el aviso:", r.status, (await r.text().catch(() => "")).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.error("WhatsApp", e && e.message);
    return false;
  }
}
