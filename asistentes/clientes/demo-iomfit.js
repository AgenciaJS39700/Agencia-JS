// /asistentes/clientes/demo-iomfit.js — DEMO para IOMFIT Yoga & Pilates Studio (Teatinos, Málaga).
// Agenda por CLASES con plazas (modo «sesiones»), no por huecos libres: el horario manda.
// Web demo: https://iomfit-demo.agencia39700.workers.dev · Panel: /panel/demo-iomfit
import plantilla from "./_plantilla.js";

// Salas reales del estudio
const CH = "Sala Chandra", SU = "Sala Surya";

// Atajos de sesión: { h: hora, s: id del servicio, cap: plazas, sala }
const s = (h, id, cap, sala, extra) => ({ h, s: id, cap, sala, ...(extra || {}) });

export default {
  ...plantilla,
  slug: "demo-iomfit",
  demo: true,
  plan: "avanzado",
  motor: "basico",
  icono: "activity",
  color: "#6e3f96",
  sector: "Estudio de yoga y pilates",
  negocio: {
    nombre: "IOMFIT Yoga & Pilates Studio",
    tipo: "estudio boutique de yoga, pilates, entrenamiento funcional y baile, con especialidad en embarazo y postparto",
    direccion: "Avda. José Ribera 11, Teatinos, 29010 Málaga",
    telefono: "622 18 32 55",
    horarioTexto: "Clases de lunes a viernes de 10:00 a 21:40 y sábados por la mañana. Cada clase tiene plazas limitadas y se reserva antes de venir.",
    // Horario de apertura (informativo; las reservas van por «sesiones»)
    horario: { 1: [["17:00", "20:30"]], 2: [["10:00", "21:40"]], 3: [["10:00", "20:30"]], 4: [["10:00", "21:40"]], 5: [["17:00", "19:45"]], 6: [["10:30", "11:45"]] },
    // Cuadro real de clases: 0 domingo … 6 sábado
    sesiones: {
      1: [s("17:30", "func-inicial", 12, SU), s("18:30", "power-flow", 14, CH), s("19:30", "gap-suelo", 12, SU)],
      2: [s("10:00", "yinyang", 14, CH), s("11:20", "embarazo", 10, CH), s("12:30", "postnatal", 10, CH),
          s("17:30", "restaurativo", 14, CH), s("18:30", "embarazo", 10, CH), s("18:45", "fisiopilates", 10, SU),
          s("19:30", "yinyang", 14, CH), s("19:45", "func-avanzado", 12, SU), s("20:45", "gap-tonif", 12, SU)],
      3: [s("10:00", "gap-tonif", 12, SU), s("17:30", "func-inicial", 12, SU), s("18:30", "power-flow", 14, CH), s("19:30", "gap-suelo", 12, SU)],
      4: [s("10:00", "yinyang", 14, CH), s("11:20", "embarazo", 10, CH), s("12:30", "postnatal", 10, CH),
          s("17:30", "restaurativo-core", 14, CH), s("18:30", "embarazo", 10, CH), s("18:45", "fisiopilates", 10, SU),
          s("19:30", "yinyang", 14, CH), s("19:45", "func-avanzado", 12, SU), s("20:45", "gap-tonif", 12, SU)],
      5: [s("17:00", "familia", 16, CH, { nota: "Un viernes al mes" }), s("17:00", "salsa-1", 20, SU), s("18:45", "salsa-0", 20, SU)],
      6: [s("10:30", "restaurativo", 14, CH)],
    },
    extra: [
      "Bono Ilimitado Bienestar: 69 € al mes, todas las clases de yoga, pilates, fisiopilates y entrenamiento funcional que quieras, sin matrícula. Es la mejor opción si vienes 3 o más veces por semana.",
      "Bonos por clases a la semana: 1 clase 32,50 €, 2 clases 47,50 €, 3 clases 62,50 € al mes. Clase suelta 12 €. Embarazo y postnatal: 1 clase 40 € y 2 clases 55 € al mes. Salsa y bachata 40 € al mes. Online por Zoom 28 € al mes.",
      "Primera clase de prueba gratis si ese mismo día te apuntas a un bono mensual. Si prefieres pensarlo, se abona como clase suelta (12 €).",
      "Matrícula de 15 €, una sola vez. Con el Bono Ilimitado no hay matrícula. 10 % de descuento pagando por trimestres (excepto Bono Ilimitado).",
      "Clases privadas: 40 € una persona, 75 € dos personas; bonos de 4 sesiones 145 € y 280 €. Se acuerdan por teléfono.",
      "Embarazo: normalmente se empieza a partir de la semana 12 y siempre con el visto bueno de la matrona o del ginecólogo. En postnatal el bebé viene contigo a la sala.",
      "Formaciones: YTT200h certificada por Yoga Alliance (un domingo al mes, de octubre a julio, 19ª edición), Yoga Prenatal y Postnatal 25 h, Yoga Terapéutico YTSO® 25 h, Yoga para Niños 25 h y Yoga Mujer (próximamente). Para la formación se pide información, no se reserva plaza por aquí.",
      "Método propio YTSO® (Yoga Terapéutico Suelo y Órganos), creado por Adriana Eslava, la fundadora.",
      "Qué llevar: esterilla, ropa cómoda, toalla y agua. Llega 5 minutos antes. Dos salas: Chandra y Surya.",
      "Si no puedes venir, anula tu plaza para que la coja otra persona; puedes recuperar la clase en otro horario dentro del mismo mes, según plazas.",
      "Estamos en Avda. José Ribera 11, en Teatinos (Málaga), con aparcamiento fácil en la zona y cerca del Hospital Clínico y de la Universidad.",
      "Talleres y encuentros: Yoga Nidra & Breathwork, Círculo de Mujeres y TribuEncuentro de Maternidad (gratuito, una vez al mes, con matrona, enfermera y fisioterapeuta).",
    ],
    wa: "34622183255",
    web: "https://iomfit-demo.agencia39700.workers.dev/",
    mapa: "https://maps.google.com/?cid=8125878425549589069",
    logo: "",
  },
  // Un servicio por tipo de clase: es lo que se reserva
  servicios: [
    { id: "yinyang", nombre: "Vinyasa YinYang Yoga", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "power-flow", nombre: "Vinyasa Power Flow", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "restaurativo", nombre: "Yoga Restaurativo YTSO®", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "restaurativo-core", nombre: "Yoga Restaurativo & Core", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "embarazo", nombre: "Yoga & Pilates Embarazo", min: 70, precio: "bono embarazo desde 40 € · suelta 12 €" },
    { id: "postnatal", nombre: "Yoga & Pilates Postnatal con bebés", min: 70, precio: "bono postnatal desde 40 € · suelta 12 €" },
    { id: "gap-tonif", nombre: "Pilates GAP + Tonificación", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "gap-suelo", nombre: "Pilates GAP + Suelo Pélvico", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "fisiopilates", nombre: "Fisiopilates", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "func-inicial", nombre: "Entrenamiento Funcional Inicial", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "func-avanzado", nombre: "Entrenamiento Funcional Avanzado", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "salsa-0", nombre: "Salsa & Bachata · Nivel Cero", min: 60, precio: "bono 40 € al mes · suelta 12 €" },
    { id: "salsa-1", nombre: "Salsa & Bachata · Básico 1", min: 60, precio: "bono 40 € al mes · suelta 12 €" },
    { id: "familia", nombre: "Taller Yoga en Familia", min: 60, precio: "20 € un adulto y un peque · 5 € extra" },
  ],
  salud: false,
  urgencia: "",
  chips: ["Quiero reservar una clase", "¿Cuánto cuesta el Bono Ilimitado?", "Estoy embarazada, ¿puedo venir?"],
  saludo: "¡Hola! Soy el asistente de IOMFIT 🧘 Reservo tu plaza en la clase que quieras y te resuelvo dudas de horarios, bonos o embarazo.",
  agenda: {
    ...plantilla.agenda,
    capacidad: 12,          // plazas por defecto si una clase no indica las suyas
    antelacionMin: 60,      // hasta 1 h antes de que empiece la clase
    diasMax: 21,            // se abre la reserva con tres semanas de margen
    maxPorTelefono: 12,     // quien viene a diario reserva varias clases
    pedirEmail: true,
  },
  avisos: { email: "agencia39700@gmail.com", whatsapp: "", whatsappCliente: false },
  panel: { hash: "6eefe7d0d002aafce2c192f50f63573ffcb39c9925839c783fd4d5c4604a8e9d" },
  dominios: ["https://iomfit-demo.agencia39700.workers.dev"],
};
