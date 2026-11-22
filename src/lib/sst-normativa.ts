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
  { codigo: "LEY-1562-2012", titulo: "Ley 1562 de 2012 — Sistema General de Riesgos Laborales", tema: "Riesgos laborales", resumen: "Modifica el Sistema de Riesgos Laborales y cambia 'salud ocupacional' por SST; define accidente de trabajo, enfermedad laboral y afiliación obligatoria a la ARL.", fuente: "Congreso de la República" },
  { codigo: "DEC-1295-1994", titulo: "Decreto 1295 de 1994 — Organización del Sistema de Riesgos Profesionales", tema: "Riesgos laborales", resumen: "Organiza y administra el Sistema General de Riesgos Profesionales: cotizaciones, clases de riesgo y prestaciones.", fuente: "Presidencia de la República" },
  { codigo: "LEY-776-2002", titulo: "Ley 776 de 2002 — Prestaciones del Sistema de Riesgos Laborales", tema: "Prestaciones ATEL", resumen: "Regula las prestaciones asistenciales y económicas por accidente de trabajo o enfermedad laboral, incapacidades e indemnizaciones.", fuente: "Congreso de la República" },
  { codigo: "DEC-1477-2014", titulo: "Decreto 1477 de 2014 — Tabla de enfermedades laborales", tema: "Enfermedad laboral", resumen: "Expide la tabla de enfermedades laborales con agentes de riesgo y grupos de enfermedades.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-1401-2007", titulo: "Resolución 1401 de 2007 — Investigación de incidentes y accidentes de trabajo", tema: "Investigación ATEL", resumen: "Obliga a investigar los incidentes y accidentes de trabajo para determinar causas y evitar su repetición.", fuente: "Ministerio de la Protección Social" },
  { codigo: "RES-2346-2007", titulo: "Resolución 2346 de 2007 — Evaluaciones médicas ocupacionales (base)", tema: "Medicina del trabajo", resumen: "Norma histórica sobre evaluaciones médicas y historias clínicas ocupacionales; revisa su vigencia frente a la Resolución 1843 de 2025.", fuente: "Ministerio de la Protección Social" },
  { codigo: "RES-2646-2008", titulo: "Resolución 2646 de 2008 — Factores de riesgo psicosocial", tema: "Riesgo psicosocial", resumen: "Establece responsabilidades para identificar, evaluar, prevenir e intervenir los factores de riesgo psicosocial y el estrés ocupacional.", fuente: "Ministerio de la Protección Social" },
  { codigo: "RES-0652-2012", titulo: "Resolución 0652 de 2012 — Comité de Convivencia Laboral", tema: "Convivencia laboral", resumen: "Establece la conformación y funcionamiento del Comité de Convivencia Laboral; modificada por la Resolución 1356 de 2012.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-1016-1989", titulo: "Resolución 1016 de 1989 — Programas de salud ocupacional", tema: "SG-SST", resumen: "Reglamenta la organización, funcionamiento y forma de los programas de salud ocupacional de los empleadores.", fuente: "Ministerio de Trabajo y Seguridad Social" },
  { codigo: "LEY-1616-2013", titulo: "Ley 1616 de 2013 — Salud mental", tema: "Salud mental", resumen: "Garantiza el derecho a la salud mental y promueve su prevención también en el ámbito laboral.", fuente: "Congreso de la República" },
  { codigo: "DEC-472-2015", titulo: "Decreto 472 de 2015 — Multas por incumplimiento en SST", tema: "Sanciones", resumen: "Reglamenta los criterios de graduación de multas por infracciones a las normas de SST y riesgos laborales.", fuente: "Ministerio del Trabajo" },
];

/** Sitios oficiales para verificar actualizaciones de la normativa SST. */
export const FUENTES_OFICIALES_SST: { nombre: string; url: string }[] = [
  { nombre: "Ministerio del Trabajo", url: "https://www.mintrabajo.gov.co" },
  { nombre: "Ministerio de Salud y Protección Social", url: "https://www.minsalud.gov.co" },
  { nombre: "Secretaría del Senado (leyes y decretos)", url: "http://www.secretariasenado.gov.co" },
  { nombre: "Función Pública (Gestor Normativo)", url: "https://www.funcionpublica.gov.co/eva/gestornormativo" },
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
