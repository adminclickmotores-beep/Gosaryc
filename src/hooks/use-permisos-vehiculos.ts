import { useMemo } from "react";
import { usePermisos } from "@/hooks/use-permisos";

/** Permisos finos del inventario de vehículos (el servidor los vuelve a validar). */
export const PERMISOS_VEHICULOS = [
  { id: "veh_ver", titulo: "Vehículos: consultar inventario" },
  { id: "veh_crear", titulo: "Vehículos: crear" },
  { id: "veh_editar", titulo: "Vehículos: editar datos y documentos" },
  { id: "veh_retirar", titulo: "Vehículos: retirar del inventario" },
  { id: "veh_gastos", titulo: "Vehículos: registrar gastos" },
  { id: "veh_precios", titulo: "Vehículos: modificar precios" },
  { id: "veh_estados", titulo: "Vehículos: cambiar estados" },
  { id: "veh_costos", titulo: "Vehículos: ver costos y utilidades" },
];

const BASE = ["veh_ver", "veh_crear", "veh_editar", "veh_gastos", "veh_estados"];
const MODULOS_BASE = ["vehiculos", "pedidos", "cocina", "domicilios"];

export function usePermisosVehiculos() {
  const { acceso, cargando, esAdmin } = usePermisos();
  return useMemo(() => {
    const mods = acceso?.modulos ?? [];
    const puede = (p: string) =>
      esAdmin || mods.includes(p) || (BASE.includes(p) && mods.some((m) => MODULOS_BASE.includes(m)));
    return {
      cargando,
      ver: puede("veh_ver"),
      crear: puede("veh_crear"),
      editar: puede("veh_editar"),
      retirar: puede("veh_retirar"),
      gastos: puede("veh_gastos"),
      precios: puede("veh_precios"),
      estados: puede("veh_estados"),
      costos: puede("veh_costos"),
    };
  }, [acceso, cargando, esAdmin]);
}
