/**
 * Dónde guarda cada módulo operativo sus registros.
 * Los módulos con dinero tienen tabla propia por negocio (owner_id = mi_negocio_id());
 * el resto sigue en la tabla genérica `modulo_registros`, separada por la columna `modulo`.
 * Todas las tablas listadas aquí tienen las mismas columnas que `modulo_registros`.
 */
export type TablaModulo =
  | "modulo_registros"
  | "fiados"
  | "equipo_pagos"
  | "propinas_registros"
  | "proveedores_registros"
  | "costos_veh"
  | "liquidaciones_repartidores"
  | "pagos_digitales_registros"
  | "facturas_registros"
  | "permisos_rest_registros"
  | "metas_registros"
  | "resenas_registros"
  | "suscripciones_registros"
  | "combos_registros"
  | "fidelizacion_registros"
  | "ventas_veh_registros"
  | "comisiones_registros"
  | "alistamiento_registros"
  | "cartera_veh_registros"
  | "vehiculos_usados_registros";

/** id del módulo -> tabla propia. */
export const TABLA_POR_MODULO: Record<string, TablaModulo> = {
  fiados: "fiados",
  equipo_turnos: "equipo_pagos",
  propinas: "propinas_registros",
  proveedores: "proveedores_registros",
  costos_veh: "costos_veh",
  repartidores: "liquidaciones_repartidores",
  pagos_digitales: "pagos_digitales_registros",
  facturas: "facturas_registros",
  permisos_rest: "permisos_rest_registros",
  metas: "metas_registros",
  resenas: "resenas_registros",
  suscripciones: "suscripciones_registros",
  combos: "combos_registros",
  fidelizacion: "fidelizacion_registros",
  ventas_veh: "ventas_veh_registros",
  comisiones: "comisiones_registros",
  alistamiento: "alistamiento_registros",
  cartera_veh: "cartera_veh_registros",
  vehiculos_usados: "vehiculos_usados_registros",
};

/** Tablas con dinero: no se borra nada, solo se anula con motivo (lo controla la base de datos). */
export const TABLAS_SIN_BORRADO: TablaModulo[] = [
  "fiados",
  "equipo_pagos",
  "propinas_registros",
  "proveedores_registros",
  "costos_veh",
  "liquidaciones_repartidores",
  "pagos_digitales_registros",
  "facturas_registros",
];

export const tablaDeModulo = (id: string): TablaModulo => TABLA_POR_MODULO[id] ?? "modulo_registros";

/** Agrupa ids de módulos por la tabla donde viven sus registros. */
export function agruparPorTabla(ids: string[]): Map<TablaModulo, string[]> {
  const salida = new Map<TablaModulo, string[]>();
  for (const id of ids) {
    const t = tablaDeModulo(id);
    salida.set(t, [...(salida.get(t) ?? []), id]);
  }
  return salida;
}
