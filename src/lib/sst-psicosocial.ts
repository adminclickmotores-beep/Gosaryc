// Conocimiento de referencia: batería de riesgo psicosocial (Res. 2646/2008, Res. 2404/2019)
// y restricciones laborales (Res. 2346/2007, Ley 776/2002, Decreto 1072/2015).
// Es una guía: el psicólogo con licencia SST o el médico laboral confirma cada decisión.

export type NivelRiesgo = "sin_riesgo" | "bajo" | "medio" | "alto" | "muy_alto";

export const NIVELES_RIESGO: { v: NivelRiesgo; t: string; clase: string; orden: number }[] = [
  { v: "sin_riesgo", t: "Sin riesgo", clase: "text-emerald-500", orden: 0 },
  { v: "bajo", t: "Riesgo bajo", clase: "text-lime-500", orden: 1 },
  { v: "medio", t: "Riesgo medio", clase: "text-amber-500", orden: 2 },
  { v: "alto", t: "Riesgo alto", clase: "text-orange-500", orden: 3 },
  { v: "muy_alto", t: "Riesgo muy alto", clase: "text-red-500", orden: 4 },
];

export const DOMINIOS_PSICOSOCIAL = [
  { clave: "liderazgo", t: "Liderazgo y relaciones sociales" },
  { clave: "control", t: "Control sobre el trabajo" },
  { clave: "demandas", t: "Demandas del trabajo" },
  { clave: "recompensas", t: "Recompensas" },
] as const;

/** Clasifica un puntaje transformado 0-100 (a mayor puntaje, mayor riesgo). */
export function nivelDePuntaje(p: number): NivelRiesgo {
  if (p < 20) return "sin_riesgo";
  if (p < 40) return "bajo";
  if (p < 60) return "medio";
  if (p < 80) return "alto";
  return "muy_alto";
}

export const textoNivel = (n: string): string => NIVELES_RIESGO.find((x) => x.v === n)?.t ?? n;
export const claseNivel = (n: string): string => NIVELES_RIESGO.find((x) => x.v === n)?.clase ?? "";
const ordenNivel = (n: string): number => NIVELES_RIESGO.find((x) => x.v === n)?.orden ?? 0;

export type ResultadoPsicosocial = {
  intralaboral: number;
  nivelIntra: NivelRiesgo;
  nivelExtra: NivelRiesgo;
  nivelEstres: NivelRiesgo;
  nivelGlobal: NivelRiesgo;
  dominioCritico: string;
};

export function evaluarPsicosocial(d: { liderazgo: number; control: number; demandas: number; recompensas: number; extralaboral: number; estres: number }): ResultadoPsicosocial {
  const intra = (d.liderazgo + d.control + d.demandas + d.recompensas) / 4;
  const nivelIntra = nivelDePuntaje(intra);
  const nivelExtra = nivelDePuntaje(d.extralaboral);
  const nivelEstres = nivelDePuntaje(d.estres);
  const todos = [nivelIntra, nivelExtra, nivelEstres];
  const nivelGlobal = todos.reduce((a, b) => (ordenNivel(b) > ordenNivel(a) ? b : a), "sin_riesgo" as NivelRiesgo);
  const peor = DOMINIOS_PSICOSOCIAL.reduce((a, b) => (d[b.clave] > d[a.clave] ? b : a), DOMINIOS_PSICOSOCIAL[0]);
  return { intralaboral: Math.round(intra), nivelIntra, nivelExtra, nivelEstres, nivelGlobal, dominioCritico: peor.t };
}

const POR_DOMINIO: Record<string, string> = {
  "Liderazgo y relaciones sociales": "Capacitar a jefes en liderazgo y comunicación asertiva; talleres de trabajo en equipo; activar el Comité de Convivencia Laboral (Res. 652 y 1356 de 2012).",
  "Control sobre el trabajo": "Revisar autonomía, rotación de tareas y participación en decisiones; definir funciones claras y capacitación para el cargo.",
  "Demandas del trabajo": "Redistribuir cargas y jornadas, garantizar pausas activas y descansos, controlar horas extra (Ley 2101 de 2021 sobre jornada).",
  "Recompensas": "Revisar reconocimiento, estabilidad, plan de carrera y claridad de la compensación; retroalimentación periódica del desempeño.",
};

/** Plan de intervención sugerido según el nivel global y el dominio más crítico. */
export function planPsicosocial(r: ResultadoPsicosocial): { plazo: string; acciones: string[] } {
  const acciones: string[] = [];
  let plazo = "";
  switch (r.nivelGlobal) {
    case "muy_alto":
      plazo = "Inmediato: iniciar en 30 días con seguimiento mensual";
      acciones.push("Remitir al trabajador a valoración por psicología con licencia SST y a la EPS si hay síntomas (Res. 2646/2008, art. 13).", "Intervención individual y de grupo: es un nivel que exige acción inmediata y programa de vigilancia epidemiológica psicosocial.", "Reevaluar con la batería en 12 meses o antes si cambian las condiciones.");
      break;
    case "alto":
      plazo = "Corto plazo: iniciar en 60 días";
      acciones.push("Intervención dirigida al dominio crítico con cronograma y responsable.", "Incluir al trabajador en el programa de vigilancia epidemiológica psicosocial.", "Reevaluar con la batería en 12 meses.");
      break;
    case "medio":
      plazo = "Mediano plazo: dentro del plan anual";
      acciones.push("Acciones de prevención en el plan anual SST: pausas activas, manejo del estrés y comunicación.", "Observar y reevaluar con la batería en 24 meses.");
      break;
    case "bajo":
      plazo = "Seguimiento rutinario";
      acciones.push("Mantener las acciones promocionales (bienestar, clima laboral) y reevaluar en 24 meses.");
      break;
    default:
      plazo = "Sin intervención específica";
      acciones.push("Mantener los factores protectores y reevaluar en 24 meses.");
  }
  if (r.nivelGlobal !== "sin_riesgo" && r.nivelGlobal !== "bajo") acciones.push(POR_DOMINIO[r.dominioCritico] ?? "");
  if (ordenNivel(r.nivelEstres) >= 3) acciones.push("Estrés alto: técnicas de manejo del estrés, pausas, evaluación médica y seguimiento por medicina laboral.");
  if (ordenNivel(r.nivelExtra) >= 3) acciones.push("Factores extralaborales altos: orientación a bienestar social, apoyo en vivienda, transporte, tiempo libre y salud mental.");
  return { plazo, acciones: acciones.filter((a) => a.length > 0) };
}

