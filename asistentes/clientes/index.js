// /asistentes/clientes/index.js — Registro de clientes del asistente de citas (lo usa worker.js). NO se publica.
// tools/nuevo-asistente.mjs añade aquí cada cliente nuevo automáticamente.
import demoClinica from "./demo-clinica.js";
import demoPeluqueria from "./demo-peluqueria.js";
// ↓ clientes (no borrar esta línea)

export const CLIENTES = {
  "demo-clinica": demoClinica,
  "demo-peluqueria": demoPeluqueria,
  // ↓ registro (no borrar esta línea)
};
