import { supabase } from "@/integrations/supabase/client";
import { resolverTipoNegocio, type TipoNegocioClave } from "@/lib/modulos-negocio";

export type ConfiguracionAutomaticaSector = {
  nombre_agente: string;
  personalidad: string;
  objetivo_cierre: string;
  instrucciones: string;
  reglas_base: string[];
  resumen_sector: string;
  etiqueta_sector: string;
};

export const REGLAS_BASE_NEGOCIO: string[] = [
  "Respuestas cortas y claras (máximo 3 líneas por mensaje), pensadas para WhatsApp.",
  "Haz máximo 1 pregunta por turno y nunca repitas datos que el cliente ya entregó.",
  "Nunca inventes precios, disponibilidad ni promociones fuera del catálogo o inventario real del negocio.",
  "Escala de inmediato a una persona del equipo si hay un reclamo grave, amenaza legal o solicitud de gerente.",
];

type PlantillaSector = {
  rol: string;
  personalidad: string;
  objetivo_cierre: string;
  enfoque: string;
};

const PLANTILLA_COMIDA: PlantillaSector = {
  rol: "Asistente de Pedidos",
  personalidad: "Asistente ágil, cálido y vendedor que sugiere acompañamientos",
  objetivo_cierre: "Tomar pedido completo con dirección y método de pago",
  enfoque:
    "Confirma platos, cantidades, acompañamientos o bebidas sugeridas, dirección/barrio o si recoge en local, y forma de pago antes de cerrar el pedido.",
};

const PLANTILLA_AUTOMOTRIZ: PlantillaSector = {
  rol: "Asesor Automotriz",
  personalidad: "Asesor automotriz consultivo, experto y persuasivo",
  objetivo_cierre: "Calificar cuota inicial/crédito y agendar Test-Drive o visita",
  enfoque:
    "Consulta vehículo o moto de interés, forma de pago (contado, crédito o retoma), cuota inicial estimada y propone día y hora para Test-Drive o visita a vitrina.",
};

const PLANTILLA_PATRIMONIAL: PlantillaSector = {
  rol: "Asesor Patrimonial",
  personalidad: "Asesor patrimonial profesional y claro",
  objetivo_cierre: "Calificar presupuesto/subsidio y agendar visita a sala de ventas",
  enfoque:
    "Identifica si busca vivienda propia o inversión, presupuesto, cuota inicial o subsidio disponible y coordina visita a la sala de ventas o al inmueble.",
};

const PLANTILLA_SALUD_SERVICIOS: PlantillaSector = {
  rol: "Recepcionista Virtual",
  personalidad: "Recepcionista empático, ordenado y resolutivo",
  objetivo_cierre: "Identificar servicio/falla y agendar cita",
  enfoque:
    "Escucha con empatía el servicio, síntoma o falla que necesita resolver, confirma urgencia y propone día y hora concretos para agendar la cita.",
};

const PLANTILLA_COMERCIO: PlantillaSector = {
  rol: "Asesor Comercial",
  personalidad: "Asesor comercial cercano, ágil y resolutivo",
  objetivo_cierre: "Confirmar disponibilidad en inventario, cotizar y cerrar pedido",
  enfoque:
    "Verifica disponibilidad y precios reales en el catálogo, sugiere la mejor opción o complemento y confirma entrega o recogida y método de pago.",
};

