// Conocimiento SST Colombia: perfiles de cargo, GTC 45 y análisis de ausentismo.
// Son orientaciones de referencia: el médico laboral o el responsable del SG-SST confirma cada caso.

export type PerfilCargo = {
  id: string;
  cargo: string;
  peligros: string;
  controles: string;
  epp: string;
  periodicidad: number;
  examenes: string;
  norma: string;
};

export const PERFILES_CARGO: PerfilCargo[] = [
  { id: "admin", cargo: "Administrativo / oficina", peligros: "Biomecánico (postura sedente, movimientos repetitivos), psicosocial (carga mental, estrés), iluminación, riesgo público", controles: "Pausas activas, silla y pantalla ergonómicas, batería psicosocial, programa de estilos de vida saludable", epp: "No requiere EPP específico", periodicidad: 24, examenes: "Médico ocupacional con énfasis osteomuscular y visual", norma: "Res. 1843 de 2025; Res. 2646 de 2008; Res. 2764 de 2022; GTC 45" },
  { id: "bodega", cargo: "Operario de bodega / cargue", peligros: "Biomecánico (manipulación manual de cargas), locativo (caídas, orden y aseo), mecánico (montacargas, estibas), ruido", controles: "Capacitación en manejo de cargas, ayudas mecánicas, demarcación, programa de orden y aseo, SVE osteomuscular", epp: "Calzado de seguridad, guantes, faja lumbar si aplica, protección auditiva", periodicidad: 12, examenes: "Médico con énfasis osteomuscular, audiometría, optometría", norma: "Res. 2400 de 1979; Res. 1843 de 2025; GTC 45" },
  { id: "alturas", cargo: "Trabajador en alturas (más de 2 m)", peligros: "Caídas de altura, golpes por objetos, condiciones climáticas", controles: "Permiso de trabajo en alturas, plan de rescate, coordinador de alturas, inspección de equipos y puntos de anclaje, certificación vigente", epp: "Arnés de cuerpo completo, eslinga con absorbedor, línea de vida, casco con barbuquejo, calzado dieléctrico", periodicidad: 12, examenes: "Examen médico de aptitud para alturas (anual), certificado de curso vigente", norma: "Res. 4272 de 2021; Res. 1843 de 2025" },
  { id: "conductor", cargo: "Conductor / transportador", peligros: "Seguridad vial (accidentes de tránsito), fatiga, vibración, posturas prolongadas, psicosocial", controles: "Plan Estratégico de Seguridad Vial, control de jornadas y descanso, mantenimiento preventivo, pausas activas", epp: "Calzado cerrado, chaleco reflectivo, cinturón de seguridad", periodicidad: 12, examenes: "Médico con optometría, audiometría y evaluación psicosensométrica", norma: "Res. 40595 de 2022 (PESV); Ley 1503 de 2011; Res. 1843 de 2025" },
  { id: "mensajero", cargo: "Mensajero / domiciliario en moto", peligros: "Accidente de tránsito, clima, fatiga, robo, posturas y vibración", controles: "PESV, revisión técnico-mecánica, capacitación en conducción defensiva, rutas seguras", epp: "Casco certificado, chaleco reflectivo, guantes, rodilleras, impermeable", periodicidad: 12, examenes: "Médico con optometría y audiometría", norma: "Res. 40595 de 2022 (PESV); Ley 769 de 2002; Res. 1843 de 2025" },
  { id: "cocina", cargo: "Cocinero / manipulador de alimentos", peligros: "Térmico (quemaduras), cortes, resbalones, biológico, ergonómico (bipedestación prolongada)", controles: "Buenas prácticas de manufactura, curso de manipulación de alimentos, superficies antideslizantes, pausas activas", epp: "Delantal, guantes térmicos y de malla, calzado antideslizante, gorro y tapabocas", periodicidad: 12, examenes: "Médico ocupacional, examen de manipulador (coprológico, KOH, frotis faríngeo según criterio médico)", norma: "Res. 2674 de 2013; Res. 1843 de 2025; GTC 45" },
  { id: "ventas", cargo: "Vendedor / cajero de mostrador", peligros: "Biomecánico (bipedestación, movimientos repetitivos), psicosocial (atención al público), riesgo público (robos)", controles: "Pausas activas, silla de apoyo, protocolo ante atracos, manejo de clientes difíciles", epp: "Calzado cómodo cerrado; no requiere EPP específico", periodicidad: 24, examenes: "Médico ocupacional con énfasis osteomuscular y visual", norma: "Res. 1843 de 2025; Res. 2646 de 2008; GTC 45" },
  { id: "aseo", cargo: "Aseo y servicios generales", peligros: "Químico (productos de limpieza), biomecánico, resbalones y caídas, biológico", controles: "Fichas de datos de seguridad, rotulado SGA, capacitación en dilución y mezclas, señalización de piso mojado", epp: "Guantes de nitrilo, delantal, gafas, respirador para vapores, calzado antideslizante", periodicidad: 12, examenes: "Médico ocupacional con énfasis dermatológico, respiratorio y osteomuscular", norma: "Decreto 1496 de 2018 (SGA); Res. 1843 de 2025; GTC 45" },
  { id: "soldador", cargo: "Soldador / metalmecánica", peligros: "Físico (radiación, ruido, calor), químico (humos metálicos), mecánico, incendio, eléctrico", controles: "Extracción localizada, permiso de trabajo en caliente, mantenimiento de equipos, SVE respiratorio y auditivo", epp: "Careta de soldador, guantes de carnaza, peto, protección auditiva, respirador, calzado de seguridad", periodicidad: 12, examenes: "Médico con espirometría, audiometría y optometría", norma: "Res. 1843 de 2025; Res. 2400 de 1979; GTC 45" },
  { id: "vigilante", cargo: "Vigilante / seguridad", peligros: "Psicosocial (turnos nocturnos, riesgo público), bipedestación prolongada, clima", controles: "Rotación de turnos, protocolos de emergencia, pausas, control de jornada", epp: "Calzado, impermeable, chaleco según dotación", periodicidad: 12, examenes: "Médico ocupacional con énfasis psicosocial y osteomuscular", norma: "Res. 1843 de 2025; Res. 2646 de 2008; Ley 1010 de 2006" },
  { id: "confinado", cargo: "Operario en espacios confinados", peligros: "Atmósferas deficientes de oxígeno o tóxicas, atrapamiento, calor, ahogamiento", controles: "Permiso de entrada, medición de gases, vigía externo, plan de rescate, capacitación certificada", epp: "Detector de gases, arnés con línea de vida, respiración autónoma o línea de aire, casco", periodicidad: 12, examenes: "Médico con espirometría y evaluación cardiovascular", norma: "Res. 0491 de 2020; Res. 1843 de 2025" },
  { id: "salud", cargo: "Personal de salud / auxiliar", peligros: "Biológico (fluidos, punzocortantes), químico, ergonómico (movilización de pacientes), psicosocial", controles: "Precauciones universales, esquema de vacunación, manejo de residuos, bioseguridad, protocolo de accidente biológico", epp: "Guantes, tapabocas, bata, gafas o careta, guardián de cortopunzantes", periodicidad: 12, examenes: "Médico ocupacional, esquema de vacunación (hepatitis B, tétanos), serología según protocolo", norma: "Res. 1843 de 2025; Res. 2400 de 1979; Decreto 1072 de 2015" },
];

