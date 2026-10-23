// /asistentes/sectores.js — Configuración de los asistentes de citas por sector.
// La usan el servidor (asistentes/motor.js, para el prompt) y el navegador (asistentes/asistente.js, para la
// interfaz y el flujo de reserva). No contiene secretos: todo lo de aquí es público.
//
// Para un cliente real: copiar un sector, cambiar los datos del negocio y poner `motor: "pro"` si contrata
// el nivel avanzado (Claude). Los negocios de esta lista son FICTICIOS (demos del mercado de Agencia JS).

/** Horario: clave = día de la semana (0 domingo … 6 sábado), valor = tramos ["HH:MM", "HH:MM"]. */
const L_V_PARTIDO = { 1: [["09:00", "14:00"], ["16:00", "20:00"]], 2: [["09:00", "14:00"], ["16:00", "20:00"]], 3: [["09:00", "14:00"], ["16:00", "20:00"]], 4: [["09:00", "14:00"], ["16:00", "20:00"]], 5: [["09:00", "14:00"], ["16:00", "20:00"]] };

export const SECTORES = {
  dental: {
    id: "dental",
    sector: "Clínicas dentales",
    icono: "tooth",
    color: "#38bdf8",
    gancho: "Primeras visitas, limpiezas y urgencias sin colgarse del teléfono.",
    negocio: {
      nombre: "Clínica Dental Sonríe",
      tipo: "clínica dental",
      direccion: "Avenida Principal 12 (dirección de ejemplo)",
      telefono: "600 000 001 (número de ejemplo)",
      horarioTexto: "Lunes a viernes de 9:00 a 14:00 y de 16:00 a 20:00. Sábados y domingos cerrado.",
      horario: L_V_PARTIDO,
      extra: [
        "Primera visita con revisión y radiografía panorámica gratuita.",
        "Financiación de tratamientos hasta 12 meses sin intereses (sujeto a aprobación).",
        "Se atienden niños desde los 3 años.",
        "Aparcamiento gratuito para pacientes en el mismo edificio.",
      ],
    },
    servicios: [
      { id: "primera", nombre: "Primera visita y revisión", min: 30, precio: "Gratis" },
      { id: "limpieza", nombre: "Limpieza dental", min: 45, precio: "45 €" },
      { id: "blanq", nombre: "Blanqueamiento (valoración)", min: 30, precio: "Valoración gratis" },
      { id: "orto", nombre: "Ortodoncia invisible (estudio)", min: 45, precio: "Estudio gratis" },
      { id: "implante", nombre: "Implantes (consulta)", min: 30, precio: "Consulta gratis" },
    ],
    salud: true,
    urgencia: "Si tienes dolor fuerte, hinchazón o un golpe en un diente, llama ahora a la clínica: reservamos huecos de urgencia cada día.",
    chips: ["¿Cuánto cuesta una limpieza?", "¿Tenéis financiación?", "Me duele una muela", "¿Atendéis a niños?"],
    saludo: "¡Hola! Soy el asistente de Clínica Dental Sonríe. Te ayudo a pedir cita o a resolver dudas sobre tratamientos, precios y horarios.",
  },

  peluqueria: {
    id: "peluqueria",
    sector: "Peluquerías y barberías",
    icono: "scissors",
    color: "#e8c766",
    gancho: "Cortes, color y peinados reservados mientras tienes las manos ocupadas.",
    negocio: {
      nombre: "Estudio Lúa Peluquería",
      tipo: "peluquería unisex",
      direccion: "Calle Mayor 5 (dirección de ejemplo)",
      telefono: "600 000 002 (número de ejemplo)",
      horarioTexto: "Martes a viernes de 10:00 a 20:00 y sábados de 9:00 a 14:00. Domingo y lunes cerrado.",
      horario: { 2: [["10:00", "20:00"]], 3: [["10:00", "20:00"]], 4: [["10:00", "20:00"]], 5: [["10:00", "20:00"]], 6: [["09:00", "14:00"]] },
      extra: [
        "Trabajamos con productos sin amoniaco y veganos.",
        "Antes de un color o unas mechas hacemos prueba de sensibilidad si es la primera vez.",
        "Para novias e invitadas se recomienda reservar con 2 semanas de antelación.",
      ],
    },
    servicios: [
      { id: "corte-m", nombre: "Corte y peinado mujer", min: 45, precio: "28 €" },
      { id: "corte-h", nombre: "Corte hombre", min: 30, precio: "15 €" },
      { id: "barba", nombre: "Corte + arreglo de barba", min: 45, precio: "22 €" },
      { id: "color", nombre: "Color raíz", min: 90, precio: "desde 35 €" },
      { id: "balayage", nombre: "Mechas balayage", min: 150, precio: "desde 75 €" },
      { id: "peinado", nombre: "Peinado de evento", min: 60, precio: "desde 35 €" },
    ],
    chips: ["¿Cuánto cuestan unas mechas?", "¿Hay hueco el sábado?", "¿Usáis productos veganos?", "Quiero un peinado de boda"],
    saludo: "¡Hola! Soy el asistente de Estudio Lúa. ¿Te busco un hueco o tienes alguna duda sobre servicios y precios?",
  },

  estetica: {
    id: "estetica",
    sector: "Centros de estética y uñas",
    icono: "sparkles",
    color: "#f0abfc",
    gancho: "Faciales, uñas y tratamientos con la agenda siempre llena.",
    negocio: {
      nombre: "Aura Centro de Estética",
      tipo: "centro de estética",
      direccion: "Plaza del Sol 3 (dirección de ejemplo)",
      telefono: "600 000 003 (número de ejemplo)",
      horarioTexto: "Lunes a viernes de 10:00 a 21:00 y sábados de 10:00 a 14:00.",
      horario: { 1: [["10:00", "21:00"]], 2: [["10:00", "21:00"]], 3: [["10:00", "21:00"]], 4: [["10:00", "21:00"]], 5: [["10:00", "21:00"]], 6: [["10:00", "14:00"]] },
      extra: [
        "Bonos de 5 sesiones con un 15 % de descuento en tratamientos faciales y corporales.",
        "La depilación láser empieza siempre con una valoración gratuita y prueba en una zona pequeña.",
        "Tarjetas regalo disponibles en el centro.",
      ],
    },
    servicios: [
      { id: "facial", nombre: "Limpieza facial profunda", min: 60, precio: "45 €" },
      { id: "semi", nombre: "Manicura semipermanente", min: 45, precio: "22 €" },
      { id: "lifting", nombre: "Lifting de pestañas", min: 60, precio: "40 €" },
      { id: "masaje", nombre: "Masaje relajante", min: 60, precio: "50 €" },
      { id: "laser", nombre: "Láser (valoración)", min: 30, precio: "Valoración gratis" },
    ],
    chips: ["¿Tenéis bonos?", "¿Cómo funciona el láser?", "Quiero regalar un masaje", "¿Cuánto dura el semipermanente?"],
    saludo: "¡Hola! Soy el asistente de Aura. Te ayudo a reservar tu tratamiento o a resolver cualquier duda.",
  },

  fisio: {
    id: "fisio",
    sector: "Fisioterapia y salud",
    icono: "activity",
    color: "#4ade80",
    gancho: "Valoraciones y sesiones agendadas sin interrumpir el tratamiento.",
    negocio: {
      nombre: "FisioActiva",
      tipo: "clínica de fisioterapia",
      direccion: "Calle del Río 22 (dirección de ejemplo)",
      telefono: "600 000 004 (número de ejemplo)",
      horarioTexto: "Lunes a viernes de 8:00 a 14:00 y de 15:30 a 21:00.",
      horario: { 1: [["08:00", "14:00"], ["15:30", "21:00"]], 2: [["08:00", "14:00"], ["15:30", "21:00"]], 3: [["08:00", "14:00"], ["15:30", "21:00"]], 4: [["08:00", "14:00"], ["15:30", "21:00"]], 5: [["08:00", "14:00"], ["15:30", "21:00"]] },
      extra: [
        "Todas las sesiones son individuales, de 50 minutos, con el mismo fisioterapeuta.",
        "Bono de 5 sesiones: 200 €.",
        "Trabajamos con varias mutuas y seguros privados; consulta la tuya por teléfono.",
        "Trae ropa cómoda y, si tienes, informes o pruebas médicas.",
      ],
    },
    servicios: [
      { id: "valoracion", nombre: "Primera valoración", min: 50, precio: "45 €" },
      { id: "sesion", nombre: "Sesión de fisioterapia", min: 50, precio: "45 €" },
      { id: "deportiva", nombre: "Fisioterapia deportiva", min: 50, precio: "50 €" },
      { id: "pelvico", nombre: "Suelo pélvico", min: 50, precio: "55 €" },
    ],
    salud: true,
    urgencia: "Si el dolor es muy intenso, aparece tras un golpe fuerte o va con hormigueo o pérdida de fuerza, consulta con tu médico o acude a urgencias.",
    chips: ["¿Trabajáis con mi mutua?", "¿Cuánto dura una sesión?", "¿Tenéis bonos?", "¿Qué tengo que llevar?"],
    saludo: "¡Hola! Soy el asistente de FisioActiva. Te ayudo a pedir tu primera valoración o una sesión.",
  },

  veterinaria: {
    id: "veterinaria",
    sector: "Clínicas veterinarias",
    icono: "paw",
    color: "#fb923c",
    gancho: "Vacunas, revisiones y peluquería canina sin esperas al teléfono.",
    negocio: {
      nombre: "Clínica Veterinaria Huellas",
      tipo: "clínica veterinaria",
      direccion: "Calle de los Pinos 8 (dirección de ejemplo)",
      telefono: "600 000 005 (número de ejemplo)",
      horarioTexto: "Lunes a viernes de 9:30 a 13:30 y de 16:30 a 20:30; sábados de 10:00 a 13:30. Urgencias por teléfono 24 h.",
      horario: { 1: [["09:30", "13:30"], ["16:30", "20:30"]], 2: [["09:30", "13:30"], ["16:30", "20:30"]], 3: [["09:30", "13:30"], ["16:30", "20:30"]], 4: [["09:30", "13:30"], ["16:30", "20:30"]], 5: [["09:30", "13:30"], ["16:30", "20:30"]], 6: [["10:00", "13:30"]] },
      extra: [
        "Atendemos perros, gatos y animales exóticos pequeños (conejos, hurones, aves).",
        "Plan de salud anual con vacunas, desparasitación y revisión incluidas.",
        "Para la peluquería canina, trae a tu perro con la correa y sin haber comido en las 2 horas anteriores.",
      ],
    },
    servicios: [
      { id: "consulta", nombre: "Consulta general", min: 20, precio: "35 €" },
      { id: "vacuna", nombre: "Vacunación", min: 20, precio: "desde 30 €" },
      { id: "revision", nombre: "Revisión anual", min: 30, precio: "40 €" },
      { id: "pelu", nombre: "Peluquería canina", min: 90, precio: "desde 30 €" },
      { id: "chip", nombre: "Microchip y pasaporte", min: 20, precio: "45 €" },
    ],
    salud: true,
    urgencia: "Si tu animal tiene una urgencia (no respira bien, ha comido algo tóxico, sangra o ha sufrido un golpe), llama ya al teléfono de urgencias 24 h.",
    chips: ["¿Atendéis gatos?", "¿Qué vacunas necesita un cachorro?", "Mi perro ha comido chocolate", "¿Tenéis peluquería?"],
    saludo: "¡Hola! Soy el asistente de Huellas. ¿Pedimos cita para tu mascota o tienes alguna duda?",
  },

  taller: {
    id: "taller",
    sector: "Talleres mecánicos",
    icono: "car",
    color: "#a3a3a3",
    gancho: "Revisiones, pre-ITV y neumáticos con cita, sin colas.",
    negocio: {
      nombre: "Taller Motor Norte",
      tipo: "taller mecánico multimarca",
      direccion: "Polígono Industrial, nave 4 (dirección de ejemplo)",
      telefono: "600 000 006 (número de ejemplo)",
      horarioTexto: "Lunes a viernes de 8:00 a 13:30 y de 15:00 a 19:00.",
      horario: { 1: [["08:00", "13:30"], ["15:00", "19:00"]], 2: [["08:00", "13:30"], ["15:00", "19:00"]], 3: [["08:00", "13:30"], ["15:00", "19:00"]], 4: [["08:00", "13:30"], ["15:00", "19:00"]], 5: [["08:00", "13:30"], ["15:00", "19:00"]] },
      extra: [
        "Presupuesto sin compromiso antes de cualquier reparación.",
        "Coche de sustitución bajo disponibilidad para reparaciones de más de un día.",
        "Mantenemos la garantía oficial del fabricante usando recambios homologados.",
        "El precio exacto depende de la marca, el modelo y el motor del vehículo.",
      ],
    },
    servicios: [
      { id: "aceite", nombre: "Cambio de aceite y filtros", min: 60, precio: "desde 69 €" },
      { id: "revision", nombre: "Revisión completa", min: 120, precio: "desde 120 €" },
      { id: "preitv", nombre: "Pre-ITV", min: 45, precio: "29 €" },
      { id: "neumaticos", nombre: "Neumáticos (montaje)", min: 45, precio: "según medida" },
      { id: "diagnosis", nombre: "Diagnosis electrónica", min: 30, precio: "35 €" },
      { id: "aire", nombre: "Carga de aire acondicionado", min: 45, precio: "desde 55 €" },
    ],
    chips: ["¿Cuánto cuesta cambiar el aceite?", "¿Tenéis coche de sustitución?", "Se me ha encendido un testigo", "¿Hacéis pre-ITV?"],
    saludo: "¡Hola! Soy el asistente de Taller Motor Norte. Te doy cita o te oriento sobre revisiones, ITV y precios.",
  },
};

export const ORDEN = ["dental", "peluqueria", "estetica", "fisio", "veterinaria", "taller"];
