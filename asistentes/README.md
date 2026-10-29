# Asistentes de citas · puesta en marcha de un cliente

Todo vive en el Worker `agencia-js`: no hay que crear nada nuevo en Cloudflare por cliente.

| Pieza | Dónde |
|---|---|
| Datos del negocio | `asistentes/clientes/<slug>.js` (no se publica) |
| Citas y cierres | D1 `agencia-citas` (binding `CITAS`), separadas por slug |
| Página de citas (clientes sin web) | `agencia-js.com/c/<slug>` |
| Panel del negocio | `agencia-js.com/panel/<slug>` (clave propia) |
| Widget para su web | `<script src="https://agencia-js.com/asistentes/widget.js" data-negocio="<slug>" async></script>` |
| Calendario del móvil | Panel → «Ver en mi calendario» (enlace .ics privado, se actualiza solo) |
| Recepcionista de voz | Webhooks `POST /api/as/<slug>/voz/huecos` y `/voz/cita` (misma agenda) |

## Alta (unos 15 minutos)
1. `node tools/nuevo-asistente.mjs <slug> "<Nombre>" <sector> [basico|pro]`
   - sector: `dental`, `peluqueria`, `estetica`, `fisio`, `veterinaria`, `taller` u `otro`.
   - **Apunta la clave del panel que sale en pantalla** y dásela al cliente (no se guarda en ningún sitio).
2. Abre `asistentes/clientes/<slug>.js` y rellena los `TODO` con el cuestionario de alta: dirección, teléfono, WhatsApp, horario, servicios con **duración real**, precios, email de avisos, color y `capacidad` (profesionales a la vez).
3. `git add -A && git commit -m "feat(asistentes): alta <slug>" && git push` → se publica solo.
4. Prueba en `agencia-js.com/c/<slug>`: haz una cita, mírala en el panel y anúlala.
5. Entrega al cliente:
   - Enlace de su página de citas (para Google Business → «Reservas», Instagram y WhatsApp). Las citas del local o del teléfono se apuntan en el panel, en la misma agenda).
   - Si tiene web: la línea del widget antes de `</body>`. Cualquier botón con `data-pedir-cita` lo abre también.
   - Su panel y su clave. Enséñale «Apuntar cita», «Cerrar horas o días» y «Ver en mi calendario».

## Cambios habituales
- Horario, servicios, festivos: editar su archivo y hacer push.
- Clave perdida: `node tools/nuevo-asistente.mjs --clave <slug>` y push.
- Baja o impago: `activo: false` en su archivo (deja de aceptar citas; las existentes se conservan).
- Pasar a Avanzado: `motor: "pro"` y `agenda.pedirEmail: true` (correo de confirmación y recordatorio).

## Avisos por correo (una sola vez para todos los clientes)
Sin esto todo funciona, pero no salen correos.
1. En Brevo: crear una API key (SMTP & API) y verificar el remitente de `MAIL_FROM` (`wrangler.jsonc`).
2. Cloudflare → Workers → agencia-js → Settings → Variables and Secrets → **Secret** `BREVO_API_KEY`.
- Al negocio: cada cita nueva, cancelada o anulada.
- Al cliente (si deja email): confirmación al reservar y recordatorio la víspera (cron diario a las 17:00 UTC).

## Plan Avanzado (`plan: "avanzado"`)
- **Avisos push al móvil del negocio** en cada cita nueva o anulada (gratis). En el panel: «🔔 Avisos al móvil» → Activar. En iPhone hay que instalar antes el panel (Safari → Compartir → Añadir a pantalla de inicio).
- **Vista semanal** en el panel.
- Pide email al cliente (confirmación y recordatorio).

## Avisos por WhatsApp (todos los planes, cuando esté montada la API de Meta)
- Un único número de WhatsApp de Agencia JS envía los avisos a cada negocio (`avisos.whatsapp: "34…"`) y, si se quiere, la confirmación al cliente (`avisos.whatsappCliente: true`).
- Necesita: Meta Business de Agencia JS verificado, un número dedicado para la API, tarjeta en Meta y 3 plantillas de «Utilidad» aprobadas (texto exacto en `asistentes/whatsapp.js`).
- Secretos del Worker: `WA_TOKEN` y `WA_PHONE_ID`. Coste orientativo: ~0,017 € por aviso en España (tarifa de utilidad de Meta, octubre de 2026).

## Agente de voz de un cliente real
En su agente de ElevenLabs, las herramientas apuntan a `https://agencia-js.com/api/as/<slug>/voz/huecos` y `/voz/cita` (mismos parámetros que la demo). Opcional: secreto `VOZ_WEBHOOK_SECRET` en el Worker y la cabecera `x-voz-clave` en las herramientas.

## Seguridad
- La reserva es atómica: nunca entran dos citas en el mismo hueco por encima de `capacidad`.
- Límite por IP y máximo de citas futuras por teléfono (`maxPorTelefono`).
- `dominios`: si se rellena, el widget solo funciona en esas webs.
- El panel solo guarda el SHA-256 de la clave; las claves nunca van al repositorio.
