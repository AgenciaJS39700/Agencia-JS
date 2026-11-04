// /asistentes/clientes/demo-tatuaje.js — Cliente de DEMOSTRACIÓN (ficticio): Tinta Negra, estudio de tatuaje, con agenda real en D1.
// Lo usa la web demo https://tinta-negra-demo.agencia39700.workers.dev (chat del estudio + reserva de la web). Clave del panel: demo-tintanegra.
import plantilla from "./_plantilla.js";

const TARDE = [["10:00", "20:00"]];

export default {
  ...plantilla,
  slug: "demo-tatuaje",
  demo: true,
  plan: "basico",
  motor: "basico",
  icono: "sparkles",
  color: "#e1251b",
  sector: "Estudio de tatuaje",
  negocio: {
    nombre: "Tinta Negra",
    tipo: "estudio de tatuaje privado (blackwork, fine line, realismo, tradicional, japonés y cover up)",
    direccion: "Calle Ejemplo, 12 (dirección de ejemplo)",
    telefono: "688 93 33 08",
    horarioTexto: "Martes a viernes de 10:00 a 20:00 y sábados de 10:00 a 15:00. Domingos y lunes cerrado. Solo con cita previa.",
    horario: { 2: TARDE, 3: TARDE, 4: TARDE, 5: TARDE, 6: [["10:00", "15:00"]] },
    extra: [
      "Artistas: Alba (fine line y botánico), Marko (blackwork, geométrico y tradicional) y Sara (realismo y retratos en negro y gris). Si el cliente quiere un artista concreto, que lo diga y se anota en la cita.",
      "Presupuesto gratis y sin compromiso: el precio depende del tamaño, el detalle y la zona, y lo da el artista al ver la idea (por WhatsApp o en la consulta gratuita). Tatuajes pequeños desde 50 €. El flash del mes, desde 60 €. No des precios inventados ni confundas la duración de la sesión con el precio.",
      "Para confirmar la fecha se paga una señal de 50 € que se descuenta del total el día de la sesión. Cambios con 48 h de antelación sin perder la señal.",
      "Solo tatuamos a mayores de 18 años. No tatuamos durante el embarazo ni la lactancia. Antes de la sesión se firma el consentimiento informado (alergias, medicación, salud de la piel).",
      "Antes de venir: descansa, come bien, ropa cómoda que deje la zona a mano y nada de alcohol las 24 h anteriores.",
      "Cuidados: lavar 2 veces al día con jabón neutro, crema fina, nada de sol, piscina ni mar las primeras 3–4 semanas. El retoque, si hace falta, es gratis al mes o dos.",
      "En la web se puede probar el diseño en un cuerpo 3D o sobre una foto propia (simulador), ver el mapa del dolor por zonas, el catálogo, el flash del mes y la tienda de cuidados.",
      "Cover up: se valora el tatuaje antiguo en una consulta gratuita y se diseña uno nuevo que lo cubra.",
      "Material estéril de un solo uso. Se paga con tarjeta, Bizum o efectivo.",
    ],
    wa: "34688933308",
    web: "https://tinta-negra-demo.agencia39700.workers.dev/",
    mapa: "",
    logo: "",
  },
  servicios: [
    { id: "consulta", nombre: "Consulta y presupuesto (gratis)", min: 30, precio: "gratis" },
    { id: "pequeno", nombre: "Tatuaje pequeño (hasta 8 cm)", min: 120, precio: "desde 50 €" },
    { id: "mediano", nombre: "Tatuaje mediano (8–15 cm)", min: 180, precio: "presupuesto gratis según diseño y zona" },
    { id: "grande", nombre: "Sesión grande (más de 15 cm)", min: 300, precio: "presupuesto gratis según diseño y zona" },
    { id: "dia", nombre: "Sesión de día completo (mangas y piezas grandes)", min: 480, precio: "presupuesto gratis según diseño y zona" },
    { id: "coverup", nombre: "Valoración de cover up (gratis)", min: 30, precio: "gratis" },
    { id: "retoque", nombre: "Retoque", min: 60, precio: "gratis en piezas del estudio" },
  ],
  salud: false,
  urgencia: "",
  chips: ["¿Cuánto cuesta un tatuaje?", "¿Duele mucho?", "¿Cómo lo cuido?"],
  saludo: "¡Hola! Soy el asistente de Tinta Negra 🖤 Te ayudo a pedir cita con tu artista o con dudas sobre precio, dolor o cuidados.",
  agenda: { ...plantilla.agenda, paso: 60, capacidad: 3, antelacionMin: 720, diasMax: 60, pedirEmail: true },
  avisos: { email: "agencia39700@gmail.com", whatsapp: "", whatsappCliente: false },
  // «Te toca volver»: a las 6 semanas, cuando ya ha cicatrizado (retoque gratis y siguiente pieza)
  vuelta: { pequeno: 42, mediano: 42, grande: 42, dia: 42 },
  vueltaTitulo: "Tu tatuaje ya ha cicatrizado",
  vueltaTexto: "Si necesita un retoque, es gratis. Y si ya estás pensando en la siguiente pieza, tu artista tiene huecos.",
  panel: { hash: "5ac7dee6cfa3246cc426a2daa9028b7568288dcea467799ccc70cf8c1f78cbd7" },
  dominios: [],
};