// ---- GTC 45: valoración del riesgo ----
export const NIVEL_DEFICIENCIA = [
  { v: 0, t: "0 · Sin deficiencia (controlado)" },
  { v: 2, t: "2 · Bajo" },
  { v: 6, t: "6 · Medio" },
  { v: 10, t: "10 · Alto" },
] as const;
export const NIVEL_EXPOSICION = [
  { v: 1, t: "1 · Esporádica" },
  { v: 2, t: "2 · Ocasional" },
  { v: 3, t: "3 · Frecuente" },
  { v: 4, t: "4 · Continua" },
] as const;
export const NIVEL_CONSECUENCIA = [
  { v: 10, t: "10 · Lesión leve" },
  { v: 25, t: "25 · Lesión con incapacidad" },
  { v: 60, t: "60 · Lesión grave o invalidez" },
  { v: 100, t: "100 · Muerte" },
] as const;

export type ValoracionGTC = { np: number; nr: number; nivel: "I" | "II" | "III" | "IV"; texto: string; color: string };

export function valorarGTC45(nd: number, ne: number, nc: number): ValoracionGTC {
  const np = nd * ne;
  const nr = np * nc;
  if (nr >= 600) return { np, nr, nivel: "I", texto: "No aceptable: detener la actividad hasta controlar el riesgo", color: "text-red-500" };
  if (nr >= 150) return { np, nr, nivel: "II", texto: "No aceptable o aceptable con control específico: corregir y adoptar medidas ya", color: "text-orange-500" };
  if (nr >= 40) return { np, nr, nivel: "III", texto: "Mejorable: planear controles y verificar su eficacia", color: "text-amber-500" };
  return { np, nr, nivel: "IV", texto: "Aceptable: mantener los controles actuales", color: "text-emerald-500" };
}

