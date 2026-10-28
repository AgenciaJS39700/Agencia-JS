# Recepcionista de voz (Agencia JS)

Agente que **contesta llamadas** (o desde la web con el micrófono), habla en español natural, resuelve dudas y **da citas** en la agenda del negocio.

## Piezas
| Pieza | Qué es |
|---|---|
| ElevenLabs Agents | Plataforma de voz: escucha (Scribe), piensa (LLM) y habla (voz Eleven v4) con turnos naturales e interrupciones |
| LLM | `claude-haiku-4-5` (rápido y muy bueno en español). Alternativa más barata: `gemini-2.5-flash` |
| Voz | La de Carla (`Wi5NZQRxyOb3Jx4r0hrI`), la misma de los vídeos de la agencia |
| Agenda | `voz/agenda.js` en nuestro Worker: `POST /api/voz/huecos` y `POST /api/voz/cita` (demo: no guarda datos) |
| Teléfono (cliente real) | Número de Twilio o desvío de la línea del negocio (si comunica / no contesta / fuera de horario) |

## Archivos
- `agente-clinica.json` — configuración completa del agente de demo (Clínica Dental Sonrisa): prompt, herramientas, voz, turnos, límites y protecciones.
- `publicar.mjs` — crea o actualiza el agente con la API de ElevenLabs.
- `.github/workflows/agente-voz.yml` — lo publica solo al cambiar el JSON (o a mano desde GitHub → Actions → «Agente de voz»).

## Puesta en marcha (una sola vez)
1. Cuenta de ElevenLabs (plan Creator para empezar; Pro cuando haya clientes).
2. Crear una API key en ElevenLabs y guardarla en GitHub → Settings → Secrets and variables → Actions → **Secret** `ELEVENLABS_API_KEY`. Nunca en el chat ni en el código.
3. GitHub → Actions → «Agente de voz» → Run workflow. En el registro aparece el `agent_id`.
4. Guardar ese `agent_id` como **Variable** `VOZ_AGENT_ID` (para que las siguientes ejecuciones actualicen en vez de crear) y ponerlo en la web (`data-agent` del bloque `#mk-voz`).

## Para un cliente real
1. Copiar `agente-clinica.json`, cambiar datos, servicios, horario y nombre.
2. Sustituir la agenda de demo por la real (D1 o Google Calendar) y guardar la cita.
3. Aviso al negocio (correo con Brevo / WhatsApp) y SMS al paciente.
4. Número: Twilio (España pide documentación) o desvío de su línea; activar `transfer_to_number` hacia su móvil para urgencias.
5. RGPD: el agente se presenta como asistente virtual; informar de la grabación si se activa; política de retención en `platform_settings.privacy`.

## Costes y precio recomendado (orientativo, revisar al contratar)
- Coste por minuto: ~0,08 $ ElevenLabs + LLM (~0,005 $) + línea (~0,01–0,03 $) ≈ **0,10–0,12 $/min**.
- Ejemplo: 300 llamadas × 2 min = 600 min ≈ 60–70 €/mes de coste.

| Plan | Alta | Cuota | Minutos incluidos | Extra |
|---|---|---|---|---|
| **Voz Esencial** | 490 € | 149 €/mes | 250 min | 0,35 €/min |
| **Voz Pro** | 790 € | 249 €/mes | 600 min · agenda real · paso a persona · SMS | 0,30 €/min |
