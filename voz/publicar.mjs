// /voz/publicar.mjs — Crea o actualiza el agente de voz en ElevenLabs a partir de agente-clinica.json.
// Uso (la clave nunca va en el código ni en el chat):
//   ELEVENLABS_API_KEY=… node voz/publicar.mjs            → crea el agente e imprime su agent_id
//   ELEVENLABS_API_KEY=… VOZ_AGENT_ID=agent_… node voz/publicar.mjs → actualiza ese agente
// En GitHub se ejecuta solo con la acción «Agente de voz» (secreto ELEVENLABS_API_KEY y variable VOZ_AGENT_ID).
import { readFile } from "node:fs/promises";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.log("Sin ELEVENLABS_API_KEY: no se publica nada (añade el secreto en GitHub para activarlo)."); process.exit(0); }
const ID = (process.env.VOZ_AGENT_ID || "").trim();
const cfg = JSON.parse(await readFile(new URL("./agente-clinica.json", import.meta.url), "utf8"));
const API = "https://api.elevenlabs.io/v1/convai/agents";

const res = await fetch(ID ? `${API}/${ID}` : `${API}/create`, {
  method: ID ? "PATCH" : "POST",
  headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify(cfg)
});
const txt = await res.text();
if (!res.ok) { console.error(`Error ${res.status}: ${txt.slice(0, 2000)}`); process.exit(1); }
const out = JSON.parse(txt || "{}");
console.log(ID ? `Agente actualizado: ${ID}` : `Agente creado: ${out.agent_id}`);
console.log("Guarda este agent_id como variable VOZ_AGENT_ID en GitHub y pásaselo a Claude para ponerlo en la web.");
