/** Catálogo base de normas SST vigentes en Colombia (2026) y utilidades para inyectarlo en la IA. */

export type NormaSST = {
  codigo: string;
  titulo: string;
  tema: string;
  resumen: string;
  fuente: string;
};

export const CATALOGO_SST_2026: NormaSST[] = [
  { codigo: "DEC-1072-2015", titulo: "Decreto 1072 de 2015 — Decreto Único Reglamentario del Sector Trabajo", tema: "SG-SST", resumen: "Obliga a todo empleador a implementar el SG-SST: política, plan anual de trabajo, matriz de peligros, COPASST/Vigía, capacitación y auditoría anual.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-0312-2019", titulo: "Resolución 0312 de 2019 — Estándares mínimos del SG-SST", tema: "Estándares mínimos (7, 21 y 60)", resumen: "Define 7, 21 o 60 estándares mínimos según número de trabajadores y clase de riesgo. Base de la autoevaluación anual.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-1843-2025", titulo: "Resolución 1843 de 2025 — Evaluaciones Médicas Ocupacionales", tema: "Medicina del trabajo", resumen: "Regula las evaluaciones médicas ocupacionales (ingreso, periódicas, egreso), el profesiograma, la historia clínica ocupacional y los certificados de aptitud.", fuente: "Ministerio de Salud y Protección Social / Ministerio del Trabajo" },
  { codigo: "RES-4272-2021", titulo: "Resolución 4272 de 2021 — Trabajo en alturas", tema: "Riesgo por alturas", resumen: "Exige capacitación certificada, permiso escrito y medidas de protección para todo trabajo a más de 2 metros de altura.", fuente: "Ministerio del Trabajo" },
  { codigo: "GTC-45", titulo: "GTC 45 — Guía para identificar peligros y valorar riesgos (matriz IPVR)", tema: "Matriz de peligros", resumen: "Metodología para identificar peligros, valorar riesgos (nivel de deficiencia, exposición y consecuencia) y definir controles por cargo y tarea.", fuente: "ICONTEC" },
  { codigo: "RES-2404-2019", titulo: "Resolución 2404 de 2019 — Batería de riesgo psicosocial", tema: "Riesgo psicosocial", resumen: "Adopta la batería de instrumentos y guías para evaluar factores de riesgo psicosocial y sus efectos en el trabajo.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-2764-2022", titulo: "Resolución 2764 de 2022 — Riesgo psicosocial (actualización)", tema: "Riesgo psicosocial", resumen: "Actualiza la batería y guías de evaluación e intervención del riesgo psicosocial; complementa la Resolución 2404 de 2019.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-2013-1986", titulo: "Resolución 2013 de 1986 — COPASST / Vigía SST", tema: "Participación de trabajadores", resumen: "Reglamenta la conformación y funcionamiento del Comité Paritario de SST; el Vigía aplica en empresas pequeñas.", fuente: "Ministerio del Trabajo" },
  { codigo: "LEY-1010-2006", titulo: "Ley 1010 de 2006 — Acoso laboral y convivencia", tema: "Convivencia laboral", resumen: "Define y sanciona el acoso laboral; exige comité de convivencia laboral y medidas de prevención.", fuente: "Congreso de la República" },
];

/** Normas sectoriales sugeridas para agregar con un clic. */
export const SECTORIALES_SST: NormaSST[] = [
  { codigo: "RES-0491-2020", titulo: "Resolución 0491 de 2020 — Espacios confinados", tema: "Espacios confinados", resumen: "Requisitos mínimos de seguridad para trabajo seguro en espacios confinados: permisos, atmósferas, rescate y capacitación.", fuente: "Ministerio del Trabajo" },
  { codigo: "DEC-1496-2018", titulo: "Decreto 1496 de 2018 — Sistema Globalmente Armonizado (SGA)", tema: "Riesgo químico", resumen: "Adopta el SGA para clasificar y etiquetar productos químicos y fichas de datos de seguridad.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-40595-2022", titulo: "Resolución 40595 de 2022 — PESV", tema: "Seguridad vial", resumen: "Metodología para adoptar e implementar el Plan Estratégico de Seguridad Vial según el tipo de empresa.", fuente: "Ministerio de Transporte" },
];

export type FilaNormaTexto = {
  codigo: string;
  titulo: string;
  resumen: string;
  estado: string;
  ultima_actualizacion: string | null;
};

/** Matriz normativa en texto, lista para inyectar en el prompt del asistente SST. */
export function textoMatrizNormativa(filas?: FilaNormaTexto[] | null): string {
  const lista: FilaNormaTexto[] =
    filas && filas.length > 0
      ? filas
      : CATALOGO_SST_2026.map((n) => ({ codigo: n.codigo, titulo: n.titulo, resumen: n.resumen, estado: "Vigente", ultima_actualizacion: null }));
  const cuerpo = lista
    .map((n) => `- ${n.titulo} [${n.estado}${n.ultima_actualizacion ? `, verificada ${n.ultima_actualizacion.slice(0, 10)}` : ""}]: ${n.resumen}`)
    .join("\n");
  return `MATRIZ NORMATIVA SST VIGENTE (Colombia 2026). Al generar profesiogramas, matrices de riesgo GTC 45, listas de chequeo de la Resolución 0312, certificados médicos ocupacionales o cualquier documento SST, CITA SIEMPRE la norma vigente que corresponda (número, año y tema) de esta lista y no cites normas derogadas:\n${cuerpo}`;
}