const DICCIONARIO_SECTOR: Partial<Record<TipoNegocioClave, PlantillaSector>> = {
  restaurante: PLANTILLA_COMIDA,
  panaderia: {
    ...PLANTILLA_COMIDA,
    enfoque:
      "Asesora sabores, porciones y tortas por encargo (fecha de entrega, dedicación y anticipo) o toma pedidos de vitrina con dirección y método de pago.",
  },
  cafeteria: PLANTILLA_COMIDA,
  comida_rapida: PLANTILLA_COMIDA,
  catering: {
    ...PLANTILLA_COMIDA,
    objetivo_cierre: "Calificar fecha, número de personas y presupuesto para enviar cotización",
  },
  concesionario: PLANTILLA_AUTOMOTRIZ,
  alquiler_vehiculos: {
    ...PLANTILLA_AUTOMOTRIZ,
    objetivo_cierre: "Confirmar fechas, vehículo disponible y requisitos para reservar alquiler",
  },
  construccion: PLANTILLA_PATRIMONIAL,
  inmobiliaria: PLANTILLA_PATRIMONIAL,
  condominio: PLANTILLA_PATRIMONIAL,
  salud: PLANTILLA_SALUD_SERVICIOS,
  farmacia: {
    ...PLANTILLA_SALUD_SERVICIOS,
    objetivo_cierre: "Confirmar disponibilidad del producto/fórmula y coordinar domicilio o recogida",
  },
  optica: PLANTILLA_SALUD_SERVICIOS,
  mascotas: PLANTILLA_SALUD_SERVICIOS,
  belleza: PLANTILLA_SALUD_SERVICIOS,
  gimnasio: {
    ...PLANTILLA_SALUD_SERVICIOS,
    objetivo_cierre: "Identificar objetivo del cliente y agendar clase de cortesía o inscripción",
  },
  guarderia: PLANTILLA_SALUD_SERVICIOS,
  taller: PLANTILLA_SALUD_SERVICIOS,
  celulares: PLANTILLA_SALUD_SERVICIOS,
  servicios: PLANTILLA_SALUD_SERVICIOS,
  profesional: PLANTILLA_SALUD_SERVICIOS,
  lavanderia: {
    ...PLANTILLA_SALUD_SERVICIOS,
    objetivo_cierre: "Identificar prendas y servicio para coordinar recogida o entrega",
  },
  hospedaje: {
    rol: "Recepcionista de Reservas",
    personalidad: "Anfitrión cálido, atento y resolutivo",
    objetivo_cierre: "Confirmar fechas, huéspedes y tarifa para cerrar reserva",
    enfoque:
      "Pregunta fechas de ingreso/salida y número de huéspedes, informa disponibilidad real y guía la confirmación de la reserva.",
  },
  educacion: {
    rol: "Asesor Académico",
    personalidad: "Asesor educativo claro, cercano y orientador",
    objetivo_cierre: "Resolver dudas del programa y agendar visita o matrícula",
    enfoque:
      "Identifica el programa o curso de interés, horario preferido y perfil del estudiante para agendar visita o inscripción.",
  },
  eventos: {
    rol: "Asesor de Eventos",
    personalidad: "Coordinador creativo, organizado y persuasivo",
    objetivo_cierre: "Calificar fecha, invitados y presupuesto para agendar cotización",
    enfoque:
      "Confirma tipo de evento, fecha estimada y número de invitados para ofrecer paquete y agendar reunión.",
  },
  transporte: {
    rol: "Coordinador de Despacho",
    personalidad: "Despachador ágil, claro y confiable",
    objetivo_cierre: "Confirmar origen, destino, carga y fecha para cotizar y agendar servicio",
    enfoque:
      "Recopila origen, destino, tipo de carga y fecha requerida para dar cotización precisa y agendar.",
  },
  parqueadero: {
    rol: "Operador de Parqueadero",
    personalidad: "Operador ágil, cordial y directo",
    objetivo_cierre: "Confirmar tipo de vehículo, tarifa o mensualidad y disponibilidad",
    enfoque: "Informa tarifas por hora o mensualidad según tipo de vehículo y disponibilidad actual.",
  },
  tienda: PLANTILLA_COMERCIO,
  ferreteria: PLANTILLA_COMERCIO,
  supermercado: PLANTILLA_COMERCIO,
  carniceria: PLANTILLA_COMERCIO,
  moda: PLANTILLA_COMERCIO,
  textil: PLANTILLA_COMERCIO,
  joyeria: PLANTILLA_COMERCIO,
  papeleria: PLANTILLA_COMERCIO,
  tecnologia: PLANTILLA_COMERCIO,
  floristeria: PLANTILLA_COMERCIO,
  licorera: PLANTILLA_COMERCIO,
  agro: PLANTILLA_COMERCIO,
  ganaderia: PLANTILLA_COMERCIO,
};

/**
 * Genera automáticamente la personalidad, objetivo de cierre y reglas base del Agente IA
 * según el tipo y nombre del negocio del cliente (Plug & Play, cero fricción).
 */
export function generarConfiguracionAutomaticaSector(
  tipoNegocio: string | null | undefined,
  nombreNegocio?: string | null,
): ConfiguracionAutomaticaSector {
  const giro = resolverTipoNegocio(tipoNegocio ?? null);
  const plantilla = DICCIONARIO_SECTOR[giro.clave] ?? PLANTILLA_COMERCIO;
  const nombreLimpio = (nombreNegocio ?? "").trim().slice(0, 40);
  const nombre_agente = nombreLimpio
    ? `${plantilla.rol} · ${nombreLimpio}`.slice(0, 40)
    : plantilla.rol.slice(0, 40);

  const instrucciones = [
    `Enfoque del sector (${giro.panel}): ${plantilla.enfoque}`,
    "Reglas obligatorias:",
    ...REGLAS_BASE_NEGOCIO.map((r) => `- ${r}`),
  ].join("\n");

  const resumen_sector = `CONOCIMIENTO AUTOMÁTICO (${giro.panel.toUpperCase()}):\nPersonalidad: ${plantilla.personalidad}.\nObjetivo de cierre: ${plantilla.objetivo_cierre}.\n${plantilla.enfoque}`;

  return {
    nombre_agente,
    personalidad: plantilla.personalidad,
    objetivo_cierre: plantilla.objetivo_cierre,
    instrucciones,
    reglas_base: [...REGLAS_BASE_NEGOCIO],
    resumen_sector,
    etiqueta_sector: giro.panel,
  };
}

