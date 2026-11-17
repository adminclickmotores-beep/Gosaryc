// Sucursal activa del punto de venta (se guarda en este equipo).
// Sirve para filtrar reportes por sede o ver el consolidado de todo el negocio.

const CLAVE = "gosaryc:sucursal_actual";

export function leerSucursalActual(): string | null {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function fijarSucursalActual(id: string | null): void {
  try {
    if (!id) window.localStorage.removeItem(CLAVE);
    else window.localStorage.setItem(CLAVE, id);
  } catch {
    /* almacenamiento bloqueado */
  }
}
