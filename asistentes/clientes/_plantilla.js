// /asistentes/clientes/_plantilla.js — Plantilla de cliente del asistente de citas. NO se publica (ver .assetsignore).
// Alta de un cliente: `node tools/nuevo-asistente.mjs <slug> "<Nombre del negocio>" <sector>` copia esta plantilla,
// genera la clave del panel y lo registra en clientes/index.js. Luego rellena lo marcado con «TODO».

export default {
  slug: "SLUG",                  // en la URL: agencia-js.com/c/SLUG · solo minúsculas, números y guiones
  activo: true,                  // false = el asistente deja de dar citas (impago, baja…)
  demo: false,                   // true = muestra el aviso de «negocio ficticio»
  plan: "basico",                // "basico" · "avanzado" (avisos push al móvil, vista semanal, email y recordatorios)
  motor: "basico",               // "basico" (Workers AI) · "pro" (Claude). El Avanzado puede seguir con "basico" si va bien
  icono: "cal",                  // tooth · scissors · sparkles · activity · paw · car · cal
  color: "#e8c766",              // color principal (botones, cabecera)
  sector: "SECTOR",
  negocio: {
    nombre: "NOMBRE",
    tipo: "TODO tipo de negocio (p. ej. «clínica dental»)",
    direccion: "TODO dirección completa",
    telefono: "TODO teléfono visible",
    horarioTexto: "TODO horario en texto (lo lee el asistente)",
    // Horario real para la agenda: 0 domingo … 6 sábado → tramos ["HH:MM","HH:MM"]
    horario: { 1: [["09:00", "14:00"], ["16:00", "20:00"]], 2: [["09:00", "14:00"], ["16:00", "20:00"]], 3: [["09:00", "14:00"], ["16:00", "20:00"]], 4: [["09:00", "14:00"], ["16:00", "20:00"]], 5: [["09:00", "14:00"]] },
    extra: ["TODO datos que el asistente puede contar (aparcamiento, formas de pago, idiomas…)"],
    wa: "34XXXXXXXXX",           // WhatsApp del negocio, con prefijo y sin «+» (botón «hablar con una persona»)
    web: "",                     // si tiene web, para el enlace de la página de citas
    mapa: "",                    // enlace de Google Maps (ficha)
    logo: "",                    // URL de su logo (cuadrado, opcional)
  },
  servicios: [
    // id único · nombre · min (duración real que ocupa en la agenda) · precio en texto
    { id: "servicio1", nombre: "TODO servicio", min: 30, precio: "TODO" },
  ],
  salud: false,                  // true en clínicas, fisios, veterinarias… (no diagnostica)
  urgencia: "",                  // texto para urgencias si salud = true
  chips: ["¿Qué horario tenéis?", "¿Cuánto cuesta?", "¿Dónde estáis?"],
  saludo: "¡Hola! Soy el asistente de NOMBRE. Te ayudo a pedir cita o a resolver tus dudas.",
  agenda: {
    paso: 30,                    // cada cuántos minutos empieza un hueco
    capacidad: 1,                // citas a la vez (n.º de profesionales/sillas)
    antelacionMin: 60,           // minutos mínimos entre «ahora» y la cita
    diasMax: 60,                 // hasta cuántos días vista se puede reservar
    festivos: [],                // ["2026-12-25", "2027-01-01"] días cerrados
    maxPorTelefono: 3,           // citas futuras máximas por teléfono (anti-abuso)
    pedirEmail: false,           // true = pide email al cliente (confirmación + recordatorio por correo)
  },
  avisos: {
    email: "TODO@correo-del-negocio.com", // recibe cada cita nueva y cada cancelación
    whatsapp: "",                // WhatsApp del negocio para avisos (p. ej. "34600111222"); vacío = sin avisos por WhatsApp
    whatsappCliente: false,      // true = el cliente recibe la confirmación por WhatsApp (desde el número de Agencia JS)
  },
  panel: { hash: "HASH" },       // SHA-256 de la clave del panel (la clave NO se guarda aquí)
  dominios: [],                  // webs donde se instala el widget, p. ej. ["https://clinica.com"] (vacío = cualquiera)
};
