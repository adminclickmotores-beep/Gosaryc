/**
 * Centralized brand configuration for this template.
 *
 * Remixers: change the values here to rebrand the entire app — copy in
 * sidebar/topbar lockups, login screen, head meta, email templates,
 * onboarding copy, AI placeholders, etc. all read from BRAND.
 */
export const BRAND = {
  /** Full product name shown in lockups, titles, and email "from" lines. */
  name: "Gosaly",
  /** Short label for tight spaces (mobile nav, collapsed sidebar tooltips). */
  shortName: "GSL",
  /** One-line tagline used in headers and email footers. */
  tagline: "Gestión y ventas para tu negocio",
  /** Short marketing description for meta tags and onboarding. */
  description:
    "Vende, atiende y controla todo tu negocio desde un solo lugar: pedidos, menú digital, cocina, domicilios, clientes, inventarios y finanzas. Funciona en la web y se instala en tu computador y celular.",
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
