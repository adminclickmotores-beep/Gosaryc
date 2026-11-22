import { TIPOS_NEGOCIO, CRM_AUTOMATICO, MODULO_CRM, SECOP_AUTOMATICO, MODULO_SECOP } from "@/lib/modulos-negocio";

/** Ids de módulos con pantalla dedicada (lógica propia, tablas tipadas) en la ruta /modulos/$id. */
const IDS_DEDICADOS = new Set<string>([
  "pan_produccion", "pan_recetas", "pan_mermas", "encargos_tortas", "pan_turnos",
  "com_pos", "com_productos", "com_lotes", "com_seriales", "com_cotizador", "com_desposte",
  "bel_agenda", "bel_fichas", "bel_servicios", "bel_comisiones",
  "tal_ordenes", "tal_repuestos", "tal_comisiones", "tal_proyectos",
  "obr_obras", "inm_propiedades", "agr_lotes", "tra_manifiestos",
  "hot_habitaciones", "hot_reservas", "edu_matriculas", "edu_pensiones", "edu_academico",
  "mod_matriz", "far_control", "opt_formulas", "eve_eventos", "lav_ordenes",
  "sst_empresas", "sst_evaluaciones", "sst_profesiograma", "sst_estandares", "sst_sve", "sst_capacitaciones", "sst_normativa", "sst_matriz_legal", "sst_alertas",
  "prof_casos", "tec_proyectos", "pap_encargos", "joy_apartados", "lic_domicilios", "parq_turnos",
  "gim_checkin", "gim_socios", "gim_planes", "gim_valoracion",
  "cl_agenda", "cl_pacientes", "cl_historias", "cl_vacunas", "cl_alertas", "cl_caja", "cl_servicios", "cl_insumos", "cl_comisiones",
  "vehiculos", "caja_diaria", "compras_veh", "consignaciones_veh", "vehiculos_usados", "creditos_veh",
  "separaciones_veh", "vencimientos_veh", "documentos_veh", "cotizaciones_veh", "financiacion_veh", "financiacion_agro",
  // Tanda 1 (#35 a #39)
  "agenda_serv", "ordenes_serv_cita", "unidades_cond", "cuotas_cond", "prestamos_reg", "cronograma_cuotas", "cobranza_diaria",
  "ordenes_confeccion", "cortes_tela", "insumos_textil", "arreglos_flor", "encargos_flor", "flores_frescas",
  // Tanda 2 (#40 a #45)
  "flota_alquiler", "reservas_alquiler", "contratos_alquiler", "entregas_alq", "multas_alquiler",
  "puestos_seg", "turnos_seg", "dotacion_seg", "novedades_seg",
  "lotes_ganado", "produccion_pecuaria", "sanidad_pecuaria", "alimentacion_pecuaria", "guias_movilizacion",
  "beneficiarios_fund", "donaciones_fund", "proyectos_fund", "voluntarios_fund",
  "miembros_iglesia", "aportes_iglesia", "eventos_iglesia", "grupos_iglesia", "visitas_iglesia",
  "parq_abonados",
  "empenos_cv", "articulos_cv", "compras_cv", "retiros_cv",
  "pedidos_dist", "rutas_dist", "listas_dist", "cartera_dist",
  "ordenes_moto", "repuestos_moto",
]);

/** Rutas reales de la app, leídas de los archivos de src/routes (fijas y con parámetro). */
const ARCHIVOS_RUTAS = Object.keys(import.meta.glob("/src/routes/**/*.{ts,tsx}"));
const RUTAS_FIJAS = new Set<string>();
const PREFIJOS_DINAMICOS: string[] = [];
for (const archivo of ARCHIVOS_RUTAS) {
  let r = archivo.replace("/src/routes/", "").replace(/\.(tsx|ts)$/, "").replace(/^_app\//, "").replace(/^_app$/, "");
  r = r.replace(/\./g, "/");
  r = r.replace(/(^|\/)index$/, "");
  const partes = r.split("/").filter(Boolean);
  const iDin = partes.findIndex((p) => p.startsWith("$"));
  if (iDin >= 0) {
    if (iDin > 0) PREFIJOS_DINAMICOS.push(`/${partes.slice(0, iDin).join("/")}/`);
  } else {
    RUTAS_FIJAS.add(`/${partes.join("/")}`);
  }
}

/** Una ruta es válida si existe como archivo de ruta o cuelga de una ruta dinámica (modulos/$id, negocio/$tipo...). */
export function rutaExiste(ruta: string): boolean {
  const limpia = ruta.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
  if (RUTAS_FIJAS.has(limpia)) return true;
  return PREFIJOS_DINAMICOS.some((p) => limpia.startsWith(p));
}

export type FilaAuditoria = {
  rutasRotas: string[];
  numero: number;
  clave: string;
  nombre: string;
  activos: number;
  dedicados: number;
  genericos: number;
  logica: "Dedicada" | "Mixta" | "Plantilla genérica";
  genericosLista: string[];
};

/** Un módulo es dedicado si tiene pantalla propia (ruta fuera de /modulos) o su id está registrado. */
export function esModuloDedicado(id: string, ruta?: string): boolean {
  if (IDS_DEDICADOS.has(id) || id === "facturas" || id.startsWith("facturas_")) return true;
  return !!ruta && !ruta.startsWith("/modulos/");
}

/** Listado numerado de todos los negocios, generado en vivo desde la configuración real. */
export function auditoriaNegocios(): FilaAuditoria[] {
  return TIPOS_NEGOCIO.map((t, i): FilaAuditoria => {
    const crmVisible = CRM_AUTOMATICO.includes(t.clave);
    const activos = t.modulos.filter((m) => m.estado === "Activo" && (m.id !== MODULO_CRM.id || crmVisible) && (m.id !== MODULO_SECOP.id || SECOP_AUTOMATICO.includes(t.clave)));
    const dedic = activos.filter((m) => esModuloDedicado(m.id, m.ruta));
    const gen = activos.filter((m) => !esModuloDedicado(m.id, m.ruta));
    // Los módulos "de apoyo" (clientes, pagos, metas, personal, reseñas...) usan formularios propios del negocio.
    const nucleoGenerico = gen.filter((m) => !/^(clientes|pagos|resenas|personal|metas|cuentas|caja|proveedores|finanzas|fidelizacion|garantias|agenda|cotizaciones)_/.test(m.id));
    const logica: FilaAuditoria["logica"] = nucleoGenerico.length === 0 ? "Dedicada" : dedic.length >= 3 ? "Mixta" : "Plantilla genérica";
    const rotas = activos.filter((m) => !!m.ruta && m.ruta.startsWith("/") && !rutaExiste(m.ruta)).map((m) => `${m.titulo} (${m.ruta})`);
    return {
      rutasRotas: rotas,
      numero: i + 1,
      clave: t.clave,
      nombre: t.etiqueta,
      activos: activos.length,
      dedicados: dedic.length,
      genericos: gen.length,
      logica,
      genericosLista: nucleoGenerico.map((m) => m.titulo),
    };
  });
}