// ---- Ausentismo ----
export type NivelAusentismo = { nivel: "Bajo" | "Moderado" | "Alto" | "Crítico"; color: string; texto: string };

/** % de ausentismo = días perdidos / (trabajadores × días laborales del periodo) × 100. */
export function nivelAusentismo(pct: number): NivelAusentismo {
  if (pct < 2) return { nivel: "Bajo", color: "text-emerald-500", texto: "Dentro de lo esperable. Mantenga el seguimiento mensual." };
  if (pct < 4) return { nivel: "Moderado", color: "text-amber-500", texto: "Revise las causas principales y refuerce la prevención en el programa que más días suma." };
  if (pct < 6) return { nivel: "Alto", color: "text-orange-500", texto: "Requiere plan de intervención con el COPASST y la ARL en los programas con más días." };
  return { nivel: "Crítico", color: "text-red-500", texto: "Actúe de inmediato: investigue causas, intervenga puestos de trabajo y reporte a ARL y EPS." };
}

export const RECOMENDACION_PROGRAMA: Record<string, string> = {
  Psicosocial: "Aplicar o actualizar la batería de riesgo psicosocial, revisar cargas y jornadas, activar el comité de convivencia y ofrecer apoyo psicológico (Res. 2764 de 2022, Ley 1616 de 2013).",
  Osteomuscular: "Revisar el puesto de trabajo con la ARL, aplicar pausas activas, capacitar en higiene postural y manejo de cargas, y hacer seguimiento por médico laboral (Res. 1843 de 2025, GTC 45).",
  Auditivo: "Medir ruido ambiental, entregar y verificar protección auditiva y repetir audiometría de seguimiento; incluir al trabajador en el programa de conservación auditiva.",
  Respiratorio: "Revisar ventilación y exposición a polvos, humos o químicos, entregar respirador adecuado, hacer espirometría de control y verificar la ficha de datos de seguridad (Decreto 1496 de 2018).",
  Cardiovascular: "Valoración médica ocupacional, control de factores de riesgo (tensión, peso, tabaquismo), estilos de vida saludable y revisar si el cargo exige esfuerzo físico alto.",
  Otro: "Clasificar la causa con la EPS o la ARL, verificar si es de origen laboral o común y registrar las restricciones o recomendaciones médicas.",
};

/** Recomendación personalizada según los días de cada incapacidad. */
export function recomendacionPorDias(programa: string, dias: number): string {
  const base = RECOMENDACION_PROGRAMA[programa] ?? RECOMENDACION_PROGRAMA.Otro;
  if (dias >= 180) return `Más de 180 días: solicitar a la EPS o ARL concepto de rehabilitación y evaluar calificación de pérdida de capacidad laboral y reubicación (Ley 776 de 2002, Decreto 1072 de 2015). ${base}`;
  if (dias >= 90) return `Más de 90 días: coordinar con EPS y ARL el plan de rehabilitación, definir restricciones médicas y preparar la reincorporación o reubicación. ${base}`;
  if (dias >= 30) return `Incapacidad prolongada (30 días o más): citar a valoración con el médico laboral, hacer seguimiento semanal y reportar a la ARL si hay sospecha de origen laboral. ${base}`;
  if (dias >= 15) return `Incapacidad media: hacer seguimiento telefónico y examen post-incapacidad al regreso. ${base}`;
  return `Incapacidad corta: registrar la causa y revisar si se repite. ${base}`;
}

export type AusRegistro = { trabajador: string; programa: string; dias: number; fecha: string };

/** Trabajadores con 3 o más incapacidades en los últimos 180 días. */
export function reincidentes(lista: AusRegistro[], hoy: Date): { trabajador: string; veces: number; dias: number }[] {
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() - 180);
  const mapa = new Map<string, { veces: number; dias: number }>();
  for (const a of lista) {
    const f = new Date(`${a.fecha}T00:00:00`);
    if (Number.isNaN(f.getTime()) || f < limite) continue;
    const k = a.trabajador.trim().toLowerCase();
    const c = mapa.get(k) ?? { veces: 0, dias: 0 };
    c.veces += 1;
    c.dias += a.dias;
    mapa.set(k, c);
  }
  const nombres = new Map<string, string>();
  for (const a of lista) nombres.set(a.trabajador.trim().toLowerCase(), a.trabajador.trim());
  return [...mapa.entries()]
    .filter(([, c]) => c.veces >= 3)
    .map(([k, c]) => ({ trabajador: nombres.get(k) ?? k, veces: c.veces, dias: c.dias }));
}
