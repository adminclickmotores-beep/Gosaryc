/**
 * Centralized brand configuration for this template.
 *
 * Remixers: change the values here to rebrand the entire app — copy in
 * sidebar/topbar lockups, login screen, head meta, email templates,
 * onboarding copy, AI placeholders, etc. all read from BRAND.
 */
export const BRAND = {
  /** Full product name shown in lockups, titles, and email "from" lines. */
  name: "Gosaryc",
  /** Short label for tight spaces (mobile nav, collapsed sidebar tooltips). */
  shortName: "GSR",
  /** One-line tagline used in headers and email footers. */
  tagline: "Gestión y ventas para tu negocio",
  /** Short marketing description for meta tags and onboarding. */
  description:
    "Gosaryc es el software para administrar tu negocio en Colombia, con módulos propios para cada giro: restaurantes, concesionarios, tiendas, consultorios y clínicas, salones, talleres, hoteles, colegios y más de 50 sectores. Vende, controla inventario, caja, fiados, nómina con reglas colombianas, facturación DIAN y finanzas, con un asistente que te enseña a usarlo. Funciona en la web, en tu celular y en tu computador.",
  /**
   * Placeholder domain used in example URLs (Commander AI input hints, etc.).
   * Keep this neutral — it should NOT match the email-sending domain.
   */
  domain: "gosaryc.lovable.app",
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
