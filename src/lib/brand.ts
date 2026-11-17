/**
 * Centralized brand configuration for this template.
 *
 * Remixers: change the values here to rebrand the entire app — copy in
 * sidebar/topbar lockups, login screen, head meta, email templates,
 * onboarding copy, AI placeholders, etc. all read from BRAND.
 */
/** Lee VITE_APP_URL (sin protocolo) o devuelve el dominio publicado de respaldo. */
function dominioPublicado(): string {
  try {
    const u = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_URL;
    if (u && u.trim()) return u.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  } catch {
    /* sin entorno disponible */
  }
  return "gosaryc.lovable.app";
}

export const BRAND = {
  /** Full product name shown in lockups, titles, and email "from" lines. */
  name: "Gosaryc",
  /** Short label for tight spaces (mobile nav, collapsed sidebar tooltips). */
  shortName: "GSR",
  /** One-line tagline used in headers and email footers. */
  tagline: "Gestión y ventas para tu negocio",
  /** Short marketing description for meta tags and onboarding. */
  description:
    "Gosaryc es la plataforma para administrar tu negocio en Colombia, con módulos especializados para cada tipo de negocio: restaurantes, concesionarios, tiendas, consultorios y clínicas, salones de belleza, talleres, hoteles, instituciones educativas y más de 50 actividades económicas. Vende con punto de venta y catálogo digital, controla inventario y costos, gestiona caja, cuentas por cobrar, nómina con la normatividad colombiana vigente, facturación electrónica DIAN y finanzas con indicadores de rentabilidad, con un asistente virtual que te acompaña paso a paso. Funciona en la web, en tu celular como app instalable y en tu computador.",
  /**
   * Dominio publicado usado en ejemplos y como respaldo cuando no hay
   * VITE_APP_URL ni origen del navegador. Para migrar de hosting o cambiar
   * de dominio, fija VITE_APP_URL al compilar (ej. https://tu-dominio.com).
   */
  domain: dominioPublicado(),
  /**
   * Optional support inbox surfaced in error/empty states.
   * Remixers: replace with your real support address (or set to undefined
   * to hide the "Contact support" affordance everywhere).
   */
  supportEmail: "gosarycsoftware@gmail.com",
  /** WhatsApp de soporte (renovación y soporte de pago), con indicativo de país. */
  supportWhatsapp: "573332765584",
  /** WhatsApp de soporte como se muestra en pantalla. */
  supportWhatsappTexto: "333 276 5584",
} as const;

/** Enlace de WhatsApp al soporte con un mensaje ya escrito. */
export const enlaceWhatsappSoporte = (mensaje: string) =>
  `https://wa.me/${BRAND.supportWhatsapp}?text=${encodeURIComponent(mensaje)}`;

export type Brand = typeof BRAND;
