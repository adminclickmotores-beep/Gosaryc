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
    "Gosaryc es el sistema todo en uno para administrar tu negocio: vende, recibe pedidos, controla inventario, caja, fiados, equipo y finanzas, y atiende a tus clientes con un agente virtual de IA. Sirve para tiendas, restaurantes, talleres, salones y servicios, y funciona en la web o instalado en tu celular y computador.",
  /**
   * Placeholder domain used in example URLs (Commander AI input hints, etc.).
   * Keep this neutral — it should NOT match the email-sending domain.
   */
  domain: "example.com",
  /**
   * Optional support inbox surfaced in error/empty states.
   * Remixers: replace with your real support address (or set to undefined
   * to hide the "Contact support" affordance everywhere).
   */
  supportEmail: "support@example.com",
} as const;

export type Brand = typeof BRAND;
