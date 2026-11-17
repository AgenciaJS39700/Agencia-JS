// /asistentes/clientes/demo-iomfit.js — DEMO para IOMFIT Yoga & Pilates Studio (Teatinos, Málaga).
// Agenda por CLASES con plazas (modo «sesiones»), no por huecos libres: el horario manda.
// Web demo: https://iomfit-demo.agencia39700.workers.dev · Panel: /panel/demo-iomfit
import plantilla from "./_plantilla.js";

// Salas reales del estudio
const CH = "Sala Chandra", SU = "Sala Surya";

// Atajos de sesión: { h: hora, s: id del servicio, cap: plazas, sala, prof, on: también online }
const s = (h, id, cap, sala, prof, extra) => ({ h, s: id, cap, sala, prof, ...(extra || {}) });

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
    // Cuadro real de clases (tomado de su Momoyoga, semana del 16/11/2026): 0 domingo … 6 sábado
    sesiones: {
      1: [s("17:30", "func-inicial", 12, SU, "Sandra"), s("18:30", "power-flow", 14, CH, "Sandra", { on: 1 }), s("19:30", "gap-suelo", 12, CH, "Sandra", { on: 1 })],
      2: [s("10:00", "yinyang", 14, CH, "Adriana", { on: 1 }), s("11:20", "embarazo", 10, CH, "Adriana", { on: 1 }), s("12:30", "postnatal", 10, CH, "Adriana", { on: 1 }),
          s("17:30", "restaurativo", 14, CH, "Adriana"), s("18:15", "fisiopilates", 10, SU, "Sus"), s("18:30", "embarazo", 10, CH, "Adriana", { on: 1 }),
          s("19:30", "func-avanzado", 12, SU, "Sus"), s("19:30", "yinyang", 14, CH, "Adriana", { on: 1 }), s("20:45", "power-flow", 12, SU, "Sus")],
      3: [s("17:30", "func-inicial", 12, SU, "Juanjo"), s("18:30", "power-flow", 14, CH, "Juanjo", { on: 1 }), s("19:30", "gap-suelo", 12, CH, "Juanjo", { on: 1 })],
      4: [s("10:00", "yinyang", 14, CH, "Adriana", { on: 1 }), s("11:20", "embarazo", 10, CH, "Adriana", { on: 1 }), s("12:30", "postnatal", 10, CH, "Adriana", { on: 1 }),
          s("17:30", "restaurativo-core", 14, CH, "Sandra"), s("18:15", "fisiopilates", 10, SU, "Sus"), s("18:30", "embarazo", 10, CH, "Sandra", { on: 1 }),
          s("19:30", "func-avanzado", 12, SU, "Sus"), s("19:30", "yinyang", 14, CH, "Sandra", { on: 1 }), s("20:45", "gap-tonif", 12, CH, "Sus")],
      5: [s("17:15", "familia", 16, SU, "Adriana", { nota: "Un viernes al mes" }), s("17:30", "salsa-1", 20, SU, "Sergio"), s("19:00", "salsa-0", 20, SU, "Sergio")],
      6: [s("10:30", "restaurativo", 14, CH, "Adriana")],
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
    // `resenas`: enlace directo a escribir opinión en Google. Mientras no esté, el
    // correo que pide reseña usa el mapa, que también lleva a su ficha. El enlace
    // bueno se saca del perfil de empresa de ella (Pedir reseñas → copiar enlace).
    logo: "",
  },
  // Un servicio por tipo de clase: es lo que se reserva
  servicios: [
    { id: "yinyang", tipo: "bienestar", nombre: "Vinyasa YinYang Yoga", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "power-flow", tipo: "bienestar", nombre: "Vinyasa Power Flow", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "restaurativo", tipo: "bienestar", nombre: "Yoga Restaurativo YTSO®", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "restaurativo-core", tipo: "bienestar", nombre: "Yoga Restaurativo & Core", min: 75, precio: "incluida en tu bono · suelta 12 €" },
    { id: "embarazo", tipo: "maternidad", nombre: "Yoga & Pilates Embarazo", min: 70, precio: "bono embarazo desde 40 € · suelta 12 €" },
    { id: "postnatal", tipo: "maternidad", nombre: "Yoga & Pilates Postnatal con bebés", min: 70, precio: "bono postnatal desde 40 € · suelta 12 €" },
    { id: "gap-tonif", tipo: "fuerza", nombre: "Pilates GAP + Tonificación", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "gap-suelo", tipo: "fuerza", nombre: "Pilates GAP + Suelo Pélvico", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "fisiopilates", tipo: "fuerza", nombre: "Fisiopilates", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "func-inicial", tipo: "fuerza", nombre: "Entrenamiento Funcional Inicial", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "func-avanzado", tipo: "fuerza", nombre: "Entrenamiento Funcional Avanzado", min: 55, precio: "incluida en tu bono · suelta 12 €" },
    { id: "salsa-0", tipo: "baile", nombre: "Salsa & Bachata · Nivel Cero", min: 60, precio: "bono 40 € al mes · suelta 12 €" },
    { id: "salsa-1", tipo: "baile", nombre: "Salsa & Bachata · Básico 1", min: 60, precio: "bono 40 € al mes · suelta 12 €" },
    { id: "familia", tipo: "taller", nombre: "Taller Yoga en Familia", min: 60, precio: "20 € un adulto y un peque · 5 € extra" },
  ],
  // Bonos reales del estudio (los mismos que tienen cargados en Momoyoga, 16/11/2026).
  // precio en céntimos · meses de validez (o dias) · sem: clases por semana (0 = sin límite)
  // tipos: qué actividades cubre · recurrente: se renueva solo cada mes con Stripe
  productos: [
    { id: "ilimitado", nombre: "Bono Ilimitado Bienestar", precio: 6900, meses: 1, sem: 0, tipos: ["bienestar", "fuerza"], recurrente: true, destacado: true, nota: "Sin matrícula. Todas las clases de yoga, pilates, fisiopilates y funcional que quieras." },
    { id: "tres", nombre: "Bono 3 clases por semana", precio: 6250, meses: 1, sem: 3, tipos: ["bienestar", "fuerza"], recurrente: true },
    { id: "dos", nombre: "Bono 2 clases por semana", precio: 4750, meses: 1, sem: 2, tipos: ["bienestar", "fuerza"], recurrente: true },
    { id: "uno", nombre: "Bono 1 clase por semana", precio: 3250, meses: 1, sem: 1, tipos: ["bienestar", "fuerza"], recurrente: true },
    { id: "dos-tri", nombre: "Bono 2 clases por semana · trimestral", precio: 12800, meses: 3, sem: 2, tipos: ["bienestar", "fuerza"], nota: "Tres meses pagando de una vez: ahorras 14,50 €." },
    { id: "uno-tri", nombre: "Bono 1 clase por semana · trimestral", precio: 8800, meses: 3, sem: 1, tipos: ["bienestar", "fuerza"], nota: "Tres meses pagando de una vez: ahorras 9,50 €." },
    { id: "emb2", nombre: "Embarazo y postparto · 2 días por semana", precio: 5500, meses: 1, sem: 2, tipos: ["maternidad"], recurrente: true },
    { id: "emb1", nombre: "Embarazo y postparto · 1 día por semana", precio: 4000, meses: 1, sem: 1, tipos: ["maternidad"], recurrente: true },
    { id: "salsa", nombre: "Salsa y bachata · 1 día por semana", precio: 4000, meses: 1, sem: 1, tipos: ["baile"], recurrente: true },
    // El taller de familia es UN viernes al mes, así que no puede ser un bono semanal:
    // es una entrada por taller, al precio que ellos publican (20 € un adulto y un peque).
    { id: "familia", nombre: "Taller Yoga en Familia · un adulto y un peque", precio: 2000, dias: 1, sem: 1, tipos: ["taller"], nota: "Cada peque o acompañante de más, 5 € que se pagan en el estudio." },
    { id: "online", nombre: "Yoga o pilates online · 1 día por semana", precio: 2800, meses: 1, sem: 1, tipos: ["bienestar", "fuerza"], online: true, recurrente: true },
    { id: "ilim21", nombre: "Bono Ilimitado 21 días", precio: 3900, dias: 21, sem: 0, tipos: ["bienestar", "fuerza"], nuevas: true, nota: "Solo para quien empieza: 21 días de todo lo que quieras." },
    { id: "suelta", nombre: "Clase suelta", precio: 1200, dias: 1, sem: 1, tipos: ["bienestar", "fuerza", "maternidad", "baile"] },
    { id: "prueba", nombre: "1.ª clase de prueba", precio: 0, dias: 1, sem: 1, tipos: ["bienestar", "fuerza", "maternidad", "baile"], nuevas: true, nota: "Gratis. Si ese mismo día te apuntas a un bono mensual, no pagas nada." },
  ],
  matricula: { precio: 1500, nombre: "Matrícula", nota: "Se paga una sola vez. Con el Bono Ilimitado no hay matrícula.", exentos: ["ilimitado", "ilim21", "prueba", "suelta"] },

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
    cancelarHoras: 4,       // hasta 4 h antes se puede anular sola y la plaza se libera
  },
  // Datos para la factura. CAMBIAR por los fiscales reales del estudio antes de cobrar de verdad.
  factura: {
    serie: "F",
    nombre: "IOMFIT Yoga & Pilates Studio (datos de ejemplo)",
    nif: "B00000000",
    direccion: "Avda. José Ribera 11, 29010 Málaga",
    iva: 0,
    exento: "Operación exenta de IVA por el artículo 20.Uno.13.º de la Ley 37/1992 (servicios deportivos). Confírmalo con tu asesoría.",
  },
  // A dónde se manda el resumen mensual de facturación desde el panel.
  // Se puede cambiar sobre la marcha en el propio envío.
  gestoria: { nombre: "Asesoría", email: "agencia39700@gmail.com" },
  avisos: { email: "agencia39700@gmail.com", whatsapp: "", whatsappCliente: false },
  // Acceso de profesores: cada uno ve solo SUS clases y pasa lista. El nombre
  // tiene que coincidir con el de las sesiones del horario.
  // Adriana no está aquí: entra como responsable del estudio y desde el panel ve
  // todo, incluidas sus clases, y pasa lista igual. Una persona, una clave.
  profes: [
    { nombre: "Sandra", hash: "deffe2cd54e36216eea16de1a6354ec081b2c2c6cf84ba7bf8c0220de5dd60f8" },
    { nombre: "Sus", hash: "738c74b0920a362bef1f76b13d9508a90c329ec1d01e1707f0dcfd53868380e8" },
    { nombre: "Juanjo", hash: "1e8fe2c729bdba3a9c5256cbc025b95cda60a580c16dfc0e178bdb53de32165c" },
    { nombre: "Sergio", hash: "308382be604b5993087bce0db0702efd40a774134bbd6cd662c1d6813059f870" },
  ],
  panel: {
    // Adriana, la responsable
    nombre: "Adriana",
    hash: "4590dc9b187159b0a11fe80c528bb013ba41a3a024581b8a60f4c3f42c19d878",
    // Quien más gestione el estudio, cada uno con su clave
    equipo: [
      { nombre: "Recepción", hash: "080aeb5d14bf151d037043da295baf8470cc13ae55150f6f94aee3f9ff51e4fe" },
    ],
  },
  dominios: ["https://iomfit-demo.agencia39700.workers.dev"],
};
