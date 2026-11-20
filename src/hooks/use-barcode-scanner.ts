import { useEffect, useRef } from "react";

type OpcionesEscaner = {
  /** Si es false, pausa la escucha global (por ejemplo, cuando hay un modal abierto). */
  activo?: boolean;
  /** Intervalo máximo en milisegundos entre teclas de la pistola escáner. */
  maxIntervaloMs?: number;
  /** Longitud mínima del código leído para disparar onScan. */
  longitudMinima?: number;
  /** Función ejecutada al completar una lectura con Enter. */
  onScan: (codigo: string) => void;
};

/**
 * Escucha globalmente lecturas rápidas de pistolas de códigos de barras USB/Bluetooth terminadas en Enter,
 * incluso cuando el cursor no está en el buscador, ignorando escritura manual en campos de cliente o notas.
 */
export function useBarcodeScanner({
  activo = true,
  maxIntervaloMs = 80,
  longitudMinima = 3,
  onScan,
}: OpcionesEscaner): void {
  const callbackRef = useRef(onScan);
  callbackRef.current = onScan;

  useEffect(() => {
    if (!activo || typeof window === "undefined") return;

    let buffer = "";
    let ultimaTecla = 0;

    const esCampoEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const alTeclear = (e: KeyboardEvent) => {
      // Ignora si el usuario está escribiendo en campos de cliente, notas, buscador u otro input.
      if (esCampoEditable(e.target) || esCampoEditable(document.activeElement)) {
        buffer = "";
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const ahora = Date.now();
      if (e.key === "Enter") {
        const codigo = buffer.trim();
        const reciente = ahora - ultimaTecla <= maxIntervaloMs * 2;
        buffer = "";
        ultimaTecla = 0;
        if (codigo.length >= longitudMinima && reciente) {
          e.preventDefault();
          callbackRef.current(codigo);
        }
        return;
      }

      if (e.key.length === 1) {
        if (ultimaTecla > 0 && ahora - ultimaTecla > maxIntervaloMs) {
          buffer = "";
        }
        buffer += e.key;
        ultimaTecla = ahora;
      }
    };

    window.addEventListener("keydown", alTeclear);
    return () => {
      window.removeEventListener("keydown", alTeclear);
    };
  }, [activo, maxIntervaloMs, longitudMinima]);
}
