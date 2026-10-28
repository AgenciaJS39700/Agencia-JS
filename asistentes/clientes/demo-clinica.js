// /asistentes/clientes/demo-clinica.js — Cliente de DEMOSTRACIÓN (ficticio) con agenda real en D1.
// Sirve para enseñar la página de citas y el panel, y para probar todo antes de dar de alta un cliente real.
import plantilla from "./_plantilla.js";

const PARTIDO = [["09:00", "14:00"], ["16:00", "20:00"]];

export default {
  ...plantilla,
  slug: "demo-clinica",
  demo: true,
  icono: "tooth",
  color: "#38bdf8",
  sector: "Clínica dental",
  negocio: {
    nombre: "Clínica Dental Sonríe",
    tipo: "clínica dental",
    direccion: "Avenida Principal 12 (dirección de ejemplo)",
    telefono: "600 000 001 (número de ejemplo)",
    horarioTexto: "Lunes a viernes de 9:00 a 14:00 y de 16:00 a 20:00. Sábados de 10:00 a 14:00. Domingos cerrado.",
    horario: { 1: PARTIDO, 2: PARTIDO, 3: PARTIDO, 4: PARTIDO, 5: PARTIDO, 6: [["10:00", "14:00"]] },
    extra: [
      "Primera visita con revisión y radiografía panorámica gratuita.",
      "Financiación de tratamientos hasta 12 meses sin intereses (sujeto a aprobación).",
      "Se atienden niños desde los 3 años.",
    ],
    wa: "34688933308",
    web: "https://agencia-js.com/#asistentes",
    mapa: "",
    logo: "",
  },
  servicios: [
    { id: "primera", nombre: "Primera visita y revisión", min: 30, precio: "Gratis" },
    { id: "limpieza", nombre: "Limpieza dental", min: 45, precio: "45 €" },
    { id: "blanq", nombre: "Blanqueamiento (valoración)", min: 30, precio: "Valoración gratis" },
    { id: "orto", nombre: "Ortodoncia invisible (estudio)", min: 60, precio: "Estudio gratis" },
  ],
  salud: true,
  urgencia: "Si tienes dolor fuerte, hinchazón o un golpe en un diente, llama a la clínica: reservamos huecos de urgencia cada día.",
  chips: ["¿Cuánto cuesta una limpieza?", "¿Tenéis financiación?", "¿Atendéis a niños?"],
  saludo: "¡Hola! Soy el asistente de Clínica Dental Sonríe. Te ayudo a pedir cita o a resolver dudas sobre tratamientos, precios y horarios.",
  agenda: { ...plantilla.agenda, capacidad: 1, pedirEmail: true },
  avisos: { email: "" },         // demo: sin correos
  panel: { hash: "f5af7b545f9540d4aeaa8ca9d8b9a064aeb3852f15adc6bfc65c9fb266529f1b" },
};
