import { createFileRoute } from "@tanstack/react-router";
import { RestaurantePage } from "@/routes/_app/restaurante";

// Panel del negocio con la dirección del tipo elegido: /negocio/panaderia, /negocio/concesionario, etc.
export const Route = createFileRoute("/_app/negocio/$tipo")({
  validateSearch: (s: Record<string, unknown>): { vista?: string; ventana?: string } => ({
    vista: typeof s.vista === "string" ? s.vista : undefined,
    ventana: typeof s.ventana === "string" ? s.ventana : undefined,
  }),
  head: () => ({ meta: [{ title: "Panel de tu negocio" }] }),
  component: RestaurantePage,
});
