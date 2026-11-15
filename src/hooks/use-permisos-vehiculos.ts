import { useMemo } from "react";
import { usePermisos } from "@/hooks/use-permisos";

/** Permisos finos del inventario y de Retomas de vehículos (el servidor los vuelve a validar). */
export const PERMISOS_VEHICULOS = [
  { id: "veh_ver", titulo: "Vehículos: consultar inventario" },
  { id: "veh_crear", titulo: "Vehículos: crear" },
  { id: "veh_editar", titulo: "Vehículos: editar datos y documentos" },
  { id: "veh_retirar", titulo: "Vehículos: retirar del inventario" },
  { id: "veh_gastos", titulo: "Vehículos: registrar gastos" },
  { id: "veh_precios", titulo: "Vehículos: modificar precios" },
  { id: "veh_estados", titulo: "Vehículos: cambiar estados" },
  { id: "veh_costos", titulo: "Vehículos: ver costos y utilidades" },
  { id: "ret_ver_todas", titulo: "Retomas: ver todas las solicitudes (sin valores económicos)" },
  { id: "ret_inspeccionar", titulo: "Retomas: registrar inspecciones y observaciones (jefe de patio)" },
  { id: "ret_avaluo", titulo: "Retomas: registrar avalúos técnicos (jefe de patio)" },
  { id: "ret_economico", titulo: "Retomas: ver y modificar valores económicos" },
  { id: "ret_aprobar", titulo: "Retomas: aprobar retomas y pasarlas al inventario" },
];

const BASE = ["veh_ver", "veh_crear", "veh_editar", "veh_gastos", "veh_estados"];
const RET_BASE = ["ret_crear", "ret_ver_propias"];
const RET_VER_TODAS = ["ret_inspeccionar", "ret_avaluo", "ret_aprobar", "ret_economico"];
const MODULOS_BASE = ["vehiculos", "pedidos", "cocina", "domicilios"];

export function usePermisosVehiculos() {
  const { acceso, cargando, esAdmin } = usePermisos();
  return useMemo(() => {
    const mods = acceso?.modulos ?? [];
    const puede = (p: string) =>
      esAdmin || mods.includes(p) || (BASE.includes(p) && mods.some((m) => MODULOS_BASE.includes(m)));
    const puedeRet = (p: string) =>
      esAdmin ||
      mods.includes(p) ||
      (RET_BASE.includes(p) && mods.some((m) => MODULOS_BASE.includes(m))) ||
      (p === "ret_ver_todas" && mods.some((m) => RET_VER_TODAS.includes(m)));
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
      retCrear: puedeRet("ret_crear"),
      retVerPropias: puedeRet("ret_ver_propias"),
      retVerTodas: puedeRet("ret_ver_todas"),
      retInspeccionar: puedeRet("ret_inspeccionar"),
      retAvaluo: puedeRet("ret_avaluo"),
      retEconomico: puedeRet("ret_economico"),
      retAprobar: puedeRet("ret_aprobar"),
    };
  }, [acceso, cargando, esAdmin]);
}
