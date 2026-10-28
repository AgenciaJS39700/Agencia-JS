#!/usr/bin/env node
// /tools/nuevo-asistente.mjs — Da de alta un cliente del asistente de citas en un minuto de trabajo nuestro.
// Uso:  node tools/nuevo-asistente.mjs <slug> "<Nombre del negocio>" <sector> [basico|pro]
//       sector = dental · peluqueria · estetica · fisio · veterinaria · taller · otro
// Hace: crea asistentes/clientes/<slug>.js con los servicios y el horario típicos del sector, genera la clave del
// panel (solo se muestra AQUÍ: dásela al cliente y no la guardes en el repo) y lo registra en clientes/index.js.
// Para cambiar la clave de un cliente: node tools/nuevo-asistente.mjs --clave <slug>

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(RAIZ, "asistentes", "clientes");
const nuevaClave = () => randomBytes(9).toString("base64url"); // 12 caracteres
const hash = (t) => createHash("sha256").update(t).digest("hex");
const fallo = (m) => { console.error("✖ " + m); process.exit(1); };

const args = process.argv.slice(2);
if (args[0] === "--clave") {
  const slug = args[1], f = join(DIR, `${slug}.js`);
  if (!slug || !existsSync(f)) fallo("Cliente no encontrado: " + slug);
  const clave = nuevaClave();
  const s = readFileSync(f, "utf8").replace(/panel:\s*\{\s*hash:\s*"[0-9a-fA-F]*"\s*\}/, `panel: { hash: "${hash(clave)}" }`);
  writeFileSync(f, s);
  console.log(`✔ Clave nueva para ${slug}: ${clave}\n  Haz commit y push para que funcione. La anterior deja de valer.`);
  process.exit(0);
}

const [slug, nombre, sector = "otro", motor = "basico"] = args;
if (!slug || !/^[a-z0-9-]{2,40}$/.test(slug)) fallo('Slug no válido (minúsculas, números y guiones). Ej.: node tools/nuevo-asistente.mjs clinica-lopez "Clínica López" dental');
if (!nombre) fallo("Falta el nombre del negocio entre comillas.");
if (!["basico", "pro"].includes(motor)) fallo("Motor: basico o pro.");
const archivo = join(DIR, `${slug}.js`);
if (existsSync(archivo)) fallo(`Ya existe ${archivo}`);

const { SECTORES } = await import(join(RAIZ, "asistentes", "sectores.js"));
const base = SECTORES[sector];
if (!base && sector !== "otro") fallo("Sector desconocido. Usa: " + Object.keys(SECTORES).join(", ") + " u otro");

const clave = nuevaClave();
const v = (x) => JSON.stringify(x);
const servicios = base ? base.servicios : [{ id: "servicio1", nombre: "TODO servicio", min: 30, precio: "TODO" }];
const variable = slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^[0-9]/, "c$&");

const contenido = `// /asistentes/clientes/${slug}.js — ${nombre}. Generado con tools/nuevo-asistente.mjs el ${new Date().toISOString().slice(0, 10)}.
// Revisa todo lo marcado con TODO con los datos que nos dé el cliente (cuestionario de alta).
import plantilla from "./_plantilla.js";

export default {
  ...plantilla,
  slug: ${v(slug)},
  motor: ${v(motor)},
  icono: ${v(base ? base.icono : "cal")},
  color: ${v(base ? base.color : "#e8c766")},        // TODO color de su marca
  sector: ${v(base ? base.sector.replace(/s$/, "").replace(/ y .*/, "") : "TODO sector")},
  negocio: {
    nombre: ${v(nombre)},
    tipo: ${v(base ? base.negocio.tipo : "TODO tipo de negocio")},
    direccion: "TODO dirección completa",
    telefono: "TODO teléfono",
    horarioTexto: ${v(base ? base.negocio.horarioTexto : "TODO horario en texto")},   // TODO comprobar
    horario: ${v(base ? base.negocio.horario : plantilla_horario())},   // TODO comprobar (0 domingo … 6 sábado)
    extra: [
      // TODO datos que el asistente puede contar. Ejemplos del sector (cambiar o borrar):
${(base ? base.negocio.extra : []).map((e) => "      // " + v(e) + ",").join("\n")}
    ],
    wa: "34XXXXXXXXX",          // TODO WhatsApp del negocio
    web: "",
    mapa: "",                   // TODO enlace de su ficha de Google Maps
    logo: "",
  },
  servicios: ${JSON.stringify(servicios, null, 2).replace(/\n/g, "\n  ")},   // TODO servicios, duración real (min) y precio
  salud: ${base ? !!base.salud : false},
  urgencia: ${v(base && base.urgencia ? base.urgencia : "")},
  chips: ${v(base ? base.chips : plantillaChips())},
  saludo: ${v(`¡Hola! Soy el asistente de ${nombre}. Te ayudo a pedir cita o a resolver tus dudas.`)},
  agenda: { ...plantilla.agenda, capacidad: 1, pedirEmail: ${motor === "pro"} }, // TODO capacidad = profesionales a la vez
  avisos: { email: "TODO@correo-del-negocio.com" },
  panel: { hash: "${hash(clave)}" },
  dominios: [],                 // TODO si tiene web: ["https://su-dominio.com"]
};
`;
function plantilla_horario() { return { 1: [["09:00", "14:00"], ["16:00", "20:00"]], 2: [["09:00", "14:00"], ["16:00", "20:00"]], 3: [["09:00", "14:00"], ["16:00", "20:00"]], 4: [["09:00", "14:00"], ["16:00", "20:00"]], 5: [["09:00", "14:00"], ["16:00", "20:00"]] }; }
function plantillaChips() { return ["¿Qué horario tenéis?", "¿Cuánto cuesta?", "¿Dónde estáis?"]; }

writeFileSync(archivo, contenido);
const idx = join(DIR, "index.js");
let s = readFileSync(idx, "utf8");
s = s.replace("// ↓ clientes (no borrar esta línea)", `import ${variable} from "./${slug}.js";\n// ↓ clientes (no borrar esta línea)`)
     .replace("  // ↓ registro (no borrar esta línea)", `  ${v(slug)}: ${variable},\n  // ↓ registro (no borrar esta línea)`);
writeFileSync(idx, s);

console.log(`✔ Cliente creado: asistentes/clientes/${slug}.js

  CLAVE DEL PANEL (dásela al cliente, no se vuelve a mostrar): ${clave}

  1. Rellena los TODO del archivo con los datos del cliente.
  2. git add -A && git commit -m "feat(asistentes): alta ${slug}" && git push   (se publica solo)
  3. Prueba: https://agencia-js.com/c/${slug}  ·  Panel: https://agencia-js.com/panel/${slug}
  4. Si tiene web, pega antes de </body>:
     <script src="https://agencia-js.com/asistentes/widget.js" data-negocio="${slug}" async></script>`);
