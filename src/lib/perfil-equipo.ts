// Perfil local del equipo: qué negocio se opera en este equipo (instalador de escritorio o APK).
// Se guarda en localStorage y, en escritorio, también en config-negocio.json (carpeta de datos de la app).

export const CLAVE_PERFIL = "gosaryc:perfil_equipo";
export const EVENTO_PERFIL = "gosaryc:perfil-equipo";
export const PERFIL_MULTI = "multi";

type PuenteEscritorio = {
  leerPerfil?: () => Promise<string | null>;
  guardarPerfil?: (perfil: string) => Promise<boolean>;
};

function puente(): PuenteEscritorio | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { gosarycEscritorio?: PuenteEscritorio }).gosarycEscritorio) ?? null;
}

/** ¿Corre dentro del instalador de escritorio o de la APK? (en la web normal no se pide perfil) */
export function esAppInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { gosarycEscritorio?: unknown; Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.gosarycEscritorio) return true;
  if (/Electron/i.test(navigator.userAgent)) return true;
  try {
    return !!w.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export async function leerPerfilEquipo(): Promise<string | null> {
  let local: string | null = null;
  try {
    local = window.localStorage.getItem(CLAVE_PERFIL);
  } catch {
    local = null;
  }
  if (local) return local;
  try {
    const archivo = await puente()?.leerPerfil?.();
    if (archivo) {
      try {
        window.localStorage.setItem(CLAVE_PERFIL, archivo);
      } catch {
        /* sin almacenamiento local */
      }
      return archivo;
    }
  } catch {
    /* sin archivo de configuración */
  }
  return null;
}

export async function guardarPerfilEquipo(perfil: string): Promise<void> {
  try {
    window.localStorage.setItem(CLAVE_PERFIL, perfil);
  } catch {
    /* sin almacenamiento local */
  }
  try {
    await puente()?.guardarPerfil?.(perfil);
  } catch {
    /* el archivo es un respaldo */
  }
  window.dispatchEvent(new CustomEvent(EVENTO_PERFIL, { detail: perfil }));
}