// ===== Restricciones laborales =====
export const CATEGORIAS_RESTRICCION = [
  "Osteomuscular", "Visual", "Auditiva", "Respiratoria", "Cardiovascular", "Dermatológica", "Psicosocial / salud mental", "Metabólica", "Otra",
] as const;

const PALABRAS: [string, RegExp][] = [
  ["Osteomuscular", /(kg|carga|levant|columna|lumbar|hombro|mu[ñn]eca|manguito|tunel|espalda|rodilla|postura|manipul|lesi[oó]n|hernia)/i],
  ["Visual", /(visual|vista|ojo|pantalla|miop|lentes|oftalm)/i],
  ["Auditiva", /(ruido|audici|hipoacusia|o[ií]do|audio)/i],
  ["Respiratoria", /(respir|asma|polvo|gases|epoc|pulm|inhal)/i],
  ["Cardiovascular", /(hiperten|card[ií]|presi[oó]n|altura|arritm|coraz)/i],
  ["Dermatológica", /(piel|dermat|alergi|qu[ií]mico|contacto)/i],
  ["Psicosocial / salud mental", /(estr[eé]s|ansied|depres|psico|mental|burnout|acoso)/i],
  ["Metabólica", /(diabet|glucem|obesid|colesterol|triglic|metab)/i],
];

export function inferirCategoria(texto: string): string {
  for (const [c, r] of PALABRAS) if (r.test(texto)) return c;
  return "Otra";
}

const PLAN_CATEGORIA: Record<string, { medidas: string[]; norma: string }> = {
  Osteomuscular: { medidas: ["Evitar cargas y posturas forzadas según la restricción; reubicar o adaptar el puesto.", "Programa de pausas activas y higiene postural.", "Valoración por fisioterapia y control médico periódico."], norma: "Programa de vigilancia osteomuscular, GATISO y Res. 2844/2007" },
  Visual: { medidas: ["Pausas visuales (regla 20-20-20), iluminación y pantallas ajustadas.", "Control optométrico y dotación de lentes si aplica."], norma: "Res. 2400/1979 (iluminación) y Res. 2346/2007" },
  Auditiva: { medidas: ["Limitar la exposición a ruido y asegurar protección auditiva certificada.", "Audiometría de control según nivel de exposición."], norma: "Res. 1792/1990 y programa de conservación auditiva" },
  Respiratoria: { medidas: ["Evitar exposición a polvos, gases y vapores; protección respiratoria adecuada.", "Espirometría de control y valoración por neumología."], norma: "Programa de vigilancia respiratoria y Res. 2346/2007" },
  Cardiovascular: { medidas: ["Restringir esfuerzo físico alto, trabajo en alturas y turnos prolongados según concepto.", "Control de tensión arterial y remisión a la EPS."], norma: "Res. 1409/2012 (alturas) y programa de riesgo cardiovascular" },
  Dermatológica: { medidas: ["Evitar contacto con agentes irritantes; guantes y barreras adecuadas.", "Control por dermatología y revisión de fichas de seguridad."], norma: "Decreto 1072/2015, art. 2.2.4.6.24" },
  "Psicosocial / salud mental": { medidas: ["Ajustes razonables de carga y horario; seguimiento por psicología.", "Incluir en el programa de vigilancia psicosocial y revisar con la batería."], norma: "Res. 2646/2008 y Res. 2404/2019" },
  Metabólica: { medidas: ["Control médico y nutricional; evitar turnos nocturnos si el concepto lo indica.", "Estilos de vida saludable y seguimiento periódico."], norma: "Programa de riesgo cardiovascular y Res. 2346/2007" },
  Otra: { medidas: ["Definir con el médico laboral las condiciones de trabajo y la reubicación si se requiere."], norma: "Res. 2346/2007 y Res. 1918/2009" },
};

export function planRestriccion(categoria: string, permanente: boolean, concepto: string): { medidas: string[]; norma: string; seguimientoMeses: number } {
  const base = PLAN_CATEGORIA[categoria] ?? PLAN_CATEGORIA.Otra;
  const medidas = [...base.medidas];
  if (concepto === "No apto") medidas.unshift("Concepto «No apto»: no puede ejercer el cargo hasta nueva valoración; el empleador evalúa reubicación o readaptación.");
  if (permanente) medidas.push("Restricción permanente: reubicación o readaptación y seguimiento por la ARL/EPS (Ley 776/2002, art. 4 y Decreto 1072/2015).");
  else medidas.push("Restricción temporal: reevaluar al vencer el plazo con un examen de control.");
  medidas.push("Enviar las recomendaciones al empleador sin revelar el diagnóstico (reserva de la historia clínica, Res. 2346/2007).");
  return { medidas, norma: base.norma, seguimientoMeses: concepto === "No apto" || permanente ? 3 : 6 };
}
