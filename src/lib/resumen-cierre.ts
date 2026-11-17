/**
 * Resumen ejecutivo diario para el dueño por WhatsApp.
 * Arma el texto del cierre del día y el enlace de WhatsApp (wa.me).
 * Sin dependencias nuevas y sin guardar nada: solo texto y enlace.
 */

export type DatosCierre = {
  negocio: string;
  fecha: string;
  ventas: number;
  gastos: number;
  efectivoEsperado: number;
  transferencias: number;
  creditosDelDia: number;
  stockCritico: string[];
};

const dinero = (n: number): string =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const soloDigitos = (t: string): string => (t ?? "").replace(/\D/g, "");

/** Deja el número listo para wa.me: si trae 10 dígitos (Colombia) le agrega el 57. */
export function numeroWhatsapp(t: string): string {
  const d = soloDigitos(t);
  return d.length === 10 ? `57${d}` : d;
}

export function textoResumenCierre(d: DatosCierre): string {
  const lineas = [
    `*CIERRE DEL DÍA · ${d.negocio}*`,
    `Fecha: ${d.fecha}`,
    ``,
    `Ventas: ${dinero(d.ventas)}`,
    `Gastos y retiros: ${dinero(d.gastos)}`,
    `Efectivo en caja: ${dinero(d.efectivoEsperado)}`,
    `Transferencias + tarjeta: ${dinero(d.transferencias)}`,
    `Créditos del día (fiado): ${dinero(d.creditosDelDia)}`,
  ];
  if (d.stockCritico.length > 0) {
    lineas.push(``, `⚠️ Stock crítico:`, ...d.stockCritico.slice(0, 5).map((s) => `· ${s}`));
  } else {
    lineas.push(``, `Stock al día, sin alertas críticas.`);
  }
  lineas.push(``, `Enviado desde Gosaryc.`);
  return lineas.join("\n");
}

/** Enlace para enviar el resumen al WhatsApp del dueño. */
export function enlaceResumenDueno(telefonoDueno: string, d: DatosCierre): string | null {
  const numero = numeroWhatsapp(telefonoDueno);
  if (numero.length < 7) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(textoResumenCierre(d))}`;
}

const CLAVE_TELEFONO = "gosaryc_dueno_whatsapp";

export function telefonoDuenoGuardado(): string {
  try {
    return localStorage.getItem(CLAVE_TELEFONO) ?? "";
  } catch {
    return "";
  }
}

export function guardarTelefonoDueno(tel: string): void {
  try {
    localStorage.setItem(CLAVE_TELEFONO, tel);
  } catch {
    /* sin almacenamiento: se pide cada vez */
  }
}