const PERSONALIDADES_GENERICAS = new Set(["", "Amable y Cercano", "Persuasivo Vendedor"]);
const OBJETIVOS_GENERICOS = new Set(["", "Cerrar pedido directo"]);

export type AgenteAutoRow = {
  id: string;
  negocio_id: string;
  owner_id: string;
  clave: string;
  activo: boolean;
  nombre_agente: string;
  instrucciones: string | null;
  ia_activa: boolean;
  personalidad: string | null;
  objetivo_cierre: string | null;
  cierre_autonomo: boolean;
};

const COLS_AUTO =
  "id,negocio_id,owner_id,clave,activo,nombre_agente,instrucciones,ia_activa,personalidad,objetivo_cierre,cierre_autonomo";

/**
 * Si el negocio aún no tiene agente o no tiene configuración guardada, la rellena y guarda
 * automáticamente en `agente_whatsapp` y `agente_memoria`.
 */
export async function asegurarConfiguracionAutomaticaAgente(params: {
  negocioId: string;
  ownerId: string;
  tipoNegocio?: string | null;
  nombreNegocio?: string | null;
  forzar?: boolean;
}): Promise<{ agente: AgenteAutoRow | null; error: string | null; autoconfigurado: boolean }> {
  const { negocioId, ownerId, tipoNegocio, nombreNegocio, forzar = false } = params;
  const auto = generarConfiguracionAutomaticaSector(tipoNegocio, nombreNegocio);

  const { data: actual, error: errLectura } = await supabase
    .from("agente_whatsapp")
    .select(COLS_AUTO)
    .eq("negocio_id", negocioId)
    .maybeSingle();

  if (errLectura) {
    return { agente: null, error: errLectura.message, autoconfigurado: false };
  }

  let fila = actual as AgenteAutoRow | null;
  let autoconfigurado = false;

  if (!fila) {
    const { data: creada, error: errInsert } = await supabase
      .from("agente_whatsapp")
      .insert({
        negocio_id: negocioId,
        owner_id: ownerId,
        activo: true,
        ia_activa: true,
        cierre_autonomo: true,
        nombre_agente: auto.nombre_agente,
        personalidad: auto.personalidad,
        objetivo_cierre: auto.objetivo_cierre,
        instrucciones: auto.instrucciones,
      })
      .select(COLS_AUTO)
      .maybeSingle();

    if (errInsert) {
      return { agente: null, error: errInsert.message, autoconfigurado: false };
    }
    fila = creada as AgenteAutoRow | null;
    autoconfigurado = true;
  } else {
    const sinConfigPersonalizada =
      forzar ||
      (!fila.instrucciones?.trim() &&
        PERSONALIDADES_GENERICAS.has(fila.personalidad ?? "") &&
        OBJETIVOS_GENERICOS.has(fila.objetivo_cierre ?? ""));

    if (sinConfigPersonalizada) {
      const { data: actualizada, error: errUpdate } = await supabase
        .from("agente_whatsapp")
        .update({
          nombre_agente: forzar ? auto.nombre_agente : fila.nombre_agente || auto.nombre_agente,
          personalidad: auto.personalidad,
          objetivo_cierre: auto.objetivo_cierre,
          instrucciones: auto.instrucciones,
          cierre_autonomo: true,
        })
        .eq("id", fila.id)
        .select(COLS_AUTO)
        .maybeSingle();

      if (!errUpdate && actualizada) {
        fila = actualizada as AgenteAutoRow;
        autoconfigurado = true;
      }
    }
  }

  // Sembrar reglas base y resumen automático del sector en agente_memoria si aún no existen.
  try {
    const { data: memExistente } = await supabase
      .from("agente_memoria")
      .select("id,tipo")
      .eq("negocio_id", negocioId)
      .in("tipo", ["regla_dueno", "sector"])
      .limit(20);

    const tieneReglas = (memExistente ?? []).some((m) => m.tipo === "regla_dueno");
    const tieneSector = (memExistente ?? []).some((m) => m.tipo === "sector");

    const porInsertar: Array<{ negocio_id: string; owner_id: string; tipo: string; contenido: string }> = [];
    if (!tieneReglas) {
      for (const regla of auto.reglas_base) {
        porInsertar.push({ negocio_id: negocioId, owner_id: ownerId, tipo: "regla_dueno", contenido: regla });
      }
    }
    if (!tieneSector || forzar) {
      if (forzar && tieneSector) {
        await supabase.from("agente_memoria").delete().eq("negocio_id", negocioId).eq("tipo", "sector");
      }
      porInsertar.push({
        negocio_id: negocioId,
        owner_id: ownerId,
        tipo: "sector",
        contenido: auto.resumen_sector,
      });
    }
    if (porInsertar.length > 0) {
      await supabase.from("agente_memoria").insert(porInsertar);
    }
  } catch {
    /* si falla la memoria secundaria no bloquea la activación */
  }

  return { agente: fila, error: null, autoconfigurado };
}
